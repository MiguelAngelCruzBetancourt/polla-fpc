import { adminDb, adminMessaging } from "../infrastructure/firebase-admin";
import type { PushMessage } from "../domain/events";
import { listTokensForUid, removeDevice } from "./device-service";
import { getRoomMemberUids } from "./room-members-service";

type EventHandler = (payload: Record<string, unknown>) => Promise<PushMessage[]>;

// Patrón open/closed: agregar un tipo de evento nuevo es agregar una entrada
// acá, sin tocar el resto del servicio (drenaje de outbox, envío FCM, etc.).
const handlers: Record<string, EventHandler> = {
  "match.result_loaded": async (payload) => {
    const { roomId, homeTeam, awayTeam, homeScore, awayScore } = payload as {
      roomId: string;
      homeTeam: string;
      awayTeam: string;
      homeScore: number;
      awayScore: number;
    };

    // A toda la sala, no solo a quienes pronosticaron ese partido — la tabla
    // de posiciones que se actualiza es de toda la sala.
    const uids = await getRoomMemberUids(roomId);

    const title = "Final del partido";
    const body = `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}. Ya puedes ver la tabla de posiciones actualizada.`;
    return uids.map((uid) => ({ uid, title, body }));
  },

  "room.member_kicked": async (payload) => {
    const { kickedUid } = payload as { kickedUid: string };
    return [
      {
        uid: kickedUid,
        title: "Saliste de la sala",
        body: "Un administrador te expulsó de la sala.",
      },
    ];
  },
};

export async function dispatchEvent(type: string, payload: Record<string, unknown>): Promise<void> {
  const handler = handlers[type];
  if (!handler) {
    console.warn(`[notifications-svc] no hay handler para el evento "${type}", se ignora.`);
    return;
  }

  const messages = await handler(payload);
  await Promise.all(messages.map(sendPushToUid));
}

interface MatchSummary {
  homeTeam: string;
  awayTeam: string;
}

/**
 * Disparado por match-schedule-service (chequeo por tiempo, no por outbox) 1h
 * antes del kickoff, solo a quienes todavía no pronosticaron ese partido.
 */
export async function notifyPredictionReminder(match: MatchSummary, uids: string[]): Promise<void> {
  const title = "⏰ Falta una hora para el partido";
  const body = `Recuerda realizar tu pronóstico para ${match.homeTeam} vs ${match.awayTeam} antes de que el plazo cierre.`;
  await Promise.all(uids.map((uid) => sendPushToUid({ uid, title, body })));
}

/**
 * Disparado por match-schedule-service 10 minutos antes del kickoff, a toda
 * la sala. No incluye los pronósticos en sí, solo avisa que ya se pueden ver.
 */
export async function notifyPredictionsAvailable(match: MatchSummary, uids: string[]): Promise<void> {
  const title = "👀 Pronósticos disponibles";
  const body = `Los pronósticos de todos los participantes para ${match.homeTeam} vs ${match.awayTeam} ya están disponibles. Entra a la app para verlos.`;
  await Promise.all(uids.map((uid) => sendPushToUid({ uid, title, body })));
}

async function sendPushToUid(message: PushMessage): Promise<void> {
  const tokens = await listTokensForUid(message.uid);
  if (tokens.length === 0) return;

  const response = await adminMessaging().sendEachForMulticast({
    tokens,
    notification: { title: message.title, body: message.body },
  });

  // Limpieza: si FCM dice que un token ya no es válido, se elimina para no
  // reintentar indefinidamente contra un dispositivo que desinstaló la PWA.
  await Promise.all(
    response.responses.map(async (resp, i) => {
      if (!resp.success && isUnregisteredError(resp.error?.code)) {
        const tokenId = await findTokenId(message.uid, tokens[i]!);
        if (tokenId) await removeDevice(message.uid, tokenId);
      }
    }),
  );
}

async function findTokenId(uid: string, token: string): Promise<string | null> {
  const snap = await adminDb()
    .collection("notificationDevices")
    .doc(uid)
    .collection("tokens")
    .where("token", "==", token)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0]!.id;
}

function isUnregisteredError(code: string | undefined): boolean {
  return code === "messaging/registration-token-not-registered";
}
