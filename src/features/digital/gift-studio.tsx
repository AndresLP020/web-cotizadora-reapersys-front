"use client";

import { useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import type { Occasion, PublicDigitalTemplate } from "@/types/digital";
import { GiftCatalog } from "./gift-catalog";
import { GiftPersonalize } from "./gift-personalize";

/**
 * Catálogo + personalización. El filtro (?ocasion=) y la plantilla elegida (?plantilla=) viven
 * en la URL: se pueden compartir y sobreviven a recargar la página.
 */
export function GiftStudio({
  templates,
  occasions,
  unavailable,
  privacyNoticeAvailable,
}: {
  templates: PublicDigitalTemplate[];
  occasions: Occasion[];
  unavailable: boolean;
  privacyNoticeAvailable: boolean;
}) {
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const occasion = params.get("ocasion");
  const validOccasion = occasion && occasions.some((o) => o.slug === occasion) ? occasion : null;
  const chosen = templates.find((t) => t.slug === params.get("plantilla")) ?? templates.find((t) => t.featured) ?? templates[0] ?? null;

  // history.replaceState se integra con el router de Next (useSearchParams se actualiza) sin volver a pedir la página.
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  };

  const scrollTo = (id: string, focusId?: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  };

  return (
    <>
      <GiftCatalog
        templates={templates}
        occasions={occasions}
        occasion={validOccasion}
        unavailable={unavailable}
        onOccasion={(slug) => setParam("ocasion", slug)}
        onChoose={(template) => {
          setParam("plantilla", template.slug);
          scrollTo("personaliza", "personaliza-title");
        }}
      />
      <GiftPersonalize template={chosen} privacyNoticeAvailable={privacyNoticeAvailable} onChange={() => scrollTo("catalogo", "catalogo-title")} />
    </>
  );
}
