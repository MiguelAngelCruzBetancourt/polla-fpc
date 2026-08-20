import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { calcularPuntos } from "../domain/scoring";
import { MatchServiceError } from "../domain/errors";
import { queueOutboxEvent } from "../infrastructure/outbox";

const BATCH_CHUNK_SIZE = 400; // margen bajo el límite de 500 escrituras por batch de Firestore

async function commitInChunks(
  db: FirebaseFirestore.Firestore,
  operations: Array<(batch: FirebaseFirestore.WriteBatch) => void>,
) {
  for (let i = 0; i < operations.length; i += BATCH_CHUNK_SIZE) {
    const batch = db.batch();
    for (const op of operations.slice(i, i + BATCH_CHUNK_SIZE)) op(batch);
    await batch.commit();
  }
}

export interface MatchInput {
  jornada: number;
  homeTeam: string;
  awayTeam: string;
  kickoff: string; // ISO
}

export async function createMatchesService(
  db: FirebaseFirestore.Firestore,
  actorUid: string,
  roomId: string,
  matches: MatchInput[],
): Promise<{ matchIds: string[] }> {
  const now = Timestamp.now();
  const batch = db.batch();
  const createdIds: string[] = [];

  for (const match of matches) {
    const ref = db.collection("matches").doc();
    createdIds.push(ref.id);
    batch.set(ref, {
      roomId,
      jornada: match.jornada,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoff: Timestamp.fromDate(new Date(match.kickoff)),
      status: "scheduled",
      officialHomeScore: null,
      officialAwayScore: null,
      resultEnteredBy: null,
      resultLockedAt: null,
      createdBy: actorUid,
      createdAt: now,
      lastEditedBy: null,
      lastEditedAt: null,
      cancelledBy: null,
      cancelledAt: null,
      imported: null,
    });

    batch.set(db.collection("auditLog").doc(), {
      action: "match_created",
      performedBy: actorUid,
      performedAt: now,
      targetType: "match",
      targetId: ref.id,
      details: { homeTeam: match.homeTeam, awayTeam: match.awayTeam, kickoff: match.kickoff },
    });
  }

  await batch.commit();
  return { matchIds: createdIds };
}

export interface EditableMatchFields {
  homeTeam?: string;
  awayTeam?: string;
  kickoff?: string; // ISO
  jornada?: number;
}

export async function updateMatchService(
  db: FirebaseFirestore.Firestore,
  actorUid: string,
  matchId: string,
  fields: EditableMatchFields,
): Promise<{ changed: boolean }> {
  const matchRef = db.collection("matches").doc(matchId);
  const matchSnap = await matchRef.get();
  if (!matchSnap.exists) {
    throw new MatchServiceError(404, "El partido no existe.");
  }

  const match = matchSnap.data()!;
  if (match.status === "finished") {
    throw new MatchServiceError(409, "El partido ya está finalizado, no se puede editar.");
  }

  const now = Timestamp.now();
  const changes: Record<string, { oldValue: unknown; newValue: unknown }> = {};
  const update: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;

    if (key === "kickoff") {
      const newKickoff = Timestamp.fromDate(new Date(value as string));
      const oldKickoff = match.kickoff as Timestamp;
      if (Math.abs(newKickoff.toMillis() - oldKickoff.toMillis()) < 1000) continue;
      update.kickoff = newKickoff;
      changes.kickoff = { oldValue: oldKickoff.toDate().toISOString(), newValue: value };
      continue;
    }

    if (match[key] === value) continue;
    update[key] = value;
    changes[key] = { oldValue: match[key], newValue: value };
  }

  if (Object.keys(changes).length === 0) {
    return { changed: false };
  }

  update.lastEditedBy = actorUid;
  update.lastEditedAt = now;

  const batch = db.batch();
  batch.update(matchRef, update);
  batch.set(db.collection("auditLog").doc(), {
    action: "match_edited",
    performedBy: actorUid,
    performedAt: now,
    targetType: "match",
    targetId: matchId,
    details: changes,
  });
  await batch.commit();

  return { changed: true };
}

export async function cancelMatchService(
  db: FirebaseFirestore.Firestore,
  actorUid: string,
  matchId: string,
): Promise<void> {
  const matchRef = db.collection("matches").doc(matchId);
  const matchSnap = await matchRef.get();
  if (!matchSnap.exists) {
    throw new MatchServiceError(404, "El partido no existe.");
  }

  const match = matchSnap.data()!;
  if (match.status === "finished") {
    throw new MatchServiceError(409, "El partido ya está finalizado, no se puede cancelar.");
  }

  const now = Timestamp.now();
  const batch = db.batch();
  batch.update(matchRef, {
    status: "cancelled",
    cancelledBy: actorUid,
    cancelledAt: now,
  });
  batch.set(db.collection("auditLog").doc(), {
    action: "match_cancelled",
    performedBy: actorUid,
    performedAt: now,
    targetType: "match",
    targetId: matchId,
    details: {},
  });
  await batch.commit();
}

