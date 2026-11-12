import { browserApiUrl, publicEnv } from "@/lib/env";
import type { NfcPriceTier, Occasion, PublicDigitalTemplate, PublicNfcDesign } from "@/types/digital";

const apiBase = process.env.API_INTERNAL_URL || publicEnv.NEXT_PUBLIC_API_URL;

export type Loaded<T> = { status: "ok"; data: T } | { status: "unavailable" };

/** Lectura en cada solicitud: el catálogo se edita desde el panel. */
async function load<T>(path: string): Promise<Loaded<T>> {
  try {
    const response = await fetch(`${apiBase}${path}`, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return { status: "unavailable" };
    return { status: "ok", data: (await response.json()) as T };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getDigitalTemplates(): Promise<Loaded<PublicDigitalTemplate[]>> {
  const result = await load<{ items: PublicDigitalTemplate[] }>("/digital-templates");
  return result.status === "ok" ? { status: "ok", data: result.data.items } : result;
}

export async function getOccasions(): Promise<Loaded<Occasion[]>> {
  const result = await load<{ items: Occasion[] }>("/occasions");
  return result.status === "ok" ? { status: "ok", data: result.data.items } : result;
}

export async function getNfcDesigns(): Promise<Loaded<PublicNfcDesign[]>> {
  const result = await load<{ items: PublicNfcDesign[] }>("/nfc-designs");
  return result.status === "ok" ? { status: "ok", data: result.data.items } : result;
}

export async function getNfcPricing(): Promise<Loaded<NfcPriceTier[]>> {
  const result = await load<{ tiers: NfcPriceTier[] }>("/nfc-pricing");
  return result.status === "ok" ? { status: "ok", data: result.data.tiers } : result;
}

/** URL de una imagen servida por la API (portadas, íconos, caras de la tarjeta). */
export function apiAssetUrl(path: string | null | undefined): string | null {
  return path ? `${browserApiUrl}${path}` : null;
}

/** Precio publicado más bajo (null si ninguno tiene precio). */
export function lowestPrice(prices: (number | null)[]): number | null {
  const known = prices.filter((p): p is number => p !== null);
  return known.length > 0 ? Math.min(...known) : null;
}
