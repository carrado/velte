// Same Groq call as generateBusinessDescription.ts, but for a single
// product/service listing rather than the whole store — kept as a separate
// file since the prompt and fallback template are shape-specific (a listing
// has a kind, category, and filled-in attributes to draw on; a business
// doesn't). Reuses the same model/endpoint choice for consistency.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface GenerateArgs {
  name: string;
  kind: "product" | "service";
  categoryLabel?: string;
  sectorLabel?: string;
  attributes: { name: string; value: string }[];
}

function templateDescription({
  name,
  kind,
  categoryLabel,
  attributes,
}: GenerateArgs): string {
  const details = attributes.map((a) => `${a.name.toLowerCase()}: ${a.value}`);
  const detailText = details.length ? ` (${details.join(", ")})` : "";
  if (kind === "service") {
    return `${name}${detailText}. Reach out to discuss your exact needs and get a quote.`;
  }
  const category = categoryLabel ? ` ${categoryLabel.toLowerCase()}` : "";
  return `${name} — a quality${category} item${detailText}. Message us for more photos or details.`;
}

/**
 * Drafts a listing description from what the vendor has already entered
 * (name, category/sector, and whatever attributes they've filled in) — the
 * more attributes already added before generating, the richer the draft,
 * since this is exactly the text that later gets embedded for AI matching
 * (see attribute-presets.ts's own comment). Never invents specifics beyond
 * what was passed in; same fallback-on-failure shape as
 * generateBusinessDescription.
 */
export async function generateListingDescription(
  args: GenerateArgs,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return templateDescription(args);

  const detailLines = args.attributes
    .map((a) => `- ${a.name}: ${a.value}`)
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
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You write short product/service listing descriptions for vendors on a Nigerian marketplace app. 2-4 plain-language sentences, no fluff, no hashtags, no emoji, no markdown. Only state facts given to you — never invent a brand, size, price, material, or other specific detail that wasn't provided.",
          },
          {
            role: "user",
            content: [
              `${args.kind === "service" ? "Service" : "Product"} name: ${args.name}`,
              args.categoryLabel ? `Category: ${args.categoryLabel}` : null,
              args.sectorLabel ? `Business sector: ${args.sectorLabel}` : null,
              detailLines ? `Known details:\n${detailLines}` : null,
              `Write a description that helps buyers understand what this ${
                args.kind === "service" ? "service includes" : "product is"
              } and why they'd want it.`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return templateDescription(args);

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    return content?.trim() || templateDescription(args);
  } catch {
    return templateDescription(args);
  }
}
