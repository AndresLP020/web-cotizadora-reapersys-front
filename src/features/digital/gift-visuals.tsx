import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateColors } from "@/types/digital";
import { SAMPLE_GIFT } from "./sample-content";

const DEFAULT_COLORS: TemplateColors = { bg: "#3B1424", accent: "#F4A6B8", ink: "#FFE4EA", stage: "#FCE7EC" };

/** Sobre dibujado con CSS: rectángulo, solapa triangular y sello. */
export function Envelope({ accent, ink, className }: { accent: string; ink: string; className?: string }) {
  return (
    <div aria-hidden className={cn("relative mx-auto aspect-[1.45/1] w-[62%]", className)}>
      <div className="absolute inset-0 rounded-md" style={{ background: accent }} />
      <div
        className="absolute inset-x-0 top-0 h-[62%]"
        style={{ background: `color-mix(in oklab, ${accent} 78%, black)`, clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
      />
      <div
        className="absolute top-[46%] left-1/2 grid size-[26%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-md"
        style={{ background: ink }}
      >
        <span className="size-[46%] rounded-full" style={{ background: accent }} />
      </div>
    </div>
  );
}

/**
 * Pantalla de una invitación: «PARA {nombre}», el título en Fraunces itálica, el sobre y una pista.
 * La usan las escenas del inicio, el hero y la vista previa en vivo del formulario.
 */
export function InvitationScreen({
  recipient = SAMPLE_GIFT.recipient,
  sender,
  title = SAMPLE_GIFT.title,
  hint = SAMPLE_GIFT.hint,
  colors = DEFAULT_COLORS,
  scale = 1,
  children,
}: {
  recipient?: string;
  sender?: string;
  title?: string;
  hint?: string;
  colors?: TemplateColors;
  /** 1 = celular de 210px; los textos escalan con el celular. */
  scale?: number;
  /** Contenido extra bajo la pista (mensaje, fotos, fecha en la vista previa en vivo). */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex size-full flex-col items-center px-[9%] pt-[22%] pb-[10%] text-center" style={{ background: colors.bg, color: colors.ink }}>
      <p className="font-semibold uppercase" style={{ color: colors.accent, fontSize: 10 * scale, letterSpacing: "0.22em" }}>
        Para {recipient || "…"}
        {sender ? ` · De ${sender}` : ""}
      </p>
      <p className="mt-[8%] font-serif leading-[1.05] text-balance italic [overflow-wrap:break-word]" style={{ fontSize: 28 * scale }}>
        {title || "…"}
      </p>
      <Envelope accent={colors.accent} ink={colors.ink} className="mt-[12%]" />
      <p className="mt-[9%] opacity-80" style={{ fontSize: 10.5 * scale }}>
        {hint}
      </p>
      {children}
    </div>
  );
}

/** Pantalla de cuenta regresiva en dorado. */
export function CountdownScreen({ days = SAMPLE_GIFT.countdownDays, event = SAMPLE_GIFT.countdownEvent, scale = 1 }: { days?: string; event?: string; scale?: number }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-[4%] bg-[#1C140C] text-center text-new">
      <p className="font-heading leading-none font-semibold tabular-nums" style={{ fontSize: 54 * scale }}>
        {days}
      </p>
      <p className="font-semibold uppercase" style={{ fontSize: 9 * scale, letterSpacing: "0.24em" }}>
        Días para
      </p>
      <p className="font-serif italic" style={{ fontSize: 22 * scale }}>
        {event}
      </p>
    </div>
  );
}

/** Miniatura dibujada con los colores de la plantilla (cuando no tiene imagen). */
export function TemplateThumb({ colors, label, title, hint, scale = 1 }: { colors: TemplateColors; label: string; title: string; hint: string; scale?: number }) {
  return <InvitationScreen recipient={label} title={title} hint={hint} colors={colors} scale={scale} />;
}

/**
 * Tarjeta de vista previa de un link (como la que muestra WhatsApp): franja con imagen,
 * título y dominio. `image` es una URL; sin ella se dibuja la franja con el texto `imageLabel`.
 */
export function LinkPreviewCard({
  image,
  imageLabel = `Para ${SAMPLE_GIFT.recipient}`,
  title = SAMPLE_GIFT.linkTitle,
  description,
  domain = SAMPLE_GIFT.demoDomain,
  colors = DEFAULT_COLORS,
  className,
}: {
  image?: string | null;
  imageLabel?: string;
  title?: string;
  description?: string;
  domain?: string;
  colors?: TemplateColors;
  className?: string;
}) {
  return (
    <div className={cn("w-[236px] overflow-hidden rounded-2xl bg-white text-deep shadow-[0_20px_40px_rgba(0,0,0,0.35)]", className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagen servida por la API (GridFS), tamaño variable
        <img src={image} alt="" className="aspect-[1.91/1] w-full object-cover" />
      ) : (
        <div className="grid aspect-[1.91/1] place-items-center" style={{ background: colors.bg }}>
          <span className="px-3 text-center font-serif text-xl italic" style={{ color: colors.ink }}>
            {imageLabel}
          </span>
        </div>
      )}
      <div className="space-y-0.5 px-3.5 py-3">
        <p className="truncate text-sm font-semibold">{title}</p>
        {description && <p className="line-clamp-2 text-xs text-deep-muted">{description}</p>}
        <p className="flex items-center gap-1 truncate text-xs text-deep-muted">
          <Link2 className="size-3" aria-hidden />
          {domain}
        </p>
      </div>
    </div>
  );
}
