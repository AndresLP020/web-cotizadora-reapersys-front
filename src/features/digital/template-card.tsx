import { ArrowUpRight, Globe, ImageOff, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { templateImageUrl } from "@/services/digital";
import type { PublicDigitalTemplate } from "@/types/digital";
import { occasionLabels } from "./digital-labels";

/** Precio de la plantilla («$299 MXN», «$150 MXN por tarjeta» o «Por cotizar»). */
export function TemplatePrice({ template, className }: { template: PublicDigitalTemplate; className?: string }) {
  if (template.priceCents === null) return <span className={cn("text-sm font-medium text-foreground-secondary", className)}>Por cotizar</span>;
  return (
    <span className={cn("flex flex-wrap items-baseline gap-x-1", className)}>
      <span className="font-heading text-xl font-semibold text-foreground">{formatMoney(template.priceCents)}</span>
      <span className="text-xs text-muted-foreground">MXN{template.kind === "nfc_card" ? " por tarjeta" : ""}</span>
    </span>
  );
}

/**
 * Vista previa del enlace de la plantilla, como la que muestra WhatsApp al compartir un link:
 * imagen de la página, título, descripción y dominio. La imagen y «Ver demo» abren la demo.
 */
export function TemplateCard({ template, onOrder }: { template: PublicDigitalTemplate; onOrder: (template: PublicDigitalTemplate) => void }) {
  const image = templateImageUrl(template.imagePath);
  const demoLabel = `Ver la demo de ${template.name} (se abre en otra pestaña)`;

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border bg-card text-foreground shadow-card transition-[border-color,transform,box-shadow] duration-300",
        "hover:-translate-y-1 hover:border-royal/40 hover:shadow-elevated motion-reduce:hover:translate-y-0",
        template.featured ? "border-royal/50 ring-1 ring-royal/20" : "border-border",
      )}
    >
      <a href={template.demoUrl} target="_blank" rel="noopener noreferrer" aria-label={demoLabel} className="relative block aspect-[1.91/1] overflow-hidden bg-mist">
        {image ? (
          // Imagen servida por la API (vista previa leída o captura subida): no pasa por el optimizador de Next.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
          />
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-8" aria-hidden />
            <span className="text-xs">{template.domain}</span>
          </span>
        )}
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-navy/80 px-2.5 py-1 text-xs font-medium text-snow opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Ver demo <ArrowUpRight className="size-3.5" aria-hidden />
        </span>
      </a>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{occasionLabels[template.occasion] ?? template.occasion}</Badge>
          {template.featured && (
            <Badge className="bg-sky text-royal">
              <Sparkles aria-hidden /> Destacada
            </Badge>
          )}
        </div>
        <div className="space-y-1.5">
          <h3 className="font-heading text-lg font-semibold text-navy">{template.name}</h3>
          {template.description && <p className="line-clamp-3 text-sm leading-relaxed text-foreground-secondary">{template.description}</p>}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="size-3.5" aria-hidden /> {template.domain}
        </p>
        {template.customizableFields.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Personalizas: <span className="text-foreground-secondary">{template.customizableFields.join(", ")}</span>
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <TemplatePrice template={template} />
          <div className="flex gap-2">
            <Button asChild variant="glass" size="sm">
              <a href={template.demoUrl} target="_blank" rel="noopener noreferrer" aria-label={demoLabel}>
                Ver demo <ArrowUpRight data-icon="inline-end" />
              </a>
            </Button>
            <Button variant="brand" size="sm" onClick={() => onOrder(template)}>
              Lo quiero
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Precio total estimado (solo informativo) para un pedido con cantidad. */
export function estimatedTotal(template: PublicDigitalTemplate, quantity: number): string | null {
  return template.priceCents === null ? null : formatMoney(template.priceCents * quantity);
}
