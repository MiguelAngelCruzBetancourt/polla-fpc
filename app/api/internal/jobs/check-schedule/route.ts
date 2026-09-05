import { NextResponse } from "next/server";
import { rejectIfBadCronSecret } from "@/lib/server/cron-auth";
import { serviceErrorResponse } from "@/lib/server/http";
import { checkMatchScheduleNotifications } from "@/lib/server/match-schedule-service";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Revisa los partidos próximos a iniciar y dispara el recordatorio de pronóstico
 * (1h antes) y el aviso de pronósticos disponibles (10min antes). Eventos
 * disparados por tiempo, no por una acción de negocio — por eso no pasan por la
 * outbox. Lo invoca el cron externo de GitHub Actions cada 5 minutos.
 */
export async function POST(request: Request) {
  const rejected = rejectIfBadCronSecret(request);
  if (rejected) return rejected;

  try {
    const result = await checkMatchScheduleNotifications();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
