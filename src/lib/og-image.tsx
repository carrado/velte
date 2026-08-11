import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Shared branded Open Graph / Twitter card renderer — every route's
// opengraph-image.tsx / twitter-image.tsx calls this with just its own
// eyebrow + title instead of reimplementing the layout. Satori (what
// ImageResponse renders with) only understands inline `style` objects and a
// flexbox subset of CSS — no Tailwind classes, no grid.
const SIZE = { width: 1200, height: 630 };

// The "V" mark (velte_v.png), not the full wordmark logo — that PNG's
// wordmark is dark text meant for a light surface and goes unreadable on
// this card's dark background. The mark is plain orange-on-transparent, so
// it works here; "Velte" is set as real text next to it instead.
// Read once per server lifetime, not once per request — the file never
// changes at runtime.
let cachedMarkDataUrl: string | null = null;
async function getMarkDataUrl(): Promise<string> {
  if (!cachedMarkDataUrl) {
    const buf = await readFile(join(process.cwd(), "public", "velte_v.png"));
    cachedMarkDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  }
  return cachedMarkDataUrl;
}

export async function renderOgImage({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  const mark = await getMarkDataUrl();

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px",
        background: "linear-gradient(135deg, #023337 0%, #04575e 100%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark} width={34} height={28} alt="" />
        <span
          style={{
            display: "flex",
            color: "white",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: -0.5,
          }}
        >
          Velte
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            backgroundColor: "rgba(249,115,22,0.16)",
            border: "1px solid rgba(249,115,22,0.45)",
            borderRadius: 999,
            padding: "10px 24px",
            color: "#fb923c",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            color: "white",
            fontSize: 58,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: -1,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          color: "rgba(255,255,255,0.6)",
          fontSize: 26,
        }}
      >
        velte.ng
      </div>
    </div>,
    SIZE,
  );
}
