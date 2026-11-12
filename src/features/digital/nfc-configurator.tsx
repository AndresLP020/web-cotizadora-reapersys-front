"use client";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import { publicEnv } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { apiAssetUrl } from "@/services/digital";
import type { DigitalOrderReceipt, NfcAudience, NfcInclude, NfcPriceTier, NfcQuantity, PublicNfcDesign } from "@/types/digital";
import { AUDIENCE_LABELS, INCLUDE_LABELS, INCLUDE_ORDER } from "./labels";
import { ContactScreen, NfcCardFace } from "./nfc-visuals";
import { ContactFields, type ContactValues, describeOrderError, emptyContact, type FieldErrors, validateContact } from "./order-contact";
import { PhoneMockup } from "./phone-mockup";
import { SAMPLE_NFC } from "./sample-content";

/** Diseños base (los mismos del seed) mientras no haya diseños publicados con su demo. */
export const FALLBACK_DESIGNS: PublicNfcDesign[] = [
  { slug: "ejecutivo", name: "Ejecutivo", card: "#0A0D16", line: "#1E2433", ink: "#F5F7FB", muted: "#A9B1C6", accent: "#7DD3FC", onAccent: "#06212F", btn: "#0A0F1E" },
  { slug: "minimal", name: "Minimal", card: "#F4F3EF", line: "#DDDAD2", ink: "#111111", muted: "#555555", accent: "#111111", onAccent: "#F4F3EF", btn: "#111111" },
  { slug: "color-de-marca", name: "Color de marca", card: "#1E40AF", line: "#3355C4", ink: "#FFFFFF", muted: "#C7D2FE", accent: "#FDE68A", onAccent: "#1E2A5A", btn: "#1E40AF" },
  { slug: "creativo", name: "Creativo", card: "#3B0F4A", line: "#5A2370", ink: "#FFF5FF", muted: "#E3C2EA", accent: "#F0ABFC", onAccent: "#3B0F4A", btn: "#3B0F4A" },
].map(({ slug, name, ...colors }) => ({
  slug,
  name,
  demoUrl: "",
  colors: { ...colors, onBtn: "#FFFFFF" },
  frontImagePath: null,
  backImagePath: null,
  preview: { title: null, description: null, domain: null, path: "/", imagePath: null, faviconPath: null },
}));

const QUANTITIES: NfcQuantity[] = [1, 10, 25, 50];
const AUDIENCES: NfcAudience[] = ["person", "business", "team"];
const DEFAULT_INCLUDES: NfcInclude[] = ["saveContact", "whatsapp", "callEmail", "location"];

