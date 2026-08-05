import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../infrastructure/firebase-admin";

const COLLECTION = "liveMatchesCache";

/** Evita golpear business-api de nuevo si el marcador no cambió desde el último poll. */
export async function hasScoreChanged(
  externalMatchId: string,
  homeScore: number,
  awayScore: number,
): Promise<boolean> {
  const ref = adminDb().collection(COLLECTION).doc(externalMatchId);
  const snap = await ref.get();

  if (snap.exists) {
    const data = snap.data()!;
    if (data.homeScore === homeScore && data.awayScore === awayScore) {
      return false;
    }
  }

  await ref.set({ homeScore, awayScore, updatedAt: Timestamp.now() });
  return true;
}
