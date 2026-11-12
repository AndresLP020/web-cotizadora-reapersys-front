"use client";

import { ArrowRight, Check, CreditCard, MessageCircle, Minus, Repeat, Sparkles, Wrench } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PackageCategory, PublicPackage, PublicPackageDetail } from "@/types/catalog";
import { PackageCard, type PlanSettings } from "./package-card";
import {
  CATEGORY_ORDER,
  cellStatus,
  COMPARE_ROWS,
  comboOnlyItems,
  comboSavings,
  FILTERS,
  type PayMode,
  pct,
  priceView,
  rentalState,
  themeFor,
} from "./package-logic";

interface Props {
  packages: PublicPackage[];
  /** Detalle del combo y de sus paquetes contenidos (para la lista exclusiva y la comparativa). */
  details: PublicPackageDetail[];
  plans: PlanSettings;
  whatsappUrl: string | null;
}

const MODE_NOTES: Record<PayMode, string> = {
  compra: "Pagas una vez y el sistema es tuyo.",
  renta: "Cuota mensual con mantenimiento incluido.",
};

/** Escribe en la URL sin volver a pedir la página (Next sincroniza useSearchParams). */
function writeParam(params: URLSearchParams, key: string, value: string | null) {
  const next = new URLSearchParams(params.toString());
  if (value) next.set(key, value);
  else next.delete(key);
  const query = next.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
}

