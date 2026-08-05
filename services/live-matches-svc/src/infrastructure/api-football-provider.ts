import type { ExternalMatch, ExternalMatchStatus, SportsDataProvider } from "../domain/sports-provider";

// Códigos de estado de fixture de API-Football (documentación: https://www.api-football.com/documentation-v3).
// NTS/1H/HT/2H/ET/P/LIVE = en curso; FT/AET/PEN = finalizado; el resto (NS, etc.) = programado.
function mapStatus(shortStatus: string): ExternalMatchStatus {
  if (["FT", "AET", "PEN"].includes(shortStatus)) return "finished";
  if (["1H", "HT", "2H", "ET", "P", "LIVE", "BT"].includes(shortStatus)) return "in_progress";
  return "scheduled";
}

interface ApiFootballFixtureResponse {
  response: Array<{
    fixture: { id: number; date: string; status: { short: string } };
    league: { id: number };
    teams: { home: { name: string }; away: { name: string } };
    goals: { home: number | null; away: number | null };
  }>;
}

export class ApiFootballProvider implements SportsDataProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async getMatchesForLeague(leagueExternalId: string): Promise<ExternalMatch[]> {
    // Nota: confirmar contra la documentación vigente de API-Football el
    // shape exacto de /fixtures antes de conectar una API key real — esta
    // implementación sigue el formato documentado al momento de escribirla.
    const season = new Date().getFullYear();
    const url = `${this.baseUrl}/fixtures?league=${encodeURIComponent(leagueExternalId)}&season=${season}&live=all`;

    const res = await fetch(url, {
      headers: { "x-apisports-key": this.apiKey },
    });
    if (!res.ok) {
      throw new Error(`API-Football respondió ${res.status} para la liga ${leagueExternalId}`);
    }

    const data = (await res.json()) as ApiFootballFixtureResponse;

    return data.response.map((item) => ({
      externalId: String(item.fixture.id),
      leagueExternalId: String(item.league.id),
      homeTeam: item.teams.home.name,
      awayTeam: item.teams.away.name,
      homeScore: item.goals.home,
      awayScore: item.goals.away,
      status: mapStatus(item.fixture.status.short),
      kickoff: item.fixture.date,
    }));
  }
}
