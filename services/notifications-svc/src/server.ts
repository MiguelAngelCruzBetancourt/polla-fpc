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

// En local simula el cron de drenaje de outbox que en producción correría en
// el proveedor de contenedores (Railway). Ver services/notifications-svc/src/services/outbox-drain-service.ts.
const drainIntervalMs = Number(process.env.OUTBOX_DRAIN_INTERVAL_MS ?? 15000);
setInterval(() => {
  drainOutboxOnce().catch((err) => console.error("[notifications-svc] fallo en drenaje de outbox:", err));
}, drainIntervalMs);

// Segundo chequeo periódico, mismo patrón que el de arriba: revisa partidos
// próximos a iniciar para recordatorios de pronóstico y aviso de disponibilidad
// (eventos disparados por tiempo, no por una acción de negocio puntual — no
// pasan por la outbox). Ver services/notifications-svc/src/services/match-schedule-service.ts.
const scheduleIntervalMs = Number(process.env.MATCH_SCHEDULE_INTERVAL_MS ?? 60000);
setInterval(() => {
  checkMatchScheduleNotifications().catch((err) =>
    console.error("[notifications-svc] fallo en chequeo de horarios de partidos:", err),
  );
}, scheduleIntervalMs);
