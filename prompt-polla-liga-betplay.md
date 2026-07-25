# Prompt de desarrollo — PWA "Polla Liga BetPlay"

## Rol
Actúa como desarrollador full-stack senior especializado en Next.js, TypeScript y Firebase. Vas a construir, paso a paso, una PWA (Progressive Web App) completa: **mobile-first pero totalmente funcional en escritorio**, instalable en el celular, para gestionar una "polla" (quiniela) de pronósticos de fútbol profesional colombiano — Liga BetPlay, categoría Primera A.

---

## 1. Resumen del producto

- Los usuarios se registran con email y contraseña.
- Un usuario crea una **sala** y recibe un **código único**; otros usuarios se unen a esa sala ingresando el código.
- Dentro de la sala, cada miembro pronostica el marcador de cada partido de la Liga BetPlay, hasta **1 hora antes** de que empiece.
- Mientras el pronóstico está abierto, nadie puede ver el marcador que puso otro jugador. Al cerrarse (1h antes del partido), los pronósticos de la sala se revelan a todos.
- Cuando el partido termina, un administrador de resultados carga el marcador real oficial. El sistema califica automáticamente todos los pronósticos y actualiza el ranking de la sala.
- Una vez cargado y bloqueado un resultado, **nadie puede modificarlo** (ni pronósticos vencidos, ni resultados oficiales ya cerrados).

---

## 2. Stack técnico

- **Frontend:** Next.js 14+ (App Router), React, TypeScript
- **Estilos:** Tailwind CSS — diseño mobile-first, con breakpoints para desktop
- **Backend/DB:** Firebase Auth (email/contraseña) + Firestore
- **Lógica de servidor:** Next.js Route Handlers / Server Actions usando Firebase Admin SDK (NO se necesitan Cloud Functions para el MVP — ver sección 9)
- **Hosting:** Vercel (recomendado para Next.js) — Firebase solo como Auth + Firestore
- **PWA:** `next-pwa` (o Workbox manual) + `manifest.json` + service worker

---

## 3. Supuestos de diseño (ajustables)

1. **Calendario de partidos es global**, no por sala: todas las salas comparten el mismo calendario de la Liga BetPlay. Esto evita cargar el mismo partido varias veces.
2. **Los pronósticos son globales por usuario+partido**, no por sala. Si un usuario está en 2 salas, su pronóstico de un partido es el mismo en ambas; lo que cambia por sala es contra quién compite (el ranking).
3. **Roles separados:**
   - *Dueño de sala*: quien la creó. Administra la sala (ver miembros, regenerar código, expulsar antes de iniciar el torneo). No puede cargar resultados.
   - *Admin de resultados* (global, vía custom claim de Firebase Auth `resultsAdmin: true`): **puede haber hasta 2 personas con este rol simultáneamente.** Cualquiera de los dos puede crear partidos, editar fecha/hora de un partido ya creado, y cargar/bloquear el marcador oficial. **Un partido, una vez creado, nunca se puede eliminar** — solo se puede editar (equipos, fecha/hora) mientras no esté `finished`, y toda edición queda registrada (quién y cuándo) para que quede trazabilidad entre los dos admins.
   - **El rol de admin de resultados no excluye ser jugador.** Cualquiera de los dos admins puede (y normalmente va a) unirse a salas como cualquier usuario y pronosticar los partidos, incluidos los que él mismo creó o editó — sujeto exactamente a las mismas reglas que todos (envío único, bloqueo 1h antes).
