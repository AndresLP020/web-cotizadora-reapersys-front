import type { Metadata } from "next";
import { DigitalTemplatesPage } from "@/features/admin/pages/digital-templates-page";

export const metadata: Metadata = { title: "Detalles digitales y NFC" };

/** Sin sesión el panel solo muestra un esqueleto: Next no puede validar esta página como navegación instantánea. */
export const instant = false;

export default function Page() {
  return <DigitalTemplatesPage />;
}
