# Escudos de equipos

Los escudos oficiales de los clubes de la Liga BetPlay tienen derechos de autor
de sus respectivos dueños, así que no se descargan ni se generan automáticamente
en este proyecto. Esta carpeta puede estar vacía.

Mientras falte el archivo de un equipo, la app muestra un avatar de iniciales
generado a partir del nombre (`components/ui/avatar.tsx`), así que todo funciona
sin escudos y se pueden ir agregando de a uno.

## Cómo agregar un escudo

1. Consigue el SVG del escudo.
2. Optimízalo: `npx svgo public/assets/teams/<archivo>.svg`
3. Guárdalo aquí con **exactamente** el slug de la tabla de abajo.
4. `npm run build` (o `npm run crests`) y listo.

**No hay que editar código.** `scripts/generate-crest-map.ts` lee esta carpeta y
regenera `lib/team-crests.generated.ts` en cada build. Si un archivo no coincide
con ningún equipo, el script lo avisa por consola en vez de ignorarlo en silencio.

## Slugs válidos (20 equipos)

| Equipo | Archivo |
|---|---|
| Santa Fe | `santa-fe.svg` |
| Dep. Cali | `dep-cali.svg` |
| América | `america.svg` |
| Aguilas Doradas | `aguilas-doradas.svg` |
| Atl. Nacional | `atl-nacional.svg` |
| Millonarios | `millonarios.svg` |
| Boyacá Chicó | `boyaca-chico.svg` |
| Dep. Pasto | `dep-pasto.svg` |
| Once Caldas | `once-caldas.svg` |
| Bucaramanga | `bucaramanga.svg` |
| Deportivo Pereira | `deportivo-pereira.svg` |
| Inter de Bogotá | `inter-de-bogota.svg` |
| Cúcuta | `cucuta.svg` |
| Llaneros | `llaneros.svg` |
| Junior | `junior.svg` |
| Ind. Medellín | `ind-medellin.svg` |
| Jaguares | `jaguares.svg` |
| Alianza Valledupar | `alianza-valledupar.svg` |
| Fortaleza | `fortaleza.svg` |
| Tolima | `tolima.svg` |

El slug sale de `slugifyTeamName` (`lib/slugify.ts`) aplicado al nombre de
`lib/teams.ts`: sin tildes, en minúsculas, y todo lo que no sea letra o número
convertido en guion. Si algún día cambia un nombre en `lib/teams.ts`, hay que
renombrar el archivo para que coincida.

## Formatos

Usa **SVG**. Estos archivos entran al precache del service worker, o sea que
todos los usuarios los descargan al instalar la app: 20 SVG optimizados pesan
~60-100 KB en total, aceptable. Un PNG por equipo llevaría eso a ~800 KB y sí
se notaría en la primera carga.

Si un escudo solo existe como imagen de mapa de bits, redimensiónalo a 96×96 y
guárdalo como `.webp` (el generador también acepta `.webp` y `.png`).
