import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

/** Pasos (numerados) o beneficios cortos en tarjetas: cómo funciona, qué incluye. */
export function StepsGrid({ items, numbered = true }: { items: { icon: LucideIcon; title: string; description: string }[]; numbered?: boolean }) {
  const List = numbered ? "ol" : "ul";
  return (
    <List className="grid gap-5 md:grid-cols-3">
      {items.map(({ icon: Icon, title, description }, index) => (
        <li key={title}>
          <Reveal delay={index * 0.06} className="h-full rounded-2xl border border-border bg-card p-6 shadow-card">
            <span className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-royal/10 text-electric">
              <Icon className="size-5" aria-hidden />
            </span>
            {numbered && <p className="text-xs font-semibold tracking-[0.14em] text-royal uppercase">Paso {index + 1}</p>}
            <h3 className="mt-1 font-heading text-lg font-semibold text-navy">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{description}</p>
          </Reveal>
        </li>
      ))}
    </List>
  );
}
