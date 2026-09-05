import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

// Colección propia notificationLog — ledger de deduplicación: garantiza que un
// tipo de notificación no se envíe más de una vez para el mismo partido, sin
// importar cuántas veces pase el scheduler por ese partido.
function docId(matchId: string, type: string): string {
  return `${matchId}_${type}`;
}

export async function wasNotificationSent(matchId: string, type: string): Promise<boolean> {
  const snap = await adminDb().collection("notificationLog").doc(docId(matchId, type)).get();
  return snap.exists;
}

export async function markNotificationSent(matchId: string, type: string): Promise<void> {
  await adminDb()
    .collection("notificationLog")
    .doc(docId(matchId, type))
    .set({ matchId, type, sentAt: Timestamp.now() });
}
