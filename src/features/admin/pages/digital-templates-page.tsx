"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, ImageOff, ImageUp, Loader2, Pencil, Plus, RefreshCw, Trash2, Undo2 } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/features/admin/admin-api";
import { useCan } from "@/features/admin/session";
import type { AdminDigitalTemplate, Paged } from "@/features/admin/types";
import {
  centsToInput,
  EmptyState,
  ErrorState,
  formatDateTime,
  PageHeader,
  Pagination,
  Panel,
  parsePesosInput,
  StatusPill,
  TableSkeleton,
  useAdminMutation,
} from "@/features/admin/ui";
import { useListParams } from "@/features/admin/use-list-params";
import { kindLabels, OCCASIONS_BY_KIND, occasionLabels } from "@/features/digital/digital-labels";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { templateImageUrl } from "@/services/digital";
import type { DigitalKind } from "@/types/digital";

const TABS: { value: DigitalKind | "all"; label: string }[] = [
  { value: "digital_gift", label: "Detalles digitales" },
  { value: "nfc_card", label: "Tarjetas NFC" },
  { value: "all", label: "Todas" },
];

interface FormState {
  kind: DigitalKind;
  name: string;
  occasion: string;
  demoUrl: string;
  price: string;
  fields: string;
  description: string;
  featured: boolean;
  active: boolean;
  sortOrder: string;
}

const emptyForm = (kind: DigitalKind): FormState => ({
  kind,
  name: "",
  occasion: OCCASIONS_BY_KIND[kind][0]!,
  demoUrl: "",
  price: "",
  fields: kind === "nfc_card" ? "Nombre\nPuesto o giro\nTeléfono o WhatsApp\nCorreo" : "Nombre de la festejada o festejado\nMensaje especial",
  description: "",
  featured: false,
  active: true,
  sortOrder: "0",
});

const formOf = (t: AdminDigitalTemplate): FormState => ({
  kind: t.kind,
  name: t.name,
  occasion: t.occasion,
  demoUrl: t.demoUrl,
  price: centsToInput(t.priceCents),
  fields: t.customizableFields.join("\n"),
  description: t.description ?? "",
  featured: t.featured,
  active: t.status === "active",
  sortOrder: String(t.sortOrder),
});

