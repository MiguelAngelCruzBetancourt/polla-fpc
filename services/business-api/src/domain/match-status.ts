import type { Timestamp } from "firebase-admin/firestore";
import {
  REVEAL_BEFORE_KICKOFF_MS,
  SUBMISSION_CLOSE_BEFORE_KICKOFF_MS,
  type MatchDoc,
} from "@polla-fpc/shared-types";

export { REVEAL_BEFORE_KICKOFF_MS, SUBMISSION_CLOSE_BEFORE_KICKOFF_MS };

export type DisplayStatus = "scheduled" | "locked" | "revealed" | "finished" | "cancelled";

export function getDisplayStatus(
  match: Pick<MatchDoc, "status" | "kickoff">,
  now: Date = new Date(),
): DisplayStatus {
  if (match.status === "finished" || match.status === "cancelled") return match.status;

  const kickoffMs = (match.kickoff as unknown as Timestamp).toMillis();
  const nowMs = now.getTime();

  if (nowMs >= kickoffMs - REVEAL_BEFORE_KICKOFF_MS) return "revealed";
  if (nowMs >= kickoffMs - SUBMISSION_CLOSE_BEFORE_KICKOFF_MS) return "locked";
  return "scheduled";
}
