import type { Metadata } from "next";
import { Suspense } from "react";
import { NfcConfigurator } from "@/features/digital/nfc-configurator";
import { NfcFaq, NfcHero, NfcIncluded } from "@/features/digital/nfc-page-sections";
import { getNfcDesigns, getNfcPricing } from "@/services/digital";
import { getPublicSettings } from "@/services/public-settings";

export const metadata: Metadata = {
  title: "Tarjetas NFC de presentación",
  description:
    "Tarjeta física con chip NFC y una página de contacto con tu diseño. Quien la recibe acerca su celular y guarda tus datos al instante, sin app.",
  alternates: { canonical: "/tarjetas-nfc" },
  openGraph: { title: "Tarjetas NFC de presentación | ReaperSys", url: "/tarjetas-nfc" },
};

export default function NfcCardsPage() {
  return (
    <>
      <NfcHero />
      <NfcIncluded />
      <Suspense fallback={<ConfiguratorSkeleton />}>
        <Configurator />
      </Suspense>
      <NfcFaq />
    </>
  );
}

async function Configurator() {
  const [designs, pricing, settings] = await Promise.all([getNfcDesigns(), getNfcPricing(), getPublicSettings()]);
  return (
    <NfcConfigurator
      designs={designs.status === "ok" ? designs.data : []}
      tiers={pricing.status === "ok" ? pricing.data : []}
      privacyNoticeAvailable={settings.privacyNotice.published}
    />
  );
}

function ConfiguratorSkeleton() {
  return (
    <section className="bg-paper py-20 sm:py-24" aria-busy="true" aria-label="Cargando el configurador">
      <div className="mx-auto grid w-full max-w-[1240px] gap-6 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="h-[520px] animate-pulse rounded-[28px] bg-nfc-panel" />
        <div className="h-[520px] animate-pulse rounded-[28px] bg-white" />
      </div>
    </section>
  );
}