4. **Los pronósticos son de una sola vez.** Un jugador —incluido el admin de resultados cuando participa como jugador— envía su marcador una única vez por partido; no se puede editar ni borrar después de enviado. Sigue aplicando el cierre automático 1 hora antes del kickoff. Si no se envía nada antes de esa hora, el jugador simplemente no participa en la calificación de ese partido (0 puntos implícitos, sin pronóstico tardío).
5. **Visibilidad:** los pronósticos de un partido quedan ocultos para todos excepto su dueño hasta que se cumple la hora límite (kickoff - 1h). Después, se revelan a todos los miembros de las salas donde ambos coinciden.
6. **Sin API externa de resultados en el MVP** — se carga manual por el admin de resultados. Se deja la arquitectura lista para conectar una API (ej. API-Football) más adelante si se quiere automatizar.
7. **Log de auditoría inmutable (`auditLog`)**: cada acción crítica (crear/editar partido, cargar resultado, expulsar miembro) queda registrada con quién y cuándo. No hay ningún endpoint ni pantalla que permita editar o borrar esas entradas — es la fuente de verdad ante cualquier reclamo entre jugadores.
8. **Un aplazamiento no es lo mismo que una cancelación.** Si un partido solo cambia de fecha/hora, se edita el mismo `kickoff` (sigue en `scheduled`). Si de verdad se cancela (suspendido, forfeit, etc.), se usa el estado `cancelled`: ese partido queda excluido de la calificación para todos — no aparece como pendiente ni suma 0 a nadie.
9. **Desempate real para el primer puesto (hay premio de por medio).** Si dos o más quedan empatados en `totalPoints`, desempata primero quien tenga más marcadores exactos (5 pts), luego quien tenga más aciertos de ganador (3 pts). Si el empate persiste, el premio se divide en partes iguales — ya no es solo un criterio de orden visual.
10. **Los pronósticos y las acciones de admin pasan por el backend, no por escritura directa del cliente**, lo que permite aplicar rate limiting y validaciones adicionales (rangos de goles válidos, anti-spam) — ver sección 13.
11. **Expulsar un miembro de una sala** lo puede hacer el dueño de esa sala, o cualquiera de los 2 admins de resultados (moderación global en cualquier sala). Al expulsar: se borra su membresía, se agrega su uid a una lista de baneados de esa sala y se regenera el código de la sala, para que no reingrese con la misma cuenta usando un código viejo. **Límite honesto:** esto no impide al 100% que esa persona cree una cuenta nueva con otro correo y consiga el código nuevo por otro miembro — ningún sistema sin verificación de identidad (cédula, teléfono) cierra eso del todo, y ese nivel de fricción parece excesivo para un grupo de amigos. Si más adelante quieres subir el nivel, se podría agregar verificación por número de teléfono.
12. **Los partidos jugados antes de tener la app** (los que quedaron en el Excel) se cargan una sola vez con un script de migración que reutiliza la misma función de puntaje de la sección 8 — no se copian los puntos del Excel a ciegas. Esos registros quedan marcados con `imported: true` para que quede constancia de que se cargaron retroactivamente (ver sección 18).
13. **Cada usuario elige un `username` único al registrarse** (además del email/contraseña). Ese mismo username se escribe en el Excel para identificar a cada persona, y es lo que el script de migración usa para mapear cada fila a un `uid` real — evita depender de emails exactos (typos, mayúsculas/minúsculas) al momento de subir los datos históricos.

---

## 4. Autenticación

- Firebase Auth, método email + contraseña.
- Pantallas: **Registro**, **Login**, **Recuperar contraseña**.
- Al registrarse: pedir nombre para mostrar (displayName), **username único** (ej. 3-20 caracteres, solo letras/números/guion bajo), además de email/contraseña.
- El username se valida como disponible con una transacción de Firestore (lee si `usernames/{username}` ya existe; si no, crea `users/{uid}` y `usernames/{username}` juntos de forma atómica). Una vez elegido, **no se puede cambiar** — se usa como identificador estable para relacionar datos externos (como el Excel histórico) con la cuenta real.
- Proteger todas las rutas internas con verificación de sesión (middleware o guard en layout).

---

## 5. Modelo de datos (Firestore)

