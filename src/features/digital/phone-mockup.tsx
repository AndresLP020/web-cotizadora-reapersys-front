import { cn } from "@/lib/utils";

interface PhoneMockupProps {
  /** Ancho en px (el alto mantiene la proporción ~1:2.05). */
  width?: number;
  className?: string;
  /** Leve flotación (se apaga con prefers-reduced-motion). */
  float?: boolean;
  style?: React.CSSProperties;
  /** Fondo de la pantalla. */
  screen?: string;
  children: React.ReactNode;
  /** Las muestras son decorativas: se ocultan a lectores de pantalla salvo que se indique un nombre. */
  label?: string;
}

/** Celular de muestra: marco oscuro, esquinas redondeadas y la pantalla con el contenido que recibe. */
export function PhoneMockup({ width = 210, className, float = false, style, screen = "#ffffff", children, label }: PhoneMockupProps) {
  const frame = Math.round(Math.min(9, Math.max(7, width / 28)));
  const radius = Math.round(Math.min(40, Math.max(32, width / 6)));
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative shrink-0", float && "motion-safe-only animate-float-phone", className)}
      style={{ width, aspectRatio: "1 / 2.05", ...style }}
    >
      <div
        className="absolute inset-0 overflow-hidden bg-phone shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
        style={{ borderRadius: radius, padding: frame }}
      >
        <div className="relative size-full overflow-hidden" style={{ borderRadius: radius - frame, background: screen }}>
          {/* Isla de la cámara */}
          <span aria-hidden className="absolute top-2 left-1/2 z-10 h-[5%] max-h-5 w-[34%] -translate-x-1/2 rounded-full bg-phone" />
          {children}
        </div>
      </div>
    </div>
  );
}
