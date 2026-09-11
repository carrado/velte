import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";
import type { SearchIntentKind } from "@/types/search";

// The DYNAMIC bare-query gate (2026-09-05, rewritten 2026-09-09) — the "how
// it's asked" half of the budget-only gate shipped 2026-09-04 (route.ts's
// own comment on that gate explains WHY budget alone was the first cut).
// Widened per explicit request, modeled on a live example: "I need a good
// laptop for my work as a developer" should get budget/dev-type/OS asked
// together as one natural question — not a generic "what's your budget?"
// with nothing else.
//
// 2026-09-09 REWRITE, per explicit request/feedback on a live example
// ("Dell XPS 15"): the whole reply used to be assembled in CODE from a
// fixed template ("Before I search for X — tell me just these N things:
// 1. ... 2. ... 3. ...", with budget's own sentence hardcoded verbatim) —
// that read as robotic and repeated byte-for-byte on every bare query. The
// WORDING is now the model's own, in one natural message — budget is still
// MANDATORY (the system prompt below requires it, and route.ts's own
// `askedBudget` structural flag — not a text-pattern scan of this prose —
// is what guarantees it's never re-asked, see types/search.ts), but there
// is no more fixed sentence for it to ride in on.
//
// The standalone "buying-criteria" bullets ("For X, worth prioritizing: -
// ...") are GONE, per the same feedback questioning whether they earned
// their place: they answered a question nobody visibly asked for, ahead of
// the actual question, and general spec advice with no product attached to
// it read as filler more often than as help. If a criterion is genuinely
// worth surfacing it can live inside the model's own question prose now
// (nothing stops a natural "since it's for programming, worth checking it
// has decent RAM — what's your budget?"), but it is never a separate,
// guaranteed block again.
//
// Fails toward the ORIGINAL 2026-09-04 gate (a plain budget-only question,
// no extras) on any error or unusable output — same "must only ever ADD to
// the existing flow, never be the reason a buyer sees nothing" rule
// suggestBuyingGuidance.ts already follows.

const TIMEOUT_MS = 6000;
const PROVIDER_ORDER = ["openai", "groq"] as const;
const MAX_QUESTION_LENGTH = 500;

function gateTool() {
  return tool({
    description:
      "Call this exactly once to write the single natural-language message asking the buyer what you need before searching.",
    inputSchema: z.object({
      question: z
        .string()
        .describe(
          'One short, friendly, natural message asking the buyer what\'s needed before searching for their item/service — written entirely in your own words, no fixed template. It MUST ask about their budget somewhere in it (any natural phrasing — "what\'s your budget", "how much are you hoping to spend", "any price range in mind", etc.) — never skip it. It MAY also ask up to 2 more short things about USE or PREFERENCE if the category genuinely benefits from it (e.g. what kind of development, new or used, which room it\'s for) — never a raw spec the buyer would have to go look up, and never something their own words already answered. Keep it ONE cohesive message a buyer would actually enjoy reading — conversational prose or a short natural numbered list, your choice — never a rigid form, never more than 3 things total.',
        ),
    }),
    execute: async (v) => v,
  });
}

function systemPromptFor(itemTerm: string, isService: boolean): string {
  return [
    `A buyer on Velte, a Nigerian shopping assistant, just asked for "${itemTerm}" with no distinguishing detail yet — before searching, write the one message asking what matters.`,
    "",
    isService
      ? "This is a SERVICE request. Anything beyond budget you ask about should be about who's doing the job — experience, turnaround, materials/process — never a business name."
      : "This is a purchase. Anything beyond budget you ask about should be a real, general use/preference question for this kind of item.",
    "",
    "Hard rules, no exceptions:",
    "- Read the buyer's own words for a stated USE CASE (e.g. 'for my work as a developer', 'for content creation') and let it shape the question — never ask about something the buyer's own words already answered.",
    "- Budget MUST be part of the message, phrased however feels natural — this is the one thing that's always asked.",
    "- Anything else you ask about is USE, PREFERENCE, or CATEGORY (e.g. what kind of development, new or used, which room it's for) — never a raw spec the buyer would have to go look up, never a specific product/brand/model name, never a price estimate of your own.",
    "- If the category is too generic to ask anything beyond budget, that's fine — a plain, warm budget question alone is a complete, correct answer.",
    "- One short, natural message. Never a form, never a wall of bullet points, never filler advice about what to look for — just the question(s).",
  ].join("\n");
}

function isUsableQuestion(s: string | undefined): s is string {
  if (!s) return false;
  const t = s.trim();
  return t.length > 0 && t.length <= MAX_QUESTION_LENGTH;
}

/**
 * The dynamic bare-query question text, written entirely by the model (see
 * this file's own top comment for why nothing here is code-templated
 * anymore). Returns null on ANY failure — the caller already has a working
 * static budget-only fallback, so this can only ever ADD to that, never be
 * the reason a buyer sees nothing. Never throws.
 */
export async function buildBareQueryGate(params: {
  itemTerm: string;
  seekingKind: SearchIntentKind;
  /** The buyer's own message this turn — carries any use case already
   *  stated ("for my work as a developer"), which the model reads so it
   *  doesn't re-ask what's already been said. */
  message: string;
}): Promise<string | null> {
  const itemTerm = params.itemTerm.trim();
  if (!itemTerm) return null;

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: systemPromptFor(
            itemTerm,
            params.seekingKind === "get_service",
          ),
          messages: [{ role: "user", content: params.message || itemTerm }],
          tools: { bareQueryGate: gateTool() },
          toolChoice: "required",
        },
        [...PROVIDER_ORDER],
        "bare-query-gate",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("bare-query gate timed out")),
          TIMEOUT_MS,
        ),
      ),
    ]);

    const output = result.toolResults.find(
      (r) => r.toolName === "bareQueryGate",
    )?.output as { question?: string } | undefined;

    return isUsableQuestion(output?.question) ? output.question.trim() : null;
  } catch (err) {
    console.error(
      "[search] bare-query gate generation failed, falling back to budget-only:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * The reply text a buyer actually reads. `question` is null on a
 * failed/timed-out/unusable call, which collapses to a plain, static
 * budget-only question — the safest possible degrade, and a strict
 * superset of what buildBareQueryGate can return, never a regression.
 *
 * Detecting "budget already asked" no longer scans this text for a fixed
 * phrase (route.ts used to grep for the literal substring "what's your
 * budget", which broke the instant this became genuinely freeform — the
 * whole point of this rewrite). route.ts's own `askedBudget` structural
 * flag, set from the clarification's own shape rather than its wording, is
 * what does that now — see types/search.ts's comment on SearchHistoryTurn.
 */
export function composeBareQueryReply(
  itemTerm: string,
  question: string | null,
): string {
  return (
    question ??
    `Before I search for "${itemTerm}" — what's your budget? Even a rough figure (like "around ₦400k" or "under ₦200k") helps me match you with the right option instead of just the highest specs.`
  );
}
