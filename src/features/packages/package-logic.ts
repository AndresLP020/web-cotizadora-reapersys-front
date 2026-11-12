import { formatMoney } from "@/lib/format";
import type { PackageCategory, PublicPackage, PublicPackageDetail, PublicPricing } from "@/types/catalog";

/** Modalidad elegida en /paquetes (?modalidad=compra|renta). */
export type PayMode = "compra" | "renta";

/** Orden de las categorías en la página y en los filtros. El combo va aparte, destacado. */
export const CATEGORY_ORDER: PackageCategory[] = ["web", "ecommerce", "pos", "custom"];

export const FILTERS: { value: PackageCategory | null; label: string; param: string | null }[] = [
  { value: null, label: "Todos", param: null },
  { value: "web", label: "Desarrollo web", param: "web" },
  { value: "ecommerce", label: "E-commerce", param: "ecommerce" },
  { value: "pos", label: "Punto de venta", param: "pos" },
  { value: "custom", label: "A la medida", param: "a-la-medida" },
];

/** Colores de la ilustración de cada tarjeta (fondo tenue y acento), por tipo de paquete. */
export const PACKAGE_THEMES = {
  web: { bg: "#E7EEFF", accent: "#2F5BEA" },
  corporate: { bg: "#E5F0FF", accent: "#0EA5E9" },
  ecommerce: { bg: "#FFF1E6", accent: "#EA580C" },
  pos: { bg: "#E7F8EE", accent: "#16A34A" },
  custom: { bg: "#F1ECFF", accent: "#7C3AED" },
  advisory: { bg: "#F2F4F8", accent: "#64748B" },
} as const;
export type PackageTheme = (typeof PACKAGE_THEMES)[keyof typeof PACKAGE_THEMES];

const hasAmount = (p: PublicPricing | undefined | null): p is PublicPricing & { amountCents: number } =>
  !!p && !p.pendingPricing && p.amountCents !== null && p.mode !== "on_request";

/** Asesoría sin precio («Aún no estoy seguro»). */
export function isAdvisory(pkg: PublicPackage): boolean {
  return pkg.pricing.mode === "on_request";
}

/** Tono de la ilustración: el segundo paquete web usa el celeste «corporativo». */
export function themeFor(pkg: PublicPackage, indexInCategory: number): PackageTheme {
  if (isAdvisory(pkg)) return PACKAGE_THEMES.advisory;
  if (pkg.category === "web") return indexInCategory === 0 ? PACKAGE_THEMES.web : PACKAGE_THEMES.corporate;
  if (pkg.category === "combo") return PACKAGE_THEMES.web;
  return PACKAGE_THEMES[pkg.category];
}

export type RentalState = "available" | "pending" | "none";

export function rentalState(pkg: PublicPackage): RentalState {
  if (!pkg.subscription) return "none";
  return hasAmount(pkg.subscription.pricing) ? "available" : "pending";
}

export interface PriceView {
  label: string;
  main: string;
  /** «MXN», «MXN / mes» o vacío (texto sin importe). */
  unit: string;
  alt: string;
  cta: { label: string; href: string };
}

const money = (cents: number) => formatMoney(cents);

/** Qué precio, etiqueta, línea alternativa y botón muestra la tarjeta en cada modalidad. */
export function priceView(pkg: PublicPackage, mode: PayMode): PriceView {
  const quoteHref = `/cotizador?paquete=${encodeURIComponent(pkg.slug)}`;
  if (isAdvisory(pkg)) {
    return { label: "Asesoría", main: "Sin costo", unit: "", alt: "Un asesor revisa tu caso y te contacta.", cta: { label: "Hablar con un asesor", href: "/contacto" } };
  }
  const rental = rentalState(pkg);
  const purchase = pkg.pricing;
  const purchaseText = hasAmount(purchase) ? `${purchase.mode === "starting_at" ? "desde " : ""}${money(purchase.amountCents)}` : null;
  const defaultCta = { label: "Personalizar y cotizar", href: quoteHref };

  if (mode === "renta") {
    if (rental === "available") {
      const monthly = pkg.subscription!.pricing as PublicPricing & { amountCents: number };
      return {
        label: monthly.mode === "starting_at" ? "Renta desde" : "Renta mensual",
        main: money(monthly.amountCents),
        unit: "MXN / mes",
        alt: purchaseText ? `Incluye mantenimiento · o ${purchaseText} de contado` : "Incluye mantenimiento",
        cta: { label: "Cotizar en renta", href: `${quoteHref}&modalidad=suscripcion` },
      };
    }
    if (rental === "pending") {
      return { label: "Renta mensual", main: "Por cotizar", unit: "", alt: "El alcance se define en la evaluación", cta: defaultCta };
    }
    return {
      label: purchase.mode === "starting_at" ? "Desde" : "Pago único",
      main: hasAmount(purchase) ? money(purchase.amountCents) : "Por cotizar",
      unit: hasAmount(purchase) ? "MXN" : "",
      alt: "Este paquete solo se ofrece en compra",
      cta: defaultCta,
    };
  }

  const alt =
    rental === "available"
      ? `o ${money(pkg.subscription!.pricing.amountCents!)} MXN/mes en renta`
      : rental === "pending"
        ? "El alcance se define en la evaluación"
        : "Solo compra (pago único)";
  return {
    label: purchase.mode === "starting_at" ? "Desde" : "Pago único",
    main: hasAmount(purchase) ? money(purchase.amountCents) : "Por cotizar",
    unit: hasAmount(purchase) ? "MXN" : "",
    alt,
    cta: defaultCta,
  };
}

