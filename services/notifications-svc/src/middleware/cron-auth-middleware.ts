import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";

/**
 * Protege endpoints internos de jobs (drenaje de outbox, chequeo de horarios
 * de partidos) contra invocación no autorizada. No es autenticación de
 * usuario — es un secreto compartido entre este servicio y quien dispara los
 * jobs periódicamente en producción (ver .github/workflows/notifications-cron.yml).
 */
export function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Sin CRON_SECRET configurado, negar por defecto (fail-closed) — evita
    // que un despliegue mal configurado deje el endpoint abierto.
    res.status(503).json({ error: "CRON_SECRET no configurado en el servidor." });
    return;
  }

  const provided = req.header("x-cron-secret") ?? "";
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  const isMatch =
    expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);

  if (!isMatch) {
    res.status(401).json({ error: "Secreto de cron inválido." });
    return;
  }

  next();
}
