// Same Groq call as generateListingDescription.ts, but for a Hub advert
// rather than a listing — kept as a separate file since the output shape is
// different (3 headline options + 1 blurb, not 1 description) and the input
// is whatever the vendor already typed in the composer (a seed headline,
// the picked listing's name) plus their store name. Same contract as its
// siblings: never invents specifics beyond what was passed in, and falls
// back to templates when the key is missing or the call fails — the composer
// always gets something usable, never an error.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// See router.ts — the llama-3.3 id was decommissioned by Groq.
const GROQ_MODEL = "openai/gpt-oss-20b";

export interface AdvertCopyArgs {
  storeName: string;
  productName?: string | null;
  seedHeadline?: string | null;
  /** Full vendor brief for the advert (message, offer, tone). */
  brief?: string | null;
}

export interface AdvertCopy {
  headlines: string[];
  blurb: string;
}

function templateCopy(args: AdvertCopyArgs): AdvertCopy {
  const what = args.productName?.trim() || "our latest arrivals";
  return {
    headlines: [
      `${what} — now at ${args.storeName}`,
      `New in: ${what}`,
      args.seedHeadline?.trim() || `${args.storeName} has something for you`,
    ],
    blurb: `See ${what} at ${args.storeName}. Message us for prices and delivery.`,
  };
}

/**
 * Drafts advert copy from what the vendor already gave the composer. The
 * vendor picks an option and can edit it — the AI proposes, the vendor
 * disposes, and nothing posts without their tap.
 */
export async function generateAdvertCopy(
  args: AdvertCopyArgs,
): Promise<AdvertCopy> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return templateCopy(args);

  const context = [
    `Store name: ${args.storeName}`,
    args.productName ? `Advertised item: ${args.productName}` : null,
    args.seedHeadline
      ? `Vendor's own draft headline: ${args.seedHeadline}`
      : null,
    args.brief?.trim()
      ? `Vendor brief for the advert: ${args.brief.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

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
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content:
              "You write short advert copy for vendors on a Nigerian marketplace app. Reply with exactly 4 lines: 3 punchy poster headlines (max 60 characters each, no hashtags, no emoji, no markdown, no numbering), then 1 blurb (max 200 characters, plain language). Only state facts given to you — never invent a brand, price, discount, or detail that wasn't provided.",
          },
          {
            role: "user",
            content: `${context}\nWrite the advert copy.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return templateCopy(args);

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    const lines = (content ?? "")
      .split("\n")
      .map((l) => l.trim().replace(/^[-*\d.)\s]+/, ""))
      .filter(Boolean);
    if (lines.length < 4) return templateCopy(args);
    return {
      headlines: lines.slice(0, 3).map((h) => h.slice(0, 80)),
      blurb: lines.slice(3).join(" ").slice(0, 280),
    };
  } catch {
    return templateCopy(args);
  }
}
