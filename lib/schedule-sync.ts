import {
  createMatchesService,
  gradeMatchResultService,
  updateMatchService,
} from "./matches-service";
import type { SheetRow } from "./schedule-sheet";
import { SYSTEM_ACTOR_UID } from "./sync-constants";

export { SYSTEM_ACTOR_UID };

export interface SyncSummary {
  created: number;
  kickoffUpdated: number;
  pendingDetected: number;
  graded: number;
  conflicts: string[];
  warnings: string[];
  errors: string[];
}

function teamPairKey(homeTeam: string, awayTeam: string): string {
  return `${homeTeam}::${awayTeam}`;
}

export async function runScheduleSync(
  db: FirebaseFirestore.Firestore,
  rows: SheetRow[],
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    created: 0,
    kickoffUpdated: 0,
    pendingDetected: 0,
    graded: 0,
    conflicts: [],
    warnings: [],
    errors: [],
  };

  const existingSnap = await db.collection("matches").get();
  const byTeamPair = new Map<string, { id: string; data: FirebaseFirestore.DocumentData }>();
  existingSnap.docs.forEach((d) => {
    const data = d.data();
    byTeamPair.set(teamPairKey(data.homeTeam, data.awayTeam), { id: d.id, data });
  });

  for (const row of rows) {
    const label = `${row.homeTeam} vs ${row.awayTeam}`;
    try {
      const existing = byTeamPair.get(teamPairKey(row.homeTeam, row.awayTeam));

      if (!existing) {
        await createMatchesService(db, SYSTEM_ACTOR_UID, [
          { jornada: row.jornada, homeTeam: row.homeTeam, awayTeam: row.awayTeam, kickoff: row.kickoffIso },
        ]);
        summary.created++;
        continue;
      }

      const { id: matchId, data: match } = existing;

      if (match.jornada !== row.jornada) {
        summary.warnings.push(
          `${label}: jornada guardada (${match.jornada}) difiere de la hoja (${row.jornada}) — se ignora la diferencia.`,
        );
      }

      if (match.status === "cancelled") continue;

      if (match.status === "finished") {
        if (
          row.homeScore !== null &&
          row.awayScore !== null &&
          (match.officialHomeScore !== row.homeScore || match.officialAwayScore !== row.awayScore)
        ) {
          summary.conflicts.push(
            `${label} (${matchId}): ya finalizado con ${match.officialHomeScore}-${match.officialAwayScore}, ` +
              `la hoja trae ${row.homeScore}-${row.awayScore}. No se sobreescribió (resultado inmutable).`,
          );
        }
        continue;
      }

      const { changed } = await updateMatchService(db, SYSTEM_ACTOR_UID, matchId, {
        kickoff: row.kickoffIso,
      });
      if (changed) summary.kickoffUpdated++;

      const pending = match.pendingResult as { homeScore: number; awayScore: number } | null;

      if (row.homeScore !== null && row.awayScore !== null) {
        if (pending && pending.homeScore === row.homeScore && pending.awayScore === row.awayScore) {
          await gradeMatchResultService(db, SYSTEM_ACTOR_UID, matchId, row.homeScore, row.awayScore);
          summary.graded++;
        } else {
          await db
            .collection("matches")
            .doc(matchId)
            .update({ pendingResult: { homeScore: row.homeScore, awayScore: row.awayScore } });
          summary.pendingDetected++;
        }
      } else if (pending) {
        await db.collection("matches").doc(matchId).update({ pendingResult: null });
      }
    } catch (err) {
      summary.errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}
