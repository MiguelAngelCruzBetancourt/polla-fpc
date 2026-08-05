import { Timestamp } from "firebase-admin/firestore";
import { MatchServiceError } from "../domain/errors";
import { SUBMISSION_CLOSE_BEFORE_KICKOFF_MS } from "../domain/match-status";

export interface SubmitPredictionInput {
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export async function submitPredictionService(
  db: FirebaseFirestore.Firestore,
  actorUid: string,
  input: SubmitPredictionInput,
): Promise<void> {
  const matchSnap = await db.collection("matches").doc(input.matchId).get();
  if (!matchSnap.exists) {
    throw new MatchServiceError(404, "El partido no existe.");
  }

  const match = matchSnap.data()!;
  if (match.status !== "scheduled") {
    throw new MatchServiceError(409, "Este partido ya no acepta pronósticos.");
  }

  const kickoff = (match.kickoff as Timestamp).toMillis();
  if (Date.now() >= kickoff - SUBMISSION_CLOSE_BEFORE_KICKOFF_MS) {
    throw new MatchServiceError(409, "Ya pasó la hora límite para pronosticar.");
  }

  const predictionId = `${input.matchId}_${actorUid}`;
  await db
    .collection("predictions")
    .doc(predictionId)
    .set({
      matchId: input.matchId,
      uid: actorUid,
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      submittedAt: Timestamp.now(),
      points: null,
      imported: null,
    });
}
