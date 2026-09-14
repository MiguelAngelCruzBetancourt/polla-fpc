// Modulo sin dependencias a proposito: lo consumen tanto la app como
// scripts/generate-crest-map.ts. Si viviera en team-crests.ts, el generador
// dependeria del archivo que el mismo genera (ciclo) y el build fallaria en un
// clon limpio donde team-crests.generated.ts todavia no existe.
export function slugifyTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