```
users/{uid}
  displayName: string
  username: string           // único, elegido una sola vez al registrarse; se usa para mapear el Excel histórico
  email: string
  createdAt: timestamp

usernames/{username}
  uid: string                // dueño de este username; usar el username como ID del doc garantiza unicidad

rooms/{roomId}
  name: string
  code: string              // único, 6 caracteres alfanuméricos, indexado
  ownerUid: string
  championship: "Liga BetPlay 2026-II"   // fijo por ahora, pensado para extender
  createdAt: timestamp
  status: "open" | "locked"              // locked = ya no se permiten nuevos miembros
  bannedUids: string[]                   // uids expulsados; no pueden reingresar aunque tengan un código viejo

rooms/{roomId}/members/{uid}
  displayName: string
  joinedAt: timestamp
  totalPoints: number        // denormalizado, se actualiza al calificar cada partido
  exactCount: number         // # de marcadores exactos (5 pts) — para desempate real
  winnerCount: number        // # de aciertos de ganador (3 pts) — para desempate real

matches/{matchId}
  jornada: number
  homeTeam: string
  awayTeam: string
  kickoff: timestamp
  status: "scheduled" | "closed" | "finished" | "cancelled"
    // scheduled: se puede pronosticar
    // closed: pasó la hora límite (kickoff - 1h), no se puede pronosticar, se revelan pronósticos
    // finished: el admin cargó el resultado oficial y ya se calificó
    // cancelled: el partido no se jugó de verdad; se excluye de la calificación para todos
  officialHomeScore: number | null
  officialAwayScore: number | null
  resultEnteredBy: string | null
  resultLockedAt: timestamp | null
  createdBy: string          // uid del admin que creó el partido
  createdAt: timestamp
  lastEditedBy: string | null   // uid del admin que hizo la última edición de fecha/hora o equipos
  lastEditedAt: timestamp | null
  cancelledBy: string | null
  cancelledAt: timestamp | null
  imported: boolean | null   // true si el partido se cargó retroactivamente vía el script de migración (ver sección 18)

predictions/{matchId_uid}
  matchId: string
  uid: string
  homeScore: number
  awayScore: number
  submittedAt: timestamp
  points: number | null      // se llena cuando el partido pasa a "finished"; nunca se llena si el partido queda "cancelled"
  imported: boolean | null   // true si el pronóstico se cargó retroactivamente vía el script de migración

auditLog/{logId}
  action: "match_created" | "match_edited" | "match_cancelled" | "result_loaded" | "member_kicked" | "room_code_regenerated" | "historical_data_imported"
  performedBy: string        // uid de quien hizo la acción
  performedAt: timestamp
  targetType: "match" | "room"
  targetId: string           // matchId o roomId, según el caso
  details: object            // ej. { field: "kickoff", oldValue, newValue } o { kickedUid, roomId }
```

> Nota: el estado `closed` de un partido se puede derivar en el cliente comparando `now` contra `kickoff - 1h`, no hace falta un cron que lo actualice — solo se usa para la UI y para las reglas de seguridad.

---

## 6. Flujo: Crear / Unirse a sala y gestión de miembros

- **Crear sala:** formulario con nombre de sala → genera código único de 6 caracteres → el creador queda como `ownerUid` y primer miembro.
- **Unirse a sala:** campo para ingresar código → valida que exista, esté `status: open` y que el usuario **no esté en `bannedUids`** de esa sala → agrega al usuario como miembro.
- Vista de "Mis salas": lista de salas donde el usuario es miembro, con acceso rápido al ranking y a pronosticar.
- **Expulsar miembro** — `POST /api/rooms/[roomId]/kick` (protegido con Admin SDK):
  1. Validar que quien llama es el `ownerUid` de esa sala, **o** tiene el claim `resultsAdmin` (los 2 admins globales pueden moderar cualquier sala).
  2. Borrar `rooms/{roomId}/members/{uid}` del expulsado.
  3. Agregar su uid a `rooms/{roomId}.bannedUids`.
  4. Regenerar `rooms/{roomId}.code` (invalida el código viejo; los demás miembros no se ven afectados porque su membresía ya existe).
  5. Escribir una entrada en `auditLog` (`action: "member_kicked"`).

---

## 7. Flujo: Calendario de partidos y pronósticos

