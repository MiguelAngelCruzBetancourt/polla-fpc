export type ExternalMatchStatus = "scheduled" | "in_progress" | "finished";

export interface ExternalMatch {
  externalId: string;
  leagueExternalId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: ExternalMatchStatus;
  kickoff: string; // ISO
}

/**
 * Puerto de dominio, independiente del proveedor concreto — permite cambiar
 * de API-Football a otro proveedor sin tocar el resto del servicio (ver
 * elección de proveedor en el plan de migración).
 */
export interface SportsDataProvider {
  getMatchesForLeague(leagueExternalId: string): Promise<ExternalMatch[]>;
}
