import type { Metadata } from "next";
import { Suspense } from "react";
import { PackagesExperience } from "@/features/packages/packages-experience";
import { PackageGridSkeleton } from "@/features/packages/package-grid";
import { getPackageDetail, getPackages } from "@/services/catalog";
import { contactLinks, getPublicSettings } from "@/services/public-settings";

export const metadata: Metadata = {
  title: "Paquetes",
  description:
    "Paquetes de desarrollo web, e-commerce, punto de venta y la Solución Combinada. Compáralos en pago único o renta mensual. Precios en MXN.",
  alternates: { canonical: "/paquetes" },
};

export default function PackagesPage() {
  return (
    <Suspense fallback={<PackagesSkeleton />}>
      <PackagesContent />
    </Suspense>
  );
}

/** Todo sale de la API en cada solicitud: precios, renta, puntos, complementos y lo que incluye cada paquete. */
async function PackagesContent() {
  const [result, settings] = await Promise.all([getPackages(), getPublicSettings()]);
  if (result.status === "unavailable") return <PackagesSkeleton unavailable />;
  const combo = result.items.find((p) => p.category === "combo");
  const slugs = combo ? [combo.slug, ...combo.includesPackages.map((p) => p.slug)] : [];
  const details = (await Promise.all(slugs.map((slug) => getPackageDetail(slug)))).filter((d) => d !== null);
  return <PackagesExperience packages={result.items} details={details} plans={settings.subscription} whatsappUrl={contactLinks(settings).whatsappUrl} />;
}

function PackagesSkeleton({ unavailable = false }: { unavailable?: boolean }) {
  return (
    <>
      <section className="bg-night bg-grid-night pt-28 pb-28 text-night-text sm:pt-36">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-new uppercase">Paquetes</p>
          <h1 className="mt-5 text-5xl leading-[1] font-semibold tracking-[-0.035em] sm:text-6xl lg:text-[72px]">
            Elige un paquete
            <br />y hazlo tuyo
          </h1>
          {unavailable && (
            <p className="mt-6 max-w-xl text-lg text-night-muted">
              El catálogo no está disponible en este momento. Escríbenos desde <a href="/contacto" className="underline">contacto</a> y te enviamos una propuesta.
            </p>
          )}
        </div>
      </section>
      {!unavailable && (
        <section className="bg-paper py-20">
          <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
            <PackageGridSkeleton count={3} />
          </div>
        </section>
      )}
    </>
  );
}
