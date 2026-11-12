"use client";

import { ArrowRight, Check, ChevronDown, Gift, Info } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PackageCategory, PublicPackage, PublicSubscriptionOffer } from "@/types/catalog";
import { isAdvisory, type PackageTheme, PACKAGE_THEMES, type PayMode, priceView } from "./package-logic";

export { MonthlyTag, PriceTag } from "./price-tags";

export const categoryLabels: Record<PackageCategory, string> = {
  web: "Desarrollo web",
  ecommerce: "E-commerce",
  pos: "Punto de venta",
  combo: "Paquete combinado",
  custom: "A la medida",
};

export interface PlanSettings {
  minimumTermMonths: number;
  monthToMonthSurchargeBp: number;
  semiannualDiscountBp: number;
  annualDiscountBp: number;
}

/** Planes disponibles, en una línea. */
export function plansSummary(plans: PlanSettings): string {
  const pct = (bp: number) => `${bp / 100} %`;
  return `Mensual, semestral cada 6 meses (−${pct(plans.semiannualDiscountBp)}) o anual cada 12 meses (−${pct(plans.annualDiscountBp)}).`;
}

/** Qué cubre la mensualidad, en una línea. */
export function subscriptionSummary(offer: PublicSubscriptionOffer): string {
  if (offer.softwareOnly) {
    const annual = offer.infrastructureAnnualCents != null ? `dominio y hosting ${formatMoney(offer.infrastructureAnnualCents)} al año` : null;
    const parts = ["Solo el software, sin equipo", "soporte al usuario incluido", annual].filter(Boolean);
    return `${parts.join(" · ")}.`;
  }
  const covers = [
    offer.includesHosting && "hosting",
    offer.storageGb > 0 && `${offer.storageGb} GB de almacenamiento`,
    offer.includesDomain && "dominio",
    "mantenimiento",
  ].filter(Boolean);
  const parts = [`Incluye ${covers.join(", ")}`];
  if (offer.hardwareUpfront) parts.push("el equipo se paga de contado");
  return `${parts.join(" · ")}.`;
}

/** Puntos visibles antes de «Ver todo lo que incluye». */
const VISIBLE_FEATURES = 5;

/** Navegador simplificado (decorativo) en el color de la categoría. */
export function PackageIllustration({ theme, label }: { theme: PackageTheme; label: string }) {
  return (
    <div className="relative h-[150px] overflow-hidden rounded-t-3xl" style={{ background: theme.bg }}>
      <span className="absolute top-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-deep shadow-sm">{label}</span>
      <div aria-hidden className="absolute bottom-0 left-6 h-[112px] w-[62%] max-w-[240px] rounded-t-xl border border-b-0 border-black/5 bg-white shadow-[0_10px_30px_rgba(10,15,30,0.08)]">
        <div className="flex gap-1.5 border-b border-black/5 px-3 py-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 rounded-full" style={{ background: theme.accent, opacity: 0.35 + i * 0.2 }} />
          ))}
        </div>
        <div className="flex gap-3 p-3">
          <div className="flex-1 space-y-1.5">
            <span className="block h-2 w-4/5 rounded-full" style={{ background: theme.accent, opacity: 0.85 }} />
            <span className="block h-1.5 w-full rounded-full bg-black/8" />
            <span className="block h-1.5 w-3/5 rounded-full bg-black/8" />
            <span className="mt-2 block h-4 w-14 rounded-md" style={{ background: theme.accent }} />
          </div>
          <div className="grid w-[42%] grid-cols-2 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="aspect-square rounded-md" style={{ background: theme.bg }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ feature }: { feature: string }) {
  return (
    <li className="flex gap-2.5">
      <Check className="mt-0.5 size-4 shrink-0 text-royal" aria-hidden />
      <span className="text-deep-muted">{feature}</span>
    </li>
  );
}

