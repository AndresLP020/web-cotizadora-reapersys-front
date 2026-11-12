import type { FieldKey, NfcAudience, NfcInclude } from "@/types/digital";

/** Etiquetas de los datos que pide cada plantilla (mismas claves que el backend). */
export const FIELD_LABELS: Record<FieldKey, string> = {
  recipientName: "Para quién es",
  senderName: "De parte de",
  title: "Título",
  message: "Mensaje especial",
  date: "Fecha especial",
  photos: "Fotos",
  song: "Canción (opcional)",
  place: "Lugar y hora",
  rsvp: "Confirmar asistencia",
};

/** Texto corto para «Personalizas: …» en el catálogo. */
export const FIELD_SHORT: Record<FieldKey, string> = {
  recipientName: "su nombre",
  senderName: "tu nombre",
  title: "título",
  message: "mensaje",
  date: "fecha",
  photos: "fotos",
  song: "canción",
  place: "lugar",
  rsvp: "confirmación",
};

/** Largo máximo de cada dato de texto (mismo tope que el backend). */
export const FIELD_MAX: Record<Exclude<FieldKey, "photos">, number> = {
  recipientName: 60,
  senderName: 60,
  title: 80,
  message: 1000,
  date: 10,
  song: 300,
  place: 200,
  rsvp: 20,
};

export const MAX_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 5_000_000;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const AUDIENCE_LABELS: Record<NfcAudience, string> = { person: "Persona", business: "Negocio", team: "Equipo" };

export const INCLUDE_LABELS: Record<NfcInclude, string> = {
  saveContact: "Guardar contacto",
  whatsapp: "WhatsApp",
  callEmail: "Llamar y correo",
  location: "Ubicación",
  social: "Redes sociales",
  portfolio: "Sitio o portafolio",
};

export const INCLUDE_ORDER: NfcInclude[] = ["saveContact", "whatsapp", "callEmail", "location", "social", "portfolio"];
