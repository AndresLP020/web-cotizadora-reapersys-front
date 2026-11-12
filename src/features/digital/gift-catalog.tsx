"use client";

import { ExternalLink, Gift, Link2 } from "lucide-react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { apiAssetUrl } from "@/services/digital";
import type { Occasion, PublicDigitalTemplate } from "@/types/digital";
import { TemplateThumb } from "./gift-visuals";
import { FIELD_SHORT } from "./labels";
import { PhoneMockup } from "./phone-mockup";

export function priceLabel(priceCents: number | null): string {
  return priceCents === null ? "Por cotizar" : `${formatMoney(priceCents)} MXN`;
}

/** Filtros, contador y cuadrícula del catálogo de plantillas. */
export function GiftCatalog({
  templates,
  occasions,
  occasion,
  onOccasion,
  onChoose,
  unavailable,
}: {
  templates: PublicDigitalTemplate[];
  occasions: Occasion[];
  occasion: string | null;
  onOccasion: (slug: string | null) => void;
  onChoose: (template: PublicDigitalTemplate) => void;
  unavailable: boolean;
}) {
  // Solo se ofrecen las ocasiones que tienen plantillas publicadas.
  const used = occasions.filter((o) => templates.some((t) => t.occasions.includes(o.slug)));
  const visible = occasion ? templates.filter((t) => t.occasions.includes(occasion)) : templates;
  const labels = new Map(occasions.map((o) => [o.slug, o.label]));

  return (
    <section id="catalogo" aria-labelledby="catalogo-title" className="scroll-mt-24 bg-paper py-20 sm:py-24">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-gift-deep uppercase">Catálogo de plantillas</p>
            <h2 id="catalogo-title" tabIndex={-1} className="mt-3 outline-none text-4xl font-semibold tracking-[-0.03em] text-deep sm:text-5xl">
              Elige el detalle
            </h2>
          </div>
          <p className="max-w-sm text-deep-muted">
            Toca la vista previa o «Ver demo» para abrir la página real. Cuando la tengas, presiona «Lo quiero».
          </p>
        </div>

        {unavailable ? (
          <EmptyCatalog message="No pudimos cargar el catálogo en este momento. Intenta de nuevo en unos minutos." />
        ) : templates.length === 0 ? (
          <EmptyCatalog message="Pronto publicaremos plantillas. Mientras tanto, cuéntanos tu idea y la diseñamos a tu medida." />
        ) : (
          <>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <div role="group" aria-label="Filtrar por ocasión" className="flex flex-wrap gap-2">
                {[null, ...used.map((o) => o.slug)].map((slug) => {
                  const active = occasion === slug;
                  return (
                    <button
                      key={slug ?? "todos"}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onOccasion(slug)}
                      className={cn(
                        "h-11 rounded-full border px-5 text-sm font-medium transition-colors",
                        active ? "border-deep bg-deep text-white" : "border-paper-line bg-white text-deep hover:border-deep/40",
                      )}
                    >
                      {slug ? labels.get(slug) : "Todos"}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-deep-muted" aria-live="polite">
                {visible.length} {visible.length === 1 ? "plantilla" : "plantillas"}
              </p>
            </div>
            <ul className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((template) => (
                <li key={template.slug} className="flex min-w-0">
                  <TemplateCard template={template} occasionLabel={labels.get(template.occasions[0] ?? "") ?? null} onChoose={onChoose} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function EmptyCatalog({ message }: { message: string }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-paper-line bg-white px-6 py-14 text-center">
      <Gift className="size-8 text-gift-deep" aria-hidden />
      <p className="max-w-md text-deep-muted">{message}</p>
      <Link href="/contacto" className="inline-flex h-11 items-center rounded-xl bg-deep px-5 text-sm font-semibold text-white hover:opacity-90">
        Contáctanos
      </Link>
    </div>
  );
}

function TemplateCard({
  template,
  occasionLabel,
  onChoose,
}: {
  template: PublicDigitalTemplate;
  occasionLabel: string | null;
  onChoose: (template: PublicDigitalTemplate) => void;
}) {
  // Solo una portada subida (vertical) va dentro del celular; la og:image es horizontal.
  const image = template.preview.imageSource === "upload" ? apiAssetUrl(template.preview.imagePath) : null;
  const favicon = apiAssetUrl(template.preview.faviconPath);
  const domain = template.preview.domain ?? new URL(template.demoUrl).hostname.replace(/^www\./, "");
  const personalizes = template.fields.map((f) => FIELD_SHORT[f.key]).join(", ");

  return (
    <article className="flex w-full min-w-0 flex-col overflow-hidden rounded-3xl border border-paper-line bg-white">
      {/* a) Vista previa: abre la demo real */}
      <a
        href={template.demoUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir demo de ${template.name}`}
        className="group relative grid h-[300px] place-items-center overflow-hidden"
        style={{ background: template.colors.stage }}
      >
        {occasionLabel && (
          <span className="absolute top-4 left-4 z-10 rounded-full bg-white px-3 py-1 text-xs font-semibold text-deep shadow-sm">{occasionLabel}</span>
        )}
        <PhoneMockup width={132} className="translate-y-[18%] transition-transform duration-300 group-hover:-translate-y-1">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen de la vista previa servida por la API
            <img src={image} alt="" className="size-full object-cover" />
          ) : (
            <TemplateThumb colors={template.colors} label="Para ti" title={template.name} hint="Toca para abrir" scale={0.62} />
          )}
        </PhoneMockup>
      </a>

      {/* b) Barra de vista previa del link */}
      <a
        href={template.demoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 border-y border-paper-line bg-[#F6F7FA] px-4 py-3 hover:bg-paper"
      >
        {favicon ? (
          // eslint-disable-next-line @next/next/no-img-element -- ícono del sitio de la demo (guardado en la API)
          <img src={favicon} alt="" className="size-7 shrink-0 rounded-md bg-white object-contain p-0.5" />
        ) : (
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-md bg-deep font-heading text-xs font-bold text-white">
            R
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-deep">{template.preview.title ?? template.name}</span>
          <span className="block truncate text-xs text-deep-muted">
            {domain}
            {template.preview.path !== "/" ? template.preview.path : ""}
          </span>
        </span>
        <ExternalLink className="size-4 shrink-0 text-deep-muted" aria-hidden />
        <span className="sr-only">(se abre en otra pestaña)</span>
      </a>

      {/* c) Cuerpo */}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-heading text-[22px] font-semibold tracking-[-0.02em] text-deep">{template.name}</h3>
        {template.description && <p className="mt-2 text-sm leading-relaxed text-deep-muted">{template.description}</p>}
        {personalizes && (
          <p className="mt-3 text-sm text-deep-muted">
            <span className="font-medium text-deep">Personalizas:</span> {personalizes}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
          <p className="font-heading text-lg font-semibold text-deep">{priceLabel(template.priceCents)}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={template.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-paper-line px-4 text-sm font-semibold text-deep hover:bg-paper"
            >
              <Link2 className="size-4" aria-hidden />
              Ver demo
              <span className="sr-only">de {template.name} (se abre en otra pestaña)</span>
            </a>
            <button
              type="button"
              onClick={() => onChoose(template)}
              className="inline-flex h-11 items-center rounded-xl bg-deep px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              Lo quiero
              <span className="sr-only">: {template.name}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Esqueleto del catálogo (misma forma que las tarjetas). */
export function GiftCatalogSkeleton() {
  return (
    <section className="bg-paper py-20 sm:py-24" aria-busy="true" aria-label="Cargando plantillas">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <div className="h-24 w-72 animate-pulse rounded-2xl bg-white" />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-3xl border border-paper-line bg-white">
              <div className="h-[300px] animate-pulse bg-paper" />
              <div className="h-14 border-y border-paper-line bg-[#F6F7FA]" />
              <div className="space-y-3 p-6">
                <div className="h-6 w-2/3 animate-pulse rounded bg-paper" />
                <div className="h-4 w-full animate-pulse rounded bg-paper" />
                <div className="h-11 w-full animate-pulse rounded-xl bg-paper" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
