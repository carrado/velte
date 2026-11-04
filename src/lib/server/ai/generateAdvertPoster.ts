import { generateAdvertCopy, type AdvertCopy } from "./generateAdvertCopy";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
/** Fast everyday GPT Image model (OpenAI Image API, 2026). */
const IMAGE_MODEL = "gpt-image-2.5-flare";
const IMAGE_SIZE = "1024x1024";
const IMAGE_QUALITY = "medium";

/** Velte brand accent when the vendor has no logo palette. */
const VELTE_ORANGE = "#f97316";

const POSTER_STYLES = [
  "Lifestyle photography — real people or hands with the product in a warm Nigerian setting, shallow depth of field, natural light.",
  "Bold graphic poster — flat shapes, strong typography blocks (as shapes only, no readable tiny type), high contrast, modern flyer energy.",
  "Minimal product hero — single product centred on a clean studio backdrop, soft shadows, lots of negative space.",
  "Editorial magazine cover — sophisticated crop, muted secondary tones, premium retail feel.",
  "Vibrant marketplace flyer — busy-but-balanced colour blocks, festive Nigerian market energy, playful without clutter.",
  "Soft pastel brand story — gentle gradients, airy composition, friendly neighbourhood-shop mood.",
  "Dark moody premium — deep backgrounds, spotlight on the product, luxury boutique atmosphere.",
  "Illustrated / flat design — clean vector-like product illustration, simple icons, contemporary African design sensibility.",
  "Collage cut-out — product cut from photo onto a colourful paper-texture or patterned ground, craft-market vibe.",
  "Geometric modern — diagonal colour fields, sharp product placement, tech-forward retail look.",
] as const;

export interface AdvertPosterArgs {
  storeName: string;
  /** Offer / message for the advert. */
  prompt: string;
  /** Visual direction for the poster (layout, colours, mood). */
  instructions?: string | null;
  productName?: string | null;
  /** Dominant hex colours from the store logo — drives the palette when set. */
  palette?: string[] | null;
}

export interface AdvertPosterResult extends AdvertCopy {
  /** PNG bytes as base64 — the browser uploads to Cloudinary (same path as
   *  product photos). Server-side Cloudinary DNS was failing with ENOTFOUND
   *  on regenerate. */
  imageBase64: string;
  mimeType: "image/png";
}

function pickStyle(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  // Mix in time so each generate (including regenerate) can land on a new look.
  const idx = Math.abs(hash + Date.now()) % POSTER_STYLES.length;
  return POSTER_STYLES[idx];
}

function sanitizePalette(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return [];
  const hex = /^#[0-9a-fA-F]{6}$/;
  const out: string[] = [];
  for (const c of raw) {
    if (typeof c !== "string") continue;
    const t = c.trim();
    if (!hex.test(t)) continue;
    if (!out.includes(t.toLowerCase())) out.push(t.toLowerCase());
    if (out.length >= 3) break;
  }
  return out;
}

function buildImagePrompt(args: AdvertPosterArgs): string {
  const product = args.productName?.trim();
  const offer = args.prompt.trim();
  const instructions = args.instructions?.trim();
  const palette = sanitizePalette(args.palette);
  const style = pickStyle(
    `${args.storeName}|${offer}|${instructions ?? ""}|${palette.join(",")}`,
  );

  const colourLine =
    palette.length > 0
      ? `Brand colour palette from the store logo (use as accents and backgrounds, do not invent other brand marks): ${palette.join(", ")}. Harmonise the whole poster around these hues.`
      : `Accent colour: Velte orange (${VELTE_ORANGE}) used sparingly as the brand accent — complementary neutrals around it.`;

  return [
    "Create a polished marketplace advert poster for a Nigerian small business.",
    "Square format, suitable for a social feed sponsored pin.",
    `Visual style for THIS generation (commit to it; do not default to a generic stock look): ${style}`,
    colourLine,
    "No logos of real global brands, no QR codes, no watermarks, no tiny unreadable text.",
    "Leave a clear focal product/offer area; composition should feel intentional.",
    // Real store logo is composited later — keep this corner visually quiet.
    "Leave a clean empty patch in the bottom-left corner (~15% of width) with no text or busy detail, for a store logo badge.",
    `Store name: ${args.storeName}.`,
    product ? `Product / service: ${product}.` : null,
    offer ? `Advert offer / message: ${offer}` : null,
    instructions
      ? `Vendor poster instructions (follow closely): ${instructions}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function explainFetchError(err: unknown, step: string): Error {
  if (!(err instanceof Error)) return new Error(step);
  const cause = (err as Error & { cause?: unknown }).cause;
  const causeMsg =
    cause instanceof Error && cause.message.trim()
      ? cause.message.trim()
      : typeof cause === "string" && cause.trim()
        ? cause.trim()
        : null;
  if (err.message === "fetch failed" || err.name === "TypeError") {
    return new Error(
      causeMsg
        ? `${step} (${causeMsg})`
        : `${step}. Check the network and try again.`,
    );
  }
  if (err.name === "TimeoutError" || err.name === "AbortError") {
    return new Error(`${step} timed out. Try again.`);
  }
  return new Error(err.message.trim() || step);
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  step: string,
  attempts = 2,
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }
  throw explainFetchError(lastErr, step);
}

async function generatePosterBase64(args: AdvertPosterArgs): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Image generation is not configured yet — set OPENAI_API_KEY.",
    );
  }

  const res = await fetchWithRetry(
    OPENAI_IMAGES_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: buildImagePrompt(args),
        size: IMAGE_SIZE,
        quality: IMAGE_QUALITY,
        n: 1,
      }),
      signal: AbortSignal.timeout(90_000),
    },
    "Couldn't reach the image generator",
  );

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      body.error?.message ?? "Couldn't generate a poster image. Try again.",
    );
  }

  const data = (await res.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const first = data.data?.[0];
  if (first?.b64_json) return first.b64_json;

  if (first?.url) {
    const imgRes = await fetchWithRetry(
      first.url,
      { signal: AbortSignal.timeout(60_000) },
      "Couldn't download the generated poster",
    );
    if (!imgRes.ok) {
      throw new Error("Couldn't download the generated poster. Try again.");
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    return buf.toString("base64");
  }

  throw new Error("Couldn't generate a poster image. Try again.");
}

/**
 * One AI advert generation: poster bytes (OpenAI) plus editable copy (Groq).
 * Style is rotated per call; colour follows the logo palette when provided,
 * otherwise Velte orange. Cloudinary hosting stays in the browser.
 */
export async function generateAdvertPoster(
  args: AdvertPosterArgs,
): Promise<AdvertPosterResult> {
  const prompt = args.prompt.trim();
  const instructions = args.instructions?.trim() || "";
  if (!prompt && !instructions) {
    throw new Error("Add your offer or poster instructions.");
  }

  const imageBase64 = await generatePosterBase64({
    ...args,
    prompt: prompt || instructions,
    instructions: instructions || null,
  });
  const brief = [prompt, instructions].filter(Boolean).join("\n");
  const copy = await generateAdvertCopy({
    storeName: args.storeName,
    productName: args.productName,
    seedHeadline: (prompt || instructions).slice(0, 80),
    brief,
  });

  return { imageBase64, mimeType: "image/png", ...copy };
}
