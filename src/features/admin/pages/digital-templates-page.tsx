"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Star, Tags, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/features/admin/admin-api";
import { useCan } from "@/features/admin/session";
import type { AdminDigitalTemplate, AdminOccasion, ProductPage } from "@/features/admin/types";
import { centsToInput, EmptyState, ErrorState, PageHeader, Panel, parsePesosInput, StatusPill, TableSkeleton, useAdminMutation } from "@/features/admin/ui";
import { TemplateThumb } from "@/features/digital/gift-visuals";
import { FIELD_LABELS, MAX_PHOTOS } from "@/features/digital/labels";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { apiAssetUrl } from "@/services/digital";
import type { FieldKey, TemplateColors } from "@/types/digital";
import { ColorField, DemoUrlField, ImageUploadButton, isHttpsUrl, ReorderButtons, StatusTabs } from "./digital-shared";

const FIELD_ORDER: FieldKey[] = ["recipientName", "senderName", "title", "message", "date", "photos", "song", "place", "rsvp"];
const DEFAULT_COLORS: TemplateColors = { bg: "#3B1424", accent: "#F4A6B8", ink: "#FFE4EA", stage: "#FCE7EC" };
const COLOR_LABELS: Record<keyof TemplateColors, string> = { bg: "Fondo", accent: "Acento", ink: "Texto", stage: "Fondo de la tarjeta" };

interface FormState {
  name: string;
  demoUrl: string;
  price: string;
  description: string;
  occasions: string[];
  fields: Partial<Record<FieldKey, { required: boolean; max: string }>>;
  colors: TemplateColors;
  published: boolean;
  featured: boolean;
}

const emptyForm = (): FormState => ({
  name: "",
  demoUrl: "",
  price: "",
  description: "",
  occasions: [],
  fields: { recipientName: { required: true, max: "" }, senderName: { required: true, max: "" }, message: { required: true, max: "" } },
  colors: { ...DEFAULT_COLORS },
  published: false,
  featured: false,
});

const formOf = (t: AdminDigitalTemplate): FormState => ({
  name: t.name,
  demoUrl: t.demoUrl,
  price: centsToInput(t.priceCents),
  description: t.description ?? "",
  occasions: [...t.occasions],
  fields: Object.fromEntries(t.fields.map((f) => [f.key, { required: f.required, max: f.max ? String(f.max) : "" }])),
  colors: { ...t.colors },
  published: t.status === "published",
  featured: t.featured,
});

