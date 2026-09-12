import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";
import { sanitizeReason } from "@/lib/server/ai/recommendResults";
import type { ShoppingListSnapshot } from "@/types/search";

// Shopping Lists (2026-09-12) — the market-researched draft shown BEFORE the
// buyer has agreed to spend anything finding real listings (see
// ShoppingListSnapshot's own comment in types/search.ts). Same division of
// labor as every other builder in this directory: the MODEL names the
// items, their categories, and reasons about realistic Nigerian pricing;
// CODE does every sum, every count, and every validation — never the
// model's own arithmetic.
//
// Deliberately estimate-only, not grounded by a live searchProductsCore/
// Serper call per item at THIS stage — running up to a few dozen real
// searches before the buyer has even seen the list, let alone agreed to
// pay for finding real options, would multiply cost and latency for a
// draft that might get thrown away or heavily edited by the buyer's own
// budget. The real, verified search happens once per item in the
// background job that "Get these items" starts. What stops this being a
// hallucination presented as fact is labeling, not grounding: every price
// here renders on the card captioned as an ESTIMATE, never a quote.

const SNAPSHOT_TIMEOUT_MS = 12_000;

// A "shopping list" that named one or two things would just be an ordinary
// search wearing a table — this cap keeps the LLM from padding a small,
// well-defined need (e.g. "kitchen essentials") out to feel more
// list-shaped than it is, without capping a genuinely large project.
const MAX_ITEMS = 40;

function buildShoppingListTool() {
  return tool({
    description:
      "Call this exactly once with the Nigerian-market shopping list for the buyer's project.",
    inputSchema: z.object({
      budgetNaira: z
        .number()
        .nullable()
        .describe(
          "The buyer's own stated budget, in naira, exactly as they gave it — null when no figure was mentioned. Never invented, never a guess at what would be 'reasonable'.",
        ),
      items: z
        .array(
          z.object({
            label: z
              .string()
              .describe(
                "A short, specific item name, e.g. '55-inch Smart TV', 'Queen mattress', 'Dining table and 4 chairs' — never a vague category on its own ('electronics', 'furniture').",
              ),
            category: z
              .string()
              .describe(
                "A short room/grouping label for this item — 'Living Room' (or 'Sitting Room'/'Parlour', whichever reads naturally for this project), 'Bedroom', 'Kitchen', 'School Supplies', 'Power & Water' (for an inverter/generator/water-tank line, when the project genuinely needs one) — used to group the table and count categories.",
              ),
            quantity: z
              .number()
              .int()
              .min(1)
              .describe(
                "How many of this item the project needs. 1 unless the request implies more (e.g. 'three children' needing school bags).",
              ),
            estimatedPriceNaira: z
              .number()
              .describe(
                "A single realistic Nigerian-market price for ONE unit of this exact item, in naira — your best real estimate, not the midpoint of the range below.",
              ),
            fairPriceMinNaira: z
              .number()
              .describe(
                "The low end of a fair Nigerian-market price range for this exact spec/quality level — grounded in what this kind of item actually costs, never a fixed percentage below estimatedPriceNaira.",
              ),
            fairPriceMaxNaira: z
              .number()
              .describe(
                "The high end of that same fair range — same grounding, never a fixed percentage above estimatedPriceNaira.",
              ),
            notes: z
              .string()
              .nullable()
              .describe(
                "One short, useful spec/quality pointer if one genuinely helps ('4K recommended', '6x6 size', 'double-door') — null when the item needs none. Never marketing language.",
              ),
          }),
        )
        .describe(
          `The essential items this project actually needs — real, specific, and no more than ${MAX_ITEMS}. A short, well-considered list beats a padded one: name what the project genuinely requires, not every conceivable accessory.`,
        ),
    }),
    execute: async (v) => v,
  });
}

// Nigerian-context grounding (2026-09-12) — a generic model defaults to
// whatever setting dominates its training data (mostly US/UK), which
// quietly produces lists that don't fit how Nigerians actually live and
// shop: central heating on a "furnish my apartment" list (Nigeria doesn't
// have winters), no power-backup line on a list full of appliances (the
// grid is unreliable enough that an inverter/generator is a real,
// commonly-needed purchase, not an accessory), a wedding list missing
// aso-ebi and a canopy, a school-supplies list missing a uniform. This
// isn't fixable by a classifier the way isComparison/wantsShoppingList
// are — there's no boolean to check, it's a judgment call across an
// open-ended range of projects — so the lever here is a concrete,
// example-driven prompt rather than a generic "be Nigerian" instruction,
// which is too vague for a model to act on reliably (this hasn't been
// measured against real output the way credits.ts's own ratios are
// flagged as unmeasured estimates — treat it the same way: a reasoned
// starting point, worth revisiting once real generated lists can be
// reviewed against it).
const NIGERIAN_CONTEXT_NOTES = [
  "INFRASTRUCTURE REALITIES that a generic list misses: Nigeria's public power supply is unreliable enough that a project involving appliances, a home, an office, or a shop commonly needs its own power-backup line (an inverter+battery system, a generator, or solar) — include one when the project genuinely calls for it, never as a reflex on every list. The same goes for water: a full apartment/house setup often needs its own water storage (an overhead tank, a borehole pump) rather than assuming reliable mains supply.",
  "CLIMATE: Nigeria is tropical — never include heating systems, furnaces, winter/snow clothing, or anything assuming a cold season. Fans and air conditioning are the real cooling equivalents where a project calls for climate control.",
  "EVENTS carry real Nigerian conventions, not generic Western ones — a wedding commonly needs aso-ebi (matching attire for family/guests), a canopy and chairs (rented, for outdoor receptions), a caterer, an MC, a DJ, and often a generator for the venue; a naming ceremony or other family event has its own similar list. Don't reach for a generic Western wedding-registry list instead.",
  "SCHOOL SUPPLIES for Nigerian children commonly means a uniform, sandals/school shoes, a school bag, textbooks/exercise books for the actual curriculum, not a US-style backpack-and-binder list.",
  "OPENING A SHOP/RESTAURANT/OFFICE commonly needs a POS machine (card payment is standard even for small retail), shelving/display units, a generator or inverter, and basic security (burglary-proofing, a gate/lock) — these are as real and as commonly needed as the stock/furniture itself.",
  "QUALITY TIERS are real and worth reflecting: Nigerian retail commonly spans brand-new, 'Nigerian-used'/Tokunbo (used import), and locally-made goods at very different price points for the same item — let the buyer's stated budget (if any) genuinely steer which tier you're pricing toward, rather than defaulting to premium/imported-new for everything.",
].join(" ");

