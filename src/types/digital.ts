/** Contrato público del catálogo digital (detalles y tarjetas NFC). Mismas claves que el backend. */

export type FieldKey = "recipientName" | "senderName" | "title" | "message" | "date" | "photos" | "song" | "place" | "rsvp";

export interface TemplateField {
  key: FieldKey;
  required: boolean;
  /** Fotos: cuántas como máximo. Texto: largo máximo. null = el del sistema. */
  max: number | null;
}

export interface TemplateColors {
  bg: string;
  accent: string;
  ink: string;
  stage: string;
}

/** Vista previa del link de la demo (rutas de imagen relativas a la API). */
export interface PublicLinkPreview {
  title: string | null;
  description: string | null;
  domain: string | null;
  path: string;
  imagePath: string | null;
  faviconPath: string | null;
  /** upload = portada vertical subida desde el panel; og = imagen horizontal de la página. */
  imageSource?: "og" | "upload" | null;
}

export interface PublicDigitalTemplate {
  slug: string;
  name: string;
  description: string | null;
  demoUrl: string;
  occasions: string[];
  fields: TemplateField[];
  /** null = «Por cotizar». */
  priceCents: number | null;
  colors: TemplateColors;
  featured: boolean;
  preview: PublicLinkPreview;
}

export interface Occasion {
  slug: string;
  label: string;
}

export interface NfcColors {
  card: string;
  line: string;
  ink: string;
  muted: string;
  accent: string;
  onAccent: string;
  btn: string;
  onBtn: string;
}

export interface PublicNfcDesign {
  slug: string;
  name: string;
  demoUrl: string;
  colors: NfcColors;
  frontImagePath: string | null;
  backImagePath: string | null;
  preview: PublicLinkPreview;
}

export type NfcQuantity = 1 | 10 | 25 | 50;

export interface NfcPriceTier {
  quantity: NfcQuantity;
  /** Precio por tarjeta; null = «Por cotizar». */
  unitPriceCents: number | null;
  quoteOnly: boolean;
}

export type NfcAudience = "person" | "business" | "team";
export type NfcInclude = "saveContact" | "whatsapp" | "callEmail" | "location" | "social" | "portfolio";

export interface DigitalOrderReceipt {
  received: true;
  reference: string;
}
