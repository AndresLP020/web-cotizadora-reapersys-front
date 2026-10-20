import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1").origin;
/**
 * Origen de la API real a la que se reenvía `/api/v1/*` (p. ej. https://reapersys-api.onrender.com).
 * Con él, el navegador solo habla con este mismo dominio: la cookie de sesión del panel es de primera parte
 * aunque la API viva en otro dominio (Vercel → Render). Sin él no hay reenvío (desarrollo local).
 */
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/+$/, "");
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Content Security Policy sin nonces: un nonce obligaría a renderizar cada página por petición
 * y se perderían el prerenderizado y la navegación instantánea del sitio público.
 * Por eso script-src admite inline (hidratación de Next y JSON-LD), pero todo lo demás se restringe:
 * solo se conecta a la propia API, no se puede embeber el sitio ni enviar formularios a terceros.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin}${isDev ? " ws: wss:" : ""}`,
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(siteUrl.startsWith("https://") ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(siteUrl.startsWith("https://") ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Servidor autocontenido para la imagen de Docker; Vercel usa su propio empaquetado.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return apiProxyTarget ? [{ source: "/api/v1/:path*", destination: `${apiProxyTarget}/api/v1/:path*` }] : [];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
