import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Reveal } from "@/components/motion/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { apiAssetUrl, getDigitalTemplates, getNfcDesigns, getNfcPricing, lowestPrice } from "@/services/digital";
import { CountdownScreen, InvitationScreen, LinkPreviewCard } from "./gift-visuals";
import { ContactScreen, NfcCardFace, NfcRings } from "./nfc-visuals";
import { PhoneMockup } from "./phone-mockup";
import { SAMPLE_GIFT } from "./sample-content";

/** Datos reales del catálogo para las tarjetas (llegan de la API en cada solicitud). */
interface HomeData {
  templateCount: number;
  giftFrom: number | null;
  giftDemoUrl: string | null;
  giftPreview: { image: string | null; title: string | null; domain: string | null } | null;
  nfcFrom: number | null;
  nfcDemoUrl: string | null;
}

async function loadHomeData(): Promise<HomeData> {
  const [templates, designs, pricing] = await Promise.all([getDigitalTemplates(), getNfcDesigns(), getNfcPricing()]);
  const items = templates.status === "ok" ? templates.data : [];
  const featured = items.find((t) => t.featured) ?? items[0] ?? null;
  return {
    templateCount: items.length,
    giftFrom: lowestPrice(items.map((t) => t.priceCents)),
    giftDemoUrl: featured?.demoUrl ?? null,
    giftPreview: featured
      ? { image: apiAssetUrl(featured.preview.imagePath), title: featured.preview.title, domain: featured.preview.domain }
      : null,
    nfcFrom: pricing.status === "ok" ? lowestPrice(pricing.data.filter((t) => !t.quoteOnly).map((t) => t.unitPriceCents)) : null,
    nfcDemoUrl: designs.status === "ok" ? (designs.data[0]?.demoUrl ?? null) : null,
  };
}

/**
 * Sección «Nuevo» del inicio: banda oscura con las dos líneas digitales como productos
 * (escena visual + texto). Las escenas se pintan al instante; los datos reales llegan después.
 */
export function DigitalHomeSection() {
  return (
    <section aria-labelledby="digital-title" className="relative isolate overflow-hidden bg-night bg-grid-night py-20 text-night-text sm:py-28">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <Reveal className="max-w-3xl">
            <p className="flex flex-wrap items-center gap-3 text-sm text-night-muted">
              <span className="rounded-full bg-new px-3 py-1 text-xs font-semibold tracking-[0.18em] text-night uppercase">Nuevo</span>
              Dos productos que se entregan en días, no en semanas
            </p>
            <h2 id="digital-title" className="mt-5 text-4xl leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[64px]">
              Un detalle que emociona.
              <br />
              Una tarjeta que conecta.
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="max-w-[380px]">
            <p className="text-lg leading-relaxed text-pretty text-night-muted">
              Sorprende a quien quieres con una página hecha con su nombre, o entrega tu contacto con solo acercar una tarjeta al celular.
            </p>
          </Reveal>
        </div>
        <Suspense fallback={<Cards data={null} />}>
          <CardsWithData />
        </Suspense>
      </div>
    </section>
  );
}

async function CardsWithData() {
  return <Cards data={await loadHomeData()} />;
}

function Cards({ data }: { data: HomeData | null }) {
  return (
    <div className="mt-14 flex flex-wrap gap-6">
      <Reveal className="flex min-w-0 flex-[1_1_520px]">
        <GiftCard data={data} />
      </Reveal>
      <Reveal delay={0.08} className="flex min-w-0 flex-[1_1_520px]">
        <NfcHomeCard data={data} />
      </Reveal>
    </div>
  );
}

function Chips({ items, tone }: { items: string[]; tone: "gift" | "nfc" }) {
  return (
    <ul className="mt-6 flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm",
            tone === "gift" ? "bg-[rgba(244,166,184,0.1)] text-gift" : "bg-[rgba(125,211,252,0.1)] text-nfc",
          )}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function PriceLine({ data, value, suffix }: { data: HomeData | null; value: number | null | undefined; suffix?: string }) {
  if (!data) return <Skeleton className="h-6 w-32 bg-white/10" />;
  return (
    <p className="text-sm text-night-muted">
      {value != null ? (
        <>
          Desde <span className="font-heading text-xl font-semibold text-night-text">{formatMoney(value)} MXN</span>
          {suffix ? ` ${suffix}` : ""}
        </>
      ) : (
        <span className="font-heading text-xl font-semibold text-night-text">Por cotizar</span>
      )}
    </p>
  );
}

const outlineBtn =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-semibold text-night-text transition-colors hover:bg-white/10";

