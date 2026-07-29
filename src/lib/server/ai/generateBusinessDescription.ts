import type { SectorClassification } from "@/types/sectors";
import { assessDescriptionQuality } from "./assessDescriptionQuality";

// First LLM integration in the stack — kept to one file so swapping models
// or providers later stays a localized change. Groq's chat completions API
// is OpenAI-compatible, so a plain fetch avoids pulling in an SDK.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// Generation is self-correcting against the SAME bar assessDescriptionQuality.ts
// checks later, rather than just hoping a well-worded prompt is enough on
// its own: a draft that doesn't score "good" gets one revision pass with
// the checker's own hint fed back in as corrective guidance. Bounded to 2
// attempts — a vendor waiting on "Ask AI to generate" still gets an answer
// quickly either way, and this is a deliberate user click, not the
// automatic background check, so the extra Groq calls are cheap relative
// to how rarely it fires.
const MAX_ATTEMPTS = 2;

interface SectorInput {
  label: string;
  classification: SectorClassification;
}

interface GenerateArgs {
  businessName: string;
  sectors: SectorInput[]; // one or more — a vendor can pick up to 5 at signup
}

// "a", "a and b", "a, b and c" — reads naturally whether the vendor picked
// one sector or several.
function formatSectorList(labels: string[]): string {
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function pick<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

function templateDescription({ businessName, sectors }: GenerateArgs): string {
  const sectorList = formatSectorList(
    sectors.map((s) => s.label.toLowerCase()),
  );
  const hasFood = sectors.some(
    (s) => s.classification === "food" || s.classification === "food_both",
  );
  const hasService = sectors.some(
    (s) =>
      s.classification === "service" ||
      s.classification === "both" ||
      s.classification === "food_both",
  );

  // Grounded in how Velte Connect itself works (chat-based booking,
  // pickup/delivery) rather than generic adjectives — this fallback has no
  // per-item data to draw from, but it can still avoid the vague-filler
  // phrases the quality check (assessDescriptionQuality.ts) flags. Only
  // hit when there's no API key at all, so it never goes through the
  // self-check loop below.
  //
  // Several phrasings per bucket, picked at random — without this, two
  // unrelated vendors who happen to share a business name and sector
  // selection (or the same vendor regenerating) would get a byte-identical
  // "About" text, which reads as templated and gives AI search two
  // indistinguishable store embeddings to tell them apart with.
  if (hasFood && hasService) {
    return pick([
      `${businessName} handles ${sectorList} — order food for pickup or delivery, or book the service side directly through chat.`,
      `${businessName} covers both ${sectorList} — food orders and service bookings both go straight through chat.`,
      `${businessName} does ${sectorList}: food ready for pickup or delivery, plus the service side booked through chat.`,
    ] as const);
  }
  if (hasFood) {
    return pick([
      `${businessName} handles ${sectorList}, made to order and ready for pickup or delivery.`,
      `${businessName} covers ${sectorList} — everything made fresh to order, pickup or delivery.`,
      `${businessName} does ${sectorList}, prepared to order for pickup or delivery.`,
    ] as const);
  }
  if (hasService) {
    return pick([
      `${businessName} handles ${sectorList} — book directly through chat, from quote to completion.`,
      `${businessName} covers ${sectorList}, booked directly through chat from quote to completion.`,
      `${businessName} does ${sectorList} — get a quote and book the job straight through chat.`,
    ] as const);
  }
  return pick([
    `${businessName} handles ${sectorList}, in stock and ready to ship or collect.`,
    `${businessName} covers ${sectorList} — in stock now, ready to ship or collect.`,
    `${businessName} does ${sectorList}, ready to ship or available for pickup.`,
  ] as const);
}

// Nudges phrasing/structure away from converging on similar output across
// different generate calls — picked at random per call, not per vendor, so
// even the same business name + sector selection typed by two different
// vendors is unlikely to land on the same structure. Only used on the
// first attempt; a revision pass stays focused on fixing the specific gap
// the quality check flagged rather than also changing angle.
const OPENING_ANGLES = [
  "Lead with your most distinctive specialty first.",
  "Structure it as: what you sell or do, then how buyers get it (pickup, delivery, or chat booking).",
  "Open with the area or niche you're known for before listing specifics.",
  "Write it as a quick, confident intro a buyer would read in five seconds.",
] as const;

const SYSTEM_PROMPT =
  // The generated text also has to clear a separate AI quality check (see
  // assessDescriptionQuality.ts) that specifically penalizes vague filler —
  // so this prompt demands the same concreteness that check rewards, not
  // just "sound nice." Found live: wording like "helps buyers understand
  // what this business sells or does" produced exactly the kind of generic
  // marketing copy the quality check then flagged as "add specific
  // services," fighting the vendor in a loop — the retry loop below is the
  // second line of defense, this prompt is the first.
  "You write short business descriptions for vendors on a Nigerian marketplace app. Write 2-3 plain-language sentences, first person plural ('We...'). You MUST name 2-4 CONCRETE, SPECIFIC things this kind of business actually sells or does — real product types or service names typical for the sector(s) given (e.g. for a phone shop: 'chargers, screen guards, and phone repairs', not 'quality accessories'; for a software sector: 'websites, mobile apps, and POS systems', not 'reliable IT solutions'). Draw on your own knowledge of what businesses in that sector concretely offer. NEVER use vague filler — banned phrases include 'quality service', 'wide range of products', 'trusted', 'reliable', 'professional', 'ready to serve customers', 'exactly what they need'. When more than one sector is listed, name concrete examples from each rather than one generic sentence covering all of them. No fluff, no hashtags, no emoji, no markdown.";

async function callGroq(
  args: GenerateArgs,
  apiKey: string,
  revisionHint: string | null,
): Promise<string | null> {
  const sectorLabels = args.sectors.map((s) => s.label).join(", ");
  const userContent = revisionHint
    ? `Business name: ${args.businessName}\nSector(s): ${sectorLabels}\nYour previous draft wasn't specific enough: ${revisionHint}\nRewrite it — still 2-3 sentences, still naming concrete things this business sells or does, fixing that gap.`
    : `Business name: ${args.businessName}\nSector(s): ${sectorLabels}\n${pick(OPENING_ANGLES)}\nWrite a description naming specific things this business sells or does across all the sectors listed — not generic marketing language.`;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.7,
        max_tokens: 200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    return content?.trim() || null;
  } catch {
    return null;
  }
}

export async function generateBusinessDescription(
  args: GenerateArgs,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return templateDescription(args);

  let best: string | null = null;
  let revisionHint: string | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const candidate = await callGroq(args, apiKey, revisionHint);
    if (!candidate) break;
    best = candidate;

    const assessment = await assessDescriptionQuality({
      description: candidate,
      sectors: args.sectors,
    });
    if (assessment.quality === "good") return candidate;
    revisionHint = assessment.hint;
  }

  // Ran out of attempts without hitting "good" (or Groq failed outright) —
  // still return the best real draft rather than nothing; only fall back
  // to the generic template if not even one attempt produced text at all.
  return best ?? templateDescription(args);
}
