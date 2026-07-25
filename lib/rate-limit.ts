import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";

const DEFAULT_MIN_INTERVAL_MS = 2000; // máx. ~30 requests/minuto por uid

export async function checkRateLimit(
  uid: string,
  minIntervalMs: number = DEFAULT_MIN_INTERVAL_MS,
): Promise<{ allowed: boolean }> {
  const db = adminDb();
  const ref = db.collection("rateLimits").doc(uid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Timestamp.now();

    if (snap.exists) {
      const lastRequestAt = snap.data()!.lastRequestAt as Timestamp;
      const elapsedMs = now.toMillis() - lastRequestAt.toMillis();
      if (elapsedMs < minIntervalMs) {
        return { allowed: false };
      }
    }

    tx.set(ref, { lastRequestAt: now });
    return { allowed: true };
  });
}
