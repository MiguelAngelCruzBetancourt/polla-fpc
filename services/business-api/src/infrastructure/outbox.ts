import { Timestamp } from "firebase-admin/firestore";

/**
 * Outbox pattern minimalista sobre Firestore: en vez de llamar directo al
 * webhook de notifications-svc (que podría estar caído), business-api
 * encola el evento en su propia colección outboxEvents, en el mismo batch
 * que ya está escribiendo (ej. junto al auditLog de result_loaded).
 * notifications-svc drena esta colección con su propio cron.
 */
export function queueOutboxEvent(
  db: FirebaseFirestore.Firestore,
  batch: FirebaseFirestore.WriteBatch,
  type: string,
  payload: Record<string, unknown>,
): void {
  const ref = db.collection("outboxEvents").doc();
  batch.set(ref, {
    type,
    payload,
    createdAt: Timestamp.now(),
    processedAt: null,
  });
}
