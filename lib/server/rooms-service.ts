import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { generateRoomCode } from "./room-code";
import { MatchServiceError } from "./errors";
import { queueOutboxEvent } from "./outbox";

async function generateUniqueRoomCode(db: FirebaseFirestore.Firestore): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const existing = await db.collection("rooms").where("code", "==", code).get();
    if (existing.empty) return code;
  }
  throw new Error("No se pudo generar un código de sala único.");
}

export async function kickMemberService(
  db: FirebaseFirestore.Firestore,
  actorUid: string,
  actorIsResultsAdmin: boolean,
  roomId: string,
  kickedUid: string,
): Promise<{ newCode: string }> {
  const roomRef = db.collection("rooms").doc(roomId);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) {
    throw new MatchServiceError(404, "La sala no existe.");
  }

  const room = roomSnap.data()!;
  if (actorUid !== room.ownerUid && !actorIsResultsAdmin) {
    throw new MatchServiceError(
      403,
      "Solo el dueño de la sala o un admin de resultados puede expulsar miembros.",
    );
  }

  const memberRef = roomRef.collection("members").doc(kickedUid);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    throw new MatchServiceError(404, "Esa persona no es miembro de esta sala.");
  }

  const newCode = await generateUniqueRoomCode(db);

  const batch = db.batch();
  batch.delete(memberRef);
  batch.update(roomRef, {
    bannedUids: FieldValue.arrayUnion(kickedUid),
    code: newCode,
  });
  batch.set(db.collection("auditLog").doc(), {
    action: "member_kicked",
    performedBy: actorUid,
    performedAt: Timestamp.now(),
    targetType: "room",
    targetId: roomId,
    details: { kickedUid },
  });
  queueOutboxEvent(db, batch, "room.member_kicked", { roomId, kickedUid, performedBy: actorUid });
  await batch.commit();

  return { newCode };
}

export async function leaveRoomService(
  db: FirebaseFirestore.Firestore,
  actorUid: string,
  roomId: string,
): Promise<void> {
  const roomRef = db.collection("rooms").doc(roomId);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) {
    throw new MatchServiceError(404, "La sala no existe.");
  }

  const memberRef = roomRef.collection("members").doc(actorUid);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    throw new MatchServiceError(404, "No eres miembro de esta sala.");
  }

  const room = roomSnap.data()!;

  const batch = db.batch();
  batch.delete(memberRef);
  batch.set(db.collection("auditLog").doc(), {
    action: "member_left",
    performedBy: actorUid,
    performedAt: Timestamp.now(),
    targetType: "room",
    targetId: roomId,
    details: { uid: actorUid, wasOwner: room.ownerUid === actorUid },
  });
  await batch.commit();
}
