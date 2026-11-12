/** Contrato público del catálogo de productos digitales (GET /api/v1/digital-templates). */

export type DigitalKind = "digital_gift" | "nfc_card";

export interface PublicDigitalTemplate {
  slug: string;
  kind: DigitalKind;
  name: string;
  description: string | null;
  occasion: string;
  /** Página de demostración: se abre en otra pestaña. */
  demoUrl: string;
  domain: string;
  /** Por plantilla (detalles) o por tarjeta (NFC). null = «Por cotizar». */
  priceCents: number | null;
  /** Datos que el cliente llena al pedirla. */
  customizableFields: string[];
  /** Ruta de la imagen en la API (anteponer NEXT_PUBLIC_API_URL); null = sin imagen. */
  imagePath: string | null;
  previewTitle: string | null;
  featured: boolean;
}

export interface DigitalOrderReceipt {
  received: true;
  reference: string;
}