/** Ancho disponible de un contenedor (para dibujar la tarjeta a escala sin desbordar a 375px). */
function useWidth<T extends HTMLElement>(max: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(max);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.min(max, Math.floor(entry!.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [max]);
  return [ref, width] as const;
}

function pillClass(active: boolean) {
  return cn(
    "h-11 rounded-full border px-4 text-sm font-medium transition-colors",
    active ? "border-deep bg-deep text-white" : "border-paper-line bg-white text-deep hover:border-deep/40",
  );
}

export function NfcConfigurator({
  designs: published,
  tiers,
  privacyNoticeAvailable,
}: {
  designs: PublicNfcDesign[];
  tiers: NfcPriceTier[];
  privacyNoticeAvailable: boolean;
}) {
  const designs = published.length > 0 ? published : FALLBACK_DESIGNS;
  const params = useSearchParams();
  const design = designs.find((d) => d.slug === params.get("diseno")) ?? designs[0]!;
  const audienceParam = params.get("para") as NfcAudience | null;
  const audience: NfcAudience = audienceParam && AUDIENCES.includes(audienceParam) ? audienceParam : "person";
  const quantityParam = Number(params.get("cantidad"));
  const quantity: NfcQuantity = QUANTITIES.includes(quantityParam as NfcQuantity) ? (quantityParam as NfcQuantity) : 1;
  const [includes, setIncludes] = useState<NfcInclude[]>(DEFAULT_INCLUDES);
  const [side, setSide] = useState<"front" | "back">("front");
  const [ordering, setOrdering] = useState(false);
  const [stageRef, stageWidth] = useWidth<HTMLDivElement>(360);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    window.history.replaceState(null, "", `${window.location.pathname}?${next.toString()}${window.location.hash}`);
  };

  const tier = tiers.find((t) => t.quantity === quantity);
  const unit = quantity === 50 || tier?.quoteOnly ? null : (tier?.unitPriceCents ?? null);
  const subtotal = unit === null ? null : unit * quantity;
  const qrValue = design.demoUrl || `${publicEnv.NEXT_PUBLIC_SITE_URL}/tarjetas-nfc`;
  const domain = design.preview.domain ?? (design.demoUrl ? new URL(design.demoUrl).hostname.replace(/^www\./, "") : SAMPLE_NFC.demoDomain);
  const favicon = apiAssetUrl(design.preview.faviconPath);
  const quantityLabel = (q: NfcQuantity) => (q === 50 ? "50+" : String(q));

  return (
    <section id="disena" aria-labelledby="disena-title" className="scroll-mt-24 bg-paper py-20 sm:py-24">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-nfc-deep uppercase">Diseña tu tarjeta</p>
        <h2 id="disena-title" className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-deep sm:text-5xl">
          Elige un diseño y mira el resultado
        </h2>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Escenario */}
          <div className="min-w-0 rounded-[28px] bg-nfc-panel p-5 text-night-text sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-night-muted">
                Vista previa · <span className="font-semibold text-night-text">{design.name}</span>
              </p>
              <div role="group" aria-label="Cara de la tarjeta" className="flex rounded-full bg-white/8 p-1">
                {(["front", "back"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={side === value}
                    onClick={() => setSide(value)}
                    className={cn("h-10 rounded-full px-4 text-sm font-semibold", side === value ? "bg-nfc text-on-nfc" : "text-night-muted hover:text-night-text")}
                  >
                    {value === "front" ? "Frente" : "Reverso"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div ref={stageRef} className="w-full max-w-[360px] min-w-0 [perspective:1200px]">
                <div
                  className="relative transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] motion-reduce:transition-none"
                  style={{ transform: side === "back" ? "rotateY(180deg)" : "none", width: stageWidth, aspectRatio: "85.6 / 54" }}
                >
                  <NfcCardFace
                    width={stageWidth}
                    colors={design.colors}
                    side="front"
                    frontImage={apiAssetUrl(design.frontImagePath)}
                    className="absolute inset-0 [backface-visibility:hidden]"
                  />
                  <NfcCardFace
                    width={stageWidth}
                    colors={design.colors}
                    side="back"
                    qrValue={qrValue}
                    backImage={apiAssetUrl(design.backImagePath)}
                    className="absolute inset-0 [backface-visibility:hidden]"
                    style={{ transform: "rotateY(180deg)" }}
                  />
                </div>
                <p className="sr-only" aria-live="polite">
                  {side === "front" ? `Frente de la tarjeta, diseño ${design.name}` : `Reverso de la tarjeta con un código QR que abre ${qrValue}`}
                </p>
              </div>
              <PhoneMockup width={170} label={`Página de contacto en el diseño ${design.name}`}>
                <ContactScreen colors={design.colors} variant="full" scale={0.78} />
              </PhoneMockup>
            </div>

            <div className="mt-8 flex items-center gap-3 rounded-2xl bg-white/6 p-3">
              {favicon ? (
                // eslint-disable-next-line @next/next/no-img-element -- ícono del sitio de la demo (guardado en la API)
                <img src={favicon} alt="" className="size-8 shrink-0 rounded-md bg-white object-contain p-0.5" />
              ) : (
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-md bg-nfc font-heading text-sm font-bold text-on-nfc">
                  R
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{design.preview.title ?? `${SAMPLE_NFC.name} · ${SAMPLE_NFC.company}`}</span>
                <span className="block truncate text-xs text-night-muted">
                  {domain}
                  {design.preview.path !== "/" ? design.preview.path : ""}
                </span>
              </span>
              {design.demoUrl && (
                <a
                  href={design.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-nfc px-4 text-sm font-semibold text-on-nfc hover:opacity-90"
                >
                  Abrir demo
                  <ExternalLink className="size-4" aria-hidden />
                  <span className="sr-only">(se abre en otra pestaña)</span>
                </a>
              )}
            </div>
          </div>

          {/* Panel de opciones */}
          <div className="rounded-[28px] border border-paper-line bg-white p-6 text-deep sm:p-8">
            <fieldset>
              <legend className="text-sm font-semibold">Diseño</legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {designs.map((d) => {
                  const active = d.slug === design.slug;
                  return (
                    <button
                      key={d.slug}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setParam("diseno", d.slug)}
                      className={cn(
                        "flex min-h-14 items-center gap-3 rounded-2xl border bg-white p-3 text-left text-sm font-medium transition-colors",
                        active ? "border-2 border-deep" : "border-paper-line hover:border-deep/40",
                      )}
                    >
                      <span aria-hidden className="relative grid h-8 w-12 shrink-0 place-items-end rounded-md p-1" style={{ background: d.colors.card, border: `1px solid ${d.colors.line}` }}>
                        <span className="size-2.5 rounded-full" style={{ background: d.colors.accent }} />
                      </span>
                      {d.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-7">
              <legend className="text-sm font-semibold">La tarjeta es para</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {AUDIENCES.map((value) => (
                  <button key={value} type="button" aria-pressed={audience === value} onClick={() => setParam("para", value)} className={pillClass(audience === value)}>
                    {AUDIENCE_LABELS[value]}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-7">
              <legend className="text-sm font-semibold">Tu página lleva</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {INCLUDE_ORDER.map((value) => {
                  const active = includes.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setIncludes((list) => (active ? list.filter((v) => v !== value) : INCLUDE_ORDER.filter((v) => list.includes(v) || v === value)))}
                      className={cn(
                        "h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                        active ? "border-nfc-deep bg-[rgba(3,105,161,0.08)] text-nfc-deep" : "border-paper-line text-deep-muted hover:border-deep/40",
                      )}
                    >
                      {INCLUDE_LABELS[value]}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-7">
              <legend className="text-sm font-semibold">Cantidad de tarjetas</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUANTITIES.map((value) => (
                  <button key={value} type="button" aria-pressed={quantity === value} onClick={() => setParam("cantidad", String(value))} className={pillClass(quantity === value)}>
                    {quantityLabel(value)}
                  </button>
                ))}
              </div>
            </fieldset>

            <dl className="mt-8 space-y-3 border-t border-paper-line pt-6 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-deep-muted">
                  {quantity === 50 ? "50 o más" : quantity} {quantity === 1 ? "tarjeta" : "tarjetas"} · diseño {design.name}
                </dt>
                <dd className="font-medium">{subtotal === null ? "Por cotizar" : `${formatMoney(subtotal)} MXN`}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-deep-muted">Página de contacto</dt>
                <dd className="font-medium">Incluida</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-paper-line pt-3">
                <dt className="font-semibold">Total</dt>
                <dd className="font-heading text-2xl font-semibold">{subtotal === null ? "Por cotizar" : `${formatMoney(subtotal)} MXN`}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setOrdering(true)}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-deep text-sm font-semibold text-white hover:opacity-90"
            >
              Pedir mis tarjetas
            </button>
            <p className="mt-3 text-center text-xs text-deep-muted">Después te pedimos los datos y el logo de cada tarjeta.</p>
          </div>
        </div>
      </div>

      <NfcOrderDialog
        open={ordering}
        onClose={() => setOrdering(false)}
        design={design}
        quantity={quantity}
        audience={audience}
        includes={includes}
        privacyNoticeAvailable={privacyNoticeAvailable}
      />
    </section>
  );
}

function NfcOrderDialog({
  open,
  onClose,
  design,
  quantity,
  audience,
  includes,
  privacyNoticeAvailable,
}: {
  open: boolean;
  onClose: () => void;
  design: PublicNfcDesign;
  quantity: NfcQuantity;
  audience: NfcAudience;
  includes: NfcInclude[];
  privacyNoticeAvailable: boolean;
}) {
  const formId = useId();
  const [contact, setContact] = useState<ContactValues>(emptyContact);
  const [errors, setErrors] = useState<FieldErrors>({});
  const order = useMutation({
    mutationFn: () =>
      apiFetch<DigitalOrderReceipt>("/digital-orders", {
        method: "POST",
        json: {
          type: "nfc",
          designSlug: design.slug,
          quantity,
          audience,
          includes,
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          email: contact.email.trim(),
          consent: contact.consent,
          ...(contact.website ? { website: contact.website } : {}),
        },
      }),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateContact(contact);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`${formId}-${first}`)?.focus();
      return;
    }
    order.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
          if (order.isSuccess) order.reset();
        }
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{order.isSuccess ? "Recibimos tu pedido" : "Pedir mis tarjetas"}</DialogTitle>
          <DialogDescription>
            {quantity === 50 ? "50 o más" : quantity} {quantity === 1 ? "tarjeta" : "tarjetas"} · diseño {design.name} · {AUDIENCE_LABELS[audience]}
          </DialogDescription>
        </DialogHeader>
        {order.isSuccess ? (
          <div role="status" className="flex flex-col items-start gap-3">
            <CheckCircle2 className="size-9 text-nfc-deep" aria-hidden />
            <p className="text-deep-muted">
              Te contactaremos por WhatsApp para pedirte los datos y el logo de cada tarjeta. Tu folio es{" "}
              <strong className="text-deep">{order.data.reference}</strong>. No se hizo ningún cobro en línea.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative space-y-5">
            <ContactFields
              idPrefix={formId}
              values={contact}
              errors={errors}
              tone="light"
              privacyNoticeAvailable={privacyNoticeAvailable}
              onChange={(patch) => setContact((c) => ({ ...c, ...patch }))}
            />
            {order.isError && (
              <p role="alert" className="rounded-xl bg-magenta/8 px-4 py-3 text-sm text-magenta">
                {describeOrderError(order.error)}
              </p>
            )}
            <button
              type="submit"
              disabled={order.isPending}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-deep text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {order.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Enviar pedido
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
