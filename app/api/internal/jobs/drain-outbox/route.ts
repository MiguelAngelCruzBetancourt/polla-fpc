import { NextResponse } from "next/server";
import { rejectIfBadCronSecret } from "@/lib/server/cron-auth";
import { serviceErrorResponse } from "@/lib/server/http";
import { drainOutboxOnce } from "@/lib/server/outbox-drain-service";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Drena los eventos de negocio encolados en Firestore (outboxEvents) y despacha
 * las notificaciones push correspondientes. Lo dispara el cron externo de
 * GitHub Actions (.github/workflows/notifications-cron.yml) cada 5 minutos —
 * en Vercel no hay proceso persistente que pueda correr un setInterval.
 */
export async function POST(request: Request) {
  const rejected = rejectIfBadCronSecret(request);
  if (rejected) return rejected;

  try {
    const result = await drainOutboxOnce();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