- Vista "Calendario" dentro de una sala: lista **todos** los partidos (pasados y futuros), ordenados por fecha, con su estado visual (por pronosticar / cerrado / finalizado / cancelado).
- Cada partido en estado `scheduled` muestra un formulario simple: goles equipo local / goles equipo visitante, con botón de envío único.
- El envío **no escribe directo a Firestore desde el cliente**: llama a `POST /api/predictions`, que valida sesión, que el partido siga `scheduled` y antes del cierre (kickoff - 1h), que los goles sean enteros en un rango razonable (ej. 0-20), que no exista ya una predicción de ese uid+partido, y aplica un rate limit simple (ej. máx. N envíos por minuto por uid) antes de guardar.
- Al enviar, el pronóstico **queda fijo**: no hay botón de editar ni de borrar. El jugador ve su propio marcador enviado, pero no el de los demás todavía.
- Esto aplica igual para los admins de resultados cuando pronostican: pueden mandar su marcador después de crear el partido, una sola vez, con el mismo bloqueo de 1 hora antes.
- Una vez pasada esa hora (`status: closed`), el input desaparece y se muestran los pronósticos de todos los miembros de la sala para ese partido (tabla: jugador → marcador pronosticado).
- Los partidos con `status: finished` muestran: marcador real, marcador de cada jugador y puntos obtenidos por cada uno.
- Los partidos con `status: cancelled` se muestran aparte, marcados como "Cancelado — no cuenta para la calificación", sin importar si alguien ya había pronosticado.

---

## 8. Sistema de puntuación (NO acumulable — se otorga el puntaje más alto que aplique)

```ts
function calcularPuntos(pronostico, resultado): number {
  const { homeScore: hP, awayScore: aP } = pronostico;
  const { homeScore: hR, awayScore: aR } = resultado;

  // 5 puntos: marcador exacto
  if (hP === hR && aP === aR) return 5;

  const ganadorReal =
    hR > aR ? "local" : aR > hR ? "visita" : "empate";
  const ganadorPronosticado =
    hP > aP ? "local" : aP > hP ? "visita" : "empate";

  // 3 puntos: acierta el resultado (ganador o empate), sin marcador exacto
  if (ganadorReal === ganadorPronosticado) return 3;

  // 1 punto: acierta los goles de al menos uno de los dos equipos
  if (hP === hR || aP === aR) return 1;

  return 0;
}
```

> Esta función nunca se llama para un partido en estado `cancelled` — esos partidos se saltan por completo en el paso de calificación (sección 9c), y sus predicciones se quedan con `points: null` para siempre, no en `0`.

---

## 9. Acciones de administrador sobre partidos (sin Cloud Functions)

Con hasta 2 personas pudiendo crear/editar partidos, **todas** las escrituras sobre `matches` se hacen a través de Server Actions / Route Handlers protegidos con Firebase Admin SDK (nunca directo desde el cliente) — esto centraliza la validación y permite registrar quién hizo cada cosa. Cada una de las acciones de abajo, además de lo descrito, **escribe una entrada en `auditLog`** con `performedBy`, `performedAt` y el detalle del cambio.

**a) Crear partido(s)** — `POST /api/matches` (soporta uno o varios en lote)
1. Validar que quien llama tiene el claim `resultsAdmin`.
2. Crear el/los documento(s) con `createdBy` = uid del admin, `createdAt` = ahora, `status: "scheduled"`.
3. Registrar en `auditLog` (`action: "match_created"`).

**b) Editar fecha/hora/equipos, o cancelar** — `PATCH /api/matches/[matchId]`
1. Validar claim `resultsAdmin`.
2. Validar que el partido **no** esté `finished` (una vez finalizado, ni el resultado ni el partido se tocan).
3. Si es una edición de fecha/hora/equipos: actualizar solo los campos permitidos (`homeTeam`, `awayTeam`, `kickoff`, `jornada`), guardar `lastEditedBy`/`lastEditedAt`, y registrar en `auditLog` (`action: "match_edited"`, con el campo cambiado y su valor anterior/nuevo en `details`).
4. Si es una cancelación real: cambiar `status: "cancelled"`, guardar `cancelledBy`/`cancelledAt`, y registrar en `auditLog` (`action: "match_cancelled"`).
5. **Nunca permite eliminar** el documento — no existe endpoint de borrado, en ningún estado.

