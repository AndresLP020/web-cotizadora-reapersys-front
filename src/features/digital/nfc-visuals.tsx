import { Globe, Mail, MapPin, MessageCircle, Phone, UserPlus } from "lucide-react";
import qrcode from "qrcode-generator";
import { cn } from "@/lib/utils";
import type { NfcColors } from "@/types/digital";
import { SAMPLE_NFC } from "./sample-content";

export const DEFAULT_NFC_COLORS: NfcColors = {
  card: "#0A0D16",
  line: "#1E2433",
  ink: "#F5F7FB",
  muted: "#A9B1C6",
  accent: "#7DD3FC",
  onAccent: "#06212F",
  btn: "#0A0F1E",
  onBtn: "#FFFFFF",
};

/** Ícono NFC: tres arcos de trazo. */
export function NfcIcon({ className, color = "currentColor", style }: { className?: string; color?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden className={className} style={style}>
      <path d="M7 8.5a5 5 0 0 1 0 7" />
      <path d="M10.5 6a8.5 8.5 0 0 1 0 12" />
      <path d="M14 3.5a12 12 0 0 1 0 17" />
    </svg>
  );
}

/** Código QR real (SVG) para el reverso de la tarjeta. */
export function QrCode({ value, size = 96, fg = "#000000", bg = "#FFFFFF", className }: { value: string; size?: number; fg?: string; bg?: string; className?: string }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const quiet = 2;
  let path = "";
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) if (qr.isDark(row, col)) path += `M${col + quiet} ${row + quiet}h1v1h-1z`;
  }
  const total = count + quiet * 2;
  return (
    <svg
      role="img"
      aria-label={`Código QR que abre ${value}`}
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={cn("rounded-md", className)}
    >
      <rect width={total} height={total} fill={bg} />
      <path d={path} fill={fg} />
    </svg>
  );
}

interface NfcCardProps {
  colors?: NfcColors;
  name?: string;
  role?: string;
  company?: string;
  logo?: string;
  /** Ancho en px; el alto respeta la proporción real 85.6:54. */
  width?: number;
  side?: "front" | "back";
  /** URL que abre el QR del reverso. */
  qrValue?: string;
  frontImage?: string | null;
  backImage?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

/** Cara de la tarjeta NFC (frente: logo, ícono NFC, nombre y cargo; reverso: empresa y QR). */
export function NfcCardFace({
  colors = DEFAULT_NFC_COLORS,
  name = SAMPLE_NFC.name,
  role = SAMPLE_NFC.role,
  company = SAMPLE_NFC.company,
  logo = SAMPLE_NFC.logo,
  width = 290,
  side = "front",
  qrValue,
  frontImage,
  backImage,
  className,
  style,
}: NfcCardProps) {
  const s = width / 290;
  const image = side === "front" ? frontImage : backImage;
  return (
    <div
      className={cn("relative overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.45)]", className)}
      style={{ width, aspectRatio: "85.6 / 54", borderRadius: 16 * s, background: colors.card, border: `1px solid ${colors.line}`, color: colors.ink, ...style }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagen del diseño servida por la API
        <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
      ) : side === "front" ? (
        <div className="flex size-full flex-col justify-between" style={{ padding: 20 * s }}>
          <div className="flex items-start justify-between">
            <span
              className="grid place-items-center font-heading font-bold"
              style={{ width: 38 * s, height: 38 * s, borderRadius: 9 * s, background: colors.accent, color: colors.onAccent, fontSize: 20 * s }}
            >
              {logo}
            </span>
            <NfcIcon color={colors.accent} className="shrink-0" style={{ width: 24 * s, height: 24 * s }} />
          </div>
          <div>
            <p className="font-heading leading-tight font-semibold" style={{ fontSize: 19 * s }}>
              {name}
            </p>
            <p className="mt-1 font-semibold uppercase" style={{ color: colors.muted, fontSize: 8.5 * s, letterSpacing: "0.16em" }}>
              {role} · {company}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex size-full items-center justify-between gap-3" style={{ padding: 20 * s }}>
          <div className="min-w-0">
            <p className="font-heading leading-tight font-semibold" style={{ fontSize: 17 * s }}>
              {company}
            </p>
            <p className="mt-2 leading-snug" style={{ color: colors.muted, fontSize: 10 * s }}>
              Acerca tu celular o escanea el código
            </p>
          </div>
          {qrValue && <QrCode value={qrValue} size={Math.round(96 * s)} />}
        </div>
      )}
    </div>
  );
}

