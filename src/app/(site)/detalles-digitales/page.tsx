import { Gift, LayoutTemplate, Send } from "lucide-react";
import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/layout/section";
import { StepsGrid } from "@/features/digital/steps-grid";
import { TemplateGallery } from "@/features/digital/template-gallery";
import { CtaBanner } from "@/features/marketing/cta-banner";
import { PageHero } from "@/features/marketing/page-hero";

export const metadata: Metadata = {
  title: "Detalles digitales personalizados",
  description: "Invitaciones de cumpleaños y detalles digitales para tu pareja o amigos: elige una plantilla, mira la demo y la personalizamos con sus nombres y mensajes.",
  alternates: { canonical: "/detalles-digitales" },
};

const steps = [
  { icon: LayoutTemplate, title: "Elige una plantilla", description: "Abre la demo de cada diseño para ver cómo se ve y se mueve en el celular." },
  { icon: Gift, title: "Cuéntanos los detalles", description: "Los nombres, mensajes especiales y fechas que llevará: los pides en el mismo formulario." },
  { icon: Send, title: "Recibe tu enlace", description: "Te entregamos el link de tu página personalizada, listo para compartir por WhatsApp o redes." },
];

export default function DigitalGiftsPage() {
  return (
    <>
      <PageHero
        eyebrow="Detalles digitales"
        title="Un detalle que se abre con un link"
        description="Invitaciones de cumpleaños y sorpresas digitales para tu pareja, amigas o amigos, personalizadas con sus nombres y tus mensajes."
        image="/images/backgrounds/night-offices.webp"
      />
      <Section tone="tint" className="pt-14 sm:pt-20" aria-labelledby="how-title">
        <SectionHeading id="how-title" eyebrow="Cómo funciona" title="Personalizado en tres pasos" />
        <div className="mt-10">
          <StepsGrid items={steps} />
        </div>
      </Section>
      <Section tone="tint-alt" aria-labelledby="catalog-title">
        <SectionHeading id="catalog-title" title="Catálogo de plantillas" description="Toca la imagen o «Ver demo» para abrir la página de ejemplo. Cuando elijas, presiona «Lo quiero»." />
        <div className="mt-10">
          <TemplateGallery kind="digital_gift" />
        </div>
      </Section>
      <CtaBanner title="¿Tienes una idea diferente?" description="Cuéntanos la ocasión y diseñamos un detalle digital a tu medida." />
    </>
  );
}
