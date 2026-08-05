import { config } from "dotenv";
config({ path: ".env.local" });
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { leaguesRouter } from "./routes/leagues";
import { getProvider } from "./infrastructure/provider";
import { pollOnce } from "./services/polling-service";

const app = express();
// Sin restricción de origen — solo corre en local para pruebas (ver services/test-page).
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "live-matches-svc" }));

app.use(leaguesRouter);

/** Endpoint de debug para forzar un ciclo de polling inmediato en local. */
app.post("/internal/poll-now", async (_req, res, next) => {
  try {
    const result = await pollOnce(getProvider());
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

const port = Number(process.env.PORT ?? 4004);
app.listen(port, () => {
  console.log(`[live-matches-svc] escuchando en http://localhost:${port}`);
});

// En local simula el cron de polling que en producción correría en el
// proveedor de contenedores (Railway). Solo arranca si hay API key
// configurada, para no romper el arranque en un checkout local sin credenciales.
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS ?? 90000);
if (process.env.API_FOOTBALL_KEY) {
  setInterval(() => {
    pollOnce(getProvider()).catch((err) => console.error("[live-matches-svc] fallo en polling:", err));
  }, pollIntervalMs);
} else {
  console.warn("[live-matches-svc] API_FOOTBALL_KEY no configurada — el polling automático está desactivado.");
}
