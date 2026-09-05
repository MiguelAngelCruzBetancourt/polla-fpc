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

// En producción (USE_EXTERNAL_SCHEDULER=true) estos dos jobs NO corren como
// setInterval interno — los dispara un cron externo gratuito (GitHub Actions,
// ver .github/workflows/notifications-cron.yml) llamando a
// POST /internal/outbox/drain-now y POST /internal/match-schedule/check-now
// (protegidos por CRON_SECRET, ver services/notifications-svc/src/middleware/cron-auth-middleware.ts).
// Esto evita depender de que el proceso quede vivo de forma continua, algo
// que no todo proveedor de hosting gratuito garantiza. En desarrollo local
// (USE_EXTERNAL_SCHEDULER sin definir) el comportamiento no cambia: se sigue
// simulando el cron con setInterval+backoff dentro del propio proceso.
const useExternalScheduler = process.env.USE_EXTERNAL_SCHEDULER === "true";

if (!useExternalScheduler) {
  const drainIntervalMs = Number(process.env.OUTBOX_DRAIN_INTERVAL_MS ?? 15000);
  scheduleWithBackoff("drenaje de outbox", drainOutboxOnce, drainIntervalMs, 5 * 60 * 1000);

  const scheduleIntervalMs = Number(process.env.MATCH_SCHEDULE_INTERVAL_MS ?? 60000);
  scheduleWithBackoff(
    "chequeo de horarios de partidos",
    checkMatchScheduleNotifications,
    scheduleIntervalMs,
    15 * 60 * 1000,
  );
}
