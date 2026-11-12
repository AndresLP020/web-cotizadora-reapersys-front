"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, ExternalLink, Gift, Loader2, MessageCircle } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi } from "@/features/admin/admin-api";
import { useCan } from "@/features/admin/session";
import type { AdminDigitalOrder, DigitalOrdersPage as OrdersPage, FulfillmentStatus } from "@/features/admin/types";
import { EmptyState, ErrorState, formatDateTime, PageHeader, Pagination, Panel, StatusPill, TableSkeleton, useAdminMutation } from "@/features/admin/ui";
import { useListParams } from "@/features/admin/use-list-params";
import { AUDIENCE_LABELS, INCLUDE_LABELS } from "@/features/digital/labels";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { apiAssetUrl } from "@/services/digital";

const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = { new: "Nuevo", in_progress: "En proceso", delivered: "Entregado" };
const FULFILLMENT_TONE: Record<FulfillmentStatus, string> = { new: "new", in_progress: "pending", delivered: "approved" };

/** Pedidos de detalles digitales y tarjetas NFC: datos personalizados, fotos, estado de entrega y link final. */
export function DigitalOrdersPage() {
  const { values, page, update } = useListParams(["estado", "tipo"] as const);
  const fulfillment = (values.estado || undefined) as FulfillmentStatus | undefined;
  const kind = values.tipo === "detalles" ? "digital_gift" : values.tipo === "nfc" ? "nfc_card" : undefined;
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "digital-orders", fulfillment, kind, page],
    queryFn: () => adminApi.get<OrdersPage>("/admin/digital-orders", { fulfillment, kind, page }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Pedidos de detalles y NFC"
        description="Llegan también a Prospectos para el seguimiento comercial. Aquí llevas la entrega: estado y link final."
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-1.5">
          {([undefined, "new", "in_progress", "delivered"] as const).map((value) => (
            <button
              key={value ?? "todos"}
              type="button"
              aria-pressed={fulfillment === value}
              onClick={() => update({ estado: value ?? "" })}
              className={cn(
                "h-9 rounded-full px-3.5 text-sm font-medium transition-colors",
                fulfillment === value ? "bg-navy text-snow" : "bg-mist text-foreground-secondary hover:bg-cloud",
              )}
            >
              {value ? FULFILLMENT_LABELS[value] : "Todos"}
              {value && data && <span className="ml-1.5 opacity-70">{data.counts[value]}</span>}
            </button>
          ))}
        </div>
        <Select value={values.tipo || "todos"} onValueChange={(tipo) => update({ tipo: tipo === "todos" ? "" : tipo })}>
          <SelectTrigger className="w-48" aria-label="Tipo de pedido">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los productos</SelectItem>
            <SelectItem value="detalles">Detalles digitales</SelectItem>
            <SelectItem value="nfc">Tarjetas NFC</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isPending ? (
        <Panel>
          <TableSkeleton rows={4} />
        </Panel>
      ) : error ? (
        <ErrorState error={error} />
      ) : !data || data.items.length === 0 ? (
        <Panel>
          <EmptyState message="No hay pedidos con este filtro." />
        </Panel>
      ) : (
        <div className="space-y-4">
          {data.items.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
          <Panel>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => update({ page: String(p) })} />
          </Panel>
        </div>
      )}
    </>
  );
}

