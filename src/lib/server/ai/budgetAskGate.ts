import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";

// Shopping Plan — the budget ask (2026-09-19, explicit product direction:
// "our model should not estimate any amount... budget is required, then we
// search, then match price of what we've gotten against the budget"). Runs
// ONCE a request has already qualified for a Shopping Plan and its deadline
// is known, but no budget figure has been given — same two-gate shape
// deadlineAskGate.ts already uses for timing, one gate per fact this flow
// needs pinned down before a plan is created.
//
// UNLIKE the deadline ask, this one is NOT skippable — a plan with no
// budget has nothing for the real, searched prices to be checked against
// later (see shoppingPlan.job.js's own budgetStatusFor), so there is no
// "no rush"-style out here. The wording still has to read as one warm
// question, not a form field, same discipline every other dynamic gate in
// this directory follows.
//
// Fails toward a plain fixed question on any error/unusable output — same
// "must only ever ADD, never be the reason a buyer sees nothing" rule every
// other gate here follows.

const TIMEOUT_MS = 6000;
const PROVIDER_ORDER = ["openai", "groq"] as const;
const MAX_QUESTION_LENGTH = 400;

function gateTool() {
  return tool({
    description:
      "Call this exactly once to write the single natural-language message asking the buyer for their budget before this becomes a Shopping Plan.",
    inputSchema: z.object({
      question: z
        .string()
        .describe(
          "One short, warm, natural message, in your own words, asking what the buyer's budget is for this — ground it in their actual request rather than a bare 'what's your budget?'. Make clear a rough figure is fine ('around 300k', 'up to ₦2m'). Never say this is required because of tracking/plans/monitoring — just that it's what you'll compare real prices against once you find them. One or two sentences, never a list.",
        ),
    }),
    execute: async (v) => v,
  });
}

function systemPromptFor(
  goalText: string,
  deadlineDate: string,
  isRetry: boolean,
): string {
  return [
    `A buyer on Velte, a Nigerian shopping assistant, asked: "${goalText}" — needed by ${deadlineDate}. This is becoming a persistent Shopping Plan, but no budget figure has been given yet, and one is required before it can be created (Velte only ever compares REAL prices it finds against a real budget — it never invents its own price estimate).`,
    "",
    "Write the one short message asking for their budget — see the schema's own rule for exactly what it must and must not do.",
    "",
    "Ground it in what they actually asked for rather than a generic 'what's your budget?' — e.g. for furnishing an apartment, something like 'What's your budget for fully furnishing it?' reads far more naturally than a bare, disconnected question.",
    isRetry
      ? "This is a RETRY — their last reply didn't contain a figure Velte could read as a budget. Acknowledge that briefly and warmly (never blame them or call it an error) and ask again, e.g. hint a plain number works fine ('just the number, like 300000 or ₦300k')."
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function isUsableQuestion(s: string | undefined): s is string {
  if (!s) return false;
  const t = s.trim();
  return t.length > 0 && t.length <= MAX_QUESTION_LENGTH;
}

/**
 * The dynamic budget-ask question, written entirely by the model. Returns
 * null on ANY failure — the caller already has a working static fallback
 * (composeBudgetAskReply), so this can only ever ADD to that, never be the
 * reason a buyer sees nothing. Never throws.
 */
export async function buildBudgetAskGate(
  goalText: string,
  deadlineDate: string,
  isRetry = false,
): Promise<string | null> {
  const goal = goalText.trim();
  if (!goal) return null;

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: systemPromptFor(goal, deadlineDate, isRetry),
          messages: [{ role: "user", content: goal }],
          tools: { budgetAskGate: gateTool() },
          toolChoice: "required",
        },
        [...PROVIDER_ORDER],
        "budget-ask-gate",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("budget-ask gate timed out")),
          TIMEOUT_MS,
        ),
      ),
    ]);

    const output = result.toolResults.find(
      (r) => r.toolName === "budgetAskGate",
    )?.output as { question?: string } | undefined;

    if (!isUsableQuestion(output?.question)) return null;
    return output.question.trim();
  } catch (err) {
    console.error(
      "[search] budget-ask gate generation failed, falling back to the fixed question:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * The reply text a buyer actually reads. `dynamic` is null on a
 * failed/timed-out/unusable call, which collapses to a plain, static
 * fallback. Deliberately no "skip this" language anywhere — see this file's
 * own top comment on why budget is the one thing this flow can't proceed
 * without.
 */
export function composeBudgetAskReply(
  dynamic: string | null,
  isRetry = false,
): string {
  if (dynamic) return dynamic;
  return isRetry
    ? 'I didn\'t catch a figure there — what\'s your budget, roughly? Just the number is fine, e.g. "300000" or "₦2m".'
    : 'Before I set this up — what\'s your budget for this? A rough figure is fine ("around ₦300k", "up to ₦2m") — it\'s what I\'ll compare the real prices I find against.';
}
