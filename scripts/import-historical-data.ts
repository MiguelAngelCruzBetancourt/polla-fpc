/**
 * Migración de una sola vez: carga partidos y pronósticos jugados antes de tener la app,
 * desde un archivo historico.xlsx (hojas "partidos" y "pronosticos"). Ver sección 18 del spec.
 *
 * Prerrequisito: todas las personas del Excel ya deben tener cuenta creada (con su `username`)
 * y estar unidas a su sala correspondiente.
 *
 * Contra producción (usa las credenciales reales de .env.local):
 *   npx tsx --env-file=.env.local scripts/import-historical-data.ts <ruta-historico.xlsx> <uid-del-admin> [--dry-run]
 *
 * Contra el emulador, exporta antes:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
 *   FIREBASE_ADMIN_PROJECT_ID=pollabetplay
 *   npx tsx scripts/import-historical-data.ts <ruta-historico.xlsx> <uid-del-admin> [--dry-run]
 */
import { readFileSync } from "node:fs";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as XLSX from "xlsx";
import { adminDb } from "../lib/firebase-admin";
import { sortMembers } from "../lib/ranking";
import { calcularPuntos } from "../lib/scoring";
import type { RoomMemberDoc } from "../lib/types";

const COLOMBIA_UTC_OFFSET = "-05:00";
const BATCH_CHUNK_SIZE = 400;

interface PartidoRow {
  partido_id: string;
  jornada: number;
  equipo_local: string;
  equipo_visitante: string;
  fecha: string; // AAAA-MM-DD
  hora: string; // HH:MM
  marcador_local: number;
  marcador_visitante: number;
}

interface PronosticoRow {
  partido_id: string;
  username: string;
  pronostico_local: number;
  pronostico_visitante: number;
}

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

