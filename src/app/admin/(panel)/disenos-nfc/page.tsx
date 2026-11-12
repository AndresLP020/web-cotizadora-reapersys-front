import type { Metadata } from "next";
import { NfcDesignsPage } from "@/features/admin/pages/nfc-designs-page";

export const metadata: Metadata = { title: "Diseños NFC" };

/** Sin sesión el panel solo muestra un esqueleto: Next no puede validar esta página como navegación instantánea. */
export const instant = false;

export default function Page() {
  return <NfcDesignsPage />;
}
