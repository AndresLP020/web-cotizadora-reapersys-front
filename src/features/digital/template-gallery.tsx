import { LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDigitalTemplates } from "@/services/digital";
import { contactLinks, getPublicSettings } from "@/services/public-settings";
import type { DigitalKind } from "@/types/digital";
import { TemplateCatalog } from "./template-catalog";

/** Plantillas leídas de la API en cada solicitud (se agregan desde el panel). */
export function TemplateGallery({ kind }: { kind: DigitalKind }) {
  return (
    <Suspense fallback={<GallerySkeleton />}>
      <GalleryContent kind={kind} />
    </Suspense>
  );
}

async function GalleryContent({ kind }: { kind: DigitalKind }) {
  const [result, settings] = await Promise.all([getDigitalTemplates(kind), getPublicSettings()]);
  if (result.status === "unavailable" || result.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <LayoutTemplate className="size-8 text-electric" aria-hidden />
        <p className="max-w-md text-sm text-foreground-secondary">
          {result.status === "unavailable"
            ? "No pudimos cargar el catálogo en este momento. Intenta de nuevo en unos minutos."
            : "Estamos preparando nuevas plantillas. Escríbenos y te mostramos los diseños disponibles."}
        </p>
        <Button asChild variant="glass">
          <Link href="/contacto">Contáctanos</Link>
        </Button>
      </div>
    );
  }
  return (
    <TemplateCatalog
      kind={kind}
      templates={result.items}
      whatsappUrl={contactLinks(settings).whatsappUrl}
      privacyNoticeAvailable={settings.privacyNotice.published}
    />
  );
}

function GallerySkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Cargando plantillas">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <Skeleton className="aspect-[1.91/1] rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
