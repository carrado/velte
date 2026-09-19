import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";
import { sanitizeReason } from "@/lib/server/ai/recommendResults";

// Shopping Plan (2026-09-18, price estimation REMOVED 2026-09-19 per
// explicit product direction: "our model should not estimate any amount...
// budget is required, then we search, then match price of what we've
// gotten against the budget"). Generates the initial ITEM LIST only for a
// deadline-driven plan (2+ days away — the eligibility decision itself
// lives in route.ts, not here) — the MODEL names the items/categories it
// thinks the goal genuinely needs; it never prices any of them. The real,
// verified price comes only from a live searchProductsCore/Serper call per
// item, run by the background monitoring job (shoppingPlan.job.js) on its
// very first cycle after creation — see route.ts's own creation flow for
// why `nextMonitorAt` is set to fire almost immediately rather than a day
// out. Until that first cycle lands, an item simply shows as "searching",
// never a placeholder number standing in for a real price.
//
// Previously asked the model for a per-item estimatedPriceNaira/fairPrice
// range too (and a budgetNaira read off the buyer's own words) — both
// removed: the budget is now pinned down deterministically beforehand by
// route.ts's own required budget-ask gate (resolveBudgetNaira, never the
// model), and no deterministic fair-price engine exists anywhere in this
// codebase to justify a model-invented number standing in for one.

const SNAPSHOT_TIMEOUT_MS = 12_000;

// A single item with a long deadline is a real, valid Shopping Plan (the
// literal reading of the deadline rule — see the scoping plan's own note),
// so this cap exists only to stop a genuinely large project ballooning
// past what's reasonable to monitor daily, not to imply every plan is
// multi-item.
const MAX_ITEMS = 40;

export interface ShoppingPlanItemDraft {
  label: string;
  category: string;
  quantity: number;
  notes: string | null;
}

export interface ShoppingPlanDraft {
  items: ShoppingPlanItemDraft[];
}

function buildShoppingPlanTool() {
  return tool({
    description:
      "Call this exactly once with the Nigerian-market shopping list for the buyer's plan.",
    inputSchema: z.object({
      items: z
        .array(
          z.object({
            label: z
              .string()
              .describe(
                "A short, specific item name, e.g. '55-inch Smart TV', 'School shoes', 'PS5 console' — never a vague category on its own ('electronics', 'school supplies'). For a single-item plan this array has exactly one entry.",
              ),
            category: z
              .string()
              .describe(
                "A short grouping label — 'School Essentials', 'Hostel', 'Personal Care', 'Living Room', 'Electronics' — used to group items and count categories. If the buyer supplied an official requirements list (e.g. a school's own supply list, given as an image), use ITS OWN groupings/items as the source of truth rather than inventing additional ones.",
              ),
            quantity: z
              .number()
              .int()
              .min(1)
              .describe(
                "How many of this item are needed. 1 unless the request implies more.",
              ),
            notes: z
              .string()
              .nullable()
              .describe(
                "One short, useful spec/quality pointer if one genuinely helps ('4K recommended', 'size 8', 'double-door') — null when the item needs none. Never marketing language, and never a price or price-range guess of any kind — Velte only ever states a price it has actually found.",
              ),
          }),
        )
        .describe(
          `The essential items this plan actually needs — real, specific, and no more than ${MAX_ITEMS}. A short, well-considered list beats a padded one. Never include a price of any kind — that's decided later by a real search, never by you.`,
        ),
    }),
    execute: async (v) => v,
  });
}