function systemPromptFor(goalText: string, location?: string): string {
  return [
    `A buyer on Velte, a Nigerian shopping assistant, described a whole PROJECT rather than a single item: "${goalText}"${location ? ` (buyer is in ${location})` : ""}.`,
    "",
    "Think like someone who actually knows the Nigerian retail market — Naira prices, not US/global ones, and real price levels for what is realistically available here, not aspirational imported pricing unless the request specifically calls for that.",
    "",
    NIGERIAN_CONTEXT_NOTES,
    "",
    "List only the genuine essentials for this exact project — a short, well-reasoned list, not an exhaustive catalogue of every accessory that could conceivably relate to it. Apply the notes above only where the specific project genuinely calls for them (a single-item repair or a project that already has power/water sorted doesn't need an inverter line invented for it) — never pad the list just to look thorough. If the buyer named a budget, let it shape which items and which quality tier you reach for, without inventing a budget they never gave.",
    "",
    "For each item give ONE realistic estimated price AND a fair price range grounded in real quality/spec differences for that exact kind of item — never a fixed percentage spread pretending to be market reasoning.",
  ].join("\n");
}

/**
 * Builds the market-researched shopping-list draft. Never throws; returns
 * null on any failure, empty item list, or timeout — route.ts falls back to
 * a plain reply exactly as a failed pickRecommendation call already does
 * elsewhere in this pipeline.
 */
export async function buildShoppingListSnapshot(params: {
  goalText: string;
  location?: string;
}): Promise<ShoppingListSnapshot | null> {
  const goalText = params.goalText.trim();
  if (!goalText) return null;

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: systemPromptFor(goalText, params.location),
          messages: [{ role: "user", content: goalText }],
          tools: { buildShoppingList: buildShoppingListTool() },
          toolChoice: "required",
        },
        ["openai", "groq"],
        "shopping-list-snapshot",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("shopping list generation timed out")),
          SNAPSHOT_TIMEOUT_MS,
        ),
      ),
    ]);

    const verdict = result.toolResults.find(
      (r) => r.toolName === "buildShoppingList",
    )?.output as
      | {
          budgetNaira: number | null;
          items: {
            label: string;
            category: string;
            quantity: number;
            estimatedPriceNaira: number;
            fairPriceMinNaira: number;
            fairPriceMaxNaira: number;
            notes: string | null;
          }[];
        }
      | undefined;
    if (!verdict) return null;

    // Every numeric field is a model claim — sanitize and validate rather
    // than trust. A malformed item (no real label, a non-finite/negative
    // price) is dropped rather than shown with a garbage number; the list
    // still ships with whatever items survive.
    const items = verdict.items
      .slice(0, MAX_ITEMS)
      .map((item) => {
        const label = sanitizeReason(item.label, 80);
        const category = sanitizeReason(item.category, 40) || "General";
        const quantity =
          Number.isFinite(item.quantity) && item.quantity >= 1
            ? Math.round(item.quantity)
            : 1;
        const estimatedPriceNaira = Math.round(
          Math.max(0, Number(item.estimatedPriceNaira) || 0),
        );
        let fairPriceMinNaira = Math.round(
          Math.max(0, Number(item.fairPriceMinNaira) || 0),
        );
        let fairPriceMaxNaira = Math.round(
          Math.max(0, Number(item.fairPriceMaxNaira) || 0),
        );
        // The model can and occasionally does return these reversed — code
        // corrects the ORDER rather than the values, never inventing a
        // number it didn't provide.
        if (fairPriceMaxNaira < fairPriceMinNaira) {
          [fairPriceMinNaira, fairPriceMaxNaira] = [
            fairPriceMaxNaira,
            fairPriceMinNaira,
          ];
        }
        const notes = item.notes ? sanitizeReason(item.notes, 120) : null;
        return label && estimatedPriceNaira > 0
          ? {
              label,
              category,
              quantity,
              estimatedPriceNaira,
              fairPriceMinNaira,
              fairPriceMaxNaira,
              notes,
            }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (!items.length) return null;

    const totalEstimateNaira = items.reduce(
      (sum, item) => sum + item.estimatedPriceNaira * item.quantity,
      0,
    );
    const categoryCount = new Set(items.map((i) => i.category)).size;
    const budgetNaira =
      Number.isFinite(verdict.budgetNaira) && (verdict.budgetNaira ?? 0) > 0
        ? Math.round(verdict.budgetNaira as number)
        : null;

    return {
      goalText,
      items,
      budgetNaira,
      totalEstimateNaira,
      categoryCount,
      jobId: null,
    };
  } catch (err) {
    console.error(
      "[shopping-list] snapshot generation failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