**c) Cargar resultado oficial** — `POST /api/matches/[matchId]/result`
1. Validar claim `resultsAdmin`.
2. Validar que el partido no esté ya `finished` ni `cancelled` (inmutabilidad).
3. Escribir `officialHomeScore`, `officialAwayScore`, `status: "finished"`, `resultEnteredBy`, `resultLockedAt`.
4. Buscar todas las `predictions` de ese `matchId`. Los miembros de sala que no tengan una predicción para ese `matchId` simplemente no suman nada (0 puntos implícitos) — no se crea ni se completa nada por ellos.
5. Calcular puntos con la función de la sección 8 y escribirlos en cada predicción (batch write).
6. Para cada sala donde participen esos usuarios, incrementar `totalPoints`, y según corresponda `exactCount`/`winnerCount`, en `rooms/{roomId}/members/{uid}` (batch write / transacción).
7. Registrar en `auditLog` (`action: "result_loaded"`).

Esto evita depender del plan de pago (Blaze) de Firebase Functions — todo corre en el backend de Next.js, y como todo pasa por estos endpoints, queda naturalmente todo logueado para auditoría.

---

## 10. Ranking

- Vista "Ranking" dentro de cada sala: lista **de todos los miembros de la sala** ordenada por `totalPoints` descendente.
- Los primeros 3 lugares se muestran como **podio** (destacado visual tipo 🥇🥈🥉, con foto/inicial y puntos), y debajo la lista completa del resto de la sala con puesto, nombre y puntos totales.
- **Desempate real (no solo visual):** si dos o más empatan en `totalPoints`, se ordenan por `exactCount` (más marcadores exactos primero) y luego por `winnerCount` (más aciertos de ganador). Si el empate persiste — especialmente relevante si empatan en el **primer puesto** y hay premio en efectivo — la UI debe mostrar explícitamente "Empate en el primer puesto: el premio se divide en partes iguales entre [nombres]" en vez de forzar un ganador arbitrario.

---

## 11. Historial personal de pronósticos

- Vista "Mi historial" (accesible desde el perfil o un ítem de navegación), **independiente de la sala** ya que el pronóstico es del usuario, no de la sala (ver supuesto 2).
- Lista únicamente los partidos que el usuario **sí pronosticó**, ordenados del más reciente al más antiguo.
- Por cada fila: partido (equipos + fecha), mi marcador pronosticado, marcador real (si ya se jugó, si no: "pendiente"), y puntos obtenidos (5/3/1/0, o "por definir" si el partido aún no termina). Si el partido quedó `cancelled`, la fila muestra "Cancelado — no contó" en vez de un puntaje.
- Sirve como resumen personal de desempeño, sin importar en cuántas salas participe el usuario.

---

## 12. Panel de administrador de resultados

- Solo visible/accesible para usuarios con `resultsAdmin: true` (hasta 2 personas).
- **Crear partidos, uno por uno o en lote.** El formulario permite agregar varias filas (equipo local, equipo visitante, fecha y hora de kickoff) en una sola sesión y guardarlas todas juntas — así cualquiera de los 2 admins puede cargar, por ejemplo, el calendario de 5 días de una sola vez en lugar de entrar a diario. Al guardar, cada partido queda visible de inmediato para todos los usuarios en el Calendario.
- **Editar fecha/hora (o equipos) de un partido ya creado**, mientras no esté `finished`. Cada edición queda en `auditLog` (quién y cuándo) — visible para el otro admin y para los jugadores en el detalle del partido (ver sección 15).
- **Marcar un partido como cancelado de verdad** (no un simple aplazamiento — eso se resuelve editando la fecha). Un partido cancelado queda excluido de la calificación para siempre.
- **No existe opción de eliminar un partido**, en ningún estado — ni desde la UI ni desde el endpoint. Si un partido sobra de verdad, se corrige manualmente en Firestore, fuera del flujo normal de la app.
- Vista para cargar el resultado oficial de un partido ya jugado (una sola vez, con confirmación, ya que queda bloqueado permanentemente).
- Puede expulsar miembros de cualquier sala (ver sección 6).
- Cualquiera de los admins de resultados, al entrar a sus salas como jugador, ve y usa el Calendario y el formulario de pronóstico exactamente igual que cualquier otro miembro.

