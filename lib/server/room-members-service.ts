import { adminDb } from "@/lib/firebase-admin";

// Lectura de solo lectura a "rooms/{roomId}/members", propiedad de
// business-api — permitido bajo el principio "single writer", que solo
// restringe escrituras (mismo patrón ya usado para leer "predictions").
export async function getRoomMemberUids(roomId: string): Promise<string[]> {
  const snap = await adminDb().collection("rooms").doc(roomId).collection("members").get();
  return snap.docs.map((doc) => doc.id);
}