/** Tres anillos concéntricos (la señal NFC entre la tarjeta y el celular). */
export function NfcRings({ size = 220, color = "#7DD3FC", className }: { size?: number; color?: string; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none relative", className)} style={{ width: size, height: size }}>
      {[0.5, 0.3, 0.14].map((opacity, index) => (
        <span
          key={opacity}
          className="absolute rounded-full border-2"
          style={{ borderColor: color, opacity, inset: `${index * 16}%` }}
        />
      ))}
    </div>
  );
}

/** Página de contacto dentro del celular, en los colores del diseño. */
export function ContactScreen({
  colors = DEFAULT_NFC_COLORS,
  name = SAMPLE_NFC.name,
  initials = SAMPLE_NFC.initials,
  company = SAMPLE_NFC.company,
  role = SAMPLE_NFC.role,
  variant = "compact",
  scale = 1,
}: {
  colors?: NfcColors;
  name?: string;
  initials?: string;
  company?: string;
  role?: string;
  /** compact: botones en lista (inicio). full: cuadrícula 2×2 y portafolio. */
  variant?: "compact" | "full";
  scale?: number;
}) {
  const light = "#E0F2FE";
  const tile = (Icon: typeof Phone, label: string) => (
    <span
      key={label}
      className="flex items-center justify-center gap-1.5 rounded-xl font-semibold"
      style={{ background: `color-mix(in oklab, ${colors.accent} 22%, white)`, color: "#0A0F1E", fontSize: 10.5 * scale, height: 30 * scale }}
    >
      <Icon className="shrink-0" style={{ width: 12 * scale, height: 12 * scale }} aria-hidden />
      {label}
    </span>
  );
  return (
    <div className="flex size-full flex-col bg-white">
      <div className="relative shrink-0" style={{ background: colors.card, height: "30%" }}>
        <span
          className="absolute left-1/2 grid -translate-x-1/2 place-items-center rounded-full border-4 border-white font-heading font-bold"
          style={{ bottom: -30 * scale, width: 60 * scale, height: 60 * scale, background: colors.accent, color: colors.onAccent, fontSize: 18 * scale }}
        >
          {initials}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-[8%] text-center" style={{ paddingTop: 36 * scale, color: "#0A0F1E" }}>
        <p className="font-heading leading-tight font-semibold" style={{ fontSize: 15 * scale }}>
          {name}
        </p>
        <p className="mt-0.5 text-[#4A5368]" style={{ fontSize: 9.5 * scale }}>
          {role} · {company}
        </p>
        <div className="mt-[10%] grid gap-[6px]">
          <span
            className="flex items-center justify-center gap-1.5 rounded-xl font-semibold"
            style={{ background: colors.btn, color: colors.onBtn, fontSize: 11 * scale, height: 34 * scale }}
          >
            <UserPlus style={{ width: 13 * scale, height: 13 * scale }} aria-hidden />
            Guardar contacto
          </span>
          {variant === "compact" ? (
            <>
              {tile(MessageCircle, "WhatsApp")}
              {tile(Phone, "Llamar")}
              {tile(MapPin, "Ubicación")}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-[6px]">
                {tile(MessageCircle, "WhatsApp")}
                {tile(Phone, "Llamar")}
                {tile(Mail, "Correo")}
                {tile(MapPin, "Ubicación")}
              </div>
              <span
                className="flex items-center justify-center gap-1.5 rounded-xl border font-semibold"
                style={{ borderColor: light, color: "#0A0F1E", fontSize: 10.5 * scale, height: 30 * scale }}
              >
                <Globe style={{ width: 12 * scale, height: 12 * scale }} aria-hidden />
                Ver portafolio
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
