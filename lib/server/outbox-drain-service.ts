import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { dispatchEvent } from "./notification-service";

const BATCH_LIMIT = 25;

/**
 * Drena los eventos encolados por lib/server/outbox.ts::queueOutboxEvent.
 * En local se llama desde un setInterval en server.ts (ver USE_EXTERNAL_SCHEDULER).
 * En producción, un cron externo (GitHub Actions) golpea
 * POST /internal/outbox/drain-now (protegido por CRON_SECRET), que invoca
 * esta misma función.
 */
export async function drainOutboxOnce(): Promise<{ processed: number; failed: number }> {
  // Nota: esta combinación where(processedAt) + orderBy(createdAt) necesita un
  // índice compuesto en Firestore real (el emulador no lo exige). Agregar a
  // firestore.indexes.json cuando se despliegue este servicio de verdad —
  // no se toca ese archivo compartido en esta etapa de scaffold local.
  const snap = await adminDb()
    .collection("outboxEvents")
    .where("processedAt", "==", null)
    .orderBy("createdAt", "asc")
    .limit(BATCH_LIMIT)
    .get();

  let processed = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const { type, payload } = doc.data() as { type: string; payload: Record<string, unknown> };
    try {
      await dispatchEvent(type, payload);
      await doc.ref.update({ processedAt: Timestamp.now() });
      processed += 1;
    } catch (err) {
      console.error(`[notifications-svc] error procesando evento ${doc.id} (${type}):`, err);
      failed += 1;
    }
  }

  return { processed, failed };
}
