import { generateAdvertCopy, type AdvertCopy } from "./generateAdvertCopy";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
/** Fast everyday GPT Image model (OpenAI Image API, 2026). */
const IMAGE_MODEL = "gpt-image-2.5-flare";
const IMAGE_SIZE = "1024x1024";
const IMAGE_QUALITY = "medium";

type NicheCategory =
  | "food"
  | "fashion"
  | "beauty"
  | "tech"
  | "home"
  | "fitness"
  | "service"
  | "luxury"
  | "general";

function detectNiche(text: string): NicheCategory {
  const lower = text.toLowerCase();
  if (
    /\b(food|chicken|shawarma|grill|burger|suya|rice|jollof|cake|bakery|pastry|snack|drink|coffee|juice|soup|dish|restaurant|catering|spicy|delicious|chef|meal|kitchen|pepper|meat|fish|salad|delicacy|delicacies|edible|cuisine)\b/.test(
      lower,
    )
  ) {
    return "food";
  }
  if (
    /\b(shoe|sneaker|heel|boot|dress|gown|cloth|shirt|pant|trouser|suit|wear|outfit|fabric|ankara|lace|fashion|bag|handbag|tote|watch|jewelry|necklace|bracelet|ring|luxury|couture|tailor|apparel|footwear|wardrobe|attire)\b/.test(
      lower,
    )
  ) {
    return "fashion";
  }
  if (
    /\b(skin|skincare|serum|cream|lotion|glow|beauty|makeup|lipstick|hair|wig|braid|cosmetic|spa|massage|perfume|fragrance|cologne|facial|body|cleanser|moisturizer|lipgloss)\b/.test(
      lower,
    )
  ) {
    return "beauty";
  }
  if (
    /\b(phone|iphone|samsung|laptop|computer|macbook|gadget|airpod|earbud|headphone|charger|tech|screen|watch|electronic|smart|camera|device|accessory|cable|powerbank)\b/.test(
      lower,
    )
  ) {
    return "tech";
  }
  if (
    /\b(furniture|chair|table|bed|sofa|couch|interior|decor|home|curtain|lamp|cushion|shelf|kitchenware|appliance|lighting|living room)\b/.test(
      lower,
    )
  ) {
    return "home";
  }
  if (
    /\b(gym|fitness|workout|protein|sport|activewear|sneakers|training|health|supplement|exercise|weight)\b/.test(
      lower,
    )
  ) {
    return "fitness";
  }
  if (
    /\b(clean|repair|auto|car|wash|mechanic|service|plumber|electrician|logistics|delivery|event|photography|design|rent|agency|install|maintenance)\b/.test(
      lower,
    )
  ) {
    return "service";
  }
  return "general";
}

const NICHE_DESIGN_GUIDANCE: Record<
  NicheCategory,
  {
    colorPalettes: string[];
    visualMood: string;
    lightingAndTexture: string;
  }
