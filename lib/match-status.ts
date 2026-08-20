import type { Timestamp } from "firebase/firestore";
import type { MatchDoc } from "./types";

export const SUBMISSION_CLOSE_BEFORE_KICKOFF_MS = 30 * 60 * 1000; // 30 minutos
export const REVEAL_BEFORE_KICKOFF_MS = 10 * 60 * 1000; // 10 minutos

export type DisplayStatus = "scheduled" | "locked" | "revealed" | "finished" | "cancelled" | "postponed";

export function getDisplayStatus(match: Pick<MatchDoc, "status" | "kickoff">, now: Date = new Date()): DisplayStatus {
  if (match.status === "finished" || match.status === "cancelled" || match.status === "postponed") {
    return match.status;
  }

  const kickoffMs = (match.kickoff as unknown as Timestamp).toMillis();
  const nowMs = now.getTime();

  if (nowMs >= kickoffMs - REVEAL_BEFORE_KICKOFF_MS) return "revealed";
  if (nowMs >= kickoffMs - SUBMISSION_CLOSE_BEFORE_KICKOFF_MS) return "locked";
  return "scheduled";
}
