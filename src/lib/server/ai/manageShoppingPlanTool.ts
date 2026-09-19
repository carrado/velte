import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";

// Shopping Plan — conversational management (Phase 3, 2026-09-19, spec
// §23): "increase my budget to ₦250k", "remove the expensive school bag",
// "focus on finding the shoes first", "pause this plan". A dedicated call,
// same reasoning as bareQueryGate/comparisonPickTool's own: this only ever
// runs when route.ts has already confirmed the buyer has at least one open
// plan to manage, so it isn't wasted on the vast majority of ordinary turns
// that have nothing to check against.
//
// The model TRANSLATES the buyer's own words into one of a fixed set of
// actions against a REAL plan/item id from the list it's given — it never
// invents an id, and CODE is what actually writes the change
// (shoppingPlan.controller.js's own PATCH endpoints), never this call
// itself. Same "the model translates, the data decides" rule the rest of
// this pipeline runs on.

const TIMEOUT_MS = 8000;

export interface ManageablePlanItemContext {
  id: string;
  label: string;
  priority: number;
}

export interface ManageablePlanContext {
  id: string;
  goalText: string;
  budgetNaira: number | null;
  deadlineDate: string; // ISO date
  status: "active" | "monitoring" | "paused";
  items: ManageablePlanItemContext[];
}

/** How the general scope classifier (classifyScopeTool, already run earlier
 *  this same turn) judged this message relative to the ongoing chat — "new"
 *  meaning it reads as a different, unrelated need, not a continuation of
 *  anything. Passed in as CONTEXT, not a hard gate: a message can be the
 *  first turn of a brand-new conversation and still legitimately manage a
 *  plan started in an earlier one (found live: nothing about
 *  classifyScopeTool's own "new" judgment knows a plan exists at all), so
 *  this only ever narrows the model's own read, never overrides it. */
export type RequestRelationHint = "new" | "refinement" | "answer";

export type ManageShoppingPlanAction =
  | "update_budget"
  | "update_deadline"
  | "remove_item"
  | "add_item"
  | "set_priority"
  | "expedite"
  | "pause"
  | "resume"
  | "cancel"
  | "none";

export interface ManageShoppingPlanResult {
  applies: boolean;
  planId: string | null;
  action: ManageShoppingPlanAction;
  budgetNaira: number | null;
  deadlineDate: string | null;
  itemId: string | null;
  newItemLabel: string | null;
  confirmationReply: string;
}

function manageTool() {
  return tool({
    description:
      "Call this exactly once to decide whether the buyer's message is about managing one of their existing Shopping Plans, and if so, exactly what to do.",
    inputSchema: z.object({
      applies: z
        .boolean()
        .describe(
          "true whenever this message is meaningfully ABOUT one of the buyer's EXISTING Shopping Plans listed below — adjusting, pausing, resuming, cancelling, acting on it, or simply acknowledging/closing the loop on one just discussed or just created ('I think the list is fine', 'sounds good', 'perfect thanks') — even if exactly what to do or which plan isn't fully clear yet (set action to 'none' and use confirmationReply to ask for the missing detail, or to just acknowledge, in that case). false ONLY when this message isn't about an existing plan at all — a new, unrelated shopping/search request, even one that happens to mention a similar item. When genuinely unsure whether it's about a plan at all, prefer false — a missed management command just falls through to an ordinary search reply, while a false positive on an unrelated message risks changing a real plan by mistake.",
        ),
      planId: z
        .string()
        .nullable()
        .describe(
          "The exact `id` of the plan this message is about, copied from the list given — never invented. If there's more than one open plan and it's genuinely unclear which one is meant, leave this null, set action to 'none', and have confirmationReply ask which plan they mean. Always resolvable (and required) when there's only one plan in the list.",
        ),
      action: z
        .enum([
          "update_budget",
          "update_deadline",
          "remove_item",
          "add_item",
          "set_priority",
          "expedite",
          "pause",
          "resume",
          "cancel",
          "none",
        ])
        .describe(
          "update_budget: a new budget figure was given. update_deadline: a new date/timeframe was given. remove_item: buyer no longer wants a specific listed item. add_item: buyer wants to add something new to the plan. set_priority: buyer wants a specific item searched/reported on first ('focus on the shoes first'). expedite: buyer wants Velte to search harder/sooner right now ('find cheaper alternatives', 'check again now') for one item (itemId set) or the whole plan (itemId null). pause/resume/cancel: buyer wants to stop/restart/end background monitoring. none: applies is true but there's nothing concrete to act on — covers BOTH a genuine ambiguity (which plan/item is meant, or a question about the plan) AND a plain acknowledgement/closing remark about a plan just discussed or just created ('I think the list is fine', 'sounds good', 'that works', 'perfect thanks') — confirmationReply should answer/ask for what's missing in the ambiguous case, or just warmly acknowledge and reaffirm Velte is on it in the closing-remark case (never re-ask something already settled, like the deadline or budget, on a plan that already has one).",
        ),
      budgetNaira: z
        .number()
        .nullable()
        .describe(
          "The new budget in naira, ONLY for action update_budget — the buyer's own figure, never estimated. null otherwise.",
        ),
      deadlineDate: z
        .string()
        .nullable()
        .describe(
          `The new deadline resolved to a concrete ISO date (YYYY-MM-DD), ONLY for action update_deadline, given today's date is ${new Date().toISOString().slice(0, 10)}. Resolve relative phrasing yourself ('three days earlier' means three days before the plan's OWN current deadline given below, 'next Friday' is an absolute date). null otherwise.`,
        ),
      itemId: z
        .string()
        .nullable()
        .describe(
          "The exact `id` of the item this message is about, copied from the chosen plan's own item list — matched by comparing the buyer's description (e.g. 'the school bag', 'the expensive one') against each item's label. Required for remove_item and set_priority; optional for expedite (null means the whole plan). null otherwise, or when no listed item plausibly matches (in which case action should be 'none' and confirmationReply should say so).",
        ),
      newItemLabel: z
        .string()
        .nullable()
        .describe(
          "A short, specific item name, ONLY for action add_item — what the buyer wants added, in their own words. null otherwise.",
        ),
      confirmationReply: z
        .string()
        .describe(
          'One short, natural, specific sentence confirming what was just done (or, if applies is false or action is \'none\', explaining what\'s missing/ambiguous) — e.g. "Done — I\'ve updated your budget to ₦250,000.", "Got it, I\'ve removed the school bag from your plan.", "Your plan is paused — just say the word when you want me to pick it back up." Never generic filler.',
        ),
    }),
    execute: async (v) => v,
  });
}