export function PackagesExperience({ packages, details, plans, whatsappUrl }: Props) {
  const params = useSearchParams();
  const mode: PayMode = params.get("modalidad") === "renta" ? "renta" : "compra";
  const filter = FILTERS.find((f) => f.param !== null && f.param === params.get("categoria")) ?? FILTERS[0]!;
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const combo = packages.find((p) => p.category === "combo") ?? null;
  const comboDetail = combo ? (details.find((d) => d.slug === combo.slug) ?? null) : null;
  const grid = packages
    .filter((p) => p.category !== "combo")
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.sortOrder - b.sortOrder);
  const visible = filter.value ? grid.filter((p) => p.category === filter.value) : grid;
  const first = (category: PackageCategory) => grid.find((p) => p.category === category);
  const web = grid.filter((p) => p.category === "web");

  /** Lleva a la tarjeta (quitando el filtro si la oculta) y la resalta un momento. */
  const goTo = (slug: string, elementId: string) => {
    const target = packages.find((p) => p.slug === slug);
    if (target && target.category !== "combo" && filter.value && filter.value !== target.category) writeParam(params, "categoria", null);
    requestAnimationFrame(() => {
      const element = document.getElementById(elementId);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      element?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
    });
    setHighlighted(slug);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHighlighted(null), 1800);
  };

  const shortcuts = [
    first("ecommerce") && { text: "Quiero vender en línea", target: first("ecommerce")!.name, slug: first("ecommerce")!.slug, id: `paquete-${first("ecommerce")!.slug}` },
    first("pos") && { text: "Cobro en mostrador", target: first("pos")!.name, slug: first("pos")!.slug, id: `paquete-${first("pos")!.slug}` },
    combo && { text: "Las dos cosas", target: combo.name, slug: combo.slug, id: "combo" },
    web[0] && {
      text: "Solo presencia web",
      target: web.length > 1 ? `${web[0].name} o ${web[1]!.name}` : web[0].name,
      slug: web[0].slug,
      id: `paquete-${web[0].slug}`,
    },
  ].filter(Boolean) as { text: string; target: string; slug: string; id: string }[];

  const comparePackages = combo
    ? [...combo.includesPackages.map((ref) => details.find((d) => d.slug === ref.slug)), comboDetail].filter((d): d is PublicPackageDetail => !!d)
    : [];
  const rentable = packages.filter((p) => rentalState(p) === "available");

  return (
    <>
      {/* 1. Hero */}
      <section className="relative isolate overflow-hidden bg-night bg-grid-night pt-28 pb-28 text-night-text sm:pt-36 sm:pb-32">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-new uppercase">Paquetes</p>
            <h1 className="mt-5 text-5xl leading-[1] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-[72px]">
              Elige un paquete
              <br />y hazlo tuyo
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-night-muted">
              Precios en MXN. En el cotizador agregas o quitas componentes, y lo que ya viene incluido nunca se cobra dos veces.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div role="group" aria-label="Modalidad de pago" className="inline-flex rounded-full border border-white/12 bg-white/6 p-1">
                {(["compra", "renta"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => writeParam(params, "modalidad", value === "compra" ? null : value)}
                    className={cn(
                      "h-11 rounded-full px-5 text-sm font-semibold transition-colors",
                      mode === value ? "bg-white text-deep" : "text-night-muted hover:text-night-text",
                    )}
                  >
                    {value === "compra" ? "Pago único" : "Renta mensual"}
                  </button>
                ))}
              </div>
              <p className="text-sm text-night-muted" aria-live="polite">
                {MODE_NOTES[mode]}
              </p>
            </div>
          </div>

          {shortcuts.length > 0 && (
            <nav aria-labelledby="atajos-title" className="rounded-[28px] border border-white/12 bg-white/6 p-6 backdrop-blur sm:p-7">
              <h2 id="atajos-title" className="font-heading text-xl font-semibold">
                ¿No sabes cuál elegir?
              </h2>
              <ul className="mt-4 space-y-2">
                {shortcuts.map((s) => (
                  <li key={s.slug}>
                    <a
                      href={`#${s.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        goTo(s.slug, s.id);
                      }}
                      className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-2 text-sm transition-colors hover:border-white/30 hover:bg-white/6"
                    >
                      <span className="text-night-muted">{s.text}</span>
                      <span className="flex items-center gap-1.5 text-right font-semibold">
                        {s.target}
                        <ArrowRight className="size-4 shrink-0" aria-hidden />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </section>

      {/* 2. Combo destacado */}
      {combo && <ComboBand combo={combo} detail={comboDetail} all={packages} mode={mode} plans={plans} highlighted={highlighted === combo.slug} />}

      {/* 3. Todos los paquetes */}
      <section aria-labelledby="todos-title" className="bg-paper pt-20 pb-20 sm:pb-24">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <h2 id="todos-title" className="text-4xl font-semibold tracking-[-0.03em] text-deep sm:text-5xl">
              Todos los paquetes
            </h2>
            <div role="group" aria-label="Filtrar por categoría" className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  aria-pressed={filter.label === f.label}
                  onClick={() => writeParam(params, "categoria", f.param)}
                  className={cn(
                    "h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                    filter.label === f.label ? "border-deep bg-deep text-white" : "border-paper-line bg-white text-deep hover:border-deep/40",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <p className="sr-only" aria-live="polite">
            {visible.length} paquetes
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-6 lg:justify-start">
            {visible.map((pkg) => (
              <PackageCard
                key={pkg.slug}
                pkg={pkg}
                mode={mode}
                theme={themeFor(pkg, grid.filter((p) => p.category === pkg.category).indexOf(pkg))}
                highlighted={highlighted === pkg.slug}
                className="min-w-0 flex-[1_1_360px] sm:max-w-[400px]"
              />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Comparativa */}
      {comparePackages.length > 1 && <Comparison packages={comparePackages} mode={mode} />}

      {/* 5. Formas de pago */}
      <section aria-labelledby="pago-title" className="bg-paper pb-20 sm:pb-24">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-royal uppercase">Formas de pago</p>
          <h2 id="pago-title" className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-deep sm:text-5xl">
            Compra o renta, tú decides
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-3xl border border-paper-line bg-white p-7">
              <CreditCard className="size-6 text-royal" aria-hidden />
              <p className="mt-4 text-xs font-semibold tracking-[0.16em] text-deep-muted uppercase">Pago único</p>
              <h3 className="mt-1 text-xl font-semibold text-deep">El sistema es tuyo</h3>
              <p className="mt-2 leading-relaxed text-deep-muted">Pagas una vez el desarrollo. El hosting y el mantenimiento se contratan aparte.</p>
            </div>
            <div className="rounded-3xl border border-paper-line bg-white p-7">
              <Repeat className="size-6 text-royal" aria-hidden />
              <p className="mt-4 text-xs font-semibold tracking-[0.16em] text-deep-muted uppercase">Renta mensual</p>
              <h3 className="mt-1 text-xl font-semibold text-deep">Empieza sin inversión fuerte</h3>
              <p className="mt-2 leading-relaxed text-deep-muted">Una cuota mensual con mantenimiento incluido.</p>
              {rentable.length > 0 && (
                <p className="mt-3 text-sm text-deep">
                  Disponible en: <span className="font-medium">{rentable.map((p) => p.name).join(", ")}</span>.
                </p>
              )}
            </div>
            <div className="rounded-3xl bg-night p-7 text-night-text">
              <Sparkles className="size-6 text-new" aria-hidden />
              <p className="mt-4 text-xs font-semibold tracking-[0.16em] text-night-muted uppercase">Descuentos en renta</p>
              <dl className="mt-3 space-y-2.5">
                <div className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-2.5">
                  <dt>Mensual</dt>
                  <dd className="text-night-muted">Precio de lista</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-2.5">
                  <dt>Semestral</dt>
                  <dd className="font-semibold text-save">−{pct(plans.semiannualDiscountBp)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt>Anual</dt>
                  <dd className="font-semibold text-save">−{pct(plans.annualDiscountBp)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Cierre */}
      <section className="bg-paper pb-24">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[32px] bg-night bg-grid-night p-8 text-night-text sm:p-12 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">¿Ningún paquete se ajusta?</h2>
              <p className="mt-3 max-w-xl text-night-muted">Arma tu solución desde cero en el cotizador o deja que un asesor la proponga.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={whatsappUrl ? `${whatsappUrl}?text=${encodeURIComponent("Hola, quiero que un asesor me proponga una solución.")}` : "/contacto"}
                {...(whatsappUrl ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-semibold hover:bg-white/10"
              >
                <MessageCircle className="size-4" aria-hidden />
                Hablar con un asesor
              </a>
              <Link href="/cotizador?desde=cero" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-deep hover:opacity-90">
                <Wrench className="size-4" aria-hidden />
                Armar desde cero
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------- combo

function ComboBand({
  combo,
  detail,
  all,
  mode,
  plans,
  highlighted,
}: {
  combo: PublicPackage;
  detail: PublicPackageDetail | null;
  all: PublicPackage[];
  mode: PayMode;
  plans: PlanSettings;
  highlighted: boolean;
}) {
  const view = priceView(combo, mode);
  const savings = comboSavings(combo, all);
  const exclusive = detail ? comboOnlyItems(detail) : [];
  return (
    <div className="relative z-10 -mt-12 bg-[linear-gradient(to_bottom,transparent_48px,var(--rs-paper)_48px)] px-4 sm:px-6">
      <section
        id="combo"
        aria-labelledby="combo-title"
        className={cn(
          "mx-auto grid w-full max-w-[1240px] scroll-mt-28 gap-8 rounded-[32px] border bg-combo p-6 text-night-text shadow-[0_30px_80px_rgba(4,8,20,0.45)] transition-[box-shadow] duration-500 sm:p-10 lg:grid-cols-[1.15fr_0.9fr_1fr] motion-reduce:transition-none",
          highlighted ? "border-plan shadow-[0_0_0_4px_rgba(47,91,234,0.45)]" : "border-[rgba(143,180,255,0.25)]",
        )}
      >
        <div className="flex flex-col">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-new px-3 py-1 text-xs font-semibold text-night">Mejor valor</span>
            {combo.includesPackages.length > 0 && (
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium">{combo.includesPackages.map((p) => shortName(p.name)).join(" + ")}</span>
            )}
          </div>
          <h2 id="combo-title" className="mt-5 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {combo.name}
          </h2>
          <p className="mt-3 leading-relaxed text-night-muted">{combo.tagline ?? combo.summary}</p>
          <p className="mt-6 text-xs font-semibold tracking-wide text-night-muted uppercase">{view.label}</p>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-heading text-[44px] leading-tight font-semibold tracking-[-0.03em] sm:text-[52px]">{view.main}</span>
            {view.unit && <span className="text-night-muted">{view.unit}</span>}
          </p>
          {mode === "compra" ? (
            savings ? (
              <p className="mt-1 flex flex-wrap gap-x-3 text-sm">
                <span className="text-night-muted line-through">{formatMoney(savings.separateCents)} por separado</span>
                <span className="font-semibold text-save">Ahorras {formatMoney(savings.savingCents)}</span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-night-muted">{view.alt}</p>
            )
          ) : rentalState(combo) === "available" ? (
            <p className="mt-1 text-sm text-night-muted">
              Incluye mantenimiento · semestral −{pct(plans.semiannualDiscountBp)} · anual −{pct(plans.annualDiscountBp)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-night-muted">{view.alt}</p>
          )}
          {combo.includedValueCents > 0 && (
            <p className="mt-3 w-fit rounded-full bg-[rgba(134,239,172,0.12)] px-3 py-1 text-sm font-medium text-save">
              Incluye {formatMoney(combo.includedValueCents)} en complementos
            </p>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={view.cta.href} className="inline-flex h-12 items-center gap-2 rounded-xl bg-plan px-5 text-sm font-semibold text-white hover:opacity-90">
              {view.cta.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a href="#comparar" className="inline-flex h-12 items-center rounded-xl border border-white/25 px-5 text-sm font-semibold hover:bg-white/10">
              Comparar con {combo.includesPackages.map((p) => shortName(p.name)).join(" y ")}
            </a>
          </div>
        </div>

        <ComboDiagram />

        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-new uppercase">Solo en la combinada</p>
          {exclusive.length > 0 ? (
            <ul className="mt-4 space-y-2.5 text-sm">
              {exclusive.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-save" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-4 space-y-2.5 text-sm">
              {combo.features.slice(0, 8).map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-save" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
          )}
          {combo.notes.length > 0 && (
            <details className="mt-5 text-xs text-night-muted">
              <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium">Condiciones</summary>
              <ul className="space-y-1">
                {combo.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </section>
    </div>
  );
}

/** «Punto de Venta (POS)» → «Punto de Venta»; «Tienda Virtual» → «Tienda». */
function shortName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "").replace(/^Tienda Virtual$/i, "Tienda");
}

/** Dos mini pantallas unidas a «Un catálogo e inventario» (decorativo). */
function ComboDiagram() {
  return (
    <div aria-hidden className="relative mx-auto hidden h-[300px] w-full max-w-[320px] sm:block lg:h-auto lg:min-h-[300px]">
      <svg className="absolute inset-0 size-full" viewBox="0 0 320 300" preserveAspectRatio="none" fill="none">
        <path d="M80 118 C80 170 160 160 160 222" stroke="rgba(143,180,255,0.6)" strokeWidth="2" strokeDasharray="5 6" />
        <path d="M240 118 C240 170 160 160 160 222" stroke="rgba(143,180,255,0.6)" strokeWidth="2" strokeDasharray="5 6" />
      </svg>
      <div className="absolute top-0 left-0 w-[46%] rounded-2xl border border-white/12 bg-white/6 p-3">
        <p className="text-[9px] font-semibold tracking-[0.16em] text-night-muted">TIENDA EN LÍNEA</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="aspect-square rounded-md bg-[rgba(143,180,255,0.22)]" />
          ))}
        </div>
      </div>
      <div className="absolute top-0 right-0 w-[46%] rounded-2xl border border-white/12 bg-white/6 p-3">
        <p className="text-[9px] font-semibold tracking-[0.16em] text-night-muted">CAJA · POS</p>
        <div className="mt-2 space-y-1.5">
          <span className="block h-1.5 w-full rounded-full bg-white/15" />
          <span className="block h-1.5 w-4/5 rounded-full bg-white/15" />
          <span className="block h-1.5 w-3/5 rounded-full bg-white/15" />
          <span className="mt-2 block h-5 w-full rounded-md bg-[#16A34A]" />
        </div>
      </div>
      <div className="absolute bottom-[22px] left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-semibold whitespace-nowrap text-deep shadow-lg">
        Un catálogo e inventario
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- comparativa

function Comparison({ packages, mode }: { packages: PublicPackageDetail[]; mode: PayMode }) {
  return (
    <section id="comparar" aria-labelledby="comparar-title" className="scroll-mt-24 bg-paper pb-20 sm:pb-24">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-royal uppercase">Compara</p>
        <h2 id="comparar-title" className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-deep sm:text-5xl">
          {packages.map((p) => shortName(p.name)).slice(0, -1).join(", ")} o los dos
        </h2>
        <div className="relative mt-10 overflow-x-auto rounded-3xl border border-paper-line bg-white" role="region" aria-labelledby="comparar-title" tabIndex={0}>
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Comparativa de lo que incluye cada paquete ({mode === "renta" ? "renta mensual" : "pago único"})
            </caption>
            <thead>
              <tr className="border-b border-paper-line">
                <th scope="col" className="w-[34%] p-5 align-bottom font-medium text-deep-muted">
                  Qué incluye
                </th>
                {packages.map((p) => {
                  const view = priceView(p, mode);
                  const isCombo = p.category === "combo";
                  return (
                    <th key={p.slug} scope="col" className={cn("p-5 align-bottom", isCombo && "bg-combo-col")}>
                      <span className="block font-heading text-lg font-semibold text-deep">{p.name}</span>
                      <span className={cn("mt-1 block font-heading text-xl font-semibold", isCombo ? "text-royal" : "text-deep")}>
                        {view.main}
                        {view.unit && <span className="ml-1 text-xs font-normal text-deep-muted">{view.unit}</span>}
                      </span>
                      <span className="block text-xs font-normal text-deep-muted">{view.label}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-paper-line last:border-0">
                  <th scope="row" className="p-5 font-medium text-deep">
                    {row.label}
                  </th>
                  {packages.map((p) => {
                    const cell = cellStatus(p, row);
                    return (
                      <td key={p.slug} className={cn("p-5", p.category === "combo" && "bg-combo-col")}>
                        {cell.status === "included" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-save-bg px-2.5 py-1 font-medium text-save-ink">
                            <Check className="size-4" aria-hidden />
                            {cell.label}
                          </span>
                        ) : cell.status === "addon" ? (
                          <span className="inline-flex items-center gap-1.5 text-deep-muted">
                            <Minus className="size-4" aria-hidden />
                            Complemento
                          </span>
                        ) : (
                          <span className="text-deep-muted">
                            <Minus className="inline size-4" aria-hidden />
                            <span className="sr-only">No aplica</span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-deep-muted">
          <span className="sm:hidden">Desliza la tabla para ver los tres paquetes. </span>«Complemento» = se agrega en el cotizador con su propio precio.
        </p>
      </div>
    </section>
  );
}

