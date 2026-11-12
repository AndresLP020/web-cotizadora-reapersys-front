"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/features/admin/admin-api";
import { useCan } from "@/features/admin/session";
import type { AdminNfcDesign, ProductPage } from "@/features/admin/types";
import { centsToInput, EmptyState, ErrorState, PageHeader, Panel, parsePesosInput, StatusPill, TableSkeleton, useAdminMutation } from "@/features/admin/ui";
import { ContactScreen, DEFAULT_NFC_COLORS, NfcCardFace } from "@/features/digital/nfc-visuals";
import { PhoneMockup } from "@/features/digital/phone-mockup";
import { cn } from "@/lib/utils";
import { apiAssetUrl } from "@/services/digital";
import type { NfcColors, NfcPriceTier } from "@/types/digital";
import { ColorField, DemoUrlField, ImageUploadButton, isHttpsUrl, ReorderButtons, StatusTabs } from "./digital-shared";

const COLOR_LABELS: Record<keyof NfcColors, string> = {
  card: "Tarjeta",
  line: "Borde",
  ink: "Texto",
  muted: "Texto secundario",
  accent: "Acento",
  onAccent: "Texto sobre acento",
  btn: "Botón de la página",
  onBtn: "Texto del botón",
};

interface FormState {
  name: string;
  demoUrl: string;
  colors: NfcColors;
  published: boolean;
}

