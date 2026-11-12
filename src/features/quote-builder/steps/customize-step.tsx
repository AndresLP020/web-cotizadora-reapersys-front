"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, ChevronDown, CircleCheck, Undo2, X } from "lucide-react";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceTag } from "@/features/packages/package-card";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { quoteApi } from "@/services/quotes";
import type { PackageCategory } from "@/types/catalog";
import type { PublicComponent, PublicPackageDetail, PublicPackageItem } from "@/types/quote";
import { ChoiceCard, PaymentModeToggle, PlanPicker, QuantityStepper, StepHeader } from "../controls";
import { LiveSummary, MobileSummaryBar } from "../live-summary";
import { RecurringComparison, recurringScope } from "../recurring-comparison";
import { INTEGRATION_SLUGS, recurringApplies } from "../recurring-policy";
import { INFRASTRUCTURE_SLUGS, useQuoteStore } from "../store";
import { useQuotePreview } from "../use-quote-preview";

/**
 * Categorías de complementos para una solución desde cero. Los paquetes ofrecen solo sus
 * propios complementos (addOns), que el backend ya filtra.
 */
const SCRATCH_CATEGORIES = ["desarrollo-web", "redes-contacto", "ecommerce", "hardware-pos", "servicios-implementacion"];

/** Paquete al que conviene cambiar cuando el cliente necesita lo que este no ofrece. */
const UPGRADE_HINTS: Record<string, { to: string; message: string }> = {
  "landing-page": { to: "web-corporativa", message: "¿Necesitas páginas internas o blog? Te conviene Web Corporativa." },
};

interface IncludedRow {
  slug: string;
  /** Nombre cuando viene incluido («Secciones de la página»). */
  name: string;
  quantity: number;
  removable: boolean;
  highlights: string[];
}

/**
 * Lo que el paquete incluye, tomado del detalle (no del cálculo, para que no parpadee mientras carga).
 * En un combo, la cantidad de sus items propios reemplaza la de sus paquetes contenidos (misma regla que el backend).
 */
function includedOf(detail: PublicPackageDetail, variants: Record<string, string>): IncludedRow[] {
  const rows = new Map<string, IncludedRow>();
  const add = (items: PublicPackageItem[], replace: boolean) => {
    for (const { component, quantity, removable } of items) {
      const existing = rows.get(component.slug);
      if (existing && !replace) {
        existing.quantity += quantity;
        existing.removable &&= removable;
        continue;
      }
      rows.set(component.slug, {
        slug: component.slug,
        name: component.includedLabel ?? component.name,
        quantity,
        removable,
        highlights: component.highlights,
      });
    }
  };
  for (const inner of detail.includedPackages) add(inner.items, false);
  add(detail.items, detail.includedPackages.length > 0);
  for (const group of detail.variantGroups) {
    const option = group.options.find((o) => o.key === (variants[group.key] ?? group.defaultOption));
    if (option) add(option.items, false);
  }
  return [...rows.values()];
}

