import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Protege los endpoints internos de jobs (drenaje de outbox, chequeo de
 * horarios) contra invocación no autorizada. No es autenticación de usuario —
 * es un secreto compartido entre esta app y quien dispara los jobs
 * periódicamente (ver .github/workflows/notifications-cron.yml).
 *
 * Devuelve una respuesta de error si el secreto no coincide, o null si el
 * llamado es legítimo.
 */
export function rejectIfBadCronSecret(request: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Sin CRON_SECRET configurado, negar por defecto (fail-closed) — evita que
    // un despliegue mal configurado deje el endpoint abierto.
    return NextResponse.json({ error: "CRON_SECRET no configurado en el servidor." }, { status: 503 });
  }

  const provided = request.headers.get("x-cron-secret") ?? "";
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  const isMatch =
    expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);

  if (!isMatch) {
    return NextResponse.json({ error: "Secreto de cron inválido." }, { status: 401 });
  }

  return null;
}
