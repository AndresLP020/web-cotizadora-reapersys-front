"use client";

import { AlertTriangle, ArrowDown, ArrowUp, ExternalLink, ImageUp, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/features/admin/admin-api";
import type { AdminLinkPreview, LinkPreviewResult } from "@/features/admin/types";
import { errorMessage } from "@/features/admin/ui";
import { cn } from "@/lib/utils";
import { apiAssetUrl } from "@/services/digital";

const HTTPS = /^https:\/\/[^\s/$.?#][^\s]*$/i;

export function isHttpsUrl(value: string) {
  return HTTPS.test(value.trim());
}

/** «hace 3 min», «hace 2 h», «hace 4 días». */
export function timeAgo(value: string | null | undefined): string {
  if (!value) return "";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

interface PreviewView {
  title: string | null;
  description: string | null;
  domain: string | null;
  image: string | null;
  favicon: string | null;
  fetchedAt: string | null;
  error: string | null;
  imageSource: "og" | "upload" | null;
}

function fromSaved(preview: AdminLinkPreview): PreviewView {
  return {
    title: preview.title,
    description: preview.description,
    domain: preview.domain,
    image: apiAssetUrl(preview.imagePath),
    favicon: apiAssetUrl(preview.faviconPath),
    fetchedAt: preview.fetchedAt,
    error: preview.error,
    imageSource: preview.imageSource,
  };
}

function fromLive(result: LinkPreviewResult): PreviewView {
  return { ...result, fetchedAt: result.fetchedAt, error: null, imageSource: result.image ? "og" : null };
}

/**
 * URL de la demo con su vista previa: al pegar o cambiar la URL, el backend lee la página
 * (og:title, og:description, og:image y favicon) y se muestra como tarjeta. Al guardar, el backend
 * vuelve a leerla y guarda la imagen en su almacenamiento.
 */
export function DemoUrlField({
  id,
  value,
  onChange,
  saved,
  savedUrl,
  onRefreshSaved,
  refreshing,
  coverSlot,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Vista previa guardada (al editar). */
  saved: AdminLinkPreview | null;
  /** URL con la que se leyó la vista previa guardada. */
  savedUrl: string | null;
  /** «Volver a leer» de un elemento guardado (guarda el resultado). */
  onRefreshSaved?: () => void;
  refreshing?: boolean;
  /** Subida de portada (solo para elementos guardados). */
  coverSlot?: React.ReactNode;
}) {
  const [live, setLive] = useState<{ url: string; view: PreviewView | null; error: string | null; loading: boolean } | null>(null);
  const request = useRef(0);
  const url = value.trim();
  const usingSaved = !!saved && url === (savedUrl ?? "");

  const read = async (target: string) => {
    const ticket = ++request.current;
    setLive({ url: target, view: null, error: null, loading: true });
    try {
      const result = await adminApi.send<LinkPreviewResult>("POST", "/admin/link-preview", { url: target });
      if (ticket === request.current) setLive({ url: target, view: fromLive(result), error: null, loading: false });
    } catch (error) {
      if (ticket === request.current) setLive({ url: target, view: null, error: errorMessage(error), loading: false });
    }
  };

  // Lectura automática tras dejar de escribir una URL https nueva.
  useEffect(() => {
    if (usingSaved || !isHttpsUrl(url) || live?.url === url) return;
    const timer = setTimeout(() => void read(url), 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambia la URL
  }, [url, usingSaved]);

  const view = usingSaved ? fromSaved(saved) : live?.url === url ? live.view : null;
  const loading = usingSaved ? !!refreshing : live?.url === url && live.loading;
  const error = usingSaved ? saved.error : live?.url === url ? live.error : null;
  const invalid = url !== "" && !isHttpsUrl(url);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id}>URL de la demo</Label>
          {isHttpsUrl(url) && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-electric hover:underline">
              Abrir demo
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
        <Input
          id={id}
          type="url"
          inputMode="url"
          placeholder="https://"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          aria-describedby={`${id}-hint`}
        />
        <p id={`${id}-hint`} className={cn("text-xs", invalid ? "text-magenta" : "text-muted-foreground")}>
          {invalid ? "La URL debe empezar con https://" : "Obligatoria para publicar. La vista previa se lee de la página."}
        </p>
      </div>

      {(view || loading || error) && (
        <div className="rounded-xl border border-border bg-mist/60 p-3">
          <div className="flex items-center justify-between gap-2 pb-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Vista previa del link</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={loading || !isHttpsUrl(url)}
              onClick={() => (usingSaved && onRefreshSaved ? onRefreshSaved() : void read(url))}
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
              Volver a leer
            </Button>
          </div>
          {loading && !view ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Leyendo la página…
            </p>
          ) : view ? (
            <div className="flex gap-3">
              {view.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- imagen leída de la demo (data: o API)
                <img src={view.image} alt="" className="h-[112px] w-[168px] shrink-0 rounded-lg border border-border bg-white object-cover" />
              ) : (
                <div className="grid h-[112px] w-[168px] shrink-0 place-items-center rounded-lg border border-dashed border-border bg-white px-3 text-center text-xs text-muted-foreground">
                  Sin imagen
                </div>
              )}
              <div className="min-w-0 space-y-1 text-sm">
                <p className="line-clamp-2 font-semibold">{view.title ?? "Sin título"}</p>
                {view.description && <p className="line-clamp-2 text-xs text-muted-foreground">{view.description}</p>}
                <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  {view.favicon && (
                    // eslint-disable-next-line @next/next/no-img-element -- ícono del sitio de la demo
                    <img src={view.favicon} alt="" className="size-4 rounded-sm" />
                  )}
                  {view.domain}
                </p>
                <p className="text-xs text-muted-foreground">
                  {view.imageSource === "upload" ? "Portada subida · " : ""}Leída de la página · {timeAgo(view.fetchedAt)}
                </p>
              </div>
            </div>
          ) : null}
          {error && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          {view && !view.image && <p className="mt-2 text-xs text-muted-foreground">Si la página no trae imagen, sube una portada.</p>}
          {coverSlot && <div className="mt-3">{coverSlot}</div>}
        </div>
      )}
      {!view && !loading && !error && coverSlot && <div>{coverSlot}</div>}
    </div>
  );
}

/** Botón para subir una imagen (PNG, JPEG, WebP o GIF, 3 MB) y, si existe, quitarla. */
export function ImageUploadButton({
  label,
  onUpload,
  onRemove,
  removeLabel = "Quitar",
  pending,
}: {
  label: string;
  onUpload: (file: File) => void;
  onRemove?: () => void;
  removeLabel?: string;
  pending?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => input.current?.click()}>
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <ImageUp className="size-3.5" aria-hidden />}
        {label}
      </Button>
      {onRemove && (
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onRemove}>
          <Trash2 className="size-3.5" aria-hidden />
          {removeLabel}
        </Button>
      )}
    </div>
  );
}

