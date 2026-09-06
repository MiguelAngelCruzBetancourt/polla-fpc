import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const ONE_DAY_SECONDS = 24 * 60 * 60;

/**
 * Las reglas por defecto del plugin cachean las navegaciones con `NetworkFirst`
 * pero **sin `networkTimeoutSeconds`**, así que en una red móvil débil el
 * service worker espera la red indefinidamente antes de caer al caché — la app
 * se siente colgada justo en el caso de uso de una PWA. Estas entradas son las
 * mismas de siempre (mismo matcher, mismo handler, misma expiración) pero con
 * un timeout corto; al compartir `cacheName` con las default y usar
 * `extendDefaultRuntimeCaching`, reemplazan a las originales en vez de sumarse.
 */
const NAVIGATION_TIMEOUT_SECONDS = 3;

const navigationCacheOverrides = [
  {
    urlPattern: ({
      request,
      url: { pathname },
      sameOrigin,
    }: {
      request: Request;
      url: URL;
      sameOrigin: boolean;
    }) => request.headers.get("Next-Router-Prefetch") !== null && sameOrigin && !pathname.startsWith("/api/"),
    handler: "NetworkFirst" as const,
    options: {
      cacheName: "pages-rsc-prefetch",
      networkTimeoutSeconds: NAVIGATION_TIMEOUT_SECONDS,
      expiration: { maxEntries: 32, maxAgeSeconds: ONE_DAY_SECONDS },
    },
  },
  {
    urlPattern: ({
      request,
      url: { pathname },
      sameOrigin,
    }: {
      request: Request;
      url: URL;
      sameOrigin: boolean;
    }) => request.headers.get("RSC") === "1" && sameOrigin && !pathname.startsWith("/api/"),
    handler: "NetworkFirst" as const,
    options: {
      cacheName: "pages-rsc",
      networkTimeoutSeconds: NAVIGATION_TIMEOUT_SECONDS,
      expiration: { maxEntries: 32, maxAgeSeconds: ONE_DAY_SECONDS },
    },
  },
  {
    urlPattern: ({ url: { pathname }, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
      sameOrigin && !pathname.startsWith("/api/"),
    handler: "NetworkFirst" as const,
    options: {
      cacheName: "pages",
      networkTimeoutSeconds: NAVIGATION_TIMEOUT_SECONDS,
      expiration: { maxEntries: 32, maxAgeSeconds: ONE_DAY_SECONDS },
    },
  },
];

const nextConfig: NextConfig = {
  // El plugin de PWA solo modifica webpack (usado en `next build --webpack`);
  // esto silencia la advertencia de Turbopack durante `next dev`.
  turbopack: {},
  images: {
    // Los assets de marca/ilustraciones en public/assets son SVG propios (no subidos por usuarios).
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    // Por defecto Next usa `dynamic: 0`, o sea que el Router Cache del cliente no
    // reutiliza nada: ir Partidos -> Ranking -> Partidos dispara 3 RSC fetch en vez
    // de 2. Las rutas de sala son dinámicas, así que sin esto cada cambio de
    // pestaña vuelve a pedir el segmento al servidor.
    staleTimes: { dynamic: 30 },
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // Mantiene el resto de reglas por defecto y solo pisa las que comparten cacheName.
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: navigationCacheOverrides,
  },
});

export default withPWA(nextConfig);
