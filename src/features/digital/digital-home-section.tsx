import { ArrowRight, ArrowUpRight, Check, CreditCard, Gift, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getDigitalTemplates, templateImageUrl } from "@/services/digital";
import type { DigitalKind, PublicDigitalTemplate } from "@/types/digital";

interface ProductLine {
  kind: DigitalKind;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  href: string;
  cta: string;
}

const LINES: ProductLine[] = [
  {
    kind: "digital_gift",
    icon: Gift,
    eyebrow: "Detalles digitales",
    title: "Sorprende con un detalle que se abre con un link",
    description: "Invitaciones de cumpleaños y detalles para tu pareja, amigas o amigos, personalizados con sus nombres y tus mensajes.",
    points: ["Elige una plantilla y mira su demo", "La personalizamos con nombres y mensajes", "Recibes un link listo para compartir"],
    href: "/detalles-digitales",
    cta: "Ver plantillas",
  },
  {
    kind: "nfc_card",
    icon: CreditCard,
    eyebrow: "Tarjetas NFC",
    title: "Tu tarjeta de presentación, a un toque del celular",
    description: "Para tu empresa, negocio o marca personal: la tarjeta NFC y su página de contacto personalizada.",
    points: ["Tarjeta NFC física", "Página de contacto con el diseño que elijas", "Se abre al acercar el celular"],
    href: "/tarjetas-nfc",
    cta: "Ver diseños",
  },
];

/** Miniaturas por línea en el inicio (destacadas primero, como las ordena la API). */
const PREVIEWS = 3;

/** Productos digitales en el inicio: una tarjeta por línea con las plantillas destacadas del catálogo. */
export function DigitalHomeSection() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {LINES.map((line, index) => (
        <Reveal key={line.kind} delay={index * 0.08} className="h-full">
          <ProductCard line={line} />
        </Reveal>
      ))}
    </div>
  );
}

function ProductCard({ line }: { line: ProductLine }) {
  const Icon = line.icon;
  return (
    <article className="on-navy relative isolate flex h-full flex-col overflow-hidden rounded-3xl border border-snow/10 bg-shade p-7 text-snow shadow-elevated sm:p-9">
      <div aria-hidden className="absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-royal/40 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 -left-20 -z-10 size-72 rounded-full bg-gold/15 blur-3xl" />
      <span className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl bg-snow/10 text-gold-soft ring-1 ring-snow/15">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="text-sm font-semibold tracking-[0.14em] text-gold-soft uppercase">{line.eyebrow}</p>
      <h3 className="mt-2 font-heading text-2xl font-semibold text-balance text-snow sm:text-3xl">{line.title}</h3>
      <p className="mt-3 leading-relaxed text-pretty text-snow/80">{line.description}</p>
      <ul className="mt-5 space-y-2 text-sm text-snow/85">
        {line.points.map((point) => (
          <li key={point} className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-gold-soft" aria-hidden />
            {point}
          </li>
        ))}
      </ul>

      <Suspense fallback={<PreviewsSkeleton />}>
        <TemplatePreviews kind={line.kind} />
      </Suspense>

      <div className="mt-auto pt-7">
        <Button asChild size="xl" className="bg-snow text-navy hover:bg-gold-soft">
          <Link href={line.href}>
            {line.cta}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

/** Miniaturas de las plantillas publicadas; cada una abre su demo. Sin catálogo no se muestra nada. */
async function TemplatePreviews({ kind }: { kind: DigitalKind }) {
  const result = await getDigitalTemplates(kind);
  if (result.status !== "ok" || result.items.length === 0) return null;
  const shown = result.items.slice(0, PREVIEWS);
  const prices = result.items.map((t) => t.priceCents).filter((p): p is number => p !== null);
  return (
    <div className="mt-7">
      <ul className={cn("grid gap-3", shown.length === 1 ? "grid-cols-1 sm:grid-cols-2" : shown.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
        {shown.map((template, index) => (
          <li key={template.slug} className={cn(index === 2 && "hidden sm:block")}>
            <PreviewThumb template={template} />
          </li>
        ))}
      </ul>
      {prices.length > 0 && (
        <p className="mt-3 text-sm text-snow/75">
          Desde <strong className="font-semibold text-snow">{formatMoney(Math.min(...prices))} MXN</strong>
          {kind === "nfc_card" ? " por tarjeta" : ""}
        </p>
      )}
    </div>
  );
}

function PreviewThumb({ template }: { template: PublicDigitalTemplate }) {
  const image = templateImageUrl(template.imagePath);
  return (
    <a
      href={template.demoUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ver la demo de ${template.name} (se abre en otra pestaña)`}
      className="group block overflow-hidden rounded-xl border border-snow/15 bg-snow/5 transition-colors hover:border-gold-soft/60 focus-visible:border-gold-soft"
    >
      <span className="relative block aspect-[1.91/1] overflow-hidden bg-snow/10">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
          />
        )}
      </span>
      <span className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-snow/85">
        <span className="truncate">{template.name}</span>
        <ArrowUpRight className="size-3.5 shrink-0 text-gold-soft" aria-hidden />
      </span>
    </a>
  );
}

function PreviewsSkeleton() {
  return (
    <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className={cn("aspect-[1.91/1] rounded-xl bg-snow/10", index === 2 && "hidden sm:block")} />
      ))}
    </div>
  );
}