> = {
  food: {
    colorPalettes: [
      "Appetizing warm amber, deep rustic terracotta, golden saffron, and charred charcoal with fresh basil green highlights",
      "Rich paprika red, toasted sesame, warm timber brown, and glowing golden honey tones",
      "Moody dark slate backdrop with vibrant fire-roasted coral, fresh citrus yellow, and emerald herb accents",
    ],
    visualMood:
      "Mouth-watering, fresh, aromatic commercial food photography with rich steam, sizzling glaze, and crisp delicious textures",
    lightingAndTexture:
      "Warm directional studio spotlighting, shallow depth of field, rustic artisan wooden or slate textures, glistening freshness",
  },
  fashion: {
    colorPalettes: [
      "Opulent champagne gold, midnight obsidian, and warm ivory with rich bronze accents",
      "Sophisticated royal emerald green, soft blush beige, and polished brass highlights",
      "High-fashion monochrome with striking cobalt blue or electric scarlet accent pops",
      "Warm sand, terracotta velvet, and soft desert rose tones",
    ],
    visualMood:
      "Vogue-grade luxury fashion editorial, architectural podium presentation, sculpted fabric folds, elite retail presence",
    lightingAndTexture:
      "Softbox diffused studio lighting, elegant velvet or travertine stone pedestal, crisp silhouettes, pristine reflections",
  },
  beauty: {
    colorPalettes: [
      "Luminous rose quartz, warm honey amber, soft eucalyptus green, and pearlescent cream",
      "Radiant golden sunset tones, velvety peach, clean lilac, and warm dewy neutral beige",
      "Minimalist organic botanical palette: calming sage, crisp porcelain white, and warm terracotta",
    ],
    visualMood:
      "Dewy, glowing, pristine skincare and beauty aesthetic with glistening serum drops, radiant clean reflections, and botanical touches",
    lightingAndTexture:
      "Soft diffused morning sunlight, translucent glass textures, gentle water ripples, luminous ethereal glow",
  },
  tech: {
    colorPalettes: [
      "Cyber deep slate, metallic titanium silver, and electric neon cyan or cobalt blue glow",
      "Matte obsidian black, stealth graphite, and vibrant electric violet or emerald edge accents",
      "Clean Scandinavian minimalism: pure snow white, space gray, and warm laser orange highlights",
    ],
    visualMood:
      "Ultra-sleek modern commercial product hero, floating precision components, high-precision industrial design",
    lightingAndTexture:
      "Sharp rim and rim-light reflections, dark ambient studio gradient, anti-reflective matte and polished metallic surfaces",
  },
  home: {
    colorPalettes: [
      "Warm Scandinavian and Afro-modern earth tones: rich walnut, warm cream linen, soft sage, and muted ochre",
      "Modern Japandi aesthetics: natural light oak, soft oatmeal, charcoal slate, and warm morning gold",
    ],
    visualMood:
      "Inviting, serene, architecturally stunning interior staging showcasing comfort, craftsmanship, and elegant living",
    lightingAndTexture:
      "Natural architectural window light, organic textured fabrics, tactile wood grain, gentle shadow play",
  },
  fitness: {
    colorPalettes: [
      "Electric lime green, deep carbon black, and vibrant cyan athletic energy",
      "Fiery sunset crimson, energetic orange, and dark metallic gray",
    ],
    visualMood:
      "Dynamic, powerful, motivational athletic performance aesthetic with high momentum and impact",
    lightingAndTexture:
      "Dramatic high-contrast rim lighting, sweat/grit particles, subtle motion blur, bold aggressive lines",
  },
  service: {
    colorPalettes: [
      "Trustworthy royal sapphire blue, crisp clean white, and energizing warm gold accents",
      "Modern corporate teal, deep twilight navy, and bright energetic coral highlights",
    ],
    visualMood:
      "Professional, reliable, seamless, modern service delivery with high confidence and clarity",
    lightingAndTexture:
      "Bright even studio lighting, clean geometric layout, modern graphic icons or pristine equipment in action",
  },
  luxury: {
    colorPalettes: [
      "Deep royal obsidian, polished 24k gold, and royal midnight indigo",
      "Rich burgundy velvet, dark mahogany, and platinum silver accents",
    ],
    visualMood:
      "Bespoke high-jewelry and luxury goods showcase, museum-grade pedestals, whisper-quiet prestige",
    lightingAndTexture:
      "Pinpoint dramatic spotlights, caustics and diamond sparkle, dark moody velvet and dark mirror reflections",
  },
  general: {
    colorPalettes: [
      "Vibrant modern marketplace palette: rich royal jewel tones (sapphire, amber gold, ruby) balanced by clean neutral backdrops",
      "Warm sunset gradient: rich coral, golden honey, and deep plum with crisp white focal highlights",
      "Fresh contemporary commercial palette: bold indigo, warm mustard gold, and soft cloud gray",
    ],
    visualMood:
      "Eye-catching commercial advertising flyer with bold visual hierarchy, stopping power, and premium polish",
    lightingAndTexture:
      "Clean professional studio commercial lighting with depth, soft balanced fill, and crisp product edges",
  },
};