---

## 13. Seguridad — Firestore Security Rules (lineamientos clave)

```
match /matches/{matchId} {
  allow read: if true;
  allow write: if false; // todas las escrituras (crear, editar fecha/hora, cargar resultado) pasan por los 3 endpoints de la sección 9, usando Admin SDK — nunca directo desde el cliente
}

match /predictions/{predictionId} {
  allow read: if request.auth != null
    && (
      request.auth.uid == resource.data.uid
      || request.time >= get(/databases/$(database)/documents/matches/$(resource.data.matchId)).data.kickoff - duration.value(1, 'h')
    );
  allow write: if false; // todo pasa por POST /api/predictions (Admin SDK): valida rango de goles, envío único y aplica rate limiting
}

match /rooms/{roomId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update: if request.auth.uid == resource.data.ownerUid
    && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['code', 'bannedUids']);
    // el código y la lista de baneados solo se tocan desde POST /api/rooms/[roomId]/kick (Admin SDK)
}

match /rooms/{roomId}/members/{uid} {
  allow read: if request.auth != null;
  allow create: if request.auth.uid == uid
    && get(/databases/$(database)/documents/rooms/$(roomId)).data.status == 'open'
    && !(uid in get(/databases/$(database)/documents/rooms/$(roomId)).data.bannedUids);
  allow update: if request.auth.uid == uid; // ej. actualizar su propio displayName
  allow delete: if false; // expulsar (kick) solo vía backend con Admin SDK
}

match /auditLog/{logId} {
  allow read: if request.auth != null;
  allow write: if false; // solo se escribe desde el backend (Admin SDK), nunca se edita ni se borra
}

match /usernames/{username} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
  allow update, delete: if false; // el username es fijo una vez elegido
}
```

> El custom claim `resultsAdmin` se asigna manualmente (script con Admin SDK) a los uids de los hasta 2 usuarios que definas como administradores de resultados. No hay UI en la app para auto-asignarse este rol — evita que alguien se lo otorgue a sí mismo.

### Rate limiting / anti-spam

Como los endpoints críticos (`/api/predictions`, `/api/matches`, `/api/matches/[matchId]`, `/api/matches/[matchId]/result`, `/api/rooms/[roomId]/kick`) corren en el backend, ahí es donde se aplica el límite de tasa — no se puede hacer confiablemente solo con Firestore Rules. Opciones simples para el MVP:
- Un rate limiter basado en Redis (ej. Upstash Ratelimit, que se integra fácil con Vercel) por uid + IP, con un límite generoso (ej. 20 requests/minuto) para no estorbar el uso normal.
- Alternativa más simple sin infraestructura extra: un contador en Firestore (`rateLimits/{uid}`) con timestamp del último request, rechazando si no ha pasado suficiente tiempo — más liviano de implementar aunque menos preciso bajo carga concurrente.
- Adicionalmente, considerar Firebase App Check para confirmar que las requests vienen de la app real y no de un script externo.

---

## 14. Requisitos PWA

- `manifest.json` con: `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color`, `background_color`, íconos en 192x192 y 512x512 (incluir `maskable`).
- Service worker (via `next-pwa`) que cachee shell de la app y assets estáticos para carga rápida; no es necesario cachear datos de Firestore (requieren conexión).
- Meta tags para iOS (`apple-touch-icon`, `apple-mobile-web-app-capable`).
- Probar instalabilidad con Lighthouse (criterios: HTTPS, manifest válido, service worker registrado, ícono adecuado).

---

## 15. UI/UX — pantallas principales

