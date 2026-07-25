import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { SUBMISSION_CLOSE_BEFORE_KICKOFF_MS } from "@/lib/match-status";
import { checkRateLimit } from "@/lib/rate-limit";
import { predictionSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(auth.uid);
  if (!allowed) {
    return NextResponse.json({ error: "Estás enviando solicitudes demasiado rápido." }, { status: 429 });
  }

  const parsed = predictionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { matchId, homeScore, awayScore } = parsed.data;
  const db = adminDb();

  const matchSnap = await db.collection("matches").doc(matchId).get();
  if (!matchSnap.exists) {
    return NextResponse.json({ error: "El partido no existe." }, { status: 404 });
  }

  const match = matchSnap.data()!;
  if (match.status !== "scheduled") {
    return NextResponse.json({ error: "Este partido ya no acepta pronósticos." }, { status: 409 });
  }

  const kickoff = (match.kickoff as Timestamp).toMillis();
  if (Date.now() >= kickoff - SUBMISSION_CLOSE_BEFORE_KICKOFF_MS) {
    return NextResponse.json({ error: "Ya pasó la hora límite para pronosticar." }, { status: 409 });
  }

  const predictionId = `${matchId}_${auth.uid}`;
  const predictionRef = db.collection("predictions").doc(predictionId);
  const existing = await predictionRef.get();
  if (existing.exists) {
    return NextResponse.json({ error: "Ya enviaste tu pronóstico para este partido." }, { status: 409 });
  }

  try {
    // .create() (en vez de .set()) rechaza si el doc ya existe — defensa extra contra
    // una carrera entre el chequeo de arriba y esta escritura.
    await predictionRef.create({
      matchId,
      uid: auth.uid,
      homeScore,
      awayScore,
      submittedAt: Timestamp.now(),
      points: null,
      imported: null,
    });
  } catch {
    return NextResponse.json({ error: "Ya enviaste tu pronóstico para este partido." }, { status: 409 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
