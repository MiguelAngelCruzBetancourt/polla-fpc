import { Timestamp } from "firebase-admin/firestore";
import {
  PREDICTION_REMINDER_BEFORE_KICKOFF_MS,
  REVEAL_BEFORE_KICKOFF_MS,
} from "@polla-fpc/shared-types";
import { adminDb } from "../infrastructure/firebase-admin";
import { getRoomMemberUids } from "./room-members-service";
import { markNotificationSent, wasNotificationSent } from "./notification-log-service";
import { notifyPredictionReminder, notifyPredictionsAvailable } from "./notification-service";

const PREDICTION_REMINDER_TYPE = "prediction_reminder";
const PREDICTIONS_AVAILABLE_TYPE = "predictions_available";

interface UpcomingMatch {
  id: string;
  roomId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffMs: number;
}

/**
 * Revisa los partidos programados próximos a iniciar y dispara, a lo sumo una
 * vez por partido (ver notification-log-service), el recordatorio de
 * pronóstico (1h antes) y el aviso de pronósticos disponibles (10min antes) —
 * eventos disparados por tiempo, no por una acción de negocio puntual, por
 * eso se resuelven acá con un chequeo periódico en vez del mecanismo de outbox.
 */
const STALE_MATCH_FLOOR_MS = 24 * 60 * 60 * 1000; // 24 horas

export async function checkMatchScheduleNotifications(): Promise<void> {
  const now = Date.now();
  const horizon = Timestamp.fromMillis(now + PREDICTION_REMINDER_BEFORE_KICKOFF_MS);
  // Partidos con kickoff más antiguo que esto ya deberían haber sido
  // calificados, cancelados o aplazados por un admin — no tiene sentido
  // seguir escaneándolos en cada tick. Sin esta cota, un partido que queda
  // huérfano en "scheduled" (ej. aplazado en la vida real sin resolver acá)
  // se re-lee para siempre, cada minuto, agregando presión de lectura
  // innecesaria a Firestore.
  const staleFloor = Timestamp.fromMillis(now - STALE_MATCH_FLOOR_MS);

  // Nota: igual que con outboxEvents, esta combinación (status== + kickoff<=)
  // puede pedir un índice compuesto en Firestore real — el emulador no lo exige.
  const snap = await adminDb()
    .collection("matches")
    .where("status", "==", "scheduled")
    .where("kickoff", ">=", staleFloor)
    .where("kickoff", "<=", horizon)
    .get();

  const matches: UpcomingMatch[] = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      roomId: data.roomId as string,
      homeTeam: data.homeTeam as string,
      awayTeam: data.awayTeam as string,
      kickoffMs: (data.kickoff as Timestamp).toMillis(),
    };
  });

  for (const match of matches) {
    const msUntilKickoff = match.kickoffMs - now;
    await Promise.all([
      maybeSendPredictionReminder(match, msUntilKickoff),
      maybeSendPredictionsAvailable(match, msUntilKickoff),
    ]);
  }
}

async function maybeSendPredictionReminder(match: UpcomingMatch, msUntilKickoff: number): Promise<void> {
  if (msUntilKickoff > PREDICTION_REMINDER_BEFORE_KICKOFF_MS) return;
  if (await wasNotificationSent(match.id, PREDICTION_REMINDER_TYPE)) return;

  const memberUids = await getRoomMemberUids(match.roomId);
  const predictedUids = await getUidsWithPrediction(match.id);
  // Preferible no notificar a quien ya pronosticó (opción elegida en el requerimiento).
  const pendingUids = memberUids.filter((uid) => !predictedUids.has(uid));

  if (pendingUids.length > 0) {
    await notifyPredictionReminder(match, pendingUids);
  }
  await markNotificationSent(match.id, PREDICTION_REMINDER_TYPE);
}

async function maybeSendPredictionsAvailable(match: UpcomingMatch, msUntilKickoff: number): Promise<void> {
  if (msUntilKickoff > REVEAL_BEFORE_KICKOFF_MS) return;
  if (await wasNotificationSent(match.id, PREDICTIONS_AVAILABLE_TYPE)) return;

  const memberUids = await getRoomMemberUids(match.roomId);
  if (memberUids.length > 0) {
    await notifyPredictionsAvailable(match, memberUids);
  }
  await markNotificationSent(match.id, PREDICTIONS_AVAILABLE_TYPE);
}

async function getUidsWithPrediction(matchId: string): Promise<Set<string>> {
  const snap = await adminDb().collection("predictions").where("matchId", "==", matchId).get();
  return new Set(snap.docs.map((doc) => doc.data().uid as string));
}