1. Login / Registro / Recuperar contraseña
2. Home — "Mis salas" (lista + botón crear/unirse)
3. Detalle de sala — tabs: **Calendario** / **Ranking** / **Miembros**
4. Calendario de partidos con formulario de pronóstico por partido (envío único). Cada partido editado o cancelado muestra un pequeño indicador ("Editado por [admin] el [fecha]" / "Cancelado") con detalle expandible leído de `auditLog`.
5. Mi historial de pronósticos (personal, ver sección 11)
6. Panel admin de resultados (solo visible si aplica), con opción de carga de partidos en lote y de marcar cancelación
7. Tab "Miembros" de la sala: lista de miembros, botón de expulsar (visible solo para el dueño de sala o los admins), y un feed simple de actividad de esa sala (expulsiones, regeneración de código) leído de `auditLog`
8. Perfil de usuario

Diseño: mobile-first, tarjetas simples, tipografía clara, colores alusivos al fútbol colombiano sin saturar. Botones grandes y táctiles (mínimo 44px de alto). En desktop, aprovechar el ancho con layout de 2-3 columnas donde tenga sentido (ej. lista de partidos + ranking lado a lado).

---

## 16. Estructura de carpetas sugerida

```
/app
  /(auth)/login
  /(auth)/register
  /(app)/rooms
  /(app)/rooms/[roomId]
  /(app)/rooms/[roomId]/matches
  /(app)/rooms/[roomId]/ranking
  /(app)/history
  /(app)/admin/results
  /api/rooms/join
  /api/rooms/[roomId]/kick           // POST: expulsar miembro + banear + regenerar código
  /api/matches                      // POST: crear uno o varios en lote
  /api/matches/[matchId]            // PATCH: editar fecha/hora/equipos o cancelar
  /api/matches/[matchId]/result     // POST: cargar resultado oficial
  /api/predictions                  // POST: enviar pronóstico (envío único, con rate limit)
/lib
  firebase-client.ts
  firebase-admin.ts
  scoring.ts
  rate-limit.ts
/components
  ui/
  match-card.tsx
  prediction-form.tsx
  ranking-table.tsx
  podium.tsx
  history-table.tsx
  audit-feed.tsx
/public
  manifest.json
  icons/
```

---

## 17. Roadmap MVP (fases)

**Fase 1 — Base**
Auth (registro/login con username único), crear/unirse a sala, modelo de datos en Firestore.

**Fase 2 — Núcleo de la polla**
Carga de calendario por el admin (individual o en lote), pronósticos vía `POST /api/predictions` (envío único, validación de rango, rate limit) con bloqueo por hora límite, visibilidad condicionada.

**Fase 3 — Calificación y ranking**
Carga de resultado oficial, cálculo automático de puntos, partidos cancelados excluidos de la calificación, ranking por sala con podio y desempate real, historial personal de pronósticos.

**Fase 4 — Moderación y auditoría**
Expulsión de miembros (con lista de baneados y regeneración de código), `auditLog` inmutable y su visualización a los jugadores (calendario y tab de miembros).

**Fase 5 — PWA y pulido**
Manifest, service worker, instalabilidad, responsive final, validaciones de UX (loading states, errores).

**Antes de anunciar el lanzamiento al grupo**
Correr el script de migración de datos históricos (sección 18), con todos ya registrados y unidos a su sala, y revisar el reporte de comparación contra el Excel antes de darlo por bueno.

---

## 18. Migración de datos históricos (backfill antes del lanzamiento)

Como el torneo ya empezó antes de tener la app, hay partidos con marcador oficial, pronóstico de cada persona y ranking ya calculados a mano en un Excel. Esto se carga con un **script de migración de una sola vez** — no es un endpoint de la app, corre localmente con Admin SDK y credenciales de servicio, directo contra Firestore de producción, antes de anunciarle a todo el grupo que ya pueden usar la app.

**Prerrequisito:** todos los que aparecen en el Excel deben tener cuenta creada (Firebase Auth, con su `username` ya elegido) y estar unidos a la sala correspondiente antes de correr el script. Si alguien no se ha registrado todavía, se le puede crear la cuenta directamente por Admin SDK (incluyendo su `username`) con un correo y una contraseña temporal que cambie al primer login. Los `username` se normalizan siempre a minúsculas, tanto al registrarse como al leer el Excel, para que no haya discrepancias por mayúsculas/minúsculas.