const POSTER_STYLES = [
  "High-end commercial studio photography — dramatic key and rim lighting, ultra-sharp product focus, clean editorial background, premium reflections.",
  "Vibrant social media hero advert — dynamic layout, bold modern color harmony, energetic commercial framing that stops the scroll.",
  "Editorial luxury campaign — minimalist podium, cinematic depth of field, sophisticated color blocking, high-fashion magazine aesthetic.",
  "Warm lifestyle in-context — product showcased naturally in a beautiful, modern Nigerian setting with warm golden-hour lighting and authentic atmosphere.",
  "3D isometric / dimensional product render — floating elements, soft volumetric shadows, clean pastel or rich contrasting backdrop, hyper-clean commercial polish.",
  "Modern graphic poster — bold geometric framing, high-contrast color fields, dynamic visual hierarchy, sleek contemporary advertising layout.",
] as const;

export interface AdvertPosterArgs {
  storeName: string;
  /** Offer / message for the advert. */
  prompt: string;
  /** Visual direction for the poster (layout, colours, mood). */
  instructions?: string | null;
  productName?: string | null;
  /** Dominant hex colours from the store logo — used as optional accent when provided. */
  palette?: string[] | null;
}

export interface AdvertPosterResult extends AdvertCopy {
  /** PNG bytes as base64 — the browser uploads to Cloudinary via the dedicated advert profile. */
  imageBase64: string;
  mimeType: "image/png";
}

function pickStyle(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
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
  const textCorpus = `${product ?? ""} ${offer} ${instructions ?? ""}`;
  const niche = detectNiche(textCorpus);
  const guidance = NICHE_DESIGN_GUIDANCE[niche];

  let hash = 0;
  for (let i = 0; i < textCorpus.length; i++) {
    hash = (hash * 33 + textCorpus.charCodeAt(i)) | 0;
  }
  const chosenPalette =
    guidance.colorPalettes[
      Math.abs(hash + Date.now()) % guidance.colorPalettes.length
    ];

  const logoPalette = sanitizePalette(args.palette);
  let colorDirection = `Aesthetic Color Palette: ${chosenPalette}. Choose the most visually stunning, high-converting commercial color harmony suited to this exact product.`;
  if (logoPalette.length > 0) {
    colorDirection += ` Optional store brand logo colors: (${logoPalette.join(", ")}). You may tastefully incorporate these as subtle secondary brand accents, rim light, or badge highlights if they enhance the design, but prioritize the overall beauty and product-specific appeal of the poster.`;
  }

  const style = pickStyle(`${args.storeName}|${textCorpus}`);

  return [
    "High-converting commercial advertising poster for an authentic business on social media.",
    "Square format (1:1), scroll-stopping visual hierarchy, award-winning advertising campaign quality.",
    `Hero Product/Subject: ${product || offer}.`,
    `Store Brand Identity: Official campaign for store "${args.storeName}".`,
    offer ? `Advert message & core offer: "${offer}".` : null,
    instructions
      ? `Vendor specific creative directions: "${instructions}".`
      : null,
    `Visual Mood: ${guidance.visualMood}.`,
    `Lighting & Texture: ${guidance.lightingAndTexture}.`,
    `Aesthetic Style: ${style}.`,
    colorDirection,
    "Composition & Framing: Frame the hero product/subject with magnetic visual impact in the center and upper frame, using professional depth of field, studio edge light, and intentional negative space.",
    // Authentic store logo & name capsule is composited in the bottom-left corner
    "Brand Identity Zone: Keep the bottom-left area (~28% of width, ~12% of height) quiet, smooth, and uncluttered with calm background shading or soft gradient shadow so the store logo and name badge read with pristine contrast.",
    "STRICT DIRECTIVE: ABSOLUTELY NO fake brand logos, NO gibberish lettering or simulated AI text, NO watermarks, NO barcodes. The visual must look like a multi-million-naira professional brand campaign that makes customers want to buy immediately.",
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
 * One AI advert generation: poster bytes (OpenAI) plus sales-generating copy (Groq/OpenAI).
 * Theme and color palette are chosen dynamically for maximum sales conversion and visual appeal.
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
