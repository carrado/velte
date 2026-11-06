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

const SYSTEM_PROMPT = `You are an expert commercial advertising copywriter and direct-response sales specialist for small businesses and vendors on the Velte commerce platform in Nigeria.

Your goal is to craft high-converting, scroll-stopping advert headlines and a persuasive advert description based on the vendor's brief. The copy must directly help the vendor attract paying customers and generate real sales and enquiries.

GUIDELINES:
1. ACCURATELY MIRROR THE VENDOR'S ADVERT:
   - Carefully extract what the vendor is advertising (product/service, special discounts, quality, taste, durability, location, delivery speed, or specific benefits).
   - Mirror their exact intent, offering, and value proposition so the advert resonates directly with interested buyers.
   - Never invent fictional specs, non-existent guarantees, or pricing that contradicts the brief.

2. THREE DISTINCT, HIGH-CONVERTING HEADLINES (STRICTLY MAX 60 CHARACTERS EACH):
   - Every headline must be punchy, catchy, and professional (NO quotes, NO emojis, NO hashtags, NO ALL-CAPS screaming, NO numbering prefixes).
   - Headline 1 (Direct Benefit / Transformation): Highlight the immediate outcome, flavor, elegance, or result (e.g., "Step Out in Style with Pure Italian Leather", "Crispy, Spicy Wings Delivered Hot to Your Door").
   - Headline 2 (Urgency / Action / Offer Hook): Drive immediate action, highlight availability, freshness, or a limited deal (e.g., "Upgrade Your Wardrobe Today — Limited Stock", "Get 20% Off Fresh Delicacies This Weekend").
   - Headline 3 (Quality / Prestige / Social Appeal): Tap into pride, convenience, or sensory appeal (e.g., "The Authentic Taste You've Been Craving", "Premium Durability Crafted to Last for Years").

3. ONE PERSUASIVE ADVERT BLURB (STRICTLY 100 TO 195 CHARACTERS, NEVER EXCEED 200 CHARACTERS):
   - A compelling, concise micro-pitch that highlights why customers should choose this product/service.
   - Conclude with an active, high-converting call to action (e.g., "Tap to order now on Velte for fast delivery!", "Message us on Velte to claim yours before it sells out!").

4. OUTPUT FORMAT:
   Return valid JSON with this exact schema:
   {
     "headlines": [
       "First high-converting headline",
       "Second high-converting headline",
       "Third high-converting headline"
     ],
     "blurb": "Persuasive advert description with a clear call to action."
   }
   Output ONLY the raw JSON object. No markdown fences.`;

function cleanLine(str: string): string {
  return str
    .trim()
    .replace(/^["'•\-\s]*\d+[\.\)\-:\s]+\s*/, "")
    .replace(/^["'•\-\s]+|["'\s]+$/g, "")
    .trim();
}

function parseCopyResponse(text: string): AdvertCopy | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (
      Array.isArray(parsed?.headlines) &&
      parsed.headlines.length > 0 &&
      typeof parsed?.blurb === "string"
    ) {
      const headlines = parsed.headlines
        .map((h: unknown) => (typeof h === "string" ? cleanLine(h) : ""))
        .filter(Boolean)
        .slice(0, 3)
        .map((h: string) => h.slice(0, 60));

      const blurb = parsed.blurb
        .trim()
        .replace(/^["']|["']$/g, "")
        .slice(0, 200);

      if (headlines.length >= 2 && blurb.length > 0) {
        return { headlines, blurb };
      }
    }
  } catch {
    /* fallback to line parsing */
  }

  // Regex or line fallback if JSON parse failed
  const lines = text
    .split("\n")
    .map((l) => cleanLine(l))
    .filter((l) => l.length > 0 && !/^(\{|}|\"headlines\"|\"blurb\")/i.test(l));

  if (lines.length >= 4) {
    return {
      headlines: lines.slice(0, 3).map((h) => h.slice(0, 60)),
      blurb: lines.slice(3).join(" ").slice(0, 200),
    };
  }

  return null;
}

function templateCopy(args: AdvertCopyArgs): AdvertCopy {
  const store = args.storeName?.trim() || "Our Store";
  const rawWhat =
    args.productName?.trim() ||
    args.seedHeadline?.trim() ||
    args.brief?.trim() ||
    "Quality Items";
  const what = rawWhat.slice(0, 32);

  return {
    headlines: [
      `Get the Best ${what} — Available at ${store}`.slice(0, 60),
      `Top Quality ${what} You Can Trust`.slice(0, 60),
      `Upgrade Today with ${what} from ${store}`.slice(0, 60),
    ],
    blurb:
      `Looking for premium ${what}? ${store} has you covered with top-tier quality. Order directly on Velte for fast delivery!`.slice(
        0,
        200,
      ),
  };
}

/**
 * Drafts high-converting, sales-oriented advert copy tailored to what the vendor
 * entered in the composer. Accurately mirrors their offer, benefits, and call to action.
 */
export async function generateAdvertCopy(
  args: AdvertCopyArgs,
): Promise<AdvertCopy> {
  const contextParts = [
    `Store name: ${args.storeName}`,
    args.productName ? `Advertised item: ${args.productName}` : null,
    args.seedHeadline ? `Vendor draft headline: ${args.seedHeadline}` : null,
    args.brief?.trim()
      ? `Advert description / brief: ${args.brief.trim()}`
      : null,
  ].filter(Boolean);

  const userPrompt = `${contextParts.join("\n")}\n\nCraft 3 sales-generating headlines and 1 persuasive advert blurb that accurately reflect this offer.`;

  // 1. Try OpenAI gpt-4o-mini first
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 400,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: AbortSignal.timeout(12_000),
      });

      if (res.ok) {
        const data = await res.json();
        const content: string | undefined =
          data?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = parseCopyResponse(content);
          if (parsed) return parsed;
        }
      }
    } catch (err) {
      console.warn(
        "[generateAdvertCopy] OpenAI call failed, falling back to Groq:",
        err,
      );
    }
  }

  // 2. Fast Groq fallback (qwen/qwen3.8-27b)
  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey) {
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
            temperature: 0.7,
            max_tokens: 400,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (res.ok) {
        const data = await res.json();
        const content: string | undefined =
          data?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = parseCopyResponse(content);
          if (parsed) return parsed;
        }
      }
    } catch (err) {
      console.warn("[generateAdvertCopy] Groq call failed:", err);
    }
  }

  return templateCopy(args);
}
