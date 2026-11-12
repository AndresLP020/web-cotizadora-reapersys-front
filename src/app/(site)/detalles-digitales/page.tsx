import type { Metadata } from "next";
import { Suspense } from "react";
import { GiftCatalogSkeleton } from "@/features/digital/gift-catalog";
import { GiftClosing, GiftHero, GiftSteps } from "@/features/digital/gift-page-sections";
import { GiftStudio } from "@/features/digital/gift-studio";
import { getDigitalTemplates, getOccasions } from "@/services/digital";
import { getPublicSettings } from "@/services/public-settings";

export const metadata: Metadata = {
  title: "Detalles digitales personalizados",
  description:
    "Invitaciones y sorpresas digitales para tu pareja, amigas o amigos: elige un diseño, mira la demo y lo hacemos con sus nombres, tus mensajes y sus fotos.",
  alternates: { canonical: "/detalles-digitales" },
  openGraph: { title: "Detalles digitales personalizados | ReaperSys", url: "/detalles-digitales" },
};

export default function DigitalGiftsPage() {
  return (
    <>
      <GiftHero />
      <GiftSteps />
      <Suspense fallback={<GiftCatalogSkeleton />}>
        <Studio />
      </Suspense>
      <GiftClosing />
    </>
  );
}

/** Catálogo y personalización con los datos del momento (se editan desde el panel). */
async function Studio() {
  const [templates, occasions, settings] = await Promise.all([getDigitalTemplates(), getOccasions(), getPublicSettings()]);
  return (
    <GiftStudio
      templates={templates.status === "ok" ? templates.data : []}
      occasions={occasions.status === "ok" ? occasions.data : []}
      unavailable={templates.status === "unavailable"}
      privacyNoticeAvailable={settings.privacyNotice.published}
    />
  );
}