export function CustomizeStep() {
  const store = useQuoteStore();
  const { packageSlug, fromScratch } = store;

  const detailQuery = useQuery({
    queryKey: ["package-detail", packageSlug],
    queryFn: () => quoteApi.packageDetail(packageSlug!),
    enabled: packageSlug !== null,
  });
  const componentsQuery = useQuery({ queryKey: ["public-components"], queryFn: quoteApi.components });
  const preview = useQuotePreview();

  const detail = detailQuery.data;
  const category: PackageCategory | null = detail?.category ?? null;
  const evaluation = detail?.pricingType === "evaluation";
  const removed = new Set(store.removed);
  const included = detail ? includedOf(detail, store.variants) : [];
  const includedQty = (slug: string) => (removed.has(slug) ? 0 : (included.find((i) => i.slug === slug)?.quantity ?? 0));
  const blocked = new Map((preview.data?.blockingIssues ?? []).map((i) => [i.componentSlug, i.message]));

  const all = componentsQuery.data ?? [];
  const equivalents = new Set(detail?.equivalents ?? []);
  // «Puedes agregar»: solo complementos del paquete, sin lo incluido, lo equivalente ni lo retirado (salvo unidades extra).
  const candidates = packageSlug ? (detail?.addOns ?? []) : all.filter((c) => SCRATCH_CATEGORIES.includes(c.category.slug));
  const oneTime = candidates.filter(
    (c) => c.billing === "one_time" && !equivalents.has(c.slug) && !removed.has(c.slug) && (includedQty(c.slug) === 0 || c.maxQuantity > 1),
  );
  const chosen = new Set([
    ...included.filter((i) => !removed.has(i.slug)).map((i) => i.slug),
    ...Object.entries(store.quantities).filter(([, qty]) => qty > 0).map(([slug]) => slug),
  ]);
  const renting = store.paymentMode === "subscription" && Boolean(detail?.subscription);
  // En suscripción, lo que cubre la mensualidad no se contrata aparte.
  const coveredByRent = new Set(renting ? detail?.subscriptionIncludedServices : []);
  // Dominio y hosting van con todo paquete: se muestran aparte, solo para indicar si el cliente ya los tiene.
  const infrastructure = INFRASTRUCTURE_SLUGS.flatMap((slug) => all.filter((c) => c.slug === slug));
  const hasIntegration = [...chosen].some((slug) => INTEGRATION_SLUGS.includes(slug));
  const recurring = all.filter(
    (c) =>
      c.billing !== "one_time" &&
      !coveredByRent.has(c.slug) &&
      !INFRASTRUCTURE_SLUGS.includes(c.slug) &&
      recurringApplies(c.slug, { category, renting, hasIntegration }),
  );
  const applicableRecurring = recurring.map((c) => c.slug).join(",");
  // Importe que calcula el backend: una sola línea anual (en renta, el cargo anual). 0 = el cliente ya tiene ambos.
  const infrastructureCents = !preview.data
    ? null
    : preview.data.subscription
      ? (preview.data.subscription.annualCharge?.cents ?? 0)
      : (preview.data.recurring.find((r) => r.componentSlug === "domain-hosting")?.amountCents ?? 0);
  const recommended = new Set(detail?.recommendedRecurring.map((c) => c.slug));
  const recurringSorted = [...recurring].sort((a, b) => Number(recommended.has(b.slug)) - Number(recommended.has(a.slug)));
  const webMaintenance = recurringSorted.filter((c) => c.exclusiveGroup === "web-maintenance");
  const byCategory = groupBy(oneTime, (c) => c.category.name);
  const upgrade = detail ? UPGRADE_HINTS[detail.slug] : undefined;
  const { preselectRecurring, setRecurring } = store;

  // En compra, el mantenimiento recomendado del paquete llega marcado (el cliente puede quitarlo).
  useEffect(() => {
    if (!detail || !componentsQuery.data) return;
    const applicable = new Set(applicableRecurring.split(","));
    preselectRecurring(
      `${detail.slug}:${store.paymentMode}`,
      renting ? [] : detail.recommendedRecurring.map((c) => c.slug).filter((slug) => applicable.has(slug)),
    );
  }, [detail, componentsQuery.data, store.paymentMode, renting, applicableRecurring, preselectRecurring]);

  // Si un servicio deja de aplicar (p. ej. se quitó la última integración), sale de la selección.
  useEffect(() => {
    if (!componentsQuery.data || (packageSlug && !detail)) return;
    const applicable = new Set(applicableRecurring.split(","));
    const kept = store.recurring.filter((slug) => applicable.has(slug));
    if (kept.length !== store.recurring.length) setRecurring(kept);
  }, [applicableRecurring, componentsQuery.data, detail, packageSlug, store.recurring, setRecurring]);

  if (!packageSlug && !fromScratch) {
    return <p className="text-foreground-secondary">Primero elige un paquete o comienza desde cero.</p>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-10">
        <StepHeader
          title={detail ? `Personaliza ${detail.name}` : "Arma tu solución"}
          description="Agrega lo que necesitas. Lo que ya está incluido no se ofrece ni se cobra dos veces."
        />

        {packageSlug && detailQuery.isPending && <Skeleton className="h-40 rounded-2xl" />}

        {detail?.subscription && (
          <section aria-label="Modalidad de pago" className="space-y-2">
            <PaymentModeToggle value={store.paymentMode} onChange={store.setPaymentMode} />
            {renting && preview.data?.subscription && (
              <PlanPicker plans={preview.data.subscription.plans} value={store.subscriptionPlan} onChange={store.setSubscriptionPlan} />
            )}
            {renting && (
              <p className="text-xs text-muted-foreground">
                Pagas una mensualidad en lugar del precio del paquete. El mantenimiento ya va dentro de esa mensualidad. El dominio y hosting del año se cobran en el primer pago, junto con los cargos de contado, así que ese pago puede ser distinto de los siguientes. El semestral es cada 6 meses; el anual, cada 12.
                Los complementos{detail.subscription.hardwareUpfront ? " y el equipo" : ""} se
                pagan de contado; cambiar variantes o retirar componentes requiere ajustar la mensualidad con un asesor.
              </p>
            )}
          </section>
        )}

        {/* Variantes: una opción por grupo */}
        {detail && detail.category !== "combo" && detail.variantGroups.length > 0 && (
          <section aria-labelledby="variants-title" className="space-y-4">
            <h3 id="variants-title" className="font-heading text-lg font-semibold">Variantes</h3>
            {detail.variantGroups.map((group) => {
              const current = store.variants[group.key] ?? group.defaultOption;
              return (
                <fieldset key={group.key} className="space-y-3">
                  <legend className="mb-2 text-sm text-muted-foreground">{group.name}</legend>
                  <div role="radiogroup" aria-label={group.name} className="grid gap-3 sm:grid-cols-2">
                    {group.options.map((option) => (
                      <ChoiceCard key={option.key} selected={current === option.key} onSelect={() => store.setVariant(group.key, option.key)}>
                        <span className="pr-6 font-medium">{option.name}</span>
                        <span className="mt-2"><PriceTag pricing={option.pricing} size="sm" /></span>
                      </ChoiceCard>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </section>
        )}

        {detail?.category === "combo" && (
          <p className="rounded-xl border border-border bg-card shadow-card px-4 py-3 text-sm text-foreground-secondary">
            Incluye: {detail.includedPackages.map((p) => p.name).join(" + ")}, con catálogo, inventario y clientes compartidos. Esa conexión
            es parte de la solución y no se cobra aparte.
          </p>
        )}

        {/* Componentes incluidos */}
        {included.length > 0 && (
          <section aria-labelledby="included-title" className="space-y-3">
            <h3 id="included-title" className="font-heading text-lg font-semibold">Incluye</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {included.map((item) => {
                const isRemoved = removed.has(item.slug);
                return (
                  <li
                    key={item.slug}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
                      isRemoved ? "border-dashed border-border text-muted-foreground line-through" : "border-border bg-card",
                    )}
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      {!isRemoved && <CircleCheck className="mt-0.5 size-4 shrink-0 text-electric" aria-hidden />}
                      <span className="min-w-0">
                        {item.name}
                        {item.quantity > 1 && <span className="text-muted-foreground no-underline"> × {item.quantity}</span>}
                        {item.highlights.length > 0 && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{item.highlights.join(" · ")}</span>
                        )}
                      </span>
                    </span>
                    {item.removable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 no-underline"
                        onClick={() => store.toggleRemoved(item.slug)}
                        aria-label={isRemoved ? `Conservar ${item.name}` : `Retirar ${item.name}`}
                      >
                        {isRemoved ? <><Undo2 /> Conservar</> : <><X /> Retirar</>}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
            {store.removed.length > 0 && (
              <p className="text-xs text-muted-foreground">Al retirar un componente se aplica solo el crédito aprobado para ese componente.</p>
            )}
          </section>
        )}

        {/* Complementos */}
        <section aria-labelledby="addons-title" className="space-y-6">
          <div>
            <h3 id="addons-title" className="font-heading text-lg font-semibold">Puedes agregar</h3>
            {!evaluation && (
              <p className="text-sm text-muted-foreground">
                Solo lo que tu paquete no incluye. Lo marcado «Por cotizar» aún no tiene precio aprobado: se incluye en tu solicitud y un asesor lo valora.
              </p>
            )}
          </div>
          {evaluation ? (
            <p className="text-sm text-foreground-secondary">Un asesor revisará tu necesidad y te contactará.</p>
          ) : (
            <>
              {(componentsQuery.isPending || (packageSlug && detailQuery.isPending)) && <Skeleton className="h-60 rounded-2xl" />}
              {!componentsQuery.isPending && (!packageSlug || detail) && oneTime.length === 0 && (
                <p className="text-sm text-muted-foreground">Este paquete no tiene adicionales disponibles.</p>
              )}
              {Object.entries(byCategory).map(([name, items]) => (
                <div key={name} className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{name}</h4>
                  <ul className="divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
                    {items.map((component) => (
                      <AddOnRow
                        key={component.slug}
                        component={component}
                        included={includedQty(component.slug)}
                        total={store.quantities[component.slug] ?? includedQty(component.slug)}
                        blockedMessage={blocked.get(component.slug)}
                        missing={(component.requires ?? []).every((r) => !chosen.has(r.slug)) ? component.requires ?? [] : []}
                        onChange={(qty) => store.setQuantity(component.slug, qty)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
              {upgrade && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-royal/30 bg-royal/10 px-4 py-3">
                  <p className="text-sm text-foreground-secondary">{upgrade.message}</p>
                  <Button variant="glass" size="sm" onClick={() => store.choosePackage(upgrade.to)}>
                    Cambiar de paquete <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Dominio y hosting: con todo paquete; se descuenta lo que el cliente ya tiene */}
        {packageSlug && infrastructure.length > 0 && (
          <section aria-labelledby="infrastructure-title" className="space-y-3">
            <div>
              <h3 id="infrastructure-title" className="font-heading text-lg font-semibold">Dominio y hosting</h3>
              <p className="text-sm text-muted-foreground">
                Son necesarios para publicar tu sistema y no están dentro del precio del paquete: se pagan aparte, una vez al año
                {renting ? ", en el primer pago" : ""}. Si ya cuentas con alguno, márcalo y no se cobra.
              </p>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card shadow-card px-4 py-3">
              <div className="min-w-0">
                <span className="text-sm font-medium">Dominio y hosting</span>{" "}
                {infrastructureCents !== 0 && <Badge variant="outline" className="ml-1">Necesario · se paga aparte</Badge>}
                <span className="mt-1 block text-xs text-muted-foreground">Nombre del sitio y servidor donde se publica, por un año.</span>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                  {infrastructure.map((component) => (
                    <label key={component.slug} className="flex cursor-pointer items-center gap-2 text-xs text-foreground-secondary">
                      <Checkbox
                        checked={store.clientProvided.includes(component.slug)}
                        onCheckedChange={() => store.toggleClientProvided(component.slug)}
                      />
                      Ya tengo {component.name.toLowerCase()} propio
                    </label>
                  ))}
                </div>
              </div>
              <span className="shrink-0 text-right text-sm">
                {infrastructureCents === 0 ? (
                  <span className="text-muted-foreground">No se cobra</span>
                ) : infrastructureCents != null ? (
                  <>
                    {formatMoney(infrastructureCents)}
                    <span className="text-xs text-muted-foreground"> / año</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">…</span>
                )}
              </span>
            </div>
          </section>
        )}

        {/* Servicios recurrentes */}
        {!evaluation && (
          <section aria-labelledby="recurring-title" className="space-y-3">
            <div>
              <h3 id="recurring-title" className="font-heading text-lg font-semibold">Mantenimiento y servicios recurrentes</h3>
              <p className="text-sm text-muted-foreground">
                {renting
                  ? "Tu renta ya incluye el mantenimiento. Estos servicios son opcionales y se pagan aparte."
                  : "Se pagan aparte del paquete, cada mes. Te marcamos el recomendado para tu paquete; puedes cambiarlo o quitarlo."}
              </p>
            </div>
            {renting && (
              <p className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground-secondary shadow-card">
                <CircleCheck className="size-4 shrink-0 text-electric" aria-hidden /> Mantenimiento incluido en tu renta
              </p>
            )}
            {recurringSorted.length > 0 && (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
                {recurringSorted.map((component) => {
                  const checked = store.recurring.includes(component.slug);
                  const scope = recurringScope(component.slug);
                  const exclusiveWith = component.exclusiveGroup
                    ? recurring.filter((c) => c.exclusiveGroup === component.exclusiveGroup && c.slug !== component.slug).map((c) => c.slug)
                    : [];
                  const message = blocked.get(component.slug);
                  return (
                    <li key={component.slug} className="flex items-start justify-between gap-3 px-4 py-3">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => store.toggleRecurring(component.slug, exclusiveWith)}
                          className="mt-0.5"
                          aria-describedby={message ? `${component.slug}-issue` : undefined}
                        />
                        <span className="min-w-0">
                          <span className="text-sm font-medium">{component.name}</span>{" "}
                          {!renting && recommended.has(component.slug) && (
                            <Badge className="ml-1 bg-royal/15 text-electric">Recomendado para tu paquete · se paga aparte</Badge>
                          )}
                          {scope && (
                            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                              {scope.includes.join(" · ")}
                              <span className="mt-0.5 block text-foreground-secondary">{scope.why}</span>
                            </span>
                          )}
                          {message && <IssueText id={`${component.slug}-issue`} message={message} />}
                        </span>
                      </label>
                      <span className="shrink-0 text-right text-sm">
                        <PriceTag pricing={component.pricing} size="sm" />
                        {component.pricing.amountCents !== null && component.billing === "monthly" && (
                          <span className="text-xs text-muted-foreground"> / mes</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {webMaintenance.length > 1 && (
              <details className="group/compare rounded-2xl border border-border bg-card shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  Comparar mantenimientos
                  <ChevronDown className="size-4 transition-transform group-open/compare:rotate-180" aria-hidden />
                </summary>
                <div className="px-4 pb-4">
                  <p className="mb-3 text-sm text-foreground-secondary">El mantenimiento del sitio es uno solo: el precio sube por lo que cubre.</p>
                  <RecurringComparison services={webMaintenance} selected={store.recurring} />
                </div>
              </details>
            )}
          </section>
        )}

        {/* Espacio para que la barra fija móvil no tape el último elemento. */}
        <div aria-hidden className="h-16 lg:hidden" />
        <MobileSummaryBar />
      </div>

      <div className="hidden lg:block">
        <LiveSummary className="sticky top-24" />
      </div>
    </div>
  );
}

function AddOnRow({
  component,
  included,
  total,
  blockedMessage,
  missing,
  onChange,
}: {
  component: PublicComponent;
  /** Unidades que el paquete ya incluye. */
  included: number;
  /** Cantidad TOTAL en la selección (incluidas + extra). */
  total: number;
  blockedMessage?: string;
  /** Módulos requeridos que aún no están en la cotización. */
  missing: NonNullable<PublicComponent["requires"]>;
  /** Recibe la cantidad TOTAL; 0 = no agregar nada. */
  onChange: (quantity: number) => void;
}) {
  const quantifiable = component.maxQuantity > 1;
  // El contador muestra solo las unidades extra; lo incluido no se cobra.
  const extra = Math.max(0, total - included);
  const setExtra = (value: number) => onChange(value > 0 ? included + value : 0);
  const issueId = `${component.slug}-issue`;

  return (
    <li className={cn("flex flex-wrap items-center justify-between gap-3 px-4 py-3", blockedMessage && "bg-magenta/5")}>
      <div className="flex min-w-0 items-start gap-3">
        {!quantifiable && (
          <Checkbox
            id={`addon-${component.slug}`}
            checked={extra > 0}
            onCheckedChange={(checked) => setExtra(checked === true ? 1 : 0)}
            className="mt-0.5"
            aria-describedby={blockedMessage ? issueId : undefined}
          />
        )}
        <div className="min-w-0">
          <label htmlFor={quantifiable ? undefined : `addon-${component.slug}`} className="cursor-pointer text-sm font-medium">
            {component.name}
          </label>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <PriceTag pricing={component.pricing} size="sm" />
            {component.pricing.amountCents !== null && quantifiable && <span>por {component.unit}</span>}
            {included > 0 && <Badge variant="secondary">{included} incluidas · agrega más</Badge>}
            {component.requiresEvaluation && <Badge variant="outline">Requiere valoración</Badge>}
            {missing.length > 0 && <Badge variant="outline">Requiere otro módulo: {missing.map((m) => m.name).join(" o ")}</Badge>}
          </div>
          {component.description && <p className="mt-1 text-xs text-muted-foreground">{component.description}</p>}
          {blockedMessage && <IssueText id={issueId} message={blockedMessage} />}
        </div>
      </div>
      {quantifiable && <QuantityStepper value={extra} min={0} max={component.maxQuantity} onChange={setExtra} label={`${component.name} extra`} />}
    </li>
  );
}

function IssueText({ id, message }: { id: string; message: string }) {
  return (
    <span id={id} className="mt-1 flex items-center gap-1.5 text-xs text-magenta">
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden /> {message}
    </span>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    (acc[key(item)] ??= []).push(item);
    return acc;
  }, {});
}
