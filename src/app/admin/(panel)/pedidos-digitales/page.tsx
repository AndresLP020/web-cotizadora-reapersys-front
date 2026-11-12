import type { Metadata } from "next";
import { DigitalOrdersPage } from "@/features/admin/pages/digital-orders-page";

export const metadata: Metadata = { title: "Pedidos de detalles y NFC" };

/** Sin sesión el panel solo muestra un esqueleto: Next no puede validar esta página como navegación instantánea. */
export const instant = false;

export default function Page() {
  return <DigitalOrdersPage />;
}