async function main() {
  const filePath = process.argv[2];
  const adminUid = process.argv[3];
  const dryRun = process.argv.includes("--dry-run");

  if (!filePath || !adminUid) {
    console.error(
      "Uso: npx tsx scripts/import-historical-data.ts <ruta-historico.xlsx> <uid-del-admin> [--dry-run]",
    );
    process.exit(1);
  }

  const workbook = XLSX.read(readFileSync(filePath));
  const partidosSheet = workbook.Sheets["partidos"];
  const pronosticosSheet = workbook.Sheets["pronosticos"];
  if (!partidosSheet || !pronosticosSheet) {
    console.error('El archivo debe tener las hojas "partidos" y "pronosticos".');
    process.exit(1);
  }

  const partidos = XLSX.utils.sheet_to_json<PartidoRow>(partidosSheet);
  const pronosticos = XLSX.utils.sheet_to_json<PronosticoRow>(pronosticosSheet);

  // --- Validación: nada se escribe hasta que todo pase ---
  const errors: string[] = [];

  const partidoIds = new Set<string>();
  for (const p of partidos) {
    if (partidoIds.has(p.partido_id)) {
      errors.push(`partido_id duplicado en 'partidos': ${p.partido_id}`);
    }
    partidoIds.add(p.partido_id);
  }

  const seenPairs = new Set<string>();
  for (const row of pronosticos) {
    if (!partidoIds.has(row.partido_id)) {
      errors.push(
        `pronostico referencia un partido_id inexistente: ${row.partido_id} (username: ${row.username})`,
      );
    }
    const key = `${row.partido_id}::${row.username.trim().toLowerCase()}`;
    if (seenPairs.has(key)) {
      errors.push(`par partido_id+username duplicado: ${row.partido_id} / ${row.username}`);
    }
    seenPairs.add(key);
  }

  const db = adminDb();
  const uidByUsername = new Map<string, string>();
  const uniqueUsernames = new Set(pronosticos.map((r) => r.username.trim().toLowerCase()));
  for (const username of uniqueUsernames) {
    const snap = await db.collection("usernames").doc(username).get();
    if (!snap.exists) {
      errors.push(`username no registrado: ${username}`);
    } else {
      uidByUsername.set(username, snap.data()!.uid);
    }
  }

  if (errors.length > 0) {
    console.error(`\nSe encontraron ${errors.length} error(es). No se escribió nada:\n`);
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }

  console.log(`Validación OK: ${partidos.length} partidos, ${pronosticos.length} pronósticos.`);
  if (dryRun) {
    console.log("Modo --dry-run: no se escribió nada.");
    return;
  }

  // --- Escritura: partidos ---
  const now = Timestamp.now();
  const kickoffByPartidoId = new Map<string, Timestamp>();
  const matchOps: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];

  for (const p of partidos) {
    const kickoff = Timestamp.fromDate(new Date(`${p.fecha}T${p.hora}:00${COLOMBIA_UTC_OFFSET}`));
    kickoffByPartidoId.set(p.partido_id, kickoff);

    matchOps.push((batch) => {
      batch.set(db.collection("matches").doc(p.partido_id), {
        jornada: p.jornada,
        homeTeam: p.equipo_local,
        awayTeam: p.equipo_visitante,
        kickoff,
        status: "finished",
        officialHomeScore: p.marcador_local,
        officialAwayScore: p.marcador_visitante,
        resultEnteredBy: adminUid,
        resultLockedAt: now,
        createdBy: adminUid,
        createdAt: now,
        lastEditedBy: null,
        lastEditedAt: null,
        cancelledBy: null,
        cancelledAt: null,
        imported: true,
      });
    });
  }
  await commitInChunks(db, matchOps);
  console.log(`${partidos.length} partido(s) importado(s).`);

  // --- Escritura: pronósticos + cálculo de puntos ---
  const predictionOps: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  const pointsByUid = new Map<string, { totalPoints: number; exactCount: number; winnerCount: number }>();

  for (const row of pronosticos) {
    const uid = uidByUsername.get(row.username.trim().toLowerCase())!;
    const partido = partidos.find((p) => p.partido_id === row.partido_id)!;
    const points = calcularPuntos(
      { homeScore: row.pronostico_local, awayScore: row.pronostico_visitante },
      { homeScore: partido.marcador_local, awayScore: partido.marcador_visitante },
    );

    predictionOps.push((batch) => {
      batch.set(db.collection("predictions").doc(`${row.partido_id}_${uid}`), {
        matchId: row.partido_id,
        uid,
        homeScore: row.pronostico_local,
        awayScore: row.pronostico_visitante,
        submittedAt: kickoffByPartidoId.get(row.partido_id)!,
        points,
        imported: true,
      });
    });

    const acc = pointsByUid.get(uid) ?? { totalPoints: 0, exactCount: 0, winnerCount: 0 };
    acc.totalPoints += points;
    if (points === 5) acc.exactCount += 1;
    if (points === 3) acc.winnerCount += 1;
    pointsByUid.set(uid, acc);
  }
  await commitInChunks(db, predictionOps);
  console.log(`${pronosticos.length} pronóstico(s) importado(s) y calificado(s).`);

  // --- Acumular en el ranking de cada sala donde participe cada persona ---
  const memberOps: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  const affectedRoomIds = new Set<string>();

  for (const [uid, increment] of pointsByUid) {
    const memberDocs = await db.collectionGroup("members").where("uid", "==", uid).get();
    for (const memberDoc of memberDocs.docs) {
      affectedRoomIds.add(memberDoc.ref.parent.parent!.id);
      memberOps.push((batch) => {
        batch.update(memberDoc.ref, {
          totalPoints: FieldValue.increment(increment.totalPoints),
          exactCount: FieldValue.increment(increment.exactCount),
          winnerCount: FieldValue.increment(increment.winnerCount),
        });
      });
    }
  }
  await commitInChunks(db, memberOps);

  await db.collection("auditLog").add({
    action: "historical_data_imported",
    performedBy: adminUid,
    performedAt: now,
    targetType: "system",
    targetId: filePath,
    details: { partidos: partidos.length, pronosticos: pronosticos.length },
  });

  // --- Reporte: ranking recalculado por sala, para comparar manualmente contra el Excel/planilla anterior ---
  console.log("\n--- Ranking recalculado tras la migración (compáralo contra tu Excel anterior) ---");
  for (const roomId of affectedRoomIds) {
    const roomSnap = await db.collection("rooms").doc(roomId).get();
    const membersSnap = await db.collection("rooms").doc(roomId).collection("members").get();
    const members = sortMembers(membersSnap.docs.map((d) => d.data() as RoomMemberDoc));

    console.log(`\nSala: ${roomSnap.data()?.name ?? roomId}`);
    members.forEach((m, i) => {
      console.log(
        `  ${i + 1}. ${m.displayName} — ${m.totalPoints} pts (exactos: ${m.exactCount}, ganadores: ${m.winnerCount})`,
      );
    });
  }

  console.log("\nMigración completa.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
