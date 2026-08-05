import type { SportsDataProvider } from "../domain/sports-provider";
import { reportLiveScore } from "../infrastructure/business-client";
import { hasScoreChanged } from "./cache-service";
import { listActiveLeagues } from "./leagues-service";
import { listMappingsForLeague } from "./mappings-service";

export async function pollOnce(provider: SportsDataProvider): Promise<{ reported: number; errors: number }> {
  const leagues = await listActiveLeagues();
  let reported = 0;
  let errors = 0;

  for (const league of leagues) {
    let externalMatches;
    try {
      externalMatches = await provider.getMatchesForLeague(league.leagueExternalId);
    } catch (err) {
      console.error(`[live-matches-svc] error consultando la liga ${league.leagueName}:`, err);
      errors += 1;
      continue;
    }

    const mappings = await listMappingsForLeague(league.leagueExternalId);
    const mappingByExternalId = new Map(mappings.map((m) => [m.externalMatchId, m]));

    for (const match of externalMatches) {
      if (match.homeScore === null || match.awayScore === null) continue;
      const mapping = mappingByExternalId.get(match.externalId);
      if (!mapping) continue; // sin mapeo manual a un matchId interno, se ignora

      const changed = await hasScoreChanged(match.externalId, match.homeScore, match.awayScore);
      if (!changed) continue;

      try {
        await reportLiveScore(mapping.internalMatchId, match.homeScore, match.awayScore);
        reported += 1;
      } catch (err) {
        console.error(
          `[live-matches-svc] error reportando marcador de ${mapping.internalMatchId} a business-api:`,
          err,
        );
        errors += 1;
      }
    }
  }

  return { reported, errors };
}
