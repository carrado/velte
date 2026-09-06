import { tool } from "ai";
import { z } from "zod";
import type { ModelMessage } from "ai";

import { callLLM } from "@/lib/server/ai/router";
import type { ShoppingPlanDraft } from "@/types/search";

// Shopping Plan's checklist generation (2026-09-06) — turns a buyer's goal
// ("moving into a new apartment, ₦2m, need the essentials") into a
// structured, budgeted checklist BEFORE anything is searched. The product
// requirement is explicit: don't assume what "essentials" means and don't
// spend a single search or credit until the buyer has seen and confirmed
// the breakdown.
//
// The model's only two jobs are (1) reading the goal into real categories
// and items, in the buyer's own domain, and (2) judging each item's
// relative WEIGHT — how much of the budget it deserves next to the others.
// It never touches the actual naira split: that arithmetic is code's job
// (see resolveShoppingPlanDraft below), the same "model translates, code
// decides" division comparisonTemplate.ts and every other builder in this
// codebase already runs on. A model asked to also do the division either
// invents numbers that don't sum to the stated total, or rounds confidently
// wrong — neither is acceptable when the number on screen is a promise
// about the buyer's own money.

const MAX_CATEGORIES = 12;
const MAX_ITEMS_PER_CATEGORY = 8;
const MAX_ITEMS_TOTAL = 40;

function buildPlanTool() {
  return tool({
    description:
      "Call this exactly once with the shopping checklist read from the buyer's goal.",
    inputSchema: z.object({
      // Null, not a guess, when the buyer didn't name a figure — a shopping
      // plan with an invented budget is worse than one that asks first.
      totalBudgetNaira: z
        .number()
        .nullable()
        .describe(
          "The buyer's own stated total budget, in naira as a plain number ('₦2m' -> 2000000, '800k' -> 800000). null if they did not name one — never estimate or assume a figure.",
        ),
      location: z
        .string()
        .nullable()
        .describe(
          "The place name the buyer's own message named, if any (e.g. 'Lagos', 'Lekki, Lagos'). null if they didn't say — never guess.",
        ),
      categories: z
        .array(
          z.object({
            label: z
              .string()
              .describe(
                "A short, natural category name in the buyer's own domain — 'Bedroom', 'Kitchen', 'Home Office', not a generic label unrelated to what they actually asked for.",
              ),
            items: z
              .array(
                z.object({
                  label: z
                    .string()
                    .describe(
                      "One concrete, searchable thing to buy — 'Bed', 'Mattress', 'Refrigerator'. Specific enough to search for, not a vague bucket like 'furniture'.",
                    ),
                  weight: z
                    .number()
                    .min(1)
                    .max(10)
                    .describe(
                      "This item's relative share of the budget next to every other item in the whole plan, 1-10 — a refrigerator or sofa should weigh far more than a bedsheet or kitchen utensil set. Judge by realistic relative COST, not importance.",
                    ),
                }),
              )
              .describe(
                "The concrete things to buy for this category. Only what the buyer's own goal and priority actually calls for — 'essentials only' means the small/optional items are left out, not included at a low weight.",
              ),
          }),
        )
        .describe(
          "The full checklist, grouped into natural categories. Read the buyer's own priority word ('essentials', 'everything', 'basic') and size the list accordingly — essentials is a short list, not a padded one.",
        ),
    }),
    execute: async (v) => v,
  });
}

function buildSystemPrompt(): string {
  return [
    "You are Velte's shopping-plan assistant, for a Nigerian buyer describing a GOAL rather than a single product — furnishing a home, setting up an office, stocking a kitchen, and similar multi-item needs.",
    "Your job is ONLY to read their goal into a real, natural checklist of categories and concrete items, and judge each item's relative cost weight. You never decide prices, never search for anything, and never split the actual naira budget — that happens afterward, in code.",
    "",
    "Read their PRIORITY word literally: 'essentials' or 'the basics' means a short, genuinely essential list — do not pad it with nice-to-haves. 'Everything' or no qualifier at all means a fuller, realistic list for the goal they named. When in doubt, prefer the shorter list — an item that's missing can be added; a list bloated with things nobody asked for reads as not having listened.",
    "",
    "Categories and items must come from the buyer's own domain. A furniture/apartment goal gets rooms (Bedroom, Living Room, Kitchen); an office goal gets office categories (Desking, Electronics, Storage); never force apartment-shaped categories onto a different kind of goal.",
    "",
    "Extract the budget and location from their own words only — null for either when they didn't say, never a guess or an estimate.",
    "",
    "Call the tool exactly once, with no other text.",
  ].join("\n");
}

const TIMEOUT_MS = 12000;

interface RawWeightedItem {
  category: string;
  label: string;
  weight: number;
}

