import { ArrowRight, Heart, MessageCircle, MonitorSmartphone, PlayCircle, Send } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Reveal } from "@/components/motion/reveal";
import { apiAssetUrl, getDigitalTemplates } from "@/services/digital";
import { contactLinks, getPublicSettings } from "@/services/public-settings";
import type { PublicDigitalTemplate, TemplateColors } from "@/types/digital";
import { CountdownScreen, InvitationScreen, TemplateThumb } from "./gift-visuals";
import { PhoneMockup } from "./phone-mockup";

const GALAXY: TemplateColors = { bg: "#141E3A", accent: "#9DB4E8", ink: "#DCE6FF", stage: "#E3E9F8" };

// ---------------------------------------------------------------- hero

export function GiftHero() {
  return (
    <section className="relative isolate overflow-hidden bg-gift-night pt-28 pb-20 text-night-text sm:pt-36 sm:pb-28">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_10%,rgba(244,166,184,0.22),transparent_55%)]" />
      <div className="mx-auto grid w-full max-w-[1240px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
        <Reveal fade={false}>
          <nav aria-label="Migas de pan" className="text-sm text-night-muted">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-night-text">
                  Inicio
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-night-text">
                Detalles digitales
              </li>
            </ol>
          </nav>
          <h1 className="mt-6 text-5xl leading-[1] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-[72px]">
            Un detalle que se abre con <span className="font-serif font-normal text-gift italic">un link</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-night-muted">
            Invitaciones y sorpresas digitales para tu pareja, amigas o amigos. Elige un diseño, míralo funcionando y lo hacemos con sus nombres, tus mensajes
            y sus fotos.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#catalogo" className="inline-flex h-12 items-center gap-2 rounded-xl bg-gift px-6 text-sm font-semibold text-on-gift hover:opacity-90">
              Ver plantillas
              <ArrowRight className="size-4" aria-hidden />
            </a>
            <a
              href="#personaliza"
              className="inline-flex h-12 items-center rounded-xl border border-white/25 px-6 text-sm font-semibold text-night-text hover:bg-white/10"
            >
              Cómo se personaliza
            </a>
          </div>
          <ul className="mt-10 grid gap-4 text-sm text-night-text sm:grid-cols-3">
            {[
              { icon: PlayCircle, text: "Demo en vivo antes de pedir" },
              { icon: MonitorSmartphone, text: "Hecho para el celular" },
              { icon: MessageCircle, text: "Se comparte por WhatsApp" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5">
                <Icon className="size-5 shrink-0 text-gift" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </Reveal>
        <div className="relative mx-auto h-[440px] w-full max-w-[520px] sm:h-[520px]" aria-hidden>
          <Suspense fallback={<PhoneFan templates={[]} />}>
            <HeroFan />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

async function HeroFan() {
  const result = await getDigitalTemplates();
  return <PhoneFan templates={result.status === "ok" ? result.data.slice(0, 3) : []} />;
}

/** Pantalla de una plantilla: su imagen si la tiene; si no, la miniatura con sus colores. */
export function TemplateScreen({ template, scale }: { template: PublicDigitalTemplate; scale: number }) {
  // Solo una portada subida (vertical) va dentro del celular; la og:image es horizontal.
  const image = template.preview.imageSource === "upload" ? apiAssetUrl(template.preview.imagePath) : null;
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element -- imagen de la vista previa servida por la API
    return <img src={image} alt="" className="size-full object-cover" />;
  }
  return <TemplateThumb colors={template.colors} label={template.name} title={template.preview.title ?? template.name} hint="Toca para abrir" scale={scale} />;
}

/** Tres celulares en abanico: las 3 primeras plantillas publicadas o, sin datos, los ejemplos. */
function PhoneFan({ templates }: { templates: PublicDigitalTemplate[] }) {
  const screen = (index: number, scale: number) => {
    const template = templates[index];
    if (template) return <TemplateScreen template={template} scale={scale} />;
    if (index === 0) return <CountdownScreen scale={scale} />;
    if (index === 2) return <InvitationScreen colors={GALAXY} title="Nuestra galaxia" hint="Desliza para ver" scale={scale} />;
    return <InvitationScreen scale={scale} />;
  };
  return (
    <>
      <div className="absolute inset-x-0 top-1/2 h-[420px] -translate-y-1/2 sm:h-[520px]">
        <PhoneMockup width={170} className="absolute top-[18%] left-[2%] -rotate-10 max-sm:scale-[0.82]" screen="#1C140C">
          {screen(0, 0.8)}
        </PhoneMockup>
        <PhoneMockup width={170} className="absolute top-[18%] right-[2%] rotate-10 max-sm:scale-[0.82]" screen={GALAXY.bg}>
          {screen(2, 0.8)}
        </PhoneMockup>
        <PhoneMockup width={230} float className="absolute top-[4%] left-1/2 z-10 -translate-x-1/2 max-sm:scale-[0.82]">
          {screen(1, 1.08)}
        </PhoneMockup>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- cómo funciona

const STEPS = [
  { title: "Elige y mira la demo", text: "Abre cada diseño y míralo funcionando en tu celular antes de pedir." },
  { title: "Cuéntanos los detalles", text: "Un formulario corto con sus nombres, tus mensajes y fotos, con vista previa mientras escribes." },
  { title: "Recibe tu link", text: "Te lo entregamos con su vista previa, listo para WhatsApp, Instagram o un QR." },
];

export function GiftSteps() {
  return (
    <section aria-labelledby="como-funciona" className="bg-paper py-20 sm:py-24">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.18em] text-gift-deep uppercase">Cómo funciona</p>
          <h2 id="como-funciona" className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-deep sm:text-5xl">
            Listo en tres pasos
          </h2>
        </Reveal>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.06} className="h-full">
              <li className="h-full rounded-3xl border border-paper-line bg-white p-7">
                <span className="grid size-11 place-items-center rounded-xl bg-[rgba(244,166,184,0.22)] font-heading text-lg font-semibold text-gift-deep">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-xl font-semibold text-deep">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-deep-muted">{step.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- cierre

export function GiftClosing() {
  return (
    <section className="bg-paper pb-24">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <Reveal className="flex flex-col items-start justify-between gap-6 rounded-[28px] border border-paper-line bg-white p-8 sm:p-12 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(244,166,184,0.22)] text-gift-deep">
              <Heart className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-2xl font-semibold text-deep sm:text-3xl">¿Tienes una idea diferente?</h2>
              <p className="mt-2 text-deep-muted">Cuéntanos la ocasión y diseñamos un detalle a tu medida.</p>
            </div>
          </div>
          <Suspense fallback={<ClosingButtons whatsappUrl={null} />}>
            <ClosingButtonsWithSettings />
          </Suspense>
        </Reveal>
      </div>
    </section>
  );
}

async function ClosingButtonsWithSettings() {
  return <ClosingButtons whatsappUrl={contactLinks(await getPublicSettings()).whatsappUrl} />;
}

function ClosingButtons({ whatsappUrl }: { whatsappUrl: string | null }) {
  return (
    <div className="flex flex-wrap gap-3">
      {whatsappUrl && (
        <a
          href={`${whatsappUrl}?text=${encodeURIComponent("Hola, quiero un detalle digital a la medida.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-paper-line px-5 text-sm font-semibold text-deep hover:bg-paper"
        >
          <MessageCircle className="size-4" aria-hidden />
          Hablar por WhatsApp
        </a>
      )}
      <Link href="/contacto" className="inline-flex h-12 items-center gap-2 rounded-xl bg-deep px-5 text-sm font-semibold text-white hover:opacity-90">
        <Send className="size-4" aria-hidden />
        Pedir uno a la medida
      </Link>
    </div>
  );
}
