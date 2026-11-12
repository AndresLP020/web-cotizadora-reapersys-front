import { digitalOgImage, ogSize } from "@/features/digital/og-image";

export const alt = "Detalles digitales personalizados de ReaperSys";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return digitalOgImage({ eyebrow: "Detalles digitales", title: "Un detalle que se abre con un link", accent: "#F4A6B8", onAccent: "#2A0B16", stage: "#0E0A14" });
}
