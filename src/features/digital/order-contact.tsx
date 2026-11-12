"use client";

import Link from "next/link";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export interface ContactValues {
  name: string;
  phone: string;
  email: string;
  consent: boolean;
  /** Campo trampa para bots (oculto). */
  website: string;
}

export const emptyContact: ContactValues = { name: "", phone: "", email: "", consent: false, website: "" };

export type FieldErrors = Partial<Record<string, string>>;

/** Retroalimentación inmediata; el backend vuelve a validar todo. */
export function validateContact(values: ContactValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.trim().length < 2) errors.name = "Escribe tu nombre.";
  if (!/^\+?[\d\s-]{10,20}$/.test(values.phone.trim())) errors.phone = "Escribe un WhatsApp de 10 dígitos.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Escribe un correo válido.";
  if (!values.consent) errors.consent = "Necesitamos tu autorización para atender tu pedido.";
  return errors;
}

export function describeOrderError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Recibimos varios pedidos desde tu conexión. Intenta de nuevo en unos minutos.";
    if (error.status === 404) return "Este diseño ya no está disponible. Elige otro.";
    if (error.status === 413) return "Las fotos pesan demasiado: cada una debe pesar menos de 5 MB.";
    if (error.status === 400 && error.body) return [error.body.message].flat().join(" ");
  }
  return "No pudimos enviar tu pedido. Verifica tu conexión e inténtalo de nuevo.";
}

const tones = {
  dark: {
    label: "text-night-text",
    input: "border-white/16 bg-gift-night text-night-text placeholder:text-night-muted/70 focus-visible:border-gift",
    hint: "text-night-muted",
    error: "text-[#FFB4C2]",
    link: "text-gift underline",
  },
  light: {
    label: "text-deep",
    input: "border-paper-line bg-white text-deep placeholder:text-deep-muted/70 focus-visible:border-nfc-deep",
    hint: "text-deep-muted",
    error: "text-magenta",
    link: "text-nfc-deep underline",
  },
} as const;

export type Tone = keyof typeof tones;

export function inputClass(tone: Tone) {
  return cn("h-12 w-full rounded-xl border px-4 text-base outline-none transition-colors", tones[tone].input);
}

/** Campo con <label> real, error asociado (aria-describedby) y pista opcional. */
export function Field({
  id,
  label,
  error,
  hint,
  tone,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  tone: Tone;
  required?: boolean;
  children: React.ReactNode;
}) {
  const t = tones[tone];
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={cn("block text-sm font-medium", t.label)}>
        {label}
        {required && (
          <span aria-hidden className="ml-0.5">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className={cn("text-xs", t.hint)}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={cn("text-sm", t.error)}>
          {error}
        </p>
      )}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

/** Nombre, WhatsApp, correo y consentimiento del cliente (para entregarle su pedido). */
export function ContactFields({
  idPrefix,
  values,
  errors,
  onChange,
  tone,
  privacyNoticeAvailable,
}: {
  idPrefix: string;
  values: ContactValues;
  errors: FieldErrors;
  onChange: (patch: Partial<ContactValues>) => void;
  tone: Tone;
  privacyNoticeAvailable: boolean;
}) {
  const t = tones[tone];
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={id("name")} label="Tu nombre" error={errors.name} tone={tone} required>
          <input
            id={id("name")}
            className={inputClass(tone)}
            autoComplete="name"
            maxLength={120}
            value={values.name}
            aria-invalid={!!errors.name}
            aria-describedby={describedBy(id("name"), errors.name)}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </Field>
        <Field id={id("phone")} label="Tu WhatsApp" error={errors.phone} tone={tone} required>
          <input
            id={id("phone")}
            className={inputClass(tone)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            placeholder="55 1234 5678"
            value={values.phone}
            aria-invalid={!!errors.phone}
            aria-describedby={describedBy(id("phone"), errors.phone)}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </Field>
      </div>
      <Field id={id("email")} label="Tu correo" error={errors.email} tone={tone} required>
        <input
          id={id("email")}
          className={inputClass(tone)}
          type="email"
          autoComplete="email"
          maxLength={254}
          value={values.email}
          aria-invalid={!!errors.email}
          aria-describedby={describedBy(id("email"), errors.email)}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </Field>
      {/* Trampa para bots: invisible para personas y lectores de pantalla. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id("website")}>Sitio web</label>
        <input id={id("website")} tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => onChange({ website: e.target.value })} />
      </div>
      <div>
        <label className={cn("flex min-h-11 items-start gap-3 text-sm", t.hint)}>
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-current"
            checked={values.consent}
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? id("consent-error") : undefined}
            onChange={(e) => onChange({ consent: e.target.checked })}
          />
          <span>
            Acepto que usen mis datos para atender este pedido y contactarme por WhatsApp o correo.
            {privacyNoticeAvailable && (
              <>
                {" "}
                <Link href="/aviso-de-privacidad" className={t.link} target="_blank">
                  Aviso de privacidad
                </Link>
                .
              </>
            )}
          </span>
        </label>
        {errors.consent && (
          <p id={id("consent-error")} className={cn("mt-1 text-sm", t.error)}>
            {errors.consent}
          </p>
        )}
      </div>
    </div>
  );
}
