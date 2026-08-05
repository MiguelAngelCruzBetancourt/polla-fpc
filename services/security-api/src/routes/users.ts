import { Router } from "express";
import { lookupUsersByEmail } from "../services/users-service";

export const usersRouter = Router();

/**
 * Endpoint interno, solo para llamadas servicio-a-servicio (ej. business-api
 * resolviendo emails -> uid para bonus points). No lo consume el frontend.
 * Uso: GET /internal/users/lookup?emails=a@x.com,b@y.com
 */
usersRouter.get("/internal/users/lookup", async (req, res) => {
  const emailsParam = req.query.emails;
  if (typeof emailsParam !== "string" || emailsParam.trim() === "") {
    return res.status(400).json({ error: "Falta el parámetro emails." });
  }

  const emails = emailsParam.split(",").map((e) => e.trim()).filter(Boolean);
  const results = await lookupUsersByEmail(emails);
  return res.json({ users: results });
});
