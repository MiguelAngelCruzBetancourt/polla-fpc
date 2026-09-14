// Desde @/lib/slugify y no desde @/lib/team-crests: asi este modulo no depende
// del mapa generado, y scripts/generate-crest-map.ts puede importar TEAMS sin ciclo.
import { slugifyTeamName } from "@/lib/slugify";

// Equipos habilitados para crear/editar partidos desde el panel de admin.
// La validacion es solo de UI: el backend sigue aceptando cualquier nombre para
// no romper partidos historicos ni salas de otros torneos.
export const TEAMS = [
  "Santa Fe",
  "Dep. Cali",
  "América",
  "Aguilas Doradas",
  "Atl. Nacional",
  "Millonarios",
  "Boyacá Chicó",
  "Dep. Pasto",
  "Once Caldas",
  "Bucaramanga",
  "Deportivo Pereira",
  "Inter de Bogotá",
  "Cúcuta",
  "Llaneros",
  "Junior",
  "Ind. Medellín",
  "Jaguares",
  "Alianza Valledupar",
  "Fortaleza",
  "Tolima",
] as const;

export type TeamName = (typeof TEAMS)[number];

/** Minimo de caracteres antes de mostrar sugerencias. */
export const MIN_TEAM_QUERY = 3;

// slugifyTeamName ya normaliza NFD, quita tildes, pasa a minusculas y colapsa
// la puntuacion a guiones, que es justo la comparacion que necesitamos aqui.
const TEAM_SLUGS = TEAMS.map((team) => ({ team, slug: slugifyTeamName(team) }));

/**
 * Equipos que coinciden con la busqueda, insensible a mayusculas y tildes.
 * Devuelve [] con menos de MIN_TEAM_QUERY caracteres.
 * Ordena por cercania: prefijo, luego substring, luego todas las palabras sueltas
 * (asi "inter bogota" encuentra "Inter de Bogota" aunque se omita el "de").
 */
export function filterTeams(queryText: string, exclude?: string): string[] {
  const q = slugifyTeamName(queryText);
  if (q.length < MIN_TEAM_QUERY) return [];

  const words = q.split("-").filter(Boolean);
  const excludeSlug = exclude ? slugifyTeamName(exclude) : null;
  const startsWith: string[] = [];
  const contains: string[] = [];
  const allWords: string[] = [];

  for (const { team, slug } of TEAM_SLUGS) {
    if (excludeSlug && slug === excludeSlug) continue;
    if (slug.startsWith(q)) startsWith.push(team);
    else if (slug.includes(q)) contains.push(team);
    else if (words.length > 1 && words.every((w) => slug.includes(w))) allWords.push(team);
  }

  return [...startsWith, ...contains, ...allWords];
}

/** Nombre canonico del equipo, ignorando mayusculas/tildes/puntuacion. null si no esta en la lista. */
export function canonicalTeam(name: string): string | null {
  const slug = slugifyTeamName(name);
  if (!slug) return null;
  return TEAM_SLUGS.find((entry) => entry.slug === slug)?.team ?? null;
}