/** Plantillas de detalles digitales: lista con filtros y orden, y formulario con la vista previa del link. */
export function DigitalTemplatesPage() {
  const canWrite = useCan("catalog:write");
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [editing, setEditing] = useState<{ id: string | null; form: FormState } | null>(null);
  const [managingOccasions, setManagingOccasions] = useState(false);

  const list = useQuery({
    queryKey: ["admin", "digital-templates", status],
    queryFn: () => adminApi.get<ProductPage<AdminDigitalTemplate>>("/admin/digital-templates", { status: status === "all" ? undefined : status, pageSize: 100 }),
  });
  const occasions = useQuery({
    queryKey: ["admin", "occasions"],
    queryFn: () => adminApi.get<{ items: AdminOccasion[] }>("/admin/occasions"),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "digital-templates"] });
  const items = list.data?.items ?? [];
  const current = editing?.id ? (items.find((t) => t.id === editing.id) ?? null) : null;
  const occasionLabel = new Map((occasions.data?.items ?? []).map((o) => [o.slug, o.label]));

  const patch = useAdminMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => adminApi.send<AdminDigitalTemplate>("PATCH", `/admin/digital-templates/${id}`, body),
    onSuccess: () => void refresh(),
  });

  /** Intercambia el orden con la plantilla vecina. */
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
        title="Plantillas de detalles"
        description="Cada plantilla es una página de demostración. Solo se publican las que tienen su URL de demo."
        actions={
          canWrite && (
            <>
              <Button variant="outline" onClick={() => setManagingOccasions(true)}>
                <Tags className="size-4" aria-hidden />
                Ocasiones
              </Button>
              <Button onClick={() => setEditing({ id: null, form: emptyForm() })}>
                <Plus className="size-4" aria-hidden />
                Nueva plantilla
              </Button>
            </>
          )
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel>
          <div className="border-b border-border px-5 py-3.5">
            <StatusTabs value={status} onChange={setStatus} counts={list.data?.counts} />
          </div>
          {list.isPending ? (
            <TableSkeleton rows={5} />
          ) : list.error ? (
            <ErrorState error={list.error} className="m-5" />
          ) : items.length === 0 ? (
            <EmptyState message="No hay plantillas con este filtro." />
          ) : (
            <ul className="divide-y divide-border">
              {items.map((t, index) => {
                const image = apiAssetUrl(t.preview.imagePath);
                const active = editing?.id === t.id;
                return (
                  <li key={t.id} className={cn("flex items-center gap-3 px-4 py-3", active && "bg-sky/50")}>
                    {canWrite && status === "all" && (
                      <ReorderButtons
                        name={t.name}
                        disabled={patch.isPending}
                        onUp={index > 0 ? () => void move(index, -1) : undefined}
                        onDown={index < items.length - 1 ? () => void move(index, 1) : undefined}
                      />
                    )}
                    <button type="button" onClick={() => setEditing({ id: t.id, form: formOf(t) })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="h-[72px] w-14 shrink-0 overflow-hidden rounded-lg border border-border" style={{ background: t.colors.bg }}>
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- miniatura servida por la API
                          <img src={image} alt="" className="size-full object-cover" />
                        ) : (
                          <TemplateThumb colors={t.colors} label="Para ti" title={t.name} hint="" scale={0.28} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{t.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t.occasions.map((o) => occasionLabel.get(o) ?? o).join(" · ") || "Sin ocasión"}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <StatusPill status={t.status} label={t.status === "published" ? "Publicada" : "Borrador"} />
                          <span className="text-xs text-muted-foreground">{t.priceCents === null ? "Por cotizar" : formatMoney(t.priceCents)}</span>
                        </span>
                      </span>
                    </button>
                    {canWrite && (
                      <button
                        type="button"
                        aria-pressed={t.featured}
                        aria-label={t.featured ? `${t.name} es la destacada` : `Marcar ${t.name} como destacada`}
                        title="Destacada: la abre «Ver una demo» del inicio"
                        disabled={patch.isPending || (!t.featured && t.status !== "published")}
                        onClick={() => patch.mutate({ id: t.id, body: { featured: !t.featured } })}
                        className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-cloud disabled:opacity-30"
                      >
                        <Star className={cn("size-4", t.featured && "fill-gold text-gold")} aria-hidden />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {patch.error && <ErrorState error={patch.error} className="m-4" />}
        </Panel>

        {editing ? (
          <TemplateForm
            key={editing.id ?? "nueva"}
            id={editing.id}
            initial={editing.form}
            current={current}
            occasions={occasions.data?.items ?? []}
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
            <EmptyState message="Elige una plantilla para editarla o crea una nueva." />
          </Panel>
        )}
      </div>
      <OccasionsDialog open={managingOccasions} onClose={() => setManagingOccasions(false)} occasions={occasions.data?.items ?? []} />
    </>
  );
}

function TemplateForm({
  id,
  initial,
  current,
  occasions,
  canWrite,
  onClose,
  onSaved,
  onDeleted,
}: {
  id: string | null;
  initial: FormState;
  current: AdminDigitalTemplate | null;
  occasions: AdminOccasion[];
  canWrite: boolean;
  onClose: () => void;
  onSaved: (template: AdminDigitalTemplate) => void;
  onDeleted: () => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<FormState>(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const save = useAdminMutation({
    mutationFn: (body: Record<string, unknown>) =>
      id ? adminApi.send<AdminDigitalTemplate>("PATCH", `/admin/digital-templates/${id}`, body) : adminApi.send<AdminDigitalTemplate>("POST", "/admin/digital-templates", body),
    onSuccess: onSaved,
  });
  const refreshPreview = useAdminMutation({
    mutationFn: () => adminApi.send<AdminDigitalTemplate>("POST", `/admin/digital-templates/${id}/refresh-preview`),
    onSuccess: onSaved,
  });
  const cover = useAdminMutation({
    mutationFn: (file: File | null) => {
      if (!file) return adminApi.send<AdminDigitalTemplate>("DELETE", `/admin/digital-templates/${id}/image`);
      const body = new FormData();
      body.append("image", file);
      return adminApi.upload<AdminDigitalTemplate>(`/admin/digital-templates/${id}/image`, body);
    },
    onSuccess: onSaved,
  });
  const remove = useAdminMutation({
    mutationFn: () => adminApi.send("DELETE", `/admin/digital-templates/${id}`),
    onSuccess: onDeleted,
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setProblem(null);
    const demoUrl = form.demoUrl.trim();
    if (form.name.trim().length < 2) return setProblem("Escribe el nombre de la plantilla.");
    if (demoUrl && !isHttpsUrl(demoUrl)) return setProblem("La URL de la demo debe empezar con https://");
    if (form.published && !demoUrl) return setProblem("Agrega la URL de la demo antes de publicar.");
    const priceCents = form.price.trim() === "" ? null : parsePesosInput(form.price);
    if (form.price.trim() !== "" && priceCents === null) return setProblem("El precio no es válido.");
    if (Object.values(form.colors).some((c) => !/^#[0-9a-f]{6}$/i.test(c))) return setProblem("Revisa los colores (formato #RRGGBB).");
    const fields = FIELD_ORDER.filter((key) => form.fields[key]).map((key) => {
      const f = form.fields[key]!;
      const max = f.max.trim() ? Number(f.max) : undefined;
      return { key, required: f.required, ...(max && Number.isInteger(max) && max > 0 ? { max } : {}) };
    });
    save.mutate({
      name: form.name.trim(),
      demoUrl,
      priceCents,
      description: form.description.trim(),
      occasions: form.occasions,
      fields,
      colors: form.colors,
      status: form.published ? "published" : "draft",
      ...(id ? { featured: form.featured } : form.featured ? { featured: true } : {}),
    });
  };

  return (
    <Panel title={id ? "Editar plantilla" : "Nueva plantilla"} actions={<Button variant="ghost" size="icon-sm" aria-label="Cerrar" onClick={onClose}><X className="size-4" aria-hidden /></Button>}>
      <form onSubmit={submit} className="space-y-6 p-5">
        <fieldset disabled={!canWrite} className="space-y-6">
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
                  pending={cover.isPending}
                  onUpload={(file) => cover.mutate(file)}
                  onRemove={current?.preview.imageSource === "upload" ? () => cover.mutate(null) : undefined}
                  removeLabel="Quitar portada"
                />
              ) : (
                <p className="text-xs text-muted-foreground">Guarda la plantilla para poder subir una portada.</p>
              )
            }
          />
          {(cover.error || refreshPreview.error) && <ErrorState error={cover.error ?? refreshPreview.error} />}

          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-name`}>Nombre</Label>
              <Input id={`${uid}-name`} value={form.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-price`}>Precio (MXN)</Label>
              <Input id={`${uid}-price`} inputMode="decimal" placeholder="Por cotizar" value={form.price} onChange={(e) => set({ price: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-desc`}>Descripción corta</Label>
            <Textarea id={`${uid}-desc`} rows={2} maxLength={400} value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Ocasiones</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {occasions.length === 0 && <p className="text-sm text-muted-foreground">No hay ocasiones: créalas con el botón «Ocasiones».</p>}
              {occasions.map((o) => {
                const checked = form.occasions.includes(o.slug);
                return (
                  <label
                    key={o.slug}
                    className={cn(
                      "flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm",
                      checked ? "border-royal bg-sky text-royal" : "border-border hover:bg-mist",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-current"
                      checked={checked}
                      onChange={() => set({ occasions: checked ? form.occasions.filter((s) => s !== o.slug) : [...form.occasions, o.slug] })}
                    />
                    {o.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium">Datos que se piden al cliente</legend>
            <div className="mt-2 divide-y divide-border rounded-xl border border-border">
              {FIELD_ORDER.map((key) => {
                const field = form.fields[key];
                const toggle = () => {
                  const next = { ...form.fields };
                  if (field) delete next[key];
                  else next[key] = { required: false, max: key === "photos" ? String(MAX_PHOTOS) : "" };
                  set({ fields: next });
                };
                const update = (patch: Partial<{ required: boolean; max: string }>) => set({ fields: { ...form.fields, [key]: { ...field!, ...patch } } });
                return (
                  <div key={key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 text-sm">
                    <label className="flex min-w-48 flex-1 cursor-pointer items-center gap-2">
                      <input type="checkbox" className="size-4" checked={!!field} onChange={toggle} />
                      {FIELD_LABELS[key]}
                      <span className="font-mono text-xs text-muted-foreground">{key}</span>
                    </label>
                    {field && (
                      <>
                        <label className="flex items-center gap-2 text-muted-foreground">
                          <input type="checkbox" className="size-4" checked={field.required} onChange={(e) => update({ required: e.target.checked })} />
                          Obligatorio
                        </label>
                        {key === "photos" && (
                          <label className="flex items-center gap-2 text-muted-foreground">
                            Máximo
                            <Input
                              type="number"
                              min={1}
                              max={MAX_PHOTOS}
                              value={field.max}
                              onChange={(e) => update({ max: e.target.value })}
                              className="h-8 w-16"
                              aria-label="Máximo de fotos"
                            />
                          </label>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium">Colores de la miniatura</legend>
            <p className="text-xs text-muted-foreground">Se usan cuando la plantilla no tiene imagen.</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(COLOR_LABELS) as (keyof TemplateColors)[]).map((key) => (
                  <ColorField key={key} id={`${uid}-color-${key}`} label={COLOR_LABELS[key]} value={form.colors[key]} onChange={(value) => set({ colors: { ...form.colors, [key]: value } })} />
                ))}
              </div>
              <div className="mx-auto grid h-[150px] w-[120px] place-items-center rounded-xl" style={{ background: /^#[0-9a-f]{6}$/i.test(form.colors.stage) ? form.colors.stage : undefined }}>
                <span className="h-[130px] w-[64px] overflow-hidden rounded-lg">
                  <TemplateThumb colors={form.colors} label="Para ti" title={form.name || "Plantilla"} hint="" scale={0.32} />
                </span>
              </div>
            </div>
          </fieldset>

          <div className="space-y-3 rounded-xl bg-mist/60 p-4">
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              Publicada en el catálogo
              <Switch checked={form.published} onCheckedChange={(published) => set({ published })} disabled={!isHttpsUrl(form.demoUrl)} />
            </label>
            {!isHttpsUrl(form.demoUrl) && <p className="text-xs text-muted-foreground">Agrega la URL de la demo para poder publicarla.</p>}
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              Destacada (la abre «Ver una demo» del inicio)
              <Switch checked={form.featured} onCheckedChange={(featured) => set({ featured })} />
            </label>
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
            <DialogDescription>Se quita del catálogo y se borran su portada y vista previa. Los pedidos ya recibidos se conservan.</DialogDescription>
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

/** Catálogo administrable de ocasiones (filtros del sitio). */
function OccasionsDialog({ open, onClose, occasions }: { open: boolean; onClose: () => void; occasions: AdminOccasion[] }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const done = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "occasions"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "digital-templates"] });
  };
  const create = useAdminMutation({
    mutationFn: (value: string) => adminApi.send("POST", "/admin/occasions", { label: value }),
    onSuccess: () => {
      setLabel("");
      done();
    },
  });
  const remove = useAdminMutation({ mutationFn: (id: string) => adminApi.send("DELETE", `/admin/occasions/${id}`), onSuccess: done });
  const rename = useAdminMutation({ mutationFn: ({ id, value }: { id: string; value: string }) => adminApi.send("PATCH", `/admin/occasions/${id}`, { label: value }), onSuccess: done });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ocasiones</DialogTitle>
          <DialogDescription>Son los filtros del catálogo. Al eliminar una, se quita de las plantillas que la usaban.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {occasions.map((o) => (
            <li key={o.id} className="flex items-center gap-2 px-3 py-2">
              <Input
                defaultValue={o.label}
                aria-label={`Nombre de la ocasión ${o.label}`}
                className="h-9"
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value.length >= 2 && value !== o.label) rename.mutate({ id: o.id, value });
                }}
              />
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{o.slug}</span>
              <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${o.label}`} onClick={() => remove.mutate(o.id)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (label.trim().length >= 2) create.mutate(label.trim());
          }}
        >
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nueva ocasión" aria-label="Nueva ocasión" maxLength={60} />
          <Button type="submit" disabled={create.isPending}>
            Agregar
          </Button>
        </form>
        {(create.error || remove.error || rename.error) && <ErrorState error={create.error ?? remove.error ?? rename.error} />}
      </DialogContent>
    </Dialog>
  );
}
