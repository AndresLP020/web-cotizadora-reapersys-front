import { digitalOgImage, ogSize } from "@/features/digital/og-image";

export const alt = "Tarjetas NFC de presentación de ReaperSys";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return digitalOgImage({ eyebrow: "Tarjetas NFC", title: "Tu presentación, a un toque del celular", accent: "#7DD3FC", onAccent: "#06212F", stage: "#071320" });
}
