import { config } from "dotenv";
config({ path: ".env.local" });
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { adminRouter } from "./routes/admin";
import { matchesRouter } from "./routes/matches";
import { predictionsRouter } from "./routes/predictions";
import { roomsRouter } from "./routes/rooms";

const app = express();
// Sin restricción de origen — solo corre en local para pruebas (ver services/test-page).
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "business-api" }));

app.use(matchesRouter);
app.use(predictionsRouter);
app.use(roomsRouter);
app.use(adminRouter);

// Manejador de errores central — MatchServiceError ya se traduce a status
// específico en cada ruta; cualquier otro error cae aquí como 500.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

const port = Number(process.env.PORT ?? 4002);
app.listen(port, () => {
  console.log(`[business-api] escuchando en http://localhost:${port}`);
});