function systemPromptFor(
  plans: ManageablePlanContext[],
  requestRelationHint: RequestRelationHint,
): string {
  const plansJson = JSON.stringify(
    plans.map((p) => ({
      id: p.id,
      goal: p.goalText,
      budgetNaira: p.budgetNaira,
      deadlineDate: p.deadlineDate,
      status: p.status,
      items: p.items.map((i) => ({
        id: i.id,
        label: i.label,
        priority: i.priority,
      })),
    })),
    null,
    2,
  );

  return [
    "A buyer on Velte, a Nigerian shopping assistant, has one or more active Shopping Plans — persistent, deadline-driven shopping missions Velte keeps monitoring in the background. Decide whether their message is about managing one of these, and if so, exactly what to do.",
    "",
    "The buyer's open plans (their own real ids — never invent one):",
    plansJson,
    "",
    `Context: Velte's own general conversation classifier already read this message as "${requestRelationHint}" relative to the immediate chat ("new" = reads like an unrelated topic; "refinement"/"answer" = clearly continues something just said). Treat this as a strong signal, not a rule you must follow blindly — a message can be the very first thing said in a fresh conversation and still genuinely be about managing a plan from days ago (that classifier has no idea a plan exists), so "new" alone does not prove this is unrelated. But it should raise your bar: on "new", only set applies true when the message plausibly targets a SPECIFIC plan/item by name or a clear management verb (change/increase/remove/pause/add to/cancel), never merely because it mentions a similar kind of thing.`,
    "",
    "Hard rules:",
    "- Only ever act on a plan/item id that's actually in the list above.",
    '- A message that just describes a NEW, DIFFERENT shopping need is NOT management, even when it shares an item type or category with something already on a plan — a different room, project, occasion, or purpose is a different need. Concrete example: a plan exists for "chairs, a table and curtains for my new apartment" and the buyer now says "I want to furnish my office space" — that is furniture too, but a DIFFERENT space and a DIFFERENT request; applies must be false here, letting it start its own plan, never treated as if it were about the apartment plan.',
    "- Only read a message as management when it does one of: names/implies a SPECIFIC existing plan or item, or uses an explicit change verb (increase/reduce/remove/add/pause/resume/cancel/focus on) aimed at something already listed above. A message that merely resembles a listed plan's category, with no such signal, is not enough — leave applies false.",
    "- If there's more than one open plan and the message doesn't make clear which one, keep applies true, set action to 'none', and have confirmationReply ask which plan they mean — UNLESS only one plan could plausibly be meant (matching item names/goal), in which case resolve it.",
    "- Never guess a budget/deadline/item the buyer didn't actually state.",
    "- When genuinely torn between 'this is a fresh request' and 'this manages an existing plan', prefer false — a missed management command just falls through to an ordinary search/new-plan flow, while a false positive silently blocks a real new request behind an unrelated plan's own reply, which is the worse failure.",
  ].join("\n");
}

/**
 * Decides whether a message manages an existing plan, and what to do.
 * Never throws — returns null on any failure/timeout, and route.ts's own
 * caller treats null exactly like `applies: false` (falls through to an
 * ordinary search turn, the safe direction per this whole pipeline's own
 * convention).
 */
export async function classifyShoppingPlanManagement(params: {
  message: string;
  plans: ManageablePlanContext[];
  requestRelationHint: RequestRelationHint;
}): Promise<ManageShoppingPlanResult | null> {
  if (!params.message.trim() || !params.plans.length) return null;

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: systemPromptFor(params.plans, params.requestRelationHint),
          messages: [{ role: "user", content: params.message }],
          tools: { manageShoppingPlan: manageTool() },
          toolChoice: "required",
        },
        ["openai", "groq"],
        "manage-shopping-plan",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("manage-shopping-plan timed out")),
          TIMEOUT_MS,
        ),
      ),
    ]);

    const output = result.toolResults.find(
      (r) => r.toolName === "manageShoppingPlan",
    )?.output as ManageShoppingPlanResult | undefined;
    if (!output) return null;
    return output;
  } catch (err) {
    console.error(
      "[shopping-plan] management classification failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
