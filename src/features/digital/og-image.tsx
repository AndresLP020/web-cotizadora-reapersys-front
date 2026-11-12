import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

/** Imagen para compartir de las páginas de productos digitales (fondo oscuro con el acento de la línea). */
export function digitalOgImage({ eyebrow, title, accent, onAccent, stage }: { eyebrow: string; title: string; accent: string; onAccent: string; stage: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `radial-gradient(circle at 80% 20%, ${accent}55, transparent 55%), ${stage}`,
          color: "#F5F7FB",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ background: accent, color: onAccent, borderRadius: 999, padding: "8px 20px", fontSize: 26, fontWeight: 700, letterSpacing: 4 }}>
            {eyebrow.toUpperCase()}
          </div>
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980 }}>{title}</div>
        <div style={{ fontSize: 30, color: "#A9B1C6" }}>ReaperSys</div>
      </div>
    ),
    ogSize,
  );
}
