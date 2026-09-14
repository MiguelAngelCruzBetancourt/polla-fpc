/**
 * Genera lib/team-crests.generated.ts a partir de los archivos que haya en
 * public/assets/teams/. Corre solo en cada `npm run build` (script `prebuild`),
 * asi que para agregar un escudo basta con soltar el archivo con el slug
 * correcto: no hay que editar codigo.
 *
 * Manual:
 *   npx tsx scripts/generate-crest-map.ts
 *
 * Valida cada archivo contra la lista TEAMS y avisa de los que no corresponden
 * a ningun equipo. Ese es el modo de fallo principal: un slug mal escrito no
 * rompe nada visible, simplemente deja al equipo con el avatar de iniciales
 * para siempre y nadie se entera.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { slugifyTeamName } from "../lib/slugify";
import { TEAMS } from "../lib/teams";

const CRESTS_DIR = join(process.cwd(), "public", "assets", "teams");
const OUT_FILE = join(process.cwd(), "lib", "team-crests.generated.ts");

// SVG primero por peso y nitidez; los rasters se aceptan por si algun escudo
// solo existe como imagen (ver README de la carpeta).
const ALLOWED_EXTENSIONS = [".svg", ".webp", ".png"];

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot < 0 ? "" : filename.slice(dot).toLowerCase();
}

function main() {
  const bySlug = new Map(TEAMS.map((team) => [slugifyTeamName(team), team]));

  let files: string[];
  try {
    files = readdirSync(CRESTS_DIR);
  } catch {
    files = [];
  }

  const crests = new Map<string, string>();
  const unknown: string[] = [];

  for (const file of files.sort()) {
    const ext = extensionOf(file);
    if (!ALLOWED_EXTENSIONS.includes(ext)) continue;

    const slug = file.slice(0, -ext.length).toLowerCase();
    if (!bySlug.has(slug)) {
      unknown.push(file);
      continue;
    }
    // Ruta web literal, no path.join: en Windows generaria backslashes.
    if (!crests.has(slug)) crests.set(slug, `/assets/teams/${file}`);
  }

  const entries = [...crests.entries()].sort(([a], [b]) => a.localeCompare(b));
  const body =
    entries.length === 0
      ? "{}"
      : `{\n${entries.map(([slug, src]) => `  ${JSON.stringify(slug)}: ${JSON.stringify(src)},`).join("\n")}\n}`;

  const output = `// GENERADO AUTOMATICAMENTE por scripts/generate-crest-map.ts — no editar a mano.
// Se regenera en cada \`npm run build\` a partir de public/assets/teams/.
export const TEAM_CRESTS: Record<string, string> = ${body};
`;

  // Escribir solo si cambio, para no ensuciar el working tree en cada build.
  let previous: string | null = null;
  try {
    previous = readFileSync(OUT_FILE, "utf8");
  } catch {
    previous = null;
  }
  if (previous !== output) {
    writeFileSync(OUT_FILE, output, "utf8");
  }

  const missing = [...bySlug.entries()].filter(([slug]) => !crests.has(slug));

  console.log(`[escudos] ${entries.length}/${TEAMS.length} equipos con escudo${previous === output ? " (sin cambios)" : ""}`);
  if (unknown.length > 0) {
    console.warn(
      `[escudos] AVISO: ${unknown.length} archivo(s) no corresponden a ningun equipo y se ignoraron:\n` +
        unknown.map((f) => `  - ${f}`).join("\n") +
        `\n  Revisa el slug contra public/assets/teams/README.md.`,
    );
  }
  if (missing.length > 0 && entries.length > 0) {
    console.log(`[escudos] Sin escudo (usan avatar de iniciales): ${missing.map(([, team]) => team).join(", ")}`);
  }
}

main();
