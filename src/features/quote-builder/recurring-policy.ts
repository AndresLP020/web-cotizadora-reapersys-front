import type { PackageCategory } from "@/types/catalog";

/**
 * Qué servicios recurrentes se ofrecen con cada tipo de paquete.
 * Es la misma regla que valida el backend (recurring-policy.ts del motor); aquí solo decide qué mostrar.
 */

/** Mantenimiento del sitio o la tienda: en renta ya va dentro de la mensualidad. */
export const SITE_MAINTENANCE_SLUGS = ["maintenance-web-basic", "maintenance-web-business", "maintenance-ecommerce"];

export const RECURRING_BY_CATEGORY: Record<PackageCategory, string[]> = {
  web: ["maintenance-web-basic", "maintenance-web-business"],
  ecommerce: ["maintenance-ecommerce"],
  pos: ["support-pos"],
  combo: ["maintenance-ecommerce", "support-pos"],
  custom: ["support-pos", "integration-monitoring"],
};

/** Solo tienen sentido si la cotización conecta con un tercero. */
export const INTEGRATION_SERVICE_SLUGS = ["integration-monitoring", "software-licenses"];

/** Integraciones y pasarelas con terceros (incluidas o agregadas). */
export const INTEGRATION_SLUGS = [
  "whatsapp-business-api",
  "crm-integration",
  "chatbot",
  "stripe-payments",
  "mercadopago-payments",
  "payment-gateway",
  "pos-ecommerce-sync",
];

/** Sin paquete (desde cero) se ofrece todo: un asesor valora la solución. */
export function recurringApplies(slug: string, context: { category: PackageCategory | null; renting: boolean; hasIntegration: boolean }): boolean {
  if (context.category === null) return true;
  if (context.renting && SITE_MAINTENANCE_SLUGS.includes(slug)) return false;
  if (RECURRING_BY_CATEGORY[context.category].includes(slug)) return true;
  return INTEGRATION_SERVICE_SLUGS.includes(slug) && context.hasIntegration;
}