/** Selector de color con su valor hexadecimal editable. */
export function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  const valid = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label}: selector`}
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-border bg-white p-0.5"
        />
        <Input id={id} value={value} maxLength={7} onChange={(e) => onChange(e.target.value)} aria-invalid={!valid} className="h-9 font-mono text-xs uppercase" />
      </div>
    </div>
  );
}

/** Botones para subir o bajar un elemento en la lista (cambia su orden). */
export function ReorderButtons({ name, onUp, onDown, disabled }: { name: string; onUp?: () => void; onDown?: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onUp}
        disabled={disabled || !onUp}
        aria-label={`Subir ${name}`}
        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-cloud hover:text-foreground disabled:opacity-30"
      >
        <ArrowUp className="size-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={disabled || !onDown}
        aria-label={`Bajar ${name}`}
        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-cloud hover:text-foreground disabled:opacity-30"
      >
        <ArrowDown className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/** Pestañas Todas / Publicadas / Borrador con conteo. */
export function StatusTabs({
  value,
  onChange,
  counts,
  labels = { all: "Todas", published: "Publicadas", draft: "Borrador" },
}: {
  value: "all" | "published" | "draft";
  onChange: (value: "all" | "published" | "draft") => void;
  counts: { all: number; published: number; draft: number } | undefined;
  labels?: { all: string; published: string; draft: string };
}) {
  return (
    <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-1.5">
      {(["all", "published", "draft"] as const).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "h-9 rounded-full px-3.5 text-sm font-medium transition-colors",
            value === key ? "bg-navy text-snow" : "bg-mist text-foreground-secondary hover:bg-cloud",
          )}
        >
          {labels[key]}
          {counts && <span className="ml-1.5 opacity-70">{counts[key]}</span>}
        </button>
      ))}
    </div>
  );
}
