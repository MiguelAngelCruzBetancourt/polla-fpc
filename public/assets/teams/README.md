# Escudos de equipos

Esta carpeta está vacía a propósito. Los escudos oficiales de los clubes de la
Liga BetPlay (y de DIMAYOR/BetPlay como torneo) tienen derechos de autor de
sus respectivos dueños, así que no se descargan ni se generan automáticamente
en este proyecto.

Mientras no haya archivos aquí, la app usa un avatar de iniciales generado
automáticamente a partir del nombre del equipo (ver `components/ui/avatar.tsx`
y `components/ui/team-crest.tsx`), así que todo funciona sin necesidad de
escudos reales.

## Cómo agregar un escudo real

1. Consigue el SVG del escudo (idealmente ya optimizado/recortado).
2. Guárdalo aquí como `<slug-del-equipo>.svg`, en minúsculas y con guiones en
   vez de espacios o tildes. Ejemplos:
   - "Millonarios FC" → `millonarios-fc.svg`
   - "Atlético Nacional" → `atletico-nacional.svg`
   - "Independiente Santa Fe" → `independiente-santa-fe.svg`

   Usa exactamente la función `slugifyTeamName` de `lib/team-crests.ts` como
   referencia: quita tildes, pasa a minúsculas y reemplaza todo lo que no sea
   letra/número por un guion.
3. Agrega la entrada correspondiente en `lib/team-crests.ts`:

   ```ts
   export const TEAM_CRESTS: Record<string, string> = {
     "millonarios-fc": "/assets/teams/millonarios-fc.svg",
   };
   ```

4. Listo — `TeamCrest` usará el escudo automáticamente para ese equipo y
   seguirá usando el avatar de iniciales para los que falten.
