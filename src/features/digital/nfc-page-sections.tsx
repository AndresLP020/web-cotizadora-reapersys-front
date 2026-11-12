import { ArrowRight, Contact, CreditCard, ExternalLink, QrCode, RefreshCw, Smartphone, UserPlus, Users, Wifi } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Reveal } from "@/components/motion/reveal";
import { getNfcDesigns } from "@/services/digital";
import { ContactScreen, NfcCardFace, NfcRings } from "./nfc-visuals";
import { PhoneMockup } from "./phone-mockup";

// ---------------------------------------------------------------- hero

export function NfcHero() {
  return (
    <section className="relative isolate overflow-hidden bg-nfc-night bg-grid-nfc pt-28 pb-20 text-night-text sm:pt-36 sm:pb-28">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_30%,rgba(125,211,252,0.18),transparent_55%)]" />
      <div className="mx-auto grid w-full max-w-[1240px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr]">
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
                Tarjetas NFC
              </li>
            </ol>
          </nav>
          <h1 className="mt-6 text-5xl leading-[1] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-[72px]">Tu presentación, a un toque del celular</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-night-muted">
            Una tarjeta física con chip NFC y una página de contacto con tu diseño. Quien la recibe acerca su celular y guarda tus datos al instante.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#disena" className="inline-flex h-12 items-center gap-2 rounded-xl bg-nfc px-6 text-sm font-semibold text-on-nfc hover:opacity-90">
              Diseñar mi tarjeta
              <ArrowRight className="size-4" aria-hidden />
            </a>
            <Suspense fallback={null}>
              <DemoButton />
            </Suspense>
          </div>
          <ul className="mt-10 grid gap-4 text-sm sm:grid-cols-3">
            {[
              { icon: Smartphone, text: "Sin app" },
              { icon: Wifi, text: "iPhone y Android con NFC" },
              { icon: QrCode, text: "QR de respaldo en el reverso" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5">
                <Icon className="size-5 shrink-0 text-nfc" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </Reveal>
        <div className="relative mx-auto h-[420px] w-full max-w-[600px] sm:h-[520px]" aria-hidden>
          <div className="absolute top-1/2 left-1/2 h-[520px] w-[600px] -translate-x-1/2 -translate-y-1/2 max-sm:scale-[0.62] sm:max-lg:scale-90">
            <NfcCardFace width={340} className="absolute top-[190px] left-0 -rotate-12" />
            <NfcRings size={200} className="absolute top-[160px] left-[255px]" />
            <PhoneMockup width={230} float className="absolute top-[20px] right-0">
              <ContactScreen variant="full" scale={1.02} />
            </PhoneMockup>
          </div>
        </div>
      </div>
    </section>
  );
}

async function DemoButton() {
  const designs = await getNfcDesigns();
  const demo = designs.status === "ok" ? designs.data[0]?.demoUrl : null;
  if (!demo) return null;
  return (
    <a
      href={demo}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 px-6 text-sm font-semibold text-night-text hover:bg-white/10"
    >
      Probar una página demo
      <ExternalLink className="size-4" aria-hidden />
      <span className="sr-only">(se abre en otra pestaña)</span>
    </a>
  );
}

// ---------------------------------------------------------------- qué incluye

const INCLUDED = [
  { icon: CreditCard, title: "Tarjeta NFC física", text: "Impresa por ambos lados, con chip NFC y QR de respaldo." },
  { icon: Contact, title: "Página de contacto", text: "WhatsApp, llamada, correo, ubicación, redes y portafolio, con tu marca." },
  { icon: UserPlus, title: "Guarda tu contacto", text: "Un botón agrega tus datos a la agenda (archivo vCard .vcf)." },
  { icon: RefreshCw, title: "Datos al día", text: "Si cambias de número o puesto, actualizamos la página y la tarjeta sigue sirviendo." },
];

export function NfcIncluded() {
  return (
    <section aria-labelledby="incluye-title" className="bg-paper py-20 sm:py-24">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.18em] text-nfc-deep uppercase">Qué incluye</p>
          <h2 id="incluye-title" className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-deep sm:text-5xl">
            La tarjeta y su página, juntas
          </h2>
        </Reveal>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {INCLUDED.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delay={index * 0.05} className="h-full">
              <li className="h-full rounded-3xl border border-paper-line bg-white p-7">
                <span className="grid size-11 place-items-center rounded-xl bg-[rgba(3,105,161,0.1)] text-nfc-deep">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-deep">{title}</h3>
                <p className="mt-2 leading-relaxed text-deep-muted">{text}</p>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- preguntas finales

export function NfcFaq() {
  return (
    <section className="bg-paper pb-24">
      <div className="mx-auto grid w-full max-w-[1240px] gap-5 px-4 sm:px-6 md:grid-cols-3">
        <Reveal className="h-full">
          <div className="h-full rounded-3xl border border-paper-line bg-white p-7">
            <QrCode className="size-6 text-nfc-deep" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-deep">¿Y si el celular no tiene NFC?</h3>
            <p className="mt-2 leading-relaxed text-deep-muted">El reverso lleva un código QR que abre la misma página con la cámara.</p>
          </div>
        </Reveal>
        <Reveal delay={0.05} className="h-full">
          <div className="h-full rounded-3xl border border-paper-line bg-white p-7">
            <Smartphone className="size-6 text-nfc-deep" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-deep">¿Quien la recibe necesita una app?</h3>
            <p className="mt-2 leading-relaxed text-deep-muted">No. Tu página se abre en el navegador del celular, sin instalar nada.</p>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="h-full">
          <div className="flex h-full flex-col rounded-3xl bg-nfc-night p-7 text-night-text">
            <Users className="size-6 text-nfc" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold">¿Tarjetas para todo tu equipo?</h3>
            <p className="mt-2 leading-relaxed text-night-muted">Armamos un pedido con la página de cada integrante y el mismo diseño.</p>
            <Link
              href="/contacto"
              className="mt-6 inline-flex h-12 w-fit items-center gap-2 rounded-xl bg-nfc px-5 text-sm font-semibold text-on-nfc hover:opacity-90"
            >
              Cotizar para equipo
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
