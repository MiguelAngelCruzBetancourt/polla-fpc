import { adminDb, adminMessaging } from "../infrastructure/firebase-admin";
import type { PushMessage } from "../domain/events";
import { listTokensForUid, removeDevice } from "./device-service";

type EventHandler = (payload: Record<string, unknown>) => Promise<PushMessage[]>;

// Patrón open/closed: agregar un tipo de evento nuevo es agregar una entrada
// acá, sin tocar el resto del servicio (drenaje de outbox, envío FCM, etc.).
const handlers: Record<string, EventHandler> = {
  "match.result_loaded": async (payload) => {
    const { matchId, homeTeam, awayTeam, homeScore, awayScore } = payload as {
      matchId: string;
      homeTeam: string;
      awayTeam: string;
      homeScore: number;
      awayScore: number;
    };

    // Lectura de solo lectura a "predictions", propiedad de business-api —
    // permitido bajo el principio "single writer", que solo restringe escrituras.
    const predictionsSnap = await adminDb().collection("predictions").where("matchId", "==", matchId).get();
    const uids = new Set(predictionsSnap.docs.map((doc) => doc.data().uid as string));

    const title = "Resultado cargado";
    const body = `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;
    return [...uids].map((uid) => ({ uid, title, body }));
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
