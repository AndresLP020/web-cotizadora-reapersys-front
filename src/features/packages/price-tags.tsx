import { CalendarClock, Clock } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicPricing, PublicSubscriptionOffer } from "@/types/catalog";

/** Precio y mensualidad en una línea (los usa el cotizador). */
export function PriceTag({ pricing, size = "lg" }: { pricing: PublicPricing; size?: "sm" | "lg" }) {
  if (pricing.pendingPricing || pricing.amountCents === null || pricing.mode === "on_request") {
    return (
      <p className={cn("inline-flex items-center gap-2 font-medium text-foreground-secondary", size === "lg" ? "text-lg" : "text-sm")}>
        <Clock className="size-4 text-electric" aria-hidden />
        {pricing.pendingPricing ? "Por cotizar" : "Sujeto a valoración"}
      </p>
    );
  }

  return (
    <p className="flex items-baseline gap-2">
      {pricing.mode === "starting_at" && <span className="text-sm text-muted-foreground">Desde</span>}
      <span className={cn("font-heading font-semibold tracking-tight text-foreground", size === "lg" ? "text-4xl" : "text-lg")}>
        {formatMoney(pricing.amountCents)}
      </span>
      <span className="text-sm text-muted-foreground">MXN</span>
    </p>
  );
}

/** Mensualidad de la suscripción ("Renta desde $946 / mes"). */
export function MonthlyTag({ offer, size = "sm" }: { offer: PublicSubscriptionOffer; size?: "sm" | "lg" }) {
  const { pricing } = offer;
  if (pricing.pendingPricing || pricing.amountCents === null) {
    return (
      <p className={cn("inline-flex items-center gap-2 text-foreground-secondary", size === "lg" ? "text-lg font-medium" : "text-sm")}>
        <CalendarClock className="size-4 text-electric" aria-hidden />
        Renta mensual por confirmar
      </p>
    );
  }
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-sm text-muted-foreground">{pricing.mode === "starting_at" ? "Renta desde" : "Renta"}</span>
      <span className={cn("font-heading font-semibold tracking-tight text-foreground", size === "lg" ? "text-4xl" : "text-lg")}>
        {formatMoney(pricing.amountCents)}
      </span>
      <span className="text-sm text-muted-foreground">MXN / mes</span>
    </p>
  );
}
