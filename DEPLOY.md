# Despliegue

Este documento reemplaza el conocimiento que antes vivía solo en el dashboard de Railway. Léelo antes de tocar cualquier variable de entorno de producción.

## Arquitectura

| Componente | Dónde vive | Notas |
|---|---|---|
| Frontend (Next.js, PWA) | Vercel | No se toca en esta migración. |
| `security-api`, `business-api`, `notifications-svc` | Render (free tier) | Ver `render.yaml` en la raíz. |
| Base de datos | Firestore (proyecto Firebase `pollabetplay`) | Independiente de todo lo demás. |
| Jobs periódicos de `notifications-svc` | GitHub Actions (`.github/workflows/notifications-cron.yml`) | Reemplaza el `setInterval` interno en producción. |

Render free tier duerme cada servicio tras 15 min sin tráfico (cold start de 30-60s en el primer request). Es un trade-off aceptado a cambio de $0 — el cron de GitHub Actions le pega a `notifications-svc` cada 5 min, así que en la práctica ese servicio queda casi siempre despierto.

## Orden de despliegue (primera vez)

1. **`security-api`** en Render — no depende de nadie más.
2. **`business-api`** en Render — necesita la URL pública de `security-api` (`SECURITY_API_URL`).
3. **`notifications-svc`** en Render — necesita la URL pública de `security-api` (`SECURITY_API_URL`).
4. Workflow de **GitHub Actions** — necesita la URL pública de `notifications-svc`.
5. Variables de entorno en **Vercel** — necesitan las URLs de `business-api` y `notifications-svc`, más un redeploy.

## Render

### Opción rápida: aplicar el Blueprint

El repo trae `render.yaml` en la raíz con los 3 servicios ya configurados (build/start command, health check, variables). En Render: **New → Blueprint**, conectar este repo, y aplicar. Render pedirá los valores de las variables marcadas `sync: false` (ver tabla abajo) — nunca se guardan en git.

Nota: si el Blueprint no valida (la sintaxis de `render.yaml` puede cambiar entre versiones de Render), crear los 3 servicios manualmente desde el dashboard como fallback, usando exactamente los mismos comandos que aparecen en `render.yaml`.

### Por qué el Root Directory queda en la raíz del repo

Cada microservicio depende de paquetes hermanos vía `file:../shared/...` en su `package.json` (ver `services/shared/`). Render **no da acceso a nada fuera del Root Directory** configurado — por eso el Root Directory se deja en la raíz del monorepo y el build/start command hace `cd services/<servicio>` explícitamente, en vez de fijar un Root Directory por servicio (eso rompería el `npm install` de los paquetes `file:../shared/...`).

### Variables de entorno por servicio

Los valores reales de Firebase salen de Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada (mismo mecanismo que ya se usaba con Railway/Vercel). **`FIREBASE_ADMIN_PRIVATE_KEY` debe pegarse con los `\n` como texto literal** (una sola línea), no como saltos de línea reales — el código hace `.replace(/\\n/g, "\n")`.

**`security-api`**
```
FIREBASE_ADMIN_PROJECT_ID=pollabetplay
FIREBASE_ADMIN_CLIENT_EMAIL=<client_email de la service account>
FIREBASE_ADMIN_PRIVATE_KEY=<private_key con \n literales>
INTERNAL_AUTH_SECRET=<generar con: openssl rand -base64 48>
```

**`business-api`**
```
FIREBASE_ADMIN_PROJECT_ID=pollabetplay
FIREBASE_ADMIN_CLIENT_EMAIL=<...>
FIREBASE_ADMIN_PRIVATE_KEY=<...>
SECURITY_API_URL=<URL pública de security-api en Render>
```

**`notifications-svc`**
```
FIREBASE_ADMIN_PROJECT_ID=pollabetplay
FIREBASE_ADMIN_CLIENT_EMAIL=<...>
FIREBASE_ADMIN_PRIVATE_KEY=<...>
SECURITY_API_URL=<URL pública de security-api en Render>
USE_EXTERNAL_SCHEDULER=true
CRON_SECRET=<generar con: openssl rand -base64 48>
```

No definir `FIRESTORE_EMULATOR_HOST` ni `FIREBASE_AUTH_EMULATOR_HOST` en ninguno de los 3 — su ausencia hace que se usen las credenciales reales en vez del emulador.

Todos exponen `GET /health` — configurado como Health Check Path en `render.yaml`.

## GitHub Actions (cron de notifications-svc)

En este repo → Settings → Secrets and variables → Actions:
- **Variable** `NOTIFICATIONS_API_URL`: URL pública de `notifications-svc` en Render (ej. `https://polla-notifications-svc.onrender.com`).
- **Secret** `NOTIFICATIONS_CRON_SECRET`: mismo valor que `CRON_SECRET` en Render.

El workflow (`.github/workflows/notifications-cron.yml`) corre cada 5 minutos y también se puede disparar manualmente desde la pestaña **Actions → notifications-cron → Run workflow** para probarlo sin esperar.

## Vercel (frontend)

Actualizar en Project Settings → Environment Variables (entorno Production, y Preview si aplica):
- `BUSINESS_API_URL` = URL pública de `business-api` en Render (server-side, usada por el rewrite de `next.config.ts`).
- `NEXT_PUBLIC_NOTIFICATIONS_API_URL` = URL pública de `notifications-svc` en Render.

**`NEXT_PUBLIC_NOTIFICATIONS_API_URL` se inyecta en build time** (Next.js la reemplaza estáticamente en el bundle de cliente) — cambiarla en el dashboard sin redeploy no tiene efecto. Después de actualizar ambas variables, disparar un **Redeploy** desde Vercel.

Esto es completamente transparente para los usuarios de la PWA: el frontend sigue en el mismo dominio de siempre, el service worker solo cachea assets estáticos (no la config de backend), y al volver a abrir la app el navegador simplemente pide el HTML/JS más reciente. Nadie reinstala nada.

## Runbook: rotar `CRON_SECRET` o `INTERNAL_AUTH_SECRET`

1. Generar un nuevo valor (`openssl rand -base64 48`).
2. Actualizarlo en Render (el/los servicio(s) que lo usan) y esperar a que redeploye.
3. Si es `CRON_SECRET`, actualizar también el secret `NOTIFICATIONS_CRON_SECRET` en GitHub Actions.
4. Si es `INTERNAL_AUTH_SECRET`, debe coincidir exactamente en `security-api` (donde se firma) — este proyecto no comparte ese secreto con otros servicios, solo `security-api` lo usa para firmar/verificar su propio JWT interno.

## Troubleshooting

- **401 en `/internal/outbox/drain-now` o `/internal/match-schedule/check-now`**: `CRON_SECRET` (Render) y `NOTIFICATIONS_CRON_SECRET` (GitHub) no coinciden.
- **503 en esos mismos endpoints**: `CRON_SECRET` no está configurado en Render.
- **Notificaciones no llegan pese a que el workflow corre en verde**: revisar logs del servicio `notifications-svc` en Render, y confirmar que `SECURITY_API_URL` apunta a la URL correcta de `security-api`.
- **Primer request muy lento tras un rato sin uso**: esperado, el servicio en Render estaba dormido (free tier). El siguiente request ya es rápido.
