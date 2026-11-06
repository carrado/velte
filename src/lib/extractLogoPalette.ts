/** Pull 2–3 dominant colours from a store logo for AI poster prompting.
 *  Returns null when the logo is missing or cannot be sampled (CORS / load). */

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((n) =>
        Math.max(0, Math.min(255, Math.round(n)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo load failed"));
    img.src = src;
  });
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

/**
 * Sample a downscaled logo and return the strongest non-near-white /
 * non-near-black colours as hex strings (most saturated first).
 */
export async function extractLogoPalette(
  logoUrl: string | null | undefined,
  maxColors = 3,
): Promise<string[] | null> {
  const url = logoUrl?.trim();
  if (!url) return null;

  try {
    const img = await loadImage(url);
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    // Bucket colours into a coarse RGB grid so near-duplicates merge.
    const buckets = new Map<
      string,
      { r: number; g: number; b: number; n: number; sat: number }
    >();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = luminance(r, g, b);
      // Skip near-white / near-black — not useful brand accents.
      if (lum > 245 || lum < 18) continue;
      const sat = saturation(r, g, b);
      if (sat < 0.12 && lum > 200) continue;
      const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
      const prev = buckets.get(key);
      if (prev) {
        prev.r += r;
        prev.g += g;
        prev.b += b;
        prev.n += 1;
        prev.sat = Math.max(prev.sat, sat);
      } else {
        buckets.set(key, { r, g, b, n: 1, sat });
      }
    }

    const ranked = [...buckets.values()]
      .map((b) => ({
        hex: rgbToHex(b.r / b.n, b.g / b.n, b.b / b.n),
        score: b.n * (0.35 + b.sat),
      }))
      .sort((a, b) => b.score - a.score);

    const unique: string[] = [];
    for (const row of ranked) {
      if (unique.includes(row.hex)) continue;
      unique.push(row.hex);
      if (unique.length >= maxColors) break;
    }
    return unique.length > 0 ? unique : null;
  } catch {
    return null;
  }
}