// Same Nigerian-context grounding the deleted Shopping List feature used —
// a generic model defaults to US/UK assumptions (central heating, winter
// clothing, a Western school-supply list) that don't fit how Nigerians
// actually shop. Not fixable by a classifier field; a concrete,
// example-driven prompt is the lever, same as that feature's own header
// explained (unmeasured against real generated output — a reasoned
// starting point, worth revisiting once real plans can be reviewed).
const NIGERIAN_CONTEXT_NOTES = [
  "INFRASTRUCTURE REALITIES a generic list misses: Nigeria's public power supply is unreliable enough that a project involving appliances, a home, an office, or a shop commonly needs its own power-backup line (inverter+battery, generator, or solar) — include one only when the project genuinely calls for it. The same for water: a full apartment/house setup often needs its own storage (overhead tank, borehole pump) rather than assuming reliable mains supply.",
  "CLIMATE: Nigeria is tropical — never include heating systems, furnaces, or winter/snow clothing. Fans and air conditioning are the real cooling equivalents.",
  "SCHOOL SUPPLIES for Nigerian children commonly mean a uniform, sandals/school shoes, a school bag, hostel items (bedsheets, mosquito net, bucket, padlock) for boarding, and personal-care basics — not a US-style backpack-and-binder list.",
  "EVENTS carry real Nigerian conventions — aso-ebi (matching attire), a canopy and chairs (rented), a caterer, an MC, a DJ, often a generator for the venue.",
  "QUALITY TIERS are real: Nigerian retail spans brand-new, 'Nigerian-used'/Tokunbo (used import), and locally-made goods at very different price points — let the buyer's stated budget (if any) steer which tier you price toward.",
].join(" ");

function systemPromptFor(goalText: string, location?: string): string {
  return [
    `A buyer on Velte, a Nigerian shopping assistant, described a shopping need with a deadline far enough out that it's being tracked as a persistent Shopping Plan rather than an immediate search: "${goalText}"${location ? ` (buyer is in ${location})` : ""}.`,
    "",
    "Think like someone who actually knows the Nigerian retail market — Naira prices, not US/global ones.",
    "",
    NIGERIAN_CONTEXT_NOTES,
    "",
    "List only the genuine essentials — a short, well-reasoned list, not an exhaustive catalogue. A request naming ONE item is a valid plan with exactly one item; do not pad it into a multi-item list it never asked for. If the buyer named a budget, let it shape which items and quality tier you reach for, without inventing a budget they never gave.",
    "",
    "Never give a price, price range, or cost estimate for any item — not even a rough one. Velte only ever states a price once it has actually found one for sale; a number you invented here would be shown to the buyer as if it were real.",
  ].join("\n");
}

/**
 * Builds the initial item draft for a new Shopping Plan. Never throws;
 * returns null on any failure, empty item list, or timeout — the caller
 * falls back to a plain "couldn't put that plan together" reply, same
 * precedent as a failed pickRecommendation call elsewhere in this pipeline.
 */
export async function buildShoppingPlanSnapshot(params: {
  goalText: string;
  location?: string;
}): Promise<ShoppingPlanDraft | null> {
  const goalText = params.goalText.trim();
  if (!goalText) return null;

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: systemPromptFor(goalText, params.location),
          messages: [{ role: "user", content: goalText }],
          tools: { buildShoppingPlan: buildShoppingPlanTool() },
          toolChoice: "required",
        },
        ["openai", "groq"],
        "shopping-plan-snapshot",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("shopping plan generation timed out")),
          SNAPSHOT_TIMEOUT_MS,
        ),
      ),
    ]);

    const verdict = result.toolResults.find(
      (r) => r.toolName === "buildShoppingPlan",
    )?.output as
      | {
          items: {
            label: string;
            category: string;
            quantity: number;
            notes: string | null;
          }[];
        }
      | undefined;
    if (!verdict) return null;

    // Sanitize and validate rather than trust. A malformed item (no real
    // label) is dropped rather than shown with a garbage name.
    const items = verdict.items
      .slice(0, MAX_ITEMS)
      .map((item) => {
        const label = sanitizeReason(item.label, 80);
        const category = sanitizeReason(item.category, 40) || "General";
        const quantity =
          Number.isFinite(item.quantity) && item.quantity >= 1
            ? Math.round(item.quantity)
            : 1;
        const notes = item.notes ? sanitizeReason(item.notes, 120) : null;
        return label ? { label, category, quantity, notes } : null;
      })
      .filter((item): item is ShoppingPlanItemDraft => item !== null);

    if (!items.length) return null;

    return { items };
  } catch (err) {
    console.error(
      "[shopping-plan] snapshot generation failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
