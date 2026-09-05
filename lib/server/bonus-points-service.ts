import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { BonusRow } from "./bonus-points";
import { lookupUsersByEmail } from "./users-service";

export interface ResolvedBonusRow extends BonusRow {
  status: "ok" | "user_not_found" | "not_member" | "invalid_points";
  uid?: string;
  displayName?: string;
}

/**
 * Antes leía directo db.collection("users") (lib/bonus-points-service.ts del
 * monolito). Con la separación de servicios, "users" es propiedad exclusiva
 * de security-api, así que resolvemos email -> uid vía su endpoint interno.
 */
export async function resolveBonusRows(
  db: FirebaseFirestore.Firestore,
  roomId: string,
  rows: BonusRow[],
): Promise<ResolvedBonusRow[]> {
  const users = await lookupUsersByEmail(rows.map((r) => r.email));
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  const results: ResolvedBonusRow[] = [];

  for (const row of rows) {
    if (!Number.isInteger(row.points)) {
      results.push({ ...row, status: "invalid_points" });
      continue;
    }

    const match = byEmail.get(row.email.toLowerCase());
    if (!match) {
      results.push({ ...row, status: "user_not_found" });
      continue;
    }

    const memberSnap = await db
      .collection("rooms")
      .doc(roomId)
      .collection("members")
      .doc(match.uid)
      .get();

    if (!memberSnap.exists) {
      results.push({ ...row, status: "not_member", uid: match.uid, displayName: match.displayName });
      continue;
    }

    results.push({ ...row, status: "ok", uid: match.uid, displayName: match.displayName });
  }

  return results;
}

export async function applyBonusPoints(
  db: FirebaseFirestore.Firestore,
  actorUid: string,
  roomId: string,
  resolvedRows: ResolvedBonusRow[],
): Promise<{ applied: number }> {
  const okRows = resolvedRows.filter((r) => r.status === "ok");
  if (okRows.length === 0) return { applied: 0 };

  const now = Timestamp.now();
  const batch = db.batch();

  for (const row of okRows) {
    const memberRef = db.collection("rooms").doc(roomId).collection("members").doc(row.uid!);
    batch.update(memberRef, { totalPoints: FieldValue.increment(row.points) });
    batch.set(db.collection("auditLog").doc(), {
      action: "bonus_points_added",
      performedBy: actorUid,
      performedAt: now,
      targetType: "room",
      targetId: roomId,
      details: { uid: row.uid, email: row.email, pointsAdded: row.points },
    });
  }

  await batch.commit();
  return { applied: okRows.length };
}
