# Despliegue

Todo el sistema vive en **un solo despliegue de Vercel**. No hay microservicios separados ni proveedores de contenedores.

## Arquitectura

| Componente | Dónde vive |
|---|---|
| Frontend (Next.js, PWA) + toda la API (`app/api/**`) | Vercel |
| Base de datos y push | Firebase (Firestore + FCM), proyecto `pollabetplay` |
| Jobs periódicos de notificaciones | GitHub Actions (`.github/workflows/notifications-cron.yml`) |

La lógica de negocio server-side está en `lib/server/**` (framework-agnóstica) y los route handlers de `app/api/**` son envoltorios finos sobre ella. La autenticación es `getAuthContext()` en `lib/api-auth.ts`, que verifica el ID token de Firebase en proceso.

### Por qué el cron vive en GitHub Actions y no en Vercel

Los jobs de notificaciones (drenar `outboxEvents` y avisar de partidos próximos) necesitan correr cada pocos minutos, pero en serverless no hay proceso persistente para un `setInterval`, y **Vercel Cron en el plan Hobby solo permite una ejecución diaria** — insuficiente para el aviso de "10 minutos antes del partido". El workflow de GitHub Actions corre cada 5 minutos, es gratis y no tiene esa limitación.

## Variables de entorno en Vercel

Todas en el entorno **Production** (y Preview si se usa):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
CRON_SECRET
```

Notas importantes:
- **`FIREBASE_ADMIN_PRIVATE_KEY` va en una sola línea con los `\n` como texto literal**, no con saltos de línea reales — el código hace `.replace(/\\n/g, "\n")`. Pegarla con saltos reales rompe la inicialización de Firebase Admin y produce errores 500 en cualquier ruta que toque Firestore.
- Las variables con prefijo `NEXT_PUBLIC_` deben ser de tipo **Config** en Vercel, no Secret (Vercel bloquea guardar como Secret algo con prefijo público, porque igual termina expuesto en el bundle del navegador).
- **No definir `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` en producción.** Si vale `true`, el cliente intenta conectarse al emulador en `127.0.0.1` del navegador de cada usuario y se rompe el login.
- No definir `FIRESTORE_EMULATOR_HOST` ni `FIREBASE_AUTH_EMULATOR_HOST` en producción.

Después de cambiar cualquier variable hay que hacer **Redeploy**: las `NEXT_PUBLIC_*` se compilan dentro del bundle del cliente en tiempo de build, así que cambiarlas sin redeploy no tiene efecto.

## Cron de notificaciones (GitHub Actions)

En el repo → Settings → Secrets and variables → Actions:
- **Variable** `NOTIFICATIONS_API_URL`: URL pública de la app en Vercel (sin `/` al final).
- **Secret** `NOTIFICATIONS_CRON_SECRET`: mismo valor que `CRON_SECRET` en Vercel.

El workflow corre cada 5 minutos y golpea `/api/internal/jobs/drain-outbox` y `/api/internal/jobs/check-schedule` con el header `X-Cron-Secret`. Se puede disparar a mano desde **Actions → notifications-cron → Run workflow**.

El workflow con `schedule` solo se dispara automáticamente desde la **rama por defecto** del repo.

## Firestore

`firestore.rules` e `firestore.indexes.json` se despliegan aparte con:
```powershell
npx firebase deploy --only firestore:indexes
npx firebase deploy --only firestore:rules
```
Los índices compuestos que necesitan los jobs (`outboxEvents(processedAt, createdAt)` y `matches(status, kickoff)`) ya están en `firestore.indexes.json`. Un índice recién creado tarda unos minutos en pasar de "Building" a "Enabled"; mientras tanto las queries que lo usan fallan.

## Runbook: rotar `CRON_SECRET`

1. Generar: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
2. Actualizarlo en Vercel y hacer Redeploy.
3. Actualizar el secret `NOTIFICATIONS_CRON_SECRET` en GitHub Actions.

## No quitar el override de `jose` en `package.json`

```json
"overrides": { "jose": "5.10.0" }
```

`firebase-admin` depende de `jwks-rsa`, que carga `jose` con `require()` de CommonJS. Desde la versión 6, `jose` es **ESM-only**, así que sin este pin el runtime de Vercel falla con `ERR_REQUIRE_ESM` al cargar cualquier módulo que importe `firebase-admin` — es decir, **todas las rutas de `app/api/**` devuelven 500**, aunque el build pase sin errores y aunque en local funcione (el `node_modules` local puede tener la versión vieja cacheada).

Para verificar el pin sin desplegar:
```powershell
npm ls jose            # debe decir 5.10.0 overridden
node -e "require('jwks-rsa')"   # debe cargar sin ERR_REQUIRE_ESM
```

## Troubleshooting

- **401 en el workflow de Actions**: `CRON_SECRET` (Vercel) y `NOTIFICATIONS_CRON_SECRET` (GitHub) no coinciden.
- **503 en `/api/internal/jobs/*`**: falta `CRON_SECRET` en Vercel.
- **401 "No autenticado" en la app**: el ID token de Firebase no llegó o venció; revisar que el usuario tenga sesión activa.
- **500 en rutas que tocan Firestore**: casi siempre `FIREBASE_ADMIN_PRIVATE_KEY` mal pegada (ver arriba), o un índice de Firestore faltante/en construcción.
- **Las notificaciones push no llegan**: revisar que el workflow corra en verde, que el usuario haya aceptado el permiso, y que `NEXT_PUBLIC_FIREBASE_VAPID_KEY` esté configurada.