/**
 * Deterministic naira split, from the model's own relative weights — the
 * "code decides" half of the split described above. Every item gets
 * `round(total * weight / sumOfWeights)`; leftover kobo from rounding lands
 * on the single most expensive item rather than being silently dropped, so
 * category totals always sum to EXACTLY the buyer's stated budget.
 */
function allocateBudget(
  items: RawWeightedItem[],
  totalBudgetKobo: number,
): { category: string; label: string; targetBudgetKobo: number }[] {
  const sumWeights = items.reduce((s, it) => s + it.weight, 0);
  if (!items.length || sumWeights <= 0) return [];

  const allocated = items.map((it) => ({
    category: it.category,
    label: it.label,
    targetBudgetKobo: Math.round((totalBudgetKobo * it.weight) / sumWeights),
  }));

  const allocatedSum = allocated.reduce((s, it) => s + it.targetBudgetKobo, 0);
  const remainder = totalBudgetKobo - allocatedSum;
  if (remainder !== 0) {
    const biggest = allocated.reduce((max, it) =>
      it.targetBudgetKobo > max.targetBudgetKobo ? it : max,
    );
    biggest.targetBudgetKobo += remainder;
  }
  return allocated;
}

/**
 * Runs the checklist call and resolves it into a ready-to-render
 * ShoppingPlanDraft — or null when the buyer named no usable budget (the
 * caller's job at that point is to ask for one, never to assume). Never
 * throws; a model/provider failure surfaces as null the same way a missing
 * budget does, since neither leaves anything honest to show.
 */
export async function buildShoppingPlanDraft(params: {
  goalText: string;
  history?: ModelMessage[];
}): Promise<ShoppingPlanDraft | null> {
  const messages: ModelMessage[] = [
    ...(params.history ?? []),
    { role: "user", content: params.goalText },
  ];

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: buildSystemPrompt(),
          messages,
          tools: { buildPlan: buildPlanTool() },
          toolChoice: "required",
        },
        ["openai", "groq"],
        "shopping-plan-draft",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("shopping plan draft timed out")),
          TIMEOUT_MS,
        ),
      ),
    ]);

    const output = result.toolResults.find((r) => r.toolName === "buildPlan")
      ?.output as
      | {
          totalBudgetNaira: number | null;
          location: string | null;
          categories: {
            label: string;
            items: { label: string; weight: number }[];
          }[];
        }
      | undefined;
    if (!output) return null;

    // No figure named — the caller asks, rather than this function guessing
    // a total to divide. Never estimate from category count or anything
    // else; a wrong assumed budget is worse than one more question.
    if (
      typeof output.totalBudgetNaira !== "number" ||
      !Number.isFinite(output.totalBudgetNaira) ||
      output.totalBudgetNaira <= 0
    ) {
      return null;
    }
    const totalBudgetKobo = Math.round(output.totalBudgetNaira * 100);

    // Numbers the model returns are claims, not facts (same discipline as
    // every other tool call in this codebase) — capped and cleaned here
    // rather than trusted as returned.
    const categories = (output.categories ?? [])
      .filter((c) => typeof c?.label === "string" && c.label.trim())
      .slice(0, MAX_CATEGORIES);
    if (!categories.length) return null;

    const rawItems: RawWeightedItem[] = [];
    for (const c of categories) {
      const label = c.label.trim();
      const items = (c.items ?? [])
        .filter((it) => typeof it?.label === "string" && it.label.trim())
        .slice(0, MAX_ITEMS_PER_CATEGORY);
      for (const it of items) {
        if (rawItems.length >= MAX_ITEMS_TOTAL) break;
        const weight =
          typeof it.weight === "number" && Number.isFinite(it.weight)
            ? Math.min(10, Math.max(1, it.weight))
            : 1;
        rawItems.push({ category: label, label: it.label.trim(), weight });
      }
    }
    if (!rawItems.length) return null;

    const allocatedItems = allocateBudget(rawItems, totalBudgetKobo);
    const categoryTotals = new Map<string, number>();
    for (const it of allocatedItems) {
      categoryTotals.set(
        it.category,
        (categoryTotals.get(it.category) ?? 0) + it.targetBudgetKobo,
      );
    }

    return {
      goalText: params.goalText,
      totalBudgetKobo,
      location: output.location?.trim()
        ? { area: output.location.trim(), state: null, lat: null, lng: null }
        : null,
      categories: categories
        .map((c) => ({
          label: c.label.trim(),
          targetBudgetKobo: categoryTotals.get(c.label.trim()) ?? 0,
        }))
        .filter((c) => c.targetBudgetKobo > 0),
      items: allocatedItems,
    };
  } catch (err) {
    console.error("[shopping-plan] draft generation failed:", err);
    return null;
  }
}
