/**
 * Contenido de ejemplo de las escenas de producto (los celulares y tarjetas de muestra).
 * Son nombres ficticios: cámbialos aquí y se actualizan en todo el sitio.
 */
export const SAMPLE_GIFT = {
  recipient: "Sofía",
  sender: "Andrés",
  title: "Feliz cumpleaños, mi amor",
  hint: "Toca el sobre para abrir",
  countdownDays: "03",
  countdownEvent: "tu fiesta",
  linkTitle: "Abre tu sorpresa",
  linkDescription: "Alguien preparó algo especial para ti.",
  /** Dominio de la demo cuando aún no hay plantillas publicadas. */
  demoDomain: "detalles.reapersys.com",
} as const;

export const SAMPLE_NFC = {
  name: "Mariana López",
  initials: "ML",
  logo: "M",
  role: "Directora",
  company: "Estudio Lumen",
  demoDomain: "contacto.reapersys.com",
} as const;