const emptyForm = (): FormState => ({ name: "", demoUrl: "", colors: { ...DEFAULT_NFC_COLORS }, published: false });
const formOf = (d: AdminNfcDesign): FormState => ({ name: d.name, demoUrl: d.demoUrl, colors: { ...d.colors }, published: d.status === "published" });
const validColors = (c: NfcColors) => Object.values(c).every((v) => /^#[0-9a-f]{6}$/i.test(v));

/** Diseños de tarjeta NFC (colores, demo de la página de contacto e imágenes) y precios por cantidad. */
export function NfcDesignsPage() {
  const canWrite = useCan("catalog:write");
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [editing, setEditing] = useState<{ id: string | null; form: FormState } | null>(null);

  const list = useQuery({
    queryKey: ["admin", "nfc-designs", status],
    queryFn: () => adminApi.get<ProductPage<AdminNfcDesign>>("/admin/nfc-designs", { status: status === "all" ? undefined : status, pageSize: 100 }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "nfc-designs"] });
  const items = list.data?.items ?? [];
  const current = editing?.id ? (items.find((d) => d.id === editing.id) ?? null) : null;

  const patch = useAdminMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => adminApi.send("PATCH", `/admin/nfc-designs/${id}`, body),
    onSuccess: () => void refresh(),
  });
  const move = async (index: number, delta: -1 | 1) => {
    const a = items[index];
    const b = items[index + delta];
    if (!a || !b) return;
    const [orderA, orderB] = a.sortOrder === b.sortOrder ? [b.sortOrder + delta, a.sortOrder] : [b.sortOrder, a.sortOrder];
    await patch.mutateAsync({ id: a.id, body: { sortOrder: Math.max(0, orderA) } });
    await patch.mutateAsync({ id: b.id, body: { sortOrder: Math.max(0, orderB) } });
  };

  return (
    <>
      <PageHeader
        title="Diseños NFC"
        description="Diseños de tarjeta y su página de contacto. Solo se publican los que tienen su URL de demo; mientras no haya ninguno, el sitio muestra los diseños base."
        actions={
          canWrite && (
            <Button onClick={() => setEditing({ id: null, form: emptyForm() })}>
              <Plus className="size-4" aria-hidden />
              Nuevo diseño
            </Button>
          )
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-6">
          <Panel>
            <div className="border-b border-border px-5 py-3.5">
              <StatusTabs value={status} onChange={setStatus} counts={list.data?.counts} labels={{ all: "Todos", published: "Publicados", draft: "Borrador" }} />
            </div>
            {list.isPending ? (
              <TableSkeleton rows={4} />
            ) : list.error ? (
              <ErrorState error={list.error} className="m-5" />
            ) : items.length === 0 ? (
              <EmptyState message="No hay diseños con este filtro." />
            ) : (
              <ul className="divide-y divide-border">
                {items.map((d, index) => (
                  <li key={d.id} className={cn("flex items-center gap-3 px-4 py-3", editing?.id === d.id && "bg-sky/50")}>
                    {canWrite && status === "all" && (
                      <ReorderButtons
                        name={d.name}
                        disabled={patch.isPending}
                        onUp={index > 0 ? () => void move(index, -1) : undefined}
                        onDown={index < items.length - 1 ? () => void move(index, 1) : undefined}
                      />
                    )}
                    <button type="button" onClick={() => setEditing({ id: d.id, form: formOf(d) })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <NfcCardFace width={88} colors={d.colors} frontImage={apiAssetUrl(d.frontImagePath)} className="shrink-0 shadow-sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{d.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{d.demoUrl || "Sin demo"}</span>
                        <span className="mt-1 block">
                          <StatusPill status={d.status} label={d.status === "published" ? "Publicado" : "Borrador"} />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {patch.error && <ErrorState error={patch.error} className="m-4" />}
          </Panel>
          <PricingPanel canWrite={canWrite} />
        </div>

        {editing ? (
          <DesignForm
            key={editing.id ?? "nuevo"}
            id={editing.id}
            initial={editing.form}
            current={current}
            canWrite={canWrite}
            onClose={() => setEditing(null)}
            onSaved={(saved) => {
              void refresh();
              setEditing({ id: saved.id, form: formOf(saved) });
            }}
            onDeleted={() => {
              void refresh();
              setEditing(null);
            }}
          />
        ) : (
          <Panel className="hidden xl:block">
            <EmptyState message="Elige un diseño para editarlo o crea uno nuevo." />
          </Panel>
        )}
      </div>
    </>
  );
}

function DesignForm({
  id,
  initial,
  current,
  canWrite,
  onClose,
  onSaved,
  onDeleted,
}: {
  id: string | null;
  initial: FormState;
  current: AdminNfcDesign | null;
  canWrite: boolean;
  onClose: () => void;
  onSaved: (design: AdminNfcDesign) => void;
  onDeleted: () => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<FormState>(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const colors = validColors(form.colors) ? form.colors : DEFAULT_NFC_COLORS;

  const save = useAdminMutation({
    mutationFn: (body: Record<string, unknown>) =>
      id ? adminApi.send<AdminNfcDesign>("PATCH", `/admin/nfc-designs/${id}`, body) : adminApi.send<AdminNfcDesign>("POST", "/admin/nfc-designs", body),
    onSuccess: onSaved,
  });
  const refreshPreview = useAdminMutation({ mutationFn: () => adminApi.send<AdminNfcDesign>("POST", `/admin/nfc-designs/${id}/refresh-preview`), onSuccess: onSaved });
  const image = useAdminMutation({
    mutationFn: ({ which, file }: { which: "preview" | "front" | "back"; file: File | null }) => {
      if (!file) return adminApi.send<AdminNfcDesign>("DELETE", `/admin/nfc-designs/${id}/images/${which}`);
      const body = new FormData();
      body.append("image", file);
      return adminApi.upload<AdminNfcDesign>(`/admin/nfc-designs/${id}/images/${which}`, body);
    },
    onSuccess: onSaved,
  });
  const remove = useAdminMutation({ mutationFn: () => adminApi.send("DELETE", `/admin/nfc-designs/${id}`), onSuccess: onDeleted });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setProblem(null);
    const demoUrl = form.demoUrl.trim();
    if (form.name.trim().length < 2) return setProblem("Escribe el nombre del diseño.");
    if (demoUrl && !isHttpsUrl(demoUrl)) return setProblem("La URL de la demo debe empezar con https://");
    if (form.published && !demoUrl) return setProblem("Agrega la URL de la demo antes de publicar.");
    if (!validColors(form.colors)) return setProblem("Revisa los colores (formato #RRGGBB).");
    save.mutate({ name: form.name.trim(), demoUrl, colors: form.colors, status: form.published ? "published" : "draft" });
  };

  return (
    <Panel title={id ? "Editar diseño" : "Nuevo diseño"} actions={<Button variant="ghost" size="icon-sm" aria-label="Cerrar" onClick={onClose}><X className="size-4" aria-hidden /></Button>}>
      <form onSubmit={submit} className="space-y-6 p-5">
        <fieldset disabled={!canWrite} className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-name`}>Nombre</Label>
            <Input id={`${uid}-name`} value={form.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} required />
          </div>
          <DemoUrlField
            id={`${uid}-demo`}
            value={form.demoUrl}
            onChange={(demoUrl) => set({ demoUrl })}
            saved={current?.preview ?? null}
            savedUrl={current?.demoUrl ?? null}
            onRefreshSaved={() => refreshPreview.mutate()}
            refreshing={refreshPreview.isPending}
            coverSlot={
              id ? (
                <ImageUploadButton
                  label={current?.preview.imageSource === "upload" ? "Cambiar portada" : "Subir portada"}
                  pending={image.isPending}
                  onUpload={(file) => image.mutate({ which: "preview", file })}
                  onRemove={current?.preview.imageSource === "upload" ? () => image.mutate({ which: "preview", file: null }) : undefined}
                  removeLabel="Quitar portada"
                />
              ) : undefined
            }
          />

          <fieldset>
            <legend className="text-sm font-medium">Colores de la tarjeta y su página</legend>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(Object.keys(COLOR_LABELS) as (keyof NfcColors)[]).map((key) => (
                <ColorField key={key} id={`${uid}-${key}`} label={COLOR_LABELS[key]} value={form.colors[key]} onChange={(value) => set({ colors: { ...form.colors, [key]: value } })} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-5 rounded-xl bg-nfc-panel p-5">
              <div className="space-y-3">
                <NfcCardFace width={220} colors={colors} frontImage={apiAssetUrl(current?.frontImagePath)} />
                <NfcCardFace width={220} colors={colors} side="back" qrValue={form.demoUrl || "https://reapersys.com"} backImage={apiAssetUrl(current?.backImagePath)} />
              </div>
              <PhoneMockup width={130}>
                <ContactScreen colors={colors} variant="full" scale={0.58} />
              </PhoneMockup>
            </div>
          </fieldset>

          {id ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {(["front", "back"] as const).map((which) => {
                const path = which === "front" ? current?.frontImagePath : current?.backImagePath;
                return (
                  <div key={which} className="space-y-2 rounded-xl border border-border p-3">
                    <p className="text-sm font-medium">{which === "front" ? "Imagen del frente" : "Imagen del reverso"} (opcional)</p>
                    <p className="text-xs text-muted-foreground">Reemplaza al diseño dibujado. Proporción 85.6 × 54.</p>
                    <ImageUploadButton
                      label={path ? "Cambiar" : "Subir"}
                      pending={image.isPending}
                      onUpload={(file) => image.mutate({ which, file })}
                      onRemove={path ? () => image.mutate({ which, file: null }) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Guarda el diseño para subir las imágenes del frente, el reverso o la portada del link.</p>
          )}
          {(image.error || refreshPreview.error) && <ErrorState error={image.error ?? refreshPreview.error} />}

          <div className="space-y-2 rounded-xl bg-mist/60 p-4">
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              Publicado en el sitio
              <Switch checked={form.published} onCheckedChange={(published) => set({ published })} disabled={!isHttpsUrl(form.demoUrl)} />
            </label>
            {!isHttpsUrl(form.demoUrl) && <p className="text-xs text-muted-foreground">Agrega la URL de la demo para poder publicarlo.</p>}
          </div>
        </fieldset>

        {(problem || save.error) && (problem ? <p role="alert" className="text-sm text-magenta">{problem}</p> : <ErrorState error={save.error} />)}

        {canWrite && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            {id ? (
              <Button type="button" variant="ghost" className="text-magenta hover:text-magenta" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" aria-hidden />
                Eliminar
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Guardar cambios
              </Button>
            </div>
          </div>
        )}
      </form>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar «{form.name}»?</DialogTitle>
            <DialogDescription>Se quita del sitio y se borran sus imágenes. Los pedidos ya recibidos se conservan.</DialogDescription>
          </DialogHeader>
          {remove.error && <ErrorState error={remove.error} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

/** Precio por tarjeta según la cantidad. Vacío = «Por cotizar»; 50+ siempre se cotiza. */
function PricingPanel({ canWrite }: { canWrite: boolean }) {
  const pricing = useQuery({ queryKey: ["admin", "nfc-pricing"], queryFn: () => adminApi.get<{ tiers: NfcPriceTier[] }>("/admin/nfc-pricing") });
  return (
    <Panel title="Precio por tarjeta según la cantidad">
      {pricing.isPending ? (
        <TableSkeleton rows={2} />
      ) : pricing.error ? (
        <ErrorState error={pricing.error} className="m-5" />
      ) : (
        <PricingForm tiers={pricing.data.tiers} canWrite={canWrite} />
      )}
    </Panel>
  );
}

function PricingForm({ tiers, canWrite }: { tiers: NfcPriceTier[]; canWrite: boolean }) {
  const uid = useId();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<number, string>>(() => Object.fromEntries(tiers.map((t) => [t.quantity, centsToInput(t.unitPriceCents)])));
  const [problem, setProblem] = useState<string | null>(null);
  const save = useAdminMutation({
    mutationFn: (list: { quantity: number; unitPriceCents: number | null }[]) => adminApi.send("PUT", "/admin/nfc-pricing", { tiers: list }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "nfc-pricing"] }),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setProblem(null);
    const parsed = [1, 10, 25].map((quantity) => {
      const raw = (values[quantity] ?? "").trim();
      return { quantity, unitPriceCents: raw === "" ? null : parsePesosInput(raw), raw };
    });
    if (parsed.some((t) => t.raw !== "" && t.unitPriceCents === null)) return setProblem("Revisa los precios.");
    save.mutate(parsed.map(({ quantity, unitPriceCents }) => ({ quantity, unitPriceCents })));
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <fieldset disabled={!canWrite} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 10, 25].map((quantity) => (
          <div key={quantity} className="space-y-1.5">
            <Label htmlFor={`${uid}-${quantity}`}>
              {quantity} {quantity === 1 ? "tarjeta" : "tarjetas"}
            </Label>
            <Input
              id={`${uid}-${quantity}`}
              inputMode="decimal"
              placeholder="Por cotizar"
              value={values[quantity] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [quantity]: e.target.value }))}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label>50 o más</Label>
          <p className="flex h-9 items-center text-sm text-muted-foreground">Se cotiza</p>
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground">Precio por tarjeta en MXN. Vacío = «Por cotizar».</p>
      {(problem || save.error) && (problem ? <p role="alert" className="text-sm text-magenta">{problem}</p> : <ErrorState error={save.error} />)}
      {canWrite && (
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {save.isSuccess ? "Guardado" : "Guardar precios"}
        </Button>
      )}
    </form>
  );
}