function OrderCard({ order }: { order: AdminDigitalOrder }) {
  const uid = useId();
  const canWrite = useCan("leads:write");
  const queryClient = useQueryClient();
  const [deliveredUrl, setDeliveredUrl] = useState(order.order.deliveredUrl ?? "");
  const o = order.order;
  const save = useAdminMutation({
    mutationFn: (body: { fulfillment?: FulfillmentStatus; deliveredUrl?: string }) => adminApi.send<AdminDigitalOrder>("PATCH", `/admin/digital-orders/${order.id}`, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "digital-orders"] }),
  });
  const whatsapp = order.contact.phone ? `https://wa.me/${order.contact.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "52$1")}` : null;
  const total = o.unitPriceCents === null ? "Por cotizar" : `${formatMoney(o.unitPriceCents * o.quantity)} MXN`;
  const urlValid = deliveredUrl.trim() === "" || /^https:\/\/\S+$/i.test(deliveredUrl.trim());

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-mist text-royal">
            {o.kind === "nfc_card" ? <CreditCard className="size-4" aria-hidden /> : <Gift className="size-4" aria-hidden />}
          </span>
          <div>
            <p className="font-semibold">
              {o.kind === "nfc_card" ? "Tarjetas NFC" : "Detalle digital"} · {o.name}
              {o.demoUrl && (
                <a href={o.demoUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-sm font-normal text-electric hover:underline">
                  demo
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {order.reference} · {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>
        <StatusPill status={FULFILLMENT_TONE[o.fulfillment]} label={FULFILLMENT_LABELS[o.fulfillment]} />
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1fr_minmax(0,320px)]">
        <div className="space-y-1 text-sm">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Cliente</p>
          <p className="font-medium">{order.contact.name}</p>
          <p>
            <a href={`mailto:${order.contact.email}`} className="text-electric hover:underline">
              {order.contact.email}
            </a>
          </p>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-electric hover:underline">
              <MessageCircle className="size-3.5" aria-hidden />
              {order.contact.phone}
            </a>
          )}
          <p className="pt-2 text-muted-foreground">
            {o.kind === "nfc_card" ? `${o.quantity === 50 ? "50 o más" : o.quantity} tarjetas · ` : ""}
            {total}
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{o.kind === "nfc_card" ? "Configuración" : "Datos personalizados"}</p>
          {o.kind === "nfc_card" ? (
            <dl className="space-y-1">
              {o.audience && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Para:</dt>
                  <dd>{AUDIENCE_LABELS[o.audience]}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Su página lleva:</dt>
                <dd>{o.includes.map((i) => INCLUDE_LABELS[i]).join(", ") || "—"}</dd>
              </div>
            </dl>
          ) : (
            <dl className="space-y-1.5">
              {o.fields.map((f) => (
                <div key={f.label}>
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="break-words whitespace-pre-line">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {o.photos.length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-1">
              {o.photos.map((photo, index) => {
                const src = apiAssetUrl(photo.path)!;
                return (
                  <li key={photo.fileId}>
                    <a href={src} target="_blank" rel="noopener noreferrer" aria-label={`Abrir foto ${index + 1}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- foto privada servida por la API con la sesión del panel */}
                      <img src={src} alt={`Foto ${index + 1} del pedido`} className="size-16 rounded-lg border border-border object-cover" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-estado`}>Estado de la entrega</Label>
            <Select value={o.fulfillment} disabled={!canWrite || save.isPending} onValueChange={(value) => save.mutate({ fulfillment: value as FulfillmentStatus })}>
              <SelectTrigger id={`${uid}-estado`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FULFILLMENT_LABELS) as FulfillmentStatus[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {FULFILLMENT_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <form
            className="space-y-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (urlValid) save.mutate({ deliveredUrl: deliveredUrl.trim() });
            }}
          >
            <Label htmlFor={`${uid}-link`}>Link final entregado</Label>
            <div className="flex gap-2">
              <Input
                id={`${uid}-link`}
                type="url"
                placeholder="https://"
                value={deliveredUrl}
                disabled={!canWrite}
                aria-invalid={!urlValid}
                onChange={(e) => setDeliveredUrl(e.target.value)}
              />
              <Button type="submit" variant="outline" disabled={!canWrite || save.isPending || !urlValid || deliveredUrl.trim() === (o.deliveredUrl ?? "")}>
                {save.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Guardar"}
              </Button>
            </div>
            {!urlValid && <p className="text-xs text-magenta">Debe empezar con https://</p>}
            {o.deliveredUrl && (
              <a href={o.deliveredUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-electric hover:underline">
                Abrir link entregado
                <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </form>
          {save.error && <ErrorState error={save.error} />}
        </div>
      </div>
    </Panel>
  );
}
