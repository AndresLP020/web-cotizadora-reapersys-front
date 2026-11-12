import { browserApiUrl, publicEnv } from "@/lib/env";
import type { DigitalKind, PublicDigitalTemplate } from "@/types/digital";

const apiBase = process.env.API_INTERNAL_URL || publicEnv.NEXT_PUBLIC_API_URL;

export type DigitalCatalogResult = { status: "ok"; items: PublicDigitalTemplate[] } | { status: "unavailable" };

/** Plantillas publicadas, leídas en cada solicitud (se agregan y editan desde el panel). */
export async function getDigitalTemplates(kind: DigitalKind): Promise<DigitalCatalogResult> {
  try {
    const response = await fetch(`${apiBase}/digital-templates?kind=${kind}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return { status: "unavailable" };
    const body = (await response.json()) as { items: PublicDigitalTemplate[] };
    return { status: "ok", items: body.items };
  } catch {
    return { status: "unavailable" };
  }
}

/** URL absoluta de la imagen de vista previa (la sirve la API). */
export function templateImageUrl(imagePath: string | null): string | null {
  return imagePath ? `${browserApiUrl}${imagePath}` : null;
}
