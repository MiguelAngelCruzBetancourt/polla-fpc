import type { Timestamp } from "firebase-admin/firestore";

export interface UserDoc {
  displayName: string;
  username: string;
  email: string;
  createdAt: Timestamp;
}

export interface UsernameDoc {
  uid: string;
}

export type RoomStatus = "open" | "locked";

export interface RoomDoc {
  name: string;
  code: string;
  ownerUid: string;
  championship: string;
  createdAt: Timestamp;
  status: RoomStatus;
  bannedUids: string[];
}

export interface RoomMemberDoc {
  uid: string;
  displayName: string;
  joinedAt: Timestamp;
  totalPoints: number;
  exactCount: number;
  winnerCount: number;
}

export type MatchStatus = "scheduled" | "closed" | "finished" | "cancelled";

export interface MatchDoc {
  roomId: string;
  jornada: number;
  homeTeam: string;
  awayTeam: string;
  kickoff: Timestamp;
  status: MatchStatus;
  officialHomeScore: number | null;
  officialAwayScore: number | null;
  resultEnteredBy: string | null;
  resultLockedAt: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
  lastEditedBy: string | null;
  lastEditedAt: Timestamp | null;
  cancelledBy: string | null;
  cancelledAt: Timestamp | null;
  imported: boolean | null;
  // Alimentado por live-matches-svc; nunca por el flujo manual de calificación.
  liveHomeScore: number | null;
  liveAwayScore: number | null;
  liveUpdatedAt: Timestamp | null;
}

export interface PredictionDoc {
  matchId: string;
  uid: string;
  homeScore: number;
  awayScore: number;
  submittedAt: Timestamp;
  points: number | null;
  imported: boolean | null;
}

export type AuditAction =
  | "match_created"
  | "match_edited"
  | "match_cancelled"
  | "result_loaded"
  | "member_kicked"
  | "member_left"
  | "room_code_regenerated"
  | "historical_data_imported"
  | "bonus_points_added"
  | "role_changed";

export interface AuditLogDoc {
  action: AuditAction;
  performedBy: string;
  performedAt: Timestamp;
  targetType: "match" | "room" | "system";
  targetId: string;
  details: Record<string, unknown>;
}
