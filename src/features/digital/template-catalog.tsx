"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DigitalKind, PublicDigitalTemplate } from "@/types/digital";
import { OCCASIONS_BY_KIND, occasionLabels } from "./digital-labels";
import { OrderDialog } from "./order-dialog";
import { TemplateCard } from "./template-card";

/** Catálogo con filtro por ocasión; «Lo quiero» abre el formulario de pedido. */
export function TemplateCatalog({
  kind,
  templates,
  whatsappUrl,
  privacyNoticeAvailable,
}: {
  kind: DigitalKind;
  templates: PublicDigitalTemplate[];
  whatsappUrl: string | null;
  privacyNoticeAvailable: boolean;
}) {
  const [occasion, setOccasion] = useState<string | null>(null);
  const [ordering, setOrdering] = useState<PublicDigitalTemplate | null>(null);
  // Solo se ofrecen filtros con plantillas publicadas.
  const occasions = OCCASIONS_BY_KIND[kind].filter((o) => templates.some((t) => t.occasion === o));
  const visible = occasion ? templates.filter((t) => t.occasion === occasion) : templates;

  return (
    <>
      {occasions.length > 1 && (
        <div role="group" aria-label="Filtrar por ocasión" className="mb-8 flex flex-wrap gap-2">
          {[null, ...occasions].map((value) => (
            <button
              key={value ?? "all"}
              type="button"
              aria-pressed={occasion === value}
              onClick={() => setOccasion(value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                occasion === value ? "border-royal bg-royal text-snow" : "border-border bg-card text-foreground-secondary hover:border-electric/40 hover:text-foreground",
              )}
            >
              {value ? occasionLabels[value] : "Todas"}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((template) => (
          <TemplateCard key={template.slug} template={template} onOrder={setOrdering} />
        ))}
      </div>
      <OrderDialog template={ordering} onClose={() => setOrdering(null)} whatsappUrl={whatsappUrl} privacyNoticeAvailable={privacyNoticeAvailable} />
    </>
  );
}
