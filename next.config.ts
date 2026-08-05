import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

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
  // Inerte salvo que LOCAL_SERVICES=true esté definida en el entorno (no
  // versionado) — reenvía /api/* hacia business-api (services/business-api) en
  // vez de las API routes propias. BUSINESS_API_URL permite apuntar tanto a
  // una instancia local (default) como a una desplegada (ej. Railway).
  async rewrites() {
    if (process.env.LOCAL_SERVICES !== "true") return { beforeFiles: [] };
    const businessApiUrl = process.env.BUSINESS_API_URL ?? "http://localhost:4002";
    return {
      beforeFiles: [{ source: "/api/:path*", destination: `${businessApiUrl}/:path*` }],
    };
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

export default withPWA(nextConfig);
