"use client";

import { useMutation } from "@tanstack/react-query";
import { CalendarHeart, CheckCircle2, Copy, Loader2, Plus, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { DigitalOrderReceipt, FieldKey, PublicDigitalTemplate } from "@/types/digital";
import { priceLabel } from "./gift-catalog";
import { InvitationScreen, LinkPreviewCard } from "./gift-visuals";
import { FIELD_LABELS, FIELD_MAX, MAX_PHOTO_BYTES, MAX_PHOTOS, PHOTO_TYPES } from "./labels";
import {
  ContactFields,
  type ContactValues,
  describedBy,
  describeOrderError,
  emptyContact,
  Field,
  type FieldErrors,
  inputClass,
  validateContact,
} from "./order-contact";
import { PhoneMockup } from "./phone-mockup";
import { SAMPLE_GIFT } from "./sample-content";

type TextKey = Exclude<FieldKey, "photos">;
type Values = Partial<Record<TextKey, string>>;

const PLACEHOLDERS: Partial<Record<TextKey, string>> = {
  recipientName: "Sofía",
  senderName: "Andrés",
  title: "Feliz cumpleaños, mi amor",
  message: "Lo que quieras decirle…",
  song: "https://open.spotify.com/track/…",
  place: "Sábado 8 pm, Casa de Ana",
  rsvp: "55 1234 5678",
};

function formatDate(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

function validateFields(template: PublicDigitalTemplate, values: Values, photos: File[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of template.fields) {
    if (field.key === "photos") {
      const max = Math.min(field.max ?? MAX_PHOTOS, MAX_PHOTOS);
      if (field.required && photos.length === 0) errors.photos = "Sube al menos una foto.";
      if (photos.length > max) errors.photos = `Puedes subir hasta ${max} fotos.`;
      continue;
    }
    const value = values[field.key]?.trim() ?? "";
    const max = Math.min(field.max ?? FIELD_MAX[field.key], FIELD_MAX[field.key]);
    if (!value) {
      if (field.required) errors[field.key] = "Este dato es obligatorio.";
    } else if (value.length > max) errors[field.key] = `Máximo ${max} caracteres.`;
    else if (field.key === "song" && !/^https:\/\/\S+$/i.test(value)) errors[field.key] = "Pega un enlace que empiece con https://";
    else if (field.key === "rsvp" && !/^\+?[\d\s-]{10,20}$/.test(value)) errors[field.key] = "Escribe un WhatsApp de 10 dígitos.";
  }
  return errors;
}

/**
 * «Personaliza»: formulario generado con los campos de la plantilla elegida y, al lado, el celular
 * que se actualiza mientras se escribe y la vista previa del link tal como llegará por WhatsApp.
 * Al enviar se crea la solicitud (no se cobra en línea).
 */
export function GiftPersonalize({
  template,
  privacyNoticeAvailable,
  onChange,
}: {
  template: PublicDigitalTemplate | null;
  privacyNoticeAvailable: boolean;
  /** Vuelve al catálogo para elegir otra plantilla. */
  onChange: () => void;
}) {
  const formId = useId();
  const [values, setValues] = useState<Values>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [contact, setContact] = useState<ContactValues>(emptyContact);
  // Errores y envío quedan asociados a la plantilla: al cambiarla, no se arrastran.
  const [errorsFor, setErrorsFor] = useState<{ slug: string | undefined; errors: FieldErrors }>({ slug: undefined, errors: {} });
  const [copied, setCopied] = useState(false);

  // Las miniaturas de las fotos se crean y liberan con la lista.
  const photoUrls = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
  useEffect(() => () => photoUrls.forEach((url) => URL.revokeObjectURL(url)), [photoUrls]);

  const order = useMutation({
    mutationFn: async (orderSlug: string) => {
      const personalization = Object.fromEntries(Object.entries(values).filter(([, v]) => v && v.trim()));
      const form = new FormData();
      form.append(
        "payload",
        JSON.stringify({
          type: "detail",
          templateSlug: orderSlug,
          personalization,
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          email: contact.email.trim(),
          consent: contact.consent,
          ...(contact.website ? { website: contact.website } : {}),
        }),
      );
      for (const photo of photos) form.append("photos", photo);
      return apiFetch<DigitalOrderReceipt>("/digital-orders", { method: "POST", form });
    },
  });

  const slug = template?.slug;
  const errors = errorsFor.slug === slug ? errorsFor.errors : {};
  const setErrors = (next: FieldErrors | ((current: FieldErrors) => FieldErrors)) =>
    setErrorsFor({ slug, errors: typeof next === "function" ? next(errors) : next });
  const sameTemplate = order.variables === slug;

  const fields = template?.fields ?? [];
  const photoField = fields.find((f) => f.key === "photos");
  const maxPhotos = photoField ? Math.min(photoField.max ?? MAX_PHOTOS, MAX_PHOTOS) : 0;
  const set = (key: TextKey, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const addPhotos = (list: FileList | null) => {
    if (!list) return;
    const accepted: File[] = [];
    let problem: string | null = null;
    for (const file of Array.from(list)) {
      if (!PHOTO_TYPES.includes(file.type)) problem = "Las fotos deben ser JPEG, PNG o WebP.";
      else if (file.size > MAX_PHOTO_BYTES) problem = `«${file.name}» pesa más de 5 MB.`;
      else accepted.push(file);
    }
    const next = [...photos, ...accepted].slice(0, maxPhotos);
    if (photos.length + accepted.length > maxPhotos) problem = `Puedes subir hasta ${maxPhotos} fotos.`;
    setPhotos(next);
    setErrors((e) => ({ ...e, photos: problem ?? undefined }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!template) return;
    const found = { ...validateFields(template, values, photos), ...validateContact(contact) };
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`${formId}-${first}`)?.focus();
      return;
    }
    order.mutate(template.slug);
  };

  const recipient = values.recipientName?.trim() || SAMPLE_GIFT.recipient;
  const sender = values.senderName?.trim() || "";
  const domain = template?.preview.domain ?? SAMPLE_GIFT.demoDomain;
  const exampleLink = `${domain}/para-${recipient
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
  const done = order.isSuccess && sameTemplate ? order.data : null;

  const copy = async () => {
    if (!done) return;
    try {
      await navigator.clipboard.writeText(done.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="personaliza" aria-labelledby="personaliza-title" className="scroll-mt-24 bg-gift-night py-20 text-night-text sm:py-24">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-gift uppercase">Personaliza</p>
        <h2 id="personaliza-title" tabIndex={-1} className="mt-3 text-4xl font-semibold tracking-[-0.03em] outline-none sm:text-5xl">
          Escribe y míralo al momento
        </h2>
        <p className="mt-3 max-w-2xl text-night-muted">La vista previa cambia mientras llenas los datos, y así se verá el link cuando lo mandes.</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          {/* Formulario */}
          <div className="relative rounded-[28px] bg-gift-form p-6 sm:p-8">
            {!template ? (
              <p className="text-night-muted">Elige una plantilla del catálogo para personalizarla aquí.</p>
            ) : done ? (
              <div role="status" className="flex flex-col items-start gap-4 py-6">
                <CheckCircle2 className="size-10 text-gift" aria-hidden />
                <h3 className="text-2xl font-semibold">Recibimos tu pedido</h3>
                <p className="text-night-muted">
                  Te contactaremos por WhatsApp para confirmar los detalles y la entrega de tu link. Tu folio es{" "}
                  <strong className="text-night-text">{done.reference}</strong>. No se hizo ningún cobro en línea.
                </p>
                <button type="button" onClick={onChange} className="h-11 rounded-xl border border-white/25 px-5 text-sm font-semibold hover:bg-white/10">
                  Ver más plantillas
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-5">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
                  <p className="min-w-0 text-sm">
                    <span className="text-night-muted">Plantilla elegida:</span> <strong className="font-semibold">{template.name}</strong>
                  </p>
                  <button type="button" onClick={onChange} className="min-h-11 shrink-0 px-2 text-sm font-semibold text-gift underline-offset-4 hover:underline">
                    Cambiar
                  </button>
                </div>

                {fields.map((field) => {
                  const id = `${formId}-${field.key}`;
                  if (field.key === "photos") {
                    return (
                      <Field key={field.key} id={id} label={`Fotos (hasta ${maxPhotos})`} error={errors.photos} hint="JPEG, PNG o WebP de hasta 5 MB." tone="dark" required={field.required}>
                        <div className="flex flex-wrap gap-2">
                          {photoUrls.map((url, index) => (
                            <div key={url} className="relative size-16 overflow-hidden rounded-xl border border-white/16">
                              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local de la foto elegida */}
                              <img src={url} alt={`Foto ${index + 1}`} className="size-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setPhotos((list) => list.filter((_, i) => i !== index))}
                                className="absolute top-0.5 right-0.5 grid size-6 place-items-center rounded-full bg-night/80"
                                aria-label={`Quitar foto ${index + 1}`}
                              >
                                <X className="size-3.5" aria-hidden />
                              </button>
                            </div>
                          ))}
                          {photos.length < maxPhotos && (
                            <label
                              htmlFor={id}
                              className="grid size-16 cursor-pointer place-items-center rounded-xl border border-dashed border-white/30 text-night-muted hover:border-gift hover:text-gift"
                            >
                              <Plus className="size-5" aria-hidden />
                              <span className="sr-only">Agregar fotos</span>
                            </label>
                          )}
                          <input
                            id={id}
                            type="file"
                            accept={PHOTO_TYPES.join(",")}
                            multiple
                            className="sr-only"
                            aria-describedby={describedBy(id, errors.photos, "x")}
                            onChange={(e) => {
                              addPhotos(e.target.files);
                              e.target.value = "";
                            }}
                          />
                        </div>
                      </Field>
                    );
                  }
                  const key = field.key;
                  const max = Math.min(field.max ?? FIELD_MAX[key], FIELD_MAX[key]);
                  const common = {
                    id,
                    value: values[key] ?? "",
                    maxLength: max,
                    "aria-invalid": !!errors[key],
                    "aria-describedby": describedBy(id, errors[key]),
                    placeholder: PLACEHOLDERS[key],
                  };
                  const label = key === "rsvp" ? "Confirmar asistencia (tu WhatsApp para recibirlas)" : FIELD_LABELS[key];
                  return (
                    <Field key={key} id={id} label={label} error={errors[key]} tone="dark" required={field.required}>
                      {key === "message" ? (
                        <textarea
                          {...common}
                          rows={4}
                          className={cn(inputClass("dark"), "h-auto min-h-28 py-3")}
                          onChange={(e) => set(key, e.target.value)}
                        />
                      ) : (
                        <input
                          {...common}
                          type={key === "date" ? "date" : key === "song" ? "url" : key === "rsvp" ? "tel" : "text"}
                          className={cn(inputClass("dark"), key === "date" && "[color-scheme:dark]")}
                          onChange={(e) => set(key, e.target.value)}
                        />
                      )}
                    </Field>
                  );
                })}

                <div className="border-t border-white/10 pt-5">
                  <p className="mb-4 text-sm font-semibold">Tus datos para entregarte el link</p>
                  <ContactFields
                    idPrefix={formId}
                    values={contact}
                    errors={errors}
                    tone="dark"
                    privacyNoticeAvailable={privacyNoticeAvailable}
                    onChange={(patch) => setContact((c) => ({ ...c, ...patch }))}
                  />
                </div>

                {order.isError && sameTemplate && (
                  <p role="alert" className="rounded-xl bg-[rgba(255,180,194,0.1)] px-4 py-3 text-sm text-[#FFB4C2]">
                    {describeOrderError(order.error)}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                  <p className="text-sm text-night-muted">
                    Total <span className="ml-1 font-heading text-2xl font-semibold text-night-text">{priceLabel(template.priceCents)}</span>
                  </p>
                  <button
                    type="submit"
                    disabled={order.isPending}
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-gift px-6 text-sm font-semibold text-on-gift hover:opacity-90 disabled:opacity-60"
                  >
                    {order.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    Pedir mi detalle
                  </button>
                </div>
                <p className="text-xs text-night-muted">No cobramos en línea: te confirmamos el pedido por WhatsApp.</p>
              </form>
            )}
          </div>

          {/* Vista previa en vivo */}
          <div className="flex flex-col items-center gap-8 rounded-[28px] bg-gift-stage p-6 sm:flex-row sm:items-start sm:justify-center sm:p-8 lg:flex-col lg:items-center xl:flex-row xl:items-start">
            <PhoneMockup width={230} label={`Vista previa del detalle para ${recipient}`} screen={template?.colors.bg}>
              <InvitationScreen recipient={recipient} sender={sender} title={values.title?.trim() || (template ? SAMPLE_GIFT.title : SAMPLE_GIFT.title)} colors={template?.colors} scale={1.05}>
                <div className="mt-[6%] w-full space-y-2 text-left" style={{ color: template?.colors.ink }}>
                  {values.message?.trim() && <p className="line-clamp-3 text-[11px] leading-snug opacity-90">{values.message}</p>}
                  {formatDate(values.date) && (
                    <p className="flex items-center gap-1 text-[11px] font-semibold">
                      <CalendarHeart className="size-3" aria-hidden />
                      {formatDate(values.date)}
                    </p>
                  )}
                  {photoUrls.length > 0 && (
                    <div className="flex gap-1">
                      {photoUrls.slice(0, 3).map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element -- vista previa local
                        <img key={url} src={url} alt="" className="size-9 rounded-md object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              </InvitationScreen>
            </PhoneMockup>

            <div className="w-full max-w-[280px]">
              <p className="text-xs font-semibold tracking-[0.18em] text-gift uppercase">Así se ve al mandarlo</p>
              <div className="mt-3 rounded-2xl rounded-tl-sm bg-chat p-2 shadow-lg">
                <LinkPreviewCard
                  className="w-full shadow-none"
                  colors={template?.colors}
                  imageLabel={`Para ${recipient}`}
                  title={`${sender || "Alguien"} te dejó una sorpresa`}
                  description={SAMPLE_GIFT.linkDescription}
                  domain={domain}
                />
                <p className="px-1.5 pt-2 text-[13px] break-all text-[#D9FDD3]">https://{exampleLink}</p>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/12 bg-gift-night p-2 pl-3">
                <span className="min-w-0 flex-1 truncate text-sm text-night-muted">{done ? `Folio ${done.reference}` : `https://${exampleLink}`}</span>
                <button
                  type="button"
                  onClick={copy}
                  disabled={!done}
                  title={done ? "Copiar folio" : "Disponible cuando hagas tu pedido"}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy className="size-4" aria-hidden />
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-night-muted">La imagen y el texto de la vista previa salen de la plantilla y sus nombres.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