/** Catálogo de plantillas de detalles digitales y diseños de tarjetas NFC. */
export function DigitalTemplatesPage() {
  const { values, page, update } = useListParams(["kind"] as const);
  const tab = (values.kind || "digital_gift") as DigitalKind | "all";
  const canWrite = useCan("catalog:write");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ id: string | null; form: FormState } | null>(null);
  const [deleting, setDeleting] = useState<AdminDigitalTemplate | null>(null);
  const uploadTarget = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "digital-templates", tab, page],
    queryFn: () => adminApi.get<Paged<AdminDigitalTemplate>>("/admin/digital-templates", { kind: tab === "all" ? undefined : tab, page }),
    placeholderData: keepPreviousData,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "digital-templates"] });

  const save = useAdminMutation({
    mutationFn: ({ id, body }: { id: string | null; body: Record<string, unknown> }) =>
      id ? adminApi.send<AdminDigitalTemplate>("PATCH", `/admin/digital-templates/${id}`, body) : adminApi.send<AdminDigitalTemplate>("POST", "/admin/digital-templates", body),
    onSuccess: () => {
      setEditing(null);
      void refresh();
    },
  });
  const action = useAdminMutation({
    mutationFn: ({ id, kind }: { id: string; kind: "refresh" | "unupload" | "delete" }) =>
      kind === "refresh"
        ? adminApi.send("POST", `/admin/digital-templates/${id}/refresh-preview`)
        : adminApi.send("DELETE", kind === "unupload" ? `/admin/digital-templates/${id}/image` : `/admin/digital-templates/${id}`),
    onSuccess: () => {
      setDeleting(null);
      void refresh();
    },
  });
  const upload = useAdminMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const form = new FormData();
      form.append("image", file);
      return adminApi.upload(`/admin/digital-templates/${id}/image`, form);
    },
    onSuccess: () => void refresh(),
  });
  const busy = action.isPending || upload.isPending;

  const priceError = editing && editing.form.price.trim() !== "" && parsePesosInput(editing.form.price) === null;
  const submit = () => {
    if (!editing || priceError) return;
    const f = editing.form;
    save.mutate({
      id: editing.id,
      body: {
        kind: f.kind,
        name: f.name,
        occasion: f.occasion,
        demoUrl: f.demoUrl,
        priceCents: f.price.trim() === "" ? null : parsePesosInput(f.price),
        customizableFields: f.fields.split("\n").map((l) => l.trim()).filter(Boolean),
        description: f.description,
        featured: f.featured,
        status: f.active ? "active" : "inactive",
        sortOrder: Number(f.sortOrder) || 0,
      },
    });
  };
  const setForm = (patch: Partial<FormState>) => setEditing((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e));

  return (
    <>
      <PageHeader
        title="Detalles digitales y NFC"
        description="Plantillas que se muestran en el sitio con la vista previa de su demo. La vista previa se lee de la página; si no trae imagen, sube una captura."
        actions={
          canWrite && (
            <Button onClick={() => setEditing({ id: null, form: emptyForm(tab === "nfc_card" ? "nfc_card" : "digital_gift") })}>
              <Plus /> Nueva plantilla
            </Button>
          )
        }
      />
      {(action.error || upload.error) && <ErrorState error={action.error ?? upload.error} className="mb-4" />}
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadTarget.current) upload.mutate({ id: uploadTarget.current, file });
          e.target.value = "";
        }}
      />
      <Panel>
        <div role="tablist" aria-label="Filtrar por producto" className="flex flex-wrap gap-1 border-b border-border p-3">
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              type="button"
              aria-selected={tab === t.value}
              onClick={() => update({ kind: t.value === "digital_gift" ? "" : t.value })}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.value ? "bg-sky text-royal" : "text-foreground-secondary hover:bg-mist hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error ? (
          <ErrorState error={error} className="m-4" />
        ) : isPending ? (
          <TableSkeleton />
        ) : data.items.length === 0 ? (
          <EmptyState message="Aún no hay plantillas. Agrega la primera con la URL de su demo." />
        ) : (
          <>
            <ul className="grid gap-4 p-4 lg:grid-cols-2">
              {data.items.map((t) => {
                const image = templateImageUrl(t.imagePath);
                return (
                  <li key={t.id} className={cn("flex flex-col overflow-hidden rounded-xl border bg-canvas", t.featured ? "border-warning/40" : "border-border")}>
                    <div className="grid gap-4 p-4 sm:grid-cols-[180px_1fr]">
                      <div className="relative aspect-[1.91/1] overflow-hidden rounded-lg bg-mist">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt={`Vista previa de ${t.name}`} className="size-full object-cover" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-muted-foreground">
                            <ImageOff className="size-6" aria-label="Sin imagen" />
                          </span>
                        )}
                        {t.preview.imageSource === "upload" && <Badge className="absolute bottom-1.5 left-1.5 bg-navy/80 text-snow">Captura</Badge>}
                      </div>
                      <div className="min-w-0 space-y-1.5 text-sm">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-medium">{t.name}</p>
                          <StatusPill status={t.status === "active" ? "published" : "rejected"} label={t.status === "active" ? "Publicada" : "Oculta"} />
                          {t.featured && <StatusPill status="pending" label="Destacada" />}
                        </div>
                        <p className="text-muted-foreground">
                          {kindLabels[t.kind]} · {occasionLabels[t.occasion] ?? t.occasion} ·{" "}
                          {t.priceCents === null ? "Por cotizar" : `${formatMoney(t.priceCents)}${t.kind === "nfc_card" ? " por tarjeta" : ""}`}
                        </p>
                        <a href={t.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 text-electric hover:underline">
                          <span className="truncate">{t.demoUrl}</span> <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                        </a>
                        {t.customizableFields.length > 0 && <p className="text-xs text-muted-foreground">Pide: {t.customizableFields.join(", ")}</p>}
                        {t.preview.title && <p className="text-xs text-muted-foreground">Título de la página: {t.preview.title}</p>}
                        {t.preview.error && (
                          <p className="flex items-start gap-1.5 text-xs text-warning">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {t.preview.error}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Vista previa leída {t.preview.fetchedAt ? formatDateTime(t.preview.fetchedAt) : "—"}
                        </p>
                      </div>
                    </div>
                    {canWrite && (
                      <div className="mt-auto flex flex-wrap gap-2 border-t border-border px-4 py-3">
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing({ id: t.id, form: formOf(t) })}>
                          <Pencil /> Editar
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => action.mutate({ id: t.id, kind: "refresh" })}>
                          {action.isPending && action.variables?.id === t.id && action.variables.kind === "refresh" ? <Loader2 className="animate-spin" /> : <RefreshCw />} Actualizar vista previa
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            uploadTarget.current = t.id;
                            fileInput.current?.click();
                          }}
                        >
                          {upload.isPending && upload.variables?.id === t.id ? <Loader2 className="animate-spin" /> : <ImageUp />} Subir captura
                        </Button>
                        {t.preview.imageSource === "upload" && (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => action.mutate({ id: t.id, kind: "unupload" })}>
                            <Undo2 /> Usar imagen de la página
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={busy} onClick={() => setDeleting(t)}>
                          <Trash2 /> Eliminar
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => update({ page: p })} />
          </>
        )}
      </Panel>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle>
            <DialogDescription>Al guardar se lee la vista previa de la demo (título, descripción e imagen). Puede tardar unos segundos.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tpl-kind">Producto</Label>
                  <Select
                    value={editing.form.kind}
                    onValueChange={(kind) => setForm({ kind: kind as DigitalKind, occasion: OCCASIONS_BY_KIND[kind as DigitalKind][0]! })}
                  >
                    <SelectTrigger id="tpl-kind" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(kindLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tpl-occasion">Ocasión o uso</Label>
                  <Select value={editing.form.occasion} onValueChange={(occasion) => setForm({ occasion })}>
                    <SelectTrigger id="tpl-occasion" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OCCASIONS_BY_KIND[editing.form.kind].map((value) => (
                        <SelectItem key={value} value={value}>{occasionLabels[value]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-name">Nombre</Label>
                <Input id="tpl-name" required minLength={2} maxLength={120} value={editing.form.name} onChange={(e) => setForm({ name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-url">URL de la demo</Label>
                <Input id="tpl-url" type="url" required placeholder="https://" value={editing.form.demoUrl} onChange={(e) => setForm({ demoUrl: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tpl-price">{editing.form.kind === "nfc_card" ? "Precio por tarjeta (MXN)" : "Precio (MXN)"}</Label>
                  <Input id="tpl-price" inputMode="decimal" placeholder="Vacío = Por cotizar" value={editing.form.price} onChange={(e) => setForm({ price: e.target.value })} aria-invalid={Boolean(priceError)} />
                  {priceError && <p className="text-xs text-destructive">Escribe un importe válido, por ejemplo 299 o 1,250.50.</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tpl-order">Orden</Label>
                  <Input id="tpl-order" type="number" min={0} max={10000} value={editing.form.sortOrder} onChange={(e) => setForm({ sortOrder: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-fields">Datos que el cliente llena (uno por línea)</Label>
                <Textarea id="tpl-fields" rows={4} value={editing.form.fields} onChange={(e) => setForm({ fields: e.target.value })} />
                <p className="text-xs text-muted-foreground">Máximo 8. Las líneas con «mensaje» se piden en un área de texto grande.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-description">Descripción (opcional)</Label>
                <Textarea id="tpl-description" rows={2} maxLength={400} placeholder="Si la dejas vacía se usa la de la página." value={editing.form.description} onChange={(e) => setForm({ description: e.target.value })} />
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={editing.form.active} onCheckedChange={(active) => setForm({ active })} /> Publicada
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={editing.form.featured} onCheckedChange={(featured) => setForm({ featured })} /> Destacada
                </label>
              </div>
              {save.error && <ErrorState error={save.error} />}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button type="submit" disabled={save.isPending || Boolean(priceError)}>
                  {save.isPending && <Loader2 className="animate-spin" />} Guardar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar plantilla</DialogTitle>
            <DialogDescription>
              «{deleting?.name}» deja de mostrarse en el sitio y se borra su imagen. Los pedidos ya recibidos conservan sus datos. Si solo quieres ocultarla, edítala y desmarca «Publicada».
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={action.isPending} onClick={() => deleting && action.mutate({ id: deleting.id, kind: "delete" })}>
              {action.isPending && <Loader2 className="animate-spin" />} Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
