import type { Timestamp } from "firebase/firestore";

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
  uid: string; // duplicado del ID del doc: necesario para collectionGroup queries (ej. "mis salas", recálculo de ranking)
  displayName: string;
  joinedAt: Timestamp;
  totalPoints: number;
  exactCount: number;
  winnerCount: number;
}

export type MatchStatus = "scheduled" | "closed" | "finished" | "cancelled";

export interface MatchDoc {
  roomId: string; // el partido pertenece a esta sala; no es global
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
  | "bonus_points_added";

export interface AuditLogDoc {
  action: AuditAction;
  performedBy: string;
  performedAt: Timestamp;
  targetType: "match" | "room" | "system"; // "system" es para acciones globales como historical_data_imported
  targetId: string;
  details: Record<string, unknown>;
}