/** Ahorro del combo en compra: compra de cada paquete contenido − compra del combo. null si falta algún precio. */
export function comboSavings(combo: PublicPackage, all: PublicPackage[]): { separateCents: number; savingCents: number } | null {
  if (!hasAmount(combo.pricing) || combo.pricing.mode !== "fixed" || combo.includesPackages.length === 0) return null;
  let separate = 0;
  for (const ref of combo.includesPackages) {
    const pkg = all.find((p) => p.slug === ref.slug);
    if (!pkg || !hasAmount(pkg.pricing) || pkg.pricing.mode !== "fixed") return null;
    separate += pkg.pricing.amountCents;
  }
  const saving = separate - combo.pricing.amountCents;
  return saving > 0 ? { separateCents: separate, savingCents: saving } : null;
}

const itemLabel = (item: PublicPackageDetail["items"][number]) => item.component.includedLabel ?? item.component.name;

/** Lo que trae el combo y no traen sus paquetes contenidos (diferencia de items). */
export function comboOnlyItems(combo: PublicPackageDetail): string[] {
  const inner = new Set(combo.includedPackages.flatMap((p) => p.items.map((i) => i.component.slug)));
  return combo.items.filter((i) => !inner.has(i.component.slug)).map(itemLabel);
}

export type CellStatus = "included" | "addon" | "none";

interface CompareRow {
  label: string;
  /** Componentes que debe incluir (todos) para contar como incluido. */
  slugs?: string[];
  /** O un «highlight» que deba aparecer en lo incluido. */
  highlight?: RegExp;
  /** Texto especial cuando lo incluye un combo. */
  comboLabel?: string;
}

export const COMPARE_ROWS: CompareRow[] = [
  { label: "Productos ilimitados", highlight: /productos ilimitados/i },
  { label: "Tienda en línea con carrito y checkout", slugs: ["store-cart", "store-checkout"] },
  { label: "Caja con escáner, tickets y corte", slugs: ["pos-register", "pos-tickets", "pos-cash-cut"] },
  { label: "Un solo catálogo e inventario", slugs: ["unified-dashboard"], highlight: /un solo cat[aá]logo/i },
  { label: "Pedidos en línea desde la caja", slugs: ["pos-online-orders"] },
  { label: "Reportes de ingresos y ganancias", slugs: ["pos-reports"] },
  { label: "Gastos administrativos", slugs: ["pos-expenses"] },
  { label: "Pagos en línea (Mercado Pago)", slugs: ["mercadopago-payments"] },
  { label: "Ofertas y venta a granel", slugs: ["offers-manager", "bulk-sales"] },
  { label: "Capacitación", slugs: ["initial-support"], comboLabel: "Integral" },
];

/** Estado de una fila para un paquete: incluido (items, paquetes contenidos o equivalentes), complemento o no aplica. */
export function cellStatus(detail: PublicPackageDetail, row: CompareRow): { status: CellStatus; label: string } {
  const items = [...detail.items, ...detail.includedPackages.flatMap((p) => p.items)];
  const included = new Set([...items.map((i) => i.component.slug), ...detail.equivalents]);
  const addOns = new Set(detail.addOns.map((a) => a.slug));
  const byHighlight = row.highlight ? items.some((i) => i.component.highlights.some((h) => row.highlight!.test(h))) : false;
  const bySlugs = row.slugs ? row.slugs.every((s) => included.has(s)) : false;
  if (byHighlight || bySlugs) {
    return { status: "included", label: detail.category === "combo" && row.comboLabel ? row.comboLabel : "Incluido" };
  }
  if (row.slugs?.some((s) => addOns.has(s))) return { status: "addon", label: "Complemento" };
  return { status: "none", label: "No aplica" };
}

/** «−5 %» a partir de puntos base. */
export function pct(bp: number): string {
  return `${bp / 100} %`;
}