function GiftCard({ data }: { data: HomeData | null }) {
  return (
    <article className="flex w-full flex-col overflow-hidden rounded-[32px] border border-[rgba(244,166,184,0.18)] bg-gift-night">
      {/* Escena: invitación al frente, cuenta regresiva detrás y la vista previa del link flotando */}
      <div className="relative h-[400px] overflow-hidden bg-gift-stage" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(244,166,184,0.28),transparent_60%)]" />
        <div className="absolute top-1/2 left-1/2 h-[400px] w-[520px] -translate-x-1/2 -translate-y-1/2 max-sm:scale-[0.64]">
          <PhoneMockup width={150} className="absolute top-[70px] left-[70px] -rotate-9 opacity-85" screen="#1C140C">
            <CountdownScreen scale={0.72} />
          </PhoneMockup>
          <PhoneMockup width={210} float className="absolute top-[-10px] left-[155px]">
            <InvitationScreen />
          </PhoneMockup>
          <LinkPreviewCard
            className="absolute right-[18px] bottom-[34px] rotate-2"
            image={data?.giftPreview?.image}
            title={data?.giftPreview?.title ?? SAMPLE_GIFT.linkTitle}
            domain={data?.giftPreview?.domain ?? SAMPLE_GIFT.demoDomain}
          />
        </div>
        {data && data.templateCount > 0 && (
          <p className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-night/85 px-3 py-1.5 text-xs font-medium text-night-text backdrop-blur">
            <span className="size-2 rounded-full bg-emerald-400" />
            {data.templateCount} {data.templateCount === 1 ? "plantilla" : "plantillas"} con demo en vivo
          </p>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-10">
        <p className="text-xs font-semibold tracking-[0.18em] text-gift uppercase">Detalles digitales</p>
        <h3 className="mt-3 text-[28px] leading-tight font-semibold tracking-[-0.025em] sm:text-[34px]">Sorprende con un detalle que se abre con un link</h3>
        <p className="mt-4 leading-relaxed text-night-muted">
          Invitaciones y sorpresas para tu pareja, amigas o amigos, hechas con sus nombres, tus mensajes y sus fotos.
        </p>
        <Chips tone="gift" items={["Elige y mira la demo", "Con sus nombres y mensajes", "Link listo para WhatsApp"]} />
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-8">
          <PriceLine data={data} value={data?.giftFrom} />
          <div className="flex flex-wrap gap-3">
            {data?.giftDemoUrl && (
              <a href={data.giftDemoUrl} target="_blank" rel="noopener noreferrer" className={outlineBtn}>
                Ver una demo
                <ExternalLink className="size-4" aria-hidden />
                <span className="sr-only">(se abre en otra pestaña)</span>
              </a>
            )}
            <Link
              href="/detalles-digitales"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gift px-5 text-sm font-semibold text-on-gift transition-opacity hover:opacity-90"
            >
              Ver plantillas
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function NfcHomeCard({ data }: { data: HomeData | null }) {
  return (
    <article className="flex w-full flex-col overflow-hidden rounded-[32px] border border-[rgba(125,211,252,0.18)] bg-nfc-night">
      <div className="relative h-[400px] overflow-hidden bg-nfc-stage" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_50%,rgba(125,211,252,0.24),transparent_60%)]" />
        <div className="absolute top-1/2 left-1/2 h-[400px] w-[520px] -translate-x-1/2 -translate-y-1/2 max-sm:scale-[0.64]">
          <NfcCardFace width={290} className="absolute top-[130px] left-[8px] -rotate-10" />
          <NfcRings size={170} className="absolute top-[115px] left-[225px]" />
          <PhoneMockup width={190} float className="absolute top-[12px] right-[22px]">
            <ContactScreen scale={0.9} />
          </PhoneMockup>
        </div>
        <p className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-night/85 px-3 py-1.5 text-xs font-medium text-night-text backdrop-blur">
          <span className="size-2 rounded-full bg-nfc" />
          Sin app: se abre al acercar el celular
        </p>
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-10">
        <p className="text-xs font-semibold tracking-[0.18em] text-nfc uppercase">Tarjetas NFC</p>
        <h3 className="mt-3 text-[28px] leading-tight font-semibold tracking-[-0.025em] sm:text-[34px]">Tu tarjeta de presentación, a un toque del celular</h3>
        <p className="mt-4 leading-relaxed text-night-muted">
          Para tu empresa, negocio o marca personal: la tarjeta física y una página de contacto con tu diseño, que actualizas sin reimprimir.
        </p>
        <Chips tone="nfc" items={["Tarjeta NFC física", "Página de contacto incluida", "Guarda tu contacto en un toque"]} />
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-8">
          <PriceLine data={data} value={data?.nfcFrom} suffix="por tarjeta" />
          <div className="flex flex-wrap gap-3">
            {data?.nfcDemoUrl && (
              <a href={data.nfcDemoUrl} target="_blank" rel="noopener noreferrer" className={outlineBtn}>
                Probar una demo
                <ExternalLink className="size-4" aria-hidden />
                <span className="sr-only">(se abre en otra pestaña)</span>
              </a>
            )}
            <Link
              href="/tarjetas-nfc"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-nfc px-5 text-sm font-semibold text-on-nfc transition-opacity hover:opacity-90"
            >
              Ver diseños
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
