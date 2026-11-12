import { CreditCard, Smartphone, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/layout/section";
import { StepsGrid } from "@/features/digital/steps-grid";
import { TemplateGallery } from "@/features/digital/template-gallery";
import { CtaBanner } from "@/features/marketing/cta-banner";
import { PageHero } from "@/features/marketing/page-hero";

export const metadata: Metadata = {
  title: "Tarjetas NFC de presentación",
  description: "Tarjetas NFC de presentación para tu empresa, negocio o marca personal, con su página de contacto personalizada. Elige el diseño y pide las que necesites.",
  alternates: { canonical: "/tarjetas-nfc" },
};

const included = [
  { icon: CreditCard, title: "Tarjeta NFC", description: "La tarjeta física de presentación, lista para entregar a tus clientes y contactos." },
  { icon: UserRound, title: "Página de contacto personalizada", description: "Una página con los datos de contacto de tu empresa, negocio o persona, con el diseño que elijas." },
  { icon: Smartphone, title: "Se comparte al acercarla", description: "Quien la recibe acerca su celular a la tarjeta y se abre tu página de contacto." },
];

export default function NfcCardsPage() {
  return (
    <>
      <PageHero
        eyebrow="Tarjetas NFC"
        title="Tu presentación, a un toque del celular"
        description="Tarjetas NFC para tu empresa, negocio o marca personal, con una página de contacto hecha a tu medida."
        image="/images/backgrounds/services-desk.webp"
      />
      <Section tone="tint" className="pt-14 sm:pt-20" aria-labelledby="included-title">
        <SectionHeading id="included-title" eyebrow="Qué incluye" title="La tarjeta y su página de contacto" />
        <div className="mt-10">
          <StepsGrid items={included} numbered={false} />
        </div>
      </Section>
      <Section tone="tint-alt" aria-labelledby="catalog-title">
        <SectionHeading
          id="catalog-title"
          title="Diseños de página de contacto"
          description="Abre la demo de cada diseño. Al pedir, indicas cuántas tarjetas necesitas y los datos que llevará tu página."
        />
        <div className="mt-10">
          <TemplateGallery kind="nfc_card" />
        </div>
      </Section>
      <CtaBanner title="¿Necesitas tarjetas para todo tu equipo?" description="Escríbenos y armamos un pedido con la página de cada integrante." />
    </>
  );
}
