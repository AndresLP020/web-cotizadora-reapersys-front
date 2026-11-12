import { z } from "zod";

/**
 * Variables públicas del frontend. Solo las NEXT_PUBLIC_* llegan al navegador,
 * por eso deben leerse con acceso estático (Next.js las reemplaza en build).
 * Nunca colocar secretos aquí. Los datos de contacto y redes NO van aquí:
 * se administran en /admin/configuracion (ver services/public-settings.ts).
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url().default("http://localhost:4000/api/v1"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || undefined,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
});

/**
 * Base de la API para el navegador (fetch, enlaces e imágenes).
 * Si la API se sirve a través del propio sitio (reenvío de Vercel), se usa la ruta relativa: así
 * cualquier dominio del despliegue (producción, alias `-git-main-…`, previews) llama a su mismo origen
 * y no a otro dominio, lo que evitaría CORS y la cookie de sesión del panel.
 */
export const browserApiUrl =
  new URL(publicEnv.NEXT_PUBLIC_API_URL).origin === new URL(publicEnv.NEXT_PUBLIC_SITE_URL).origin
    ? new URL(publicEnv.NEXT_PUBLIC_API_URL).pathname.replace(/\/+$/, "")
    : publicEnv.NEXT_PUBLIC_API_URL;