export async function postponeMatchService(
  db: FirebaseFirestore.Firestore,
  actorUid: string,
  matchId: string,
): Promise<{ predictionsDeleted: number }> {
  const matchRef = db.collection("matches").doc(matchId);
  const matchSnap = await matchRef.get();
  if (!matchSnap.exists) {
    throw new MatchServiceError(404, "El partido no existe.");
  }

  const match = matchSnap.data()!;
  if (match.status === "finished" || match.status === "cancelled") {
    throw new MatchServiceError(409, "El partido ya está finalizado o cancelado, no se puede aplazar.");
  }
  if (match.status === "postponed") {
    throw new MatchServiceError(409, "El partido ya está aplazado.");
  }

  const now = Timestamp.now();

  // Borra todos los pronósticos huérfanos del partido — evita que quede
  // "atascado" en scheduled con data de muestra que nunca se calificará
  // (ver Prompt de auditoría: partidos aplazados en la vida real que nunca
  // recibieron resultado oficial).
  const predictionsSnap = await db.collection("predictions").where("matchId", "==", matchId).get();
  const deleteOps: Array<(batch: FirebaseFirestore.WriteBatch) => void> = predictionsSnap.docs.map(
    (doc) => (batch) => batch.delete(doc.ref),
  );
  await commitInChunks(db, deleteOps);

  const batch = db.batch();
  batch.update(matchRef, {
    status: "postponed",
    lastEditedBy: actorUid,
    lastEditedAt: now,
  });
  batch.set(db.collection("auditLog").doc(), {
    action: "match_postponed",
    performedBy: actorUid,
    performedAt: now,
    targetType: "match",
    targetId: matchId,
    details: { predictionsDeleted: predictionsSnap.size },
  });
  await batch.commit();

  return { predictionsDeleted: predictionsSnap.size };
}

export async function rescheduleMatchService(
  db: FirebaseFirestore.Firestore,
  actorUid: string,
  matchId: string,
  kickoff: string, // ISO
): Promise<void> {
  const matchRef = db.collection("matches").doc(matchId);
  const matchSnap = await matchRef.get();
  if (!matchSnap.exists) {
    throw new MatchServiceError(404, "El partido no existe.");
  }

  const match = matchSnap.data()!;
  if (match.status !== "postponed") {
    throw new MatchServiceError(409, "Solo se puede reprogramar un partido aplazado.");
  }

  const now = Timestamp.now();
  const newKickoff = Timestamp.fromDate(new Date(kickoff));

  const batch = db.batch();
  batch.update(matchRef, {
    status: "scheduled",
    kickoff: newKickoff,
    lastEditedBy: actorUid,
    lastEditedAt: now,
  });
  batch.set(db.collection("auditLog").doc(), {
    action: "match_rescheduled",
    performedBy: actorUid,
    performedAt: now,
    targetType: "match",
    targetId: matchId,
    details: { newKickoff: kickoff },
  });
  await batch.commit();
}

export async function gradeMatchResultService(
  db: FirebaseFirestore.Firestore,
  actorUid: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<{ predictionsGraded: number }> {
  const matchRef = db.collection("matches").doc(matchId);
  const matchSnap = await matchRef.get();
  if (!matchSnap.exists) {
    throw new MatchServiceError(404, "El partido no existe.");
  }

  const match = matchSnap.data()!;
  if (match.status === "finished" || match.status === "cancelled") {
    throw new MatchServiceError(409, "El partido ya está finalizado o cancelado.");
  }

  const now = Timestamp.now();
  const resultado = { homeScore, awayScore };

  await matchRef.update({
    officialHomeScore: resultado.homeScore,
    officialAwayScore: resultado.awayScore,
    status: "finished",
    resultEnteredBy: actorUid,
    resultLockedAt: now,
  });

  const predictionsSnap = await db.collection("predictions").where("matchId", "==", matchId).get();

  const predictionOps: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  const memberIncrements = new Map<
    string,
    { totalPoints: number; exactCount: number; winnerCount: number }
  >();

  for (const predictionDoc of predictionsSnap.docs) {
    const prediction = predictionDoc.data();
    const points = calcularPuntos(
      { homeScore: prediction.homeScore, awayScore: prediction.awayScore },
      resultado,
    );
    predictionOps.push((batch) => batch.update(predictionDoc.ref, { points }));

    const current = memberIncrements.get(prediction.uid) ?? {
      totalPoints: 0,
      exactCount: 0,
      winnerCount: 0,
    };
    current.totalPoints += points;
    if (points === 5) current.exactCount += 1;
    if (points === 3) current.winnerCount += 1;
    memberIncrements.set(prediction.uid, current);
  }

  await commitInChunks(db, predictionOps);

  // Lectura en paralelo (en vez de un .get() secuencial por miembro dentro
  // del for...of) — reduce latencia/contención en salas con muchos
  // pronósticos. Sigue siendo N lecturas de cuota, solo cambia que no son
  // seriales.
  const memberUids = [...memberIncrements.keys()];
  const memberRefs = memberUids.map((uid) =>
    db.collection("rooms").doc(match.roomId).collection("members").doc(uid),
  );
  const memberSnaps = memberRefs.length > 0 ? await db.getAll(...memberRefs) : [];

  const memberUpdateOps: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  memberSnaps.forEach((memberSnap, i) => {
    if (!memberSnap.exists) return;
    const increment = memberIncrements.get(memberUids[i]!)!;
    memberUpdateOps.push((batch) => {
      batch.update(memberSnap.ref, {
        totalPoints: FieldValue.increment(increment.totalPoints),
        exactCount: FieldValue.increment(increment.exactCount),
        winnerCount: FieldValue.increment(increment.winnerCount),
      });
    });
  });
  await commitInChunks(db, memberUpdateOps);

  const auditBatch = db.batch();
  auditBatch.set(db.collection("auditLog").doc(), {
    action: "result_loaded",
    performedBy: actorUid,
    performedAt: now,
    targetType: "match",
    targetId: matchId,
    details: { ...resultado, predictionsGraded: predictionsSnap.size },
  });
  // Notifica a notifications-svc vía outbox — ver Fase 1 del plan de migración.
  queueOutboxEvent(db, auditBatch, "match.result_loaded", {
    matchId,
    roomId: match.roomId,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: resultado.homeScore,
    awayScore: resultado.awayScore,
  });
  await auditBatch.commit();

  return { predictionsGraded: predictionsSnap.size };
}
