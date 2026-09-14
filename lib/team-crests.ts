// Mapeo nombre de equipo -> escudo en /public/assets/teams/.
// El mapa NO se escribe a mano: lo genera scripts/generate-crest-map.ts leyendo
// la carpeta, y se regenera en cada `npm run build`. Para agregar un escudo
// basta con soltar el archivo con el slug correcto; ver public/assets/teams/README.md.
import { TEAM_CRESTS } from "@/lib/team-crests.generated";
import { slugifyTeamName } from "@/lib/slugify";

export { TEAM_CRESTS };
export { slugifyTeamName };

export function getTeamCrestSrc(teamName: string): string | null {
  return TEAM_CRESTS[slugifyTeamName(teamName)] ?? null;
}
