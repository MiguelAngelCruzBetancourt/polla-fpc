import { config } from "dotenv";
config({ path: ".env.local" });
import cors from "cors";
import express from "express";
import { rateLimitRouter } from "./routes/rate-limit";
import { rolesRouter } from "./routes/roles";
import { usersRouter } from "./routes/users";
import { verifyRouter } from "./routes/verify";

const app = express();
// Sin restricción de origen — solo corre en local para pruebas (ver services/test-page).
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "security-api" }));

app.use(verifyRouter);
app.use(rateLimitRouter);
app.use(rolesRouter);
app.use(usersRouter);

const port = Number(process.env.PORT ?? 4001);
app.listen(port, () => {
  console.log(`[security-api] escuchando en http://localhost:${port}`);
});
