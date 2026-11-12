"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QuantityStepper } from "@/features/quote-builder/controls";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { DigitalOrderReceipt, PublicDigitalTemplate } from "@/types/digital";
import { estimatedTotal, TemplatePrice } from "./template-card";

/** Tarjetas NFC por pedido (mismo tope que el backend). */
const MAX_NFC_QUANTITY = 500;

/** El backend vuelve a validar todo; esto es solo retroalimentación inmediata. */
const orderSchema = z.object({
  /** Mismo orden que template.customizableFields (las etiquetas pueden tener puntos: no sirven como ruta). */
  fields: z.array(z.string().trim().max(500, "Máximo 500 caracteres.")),
  quantity: z.number().int().min(1).max(MAX_NFC_QUANTITY),
  name: z.string().trim().min(2, "Escribe tu nombre.").max(120),
  email: z.string().trim().pipe(z.email("Escribe un correo electrónico válido.")),
  phone: z.string().trim().regex(/^\+?[\d\s-]{10,20}$/, "Escribe un WhatsApp o teléfono de 10 a 15 dígitos."),
  notes: z.string().trim().max(1000).optional(),
  consent: z.boolean().refine((value) => value, "Necesitamos tu consentimiento para atender tu pedido."),
  website: z.string().optional(),
});
type OrderValues = z.infer<typeof orderSchema>;

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Recibimos varios pedidos desde tu conexión. Intenta de nuevo en unos minutos.";
    if (error.status === 404) return "Esta plantilla ya no está disponible. Elige otra.";
    if (error.status === 400 && error.body) return [error.body.message].flat().join(" ");
  }
  return "No pudimos enviar tu pedido. Verifica tu conexión e inténtalo de nuevo.";
}

/** Campos largos (mensajes, dedicatorias) se capturan en un área de texto. */
const isLongField = (label: string) => /mensaje|dedicatoria|carta|texto|frase|descripci/i.test(label);