/** Los primeros puntos y, debajo, el resto desplegable en la misma tarjeta. */
function FeatureList({ features }: { features: string[] }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const visible = features.slice(0, VISIBLE_FEATURES);
  const more = features.slice(VISIBLE_FEATURES);
  return (
    <div className="text-sm">
      <ul className="space-y-2.5">
        {visible.map((feature) => (
          <FeatureItem key={feature} feature={feature} />
        ))}
      </ul>
      {more.length > 0 && (
        <>
          <ul id={id} hidden={!open} className="mt-2.5 space-y-2.5">
            {more.map((feature) => (
              <FeatureItem key={feature} feature={feature} />
            ))}
          </ul>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((o) => !o)}
            className="mt-3 inline-flex min-h-11 items-center gap-1 font-semibold text-royal underline-offset-4 hover:underline"
          >
            {open ? "Ver menos" : `Ver todo lo que incluye (${features.length})`}
            <ChevronDown className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}

/** Notas legales (equipo aparte, comisiones de pasarelas…) en un texto pequeño desplegable, fuera de la tarjeta. */
function Conditions({ notes }: { notes: string[] }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  if (notes.length === 0) return null;
  return (
    <div className="mt-2 px-2 text-xs text-deep-muted">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-1.5 font-medium hover:text-deep"
      >
        <Info className="size-3.5" aria-hidden />
        Condiciones
        <ChevronDown className={cn("size-3.5 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
      </button>
      <ul id={id} hidden={!open} className="space-y-1 pb-2">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Tarjeta de paquete. Todo sale de la API: precio según la modalidad, renta, puntos,
 * complementos incluidos y condiciones. `mode` = «compra» (por defecto) o «renta».
 */
export function PackageCard({
  pkg,
  mode = "compra",
  theme,
  highlighted = false,
  className,
}: {
  pkg: PublicPackage;
  mode?: PayMode;
  theme?: PackageTheme;
  highlighted?: boolean;
  className?: string;
}) {
  const view = priceView(pkg, mode);
  const tone = theme ?? (isAdvisory(pkg) ? PACKAGE_THEMES.advisory : pkg.category === "combo" ? PACKAGE_THEMES.web : PACKAGE_THEMES[pkg.category]);
  return (
    <div id={`paquete-${pkg.slug}`} className={cn("flex scroll-mt-28 flex-col", className)}>
      <article
        className={cn(
          "flex h-full flex-col rounded-3xl border bg-white text-deep transition-[box-shadow,border-color] duration-500 motion-reduce:transition-none",
          highlighted ? "border-plan shadow-[0_0_0_4px_rgba(47,91,234,0.25)]" : "border-paper-line",
        )}
      >
        <PackageIllustration theme={tone} label={categoryLabels[pkg.category]} />
        <div className="flex flex-1 flex-col p-6 sm:p-7">
          <h3 className="font-heading text-2xl font-semibold tracking-[-0.02em]">{pkg.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-deep-muted">{pkg.tagline ?? pkg.summary}</p>

          <div className="mt-5 rounded-2xl bg-price-bg p-4">
            <p className="text-xs font-semibold tracking-wide text-deep-muted uppercase">{view.label}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-heading text-[34px] leading-tight font-semibold tracking-[-0.02em]">{view.main}</span>
              {view.unit && <span className="text-sm text-deep-muted">{view.unit}</span>}
            </p>
            <p className="mt-1 text-sm text-deep-muted">{view.alt}</p>
          </div>

          {pkg.includedValueCents > 0 && (
            <p className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-save-bg px-3 py-1.5 text-sm font-medium text-save-ink">
              <Gift className="size-4 shrink-0" aria-hidden />
              Incluye {formatMoney(pkg.includedValueCents)} en complementos
            </p>
          )}

          <div className="mt-5 mb-6">
            <FeatureList features={pkg.features} />
          </div>

          <Link
            href={view.cta.href}
            className="mt-auto inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-deep px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {view.cta.label}
            <ArrowRight className="size-4" aria-hidden />
            <span className="sr-only">: {pkg.name}</span>
          </Link>
        </div>
      </article>
      <Conditions notes={pkg.notes} />
    </div>
  );
}
