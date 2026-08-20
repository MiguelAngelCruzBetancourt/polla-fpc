import { config } from "dotenv";
config({ path: ".env.local" });
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { devicesRouter } from "./routes/devices";
import { eventsRouter } from "./routes/events";
import { drainOutboxOnce } from "./services/outbox-drain-service";
import { checkMatchScheduleNotifications } from "./services/match-schedule-service";

const app = express();
// Sin restricción de origen — solo corre en local para pruebas (ver services/test-page).
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "notifications-svc" }));

app.use(devicesRouter);
app.use(eventsRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

const port = Number(process.env.PORT ?? 4003);
app.listen(port, () => {
  console.log(`[notifications-svc] escuchando en http://localhost:${port}`);
});

/**
 * Reprograma `task` con backoff exponencial: cada fallo consecutivo duplica
 * la espera hasta `maxIntervalMs`; un éxito la resetea a `baseIntervalMs`.
 * Evita martillar Firestore cada pocos segundos cuando la causa del fallo es
 * algo sostenido (ej. cuota de Firestore agotada, RESOURCE_EXHAUSTED) — en
 * ese escenario un setInterval fijo solo suma más intentos fallidos contra
 * una cuota que ya está en cero, sin acelerar la recuperación.
 */
function scheduleWithBackoff(
  label: string,
  task: () => Promise<unknown>,
  baseIntervalMs: number,
  maxIntervalMs: number,
) {
  let currentDelayMs = baseIntervalMs;

  const run = () => {
    task()
      .then(() => {
        currentDelayMs = baseIntervalMs;
      })
      .catch((err) => {
        console.error(`[notifications-svc] fallo en ${label}:`, err);
        currentDelayMs = Math.min(currentDelayMs * 2, maxIntervalMs);
      })
      .finally(() => {
        setTimeout(run, currentDelayMs);
      });
  };

  setTimeout(run, baseIntervalMs);
}

// En local simula el cron de drenaje de outbox que en producción correría en
// el proveedor de contenedores (Railway). Ver services/notifications-svc/src/services/outbox-drain-service.ts.
const drainIntervalMs = Number(process.env.OUTBOX_DRAIN_INTERVAL_MS ?? 15000);
scheduleWithBackoff("drenaje de outbox", drainOutboxOnce, drainIntervalMs, 5 * 60 * 1000);

// Segundo chequeo periódico, mismo patrón que el de arriba: revisa partidos
// próximos a iniciar para recordatorios de pronóstico y aviso de disponibilidad
// (eventos disparados por tiempo, no por una acción de negocio puntual — no
// pasan por la outbox). Ver services/notifications-svc/src/services/match-schedule-service.ts.
const scheduleIntervalMs = Number(process.env.MATCH_SCHEDULE_INTERVAL_MS ?? 60000);
scheduleWithBackoff(
  "chequeo de horarios de partidos",
  checkMatchScheduleNotifications,
  scheduleIntervalMs,
  15 * 60 * 1000,
);
