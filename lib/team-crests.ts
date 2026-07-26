// Mapeo opcional nombre de equipo -> escudo SVG en /public/assets/teams/.
// No incluye escudos reales por defecto (derechos de autor de los clubes/DIMAYOR/BetPlay).
// Para agregar uno: coloca el SVG en public/assets/teams/<slug>.svg y anade la entrada aqui.
// Ver public/assets/teams/README.md para la convencion de nombres.
export const TEAM_CRESTS: Record<string, string> = {};

export function slugifyTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getTeamCrestSrc(teamName: string): string | null {
  return TEAM_CRESTS[slugifyTeamName(teamName)] ?? null;
}