**Formato de entrada:** un único archivo `historico.xlsx` con **2 hojas** (nombres exactos, en minúscula):

**Hoja `partidos`** — una fila por partido:
```
partido_id | jornada | equipo_local | equipo_visitante | fecha (AAAA-MM-DD) | hora (HH:MM, 24h) | marcador_local | marcador_visitante
```
- `partido_id`: código corto único inventado por el admin (ej. P001, P002...), nunca repetido — es la llave que conecta con la hoja de pronósticos.

**Hoja `pronosticos`** — una fila por cada pronóstico de cada persona:
```
partido_id | username | pronostico_local | pronostico_visitante
```
- `partido_id` debe existir en la hoja `partidos`. `username` debe coincidir con el de un usuario ya registrado.
- **Si alguien no pronosticó un partido, simplemente no hay fila para esa combinación** — nunca poner 0-0 como relleno, porque el sistema lo tomaría como un pronóstico real de 0 a 0 en vez de "no pronosticó" (0 puntos implícitos).
- No puede haber dos filas con el mismo `partido_id` + `username`.

El script lee el `.xlsx` directamente con la librería `xlsx` (SheetJS) — no se pasa por CSV, para evitar problemas de codificación con tildes en nombres de equipos (Bogotá, Medellín, etc.).

**`scripts/import-historical-data.ts`** — pasos:
1. Leer `historico.xlsx`, hojas `partidos` y `pronosticos`, con SheetJS.
2. Validar antes de escribir nada: que no haya `partido_id` repetidos en `partidos`, que todo `partido_id` de `pronosticos` exista en `partidos`, que no haya pares `partido_id`+`username` repetidos, y que todo `username` exista en la colección `usernames`. Si algo falla, el script se detiene y lista los errores encontrados — no escribe nada a medias.
3. Por cada partido: crear/actualizar el doc en `matches` con `status: "finished"`, los marcadores oficiales, el `kickoff` real (fecha + hora, asumiendo zona horaria de Colombia, UTC-5), `resultEnteredBy` = uid de quien corre el script, y **`imported: true`**.
4. Por cada fila de `pronosticos`: resolver el `uid` a partir del `username` (lookup directo en `usernames/{username}`), crear el doc en `predictions` con el pronóstico, `submittedAt` = fecha del partido, **`imported: true`**, y calcular `points` con la **misma función `calcularPuntos` de la sección 8** — nunca copiar el puntaje que traía el Excel a ciegas, para no arrastrar errores de cálculo manual.
4. Acumular `totalPoints`, `exactCount` y `winnerCount` por persona y por sala, y escribirlos en `rooms/{roomId}/members/{uid}`.
5. Al terminar, imprimir un reporte comparando el ranking recalculado contra el ranking que ya traía el Excel, para detectar diferencias antes de dar por buena la migración (si algo no cuadra, seguramente el Excel tenía un error manual — mejor detectarlo ahora que después con plata de por medio).
6. Registrar una entrada en `auditLog` (`action: "historical_data_imported"`) con el resumen (cuántos partidos y pronósticos se cargaron).

**Transparencia:** en el Calendario y el Historial, cualquier partido o pronóstico con `imported: true` muestra un indicador tipo "Cargado retroactivamente antes del lanzamiento de la app" — así nadie piensa que se fabricó o alteró información después de que la app ya estaba en uso real.

---

## 19. Fuera de alcance por ahora (ideas futuras)

- Integración con API de resultados en tiempo real (ej. API-Football) para automatizar la carga.
- Notificaciones push recordando pronosticar antes de la hora límite.
- Soporte multi-torneo (Liga BetPlay + Copa Colombia, etc.) — el campo `championship` ya está pensado para esto.
- Historial de pollas pasadas / temporadas.
- Compartir sala vía link/WhatsApp con código embebido.