export function OrderDialog({
  template,
  onClose,
  whatsappUrl,
  privacyNoticeAvailable,
}: {
  template: PublicDigitalTemplate | null;
  onClose: () => void;
  /** wa.me del negocio, si está configurado: para dar seguimiento al pedido. */
  whatsappUrl: string | null;
  privacyNoticeAvailable: boolean;
}) {
  const form = useForm<OrderValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { fields: [], quantity: 1, name: "", email: "", phone: "", notes: "", consent: false, website: "" },
  });
  const mutation = useMutation({
    mutationFn: (values: OrderValues) =>
      apiFetch<DigitalOrderReceipt>("/digital-orders", {
        method: "POST",
        json: {
          templateSlug: template!.slug,
          quantity: template!.kind === "nfc_card" ? values.quantity : undefined,
          fields: template!.customizableFields
            .map((label, index) => ({ label, value: values.fields[index] ?? "" }))
            .filter((field) => field.value.length > 0),
          name: values.name,
          email: values.email,
          phone: values.phone,
          notes: values.notes || undefined,
          consent: values.consent,
          website: values.website,
        },
      }),
  });

  // Cada plantilla empieza con un formulario limpio.
  const { reset } = form;
  const resetMutation = mutation.reset;
  useEffect(() => {
    if (!template) return;
    reset({ fields: template.customizableFields.map(() => ""), quantity: 1, name: "", email: "", phone: "", notes: "", consent: false, website: "" });
    resetMutation();
  }, [template, reset, resetMutation]);

  const { errors } = form.formState;
  const nfc = template?.kind === "nfc_card";
  const quantity = useWatch({ control: form.control, name: "quantity" });
  const total = template && nfc && quantity > 1 ? estimatedTotal(template, quantity) : null;
  const followUp =
    whatsappUrl && mutation.data && template
      ? `${whatsappUrl}?text=${encodeURIComponent(`Hola, acabo de pedir «${template.name}» (referencia ${mutation.data.reference}).`)}`
      : null;

  return (
    <Dialog open={template !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        {template && (
          <>
            <DialogHeader>
              <DialogTitle>{mutation.isSuccess ? "¡Pedido recibido!" : `Pedir «${template.name}»`}</DialogTitle>
              <DialogDescription>
                {mutation.isSuccess
                  ? "Te contactaremos para confirmar los detalles, el pago y la entrega."
                  : nfc
                    ? "Indica cuántas tarjetas necesitas y los datos de tu página de contacto."
                    : "Escribe los nombres y mensajes que llevará tu detalle. Puedes ajustarlos después con nosotros."}
              </DialogDescription>
            </DialogHeader>

            {mutation.isSuccess ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-border bg-mist px-4 py-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                  <p className="text-sm text-foreground-secondary">
                    Tu referencia es <strong className="font-mono text-foreground">{mutation.data.reference}</strong>. Guárdala para dar seguimiento.
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {followUp && (
                    <Button asChild variant="glass">
                      <a href={followUp} target="_blank" rel="noopener noreferrer">
                        <MessageCircle /> Escribirnos por WhatsApp
                      </a>
                    </Button>
                  )}
                  <Button variant="brand" onClick={onClose}>
                    Listo
                  </Button>
                </div>
              </div>
            ) : (
              <form noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="relative space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-mist px-4 py-3">
                  <TemplatePrice template={template} />
                  {total && <span className="text-sm text-foreground-secondary">Total estimado: {total} MXN</span>}
                </div>

                {nfc && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Label htmlFor="quantity">Cantidad de tarjetas</Label>
                    <Controller
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <QuantityStepper value={field.value} min={1} max={MAX_NFC_QUANTITY} onChange={field.onChange} label="Cantidad de tarjetas" />
                      )}
                    />
                  </div>
                )}

                {template.customizableFields.length > 0 && (
                  <fieldset className="space-y-4">
                    <legend className="mb-3 text-sm font-medium">{nfc ? "Datos de tu página de contacto" : "Personalización"}</legend>
                    {template.customizableFields.map((label, index) => {
                      const id = `field-${index}`;
                      const error = errors.fields?.[index]?.message;
                      const props = { id, "aria-invalid": Boolean(error), ...form.register(`fields.${index}` as const) };
                      return (
                        <Field key={label} id={id} label={label} error={error}>
                          {isLongField(label) ? <Textarea rows={3} {...props} /> : <Input className="h-11" {...props} />}
                        </Field>
                      );
                    })}
                  </fieldset>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="order-name" label="Tu nombre" required error={errors.name?.message}>
                    <Input className="h-11" id="order-name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
                  </Field>
                  <Field id="order-phone" label="WhatsApp o teléfono" required error={errors.phone?.message}>
                    <Input className="h-11" id="order-phone" type="tel" autoComplete="tel" aria-invalid={Boolean(errors.phone)} {...form.register("phone")} />
                  </Field>
                  <Field id="order-email" label="Correo electrónico" required error={errors.email?.message} className="sm:col-span-2">
                    <Input className="h-11" id="order-email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
                  </Field>
                </div>
                <Field id="order-notes" label="Notas (opcional)" error={errors.notes?.message}>
                  <Textarea id="order-notes" rows={2} placeholder={nfc ? "Colores, logotipo, fecha de entrega…" : "Fecha en que lo necesitas, fotos que quieres incluir…"} {...form.register("notes")} />
                </Field>

                {/* Honeypot: oculto para personas y tecnologías de asistencia. */}
                <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                  <label htmlFor="order-website">No llenes este campo</label>
                  <input id="order-website" type="text" tabIndex={-1} autoComplete="off" {...form.register("website")} />
                </div>

                <div className="space-y-1">
                  <div className="flex items-start gap-3">
                    <Controller
                      control={form.control}
                      name="consent"
                      render={({ field }) => (
                        <Checkbox
                          id="order-consent"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                          aria-invalid={Boolean(errors.consent)}
                          className="mt-0.5"
                        />
                      )}
                    />
                    <Label htmlFor="order-consent" className="text-sm leading-relaxed font-normal text-foreground-secondary">
                      Acepto que ReaperSys use estos datos para atender mi pedido.
                      {privacyNoticeAvailable && (
                        <>
                          {" "}
                          Consulta el{" "}
                          <Link href="/aviso-de-privacidad" className="text-electric underline underline-offset-4">
                            aviso de privacidad
                          </Link>
                          .
                        </>
                      )}
                    </Label>
                  </div>
                  {errors.consent && <p className="text-sm text-destructive">{errors.consent.message}</p>}
                </div>

                {mutation.isError && (
                  <Alert variant="destructive">
                    <AlertCircle />
                    <AlertDescription>{describeError(mutation.error)}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="brand" disabled={mutation.isPending}>
                    {mutation.isPending ? <Loader2 className="animate-spin" /> : <Send />} Enviar pedido
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, required, error, children, className }: { id: string; label: string; required?: boolean; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-electric" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
