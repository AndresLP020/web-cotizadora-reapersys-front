import type { DigitalKind } from "@/types/digital";

/** Ocasiones de cada línea (mismas claves que el backend). */
export const occasionLabels: Record<string, string> = {
  birthday: "Cumpleaños",
  partner: "Para tu pareja",
  friendship: "Amistad",
  anniversary: "Aniversario",
  other: "Otra ocasión",
  business: "Empresa o negocio",
  professional: "Profesional independiente",
  personal: "Personal",
};

export const OCCASIONS_BY_KIND: Record<DigitalKind, string[]> = {
  digital_gift: ["birthday", "partner", "friendship", "anniversary", "other"],
  nfc_card: ["business", "professional", "personal"],
};

export const kindLabels: Record<DigitalKind, string> = { digital_gift: "Detalles digitales", nfc_card: "Tarjetas NFC" };
