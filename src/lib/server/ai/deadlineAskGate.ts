import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";

// The Shopping Plan deadline ask, made dynamic (2026-09-19, per explicit
// feedback that the old fixed line — "Quick question before I search — when
// do you need this by?" — read as confusing/generic, a non-sequitur dropped
// in ahead of any results). Same treatment bareQueryGate.ts already got for
// the same reason: the WORDING is the model's own, grounded in the buyer's
// actual request, rather than one fixed sentence repeated byte-for-byte no
// matter what was asked for.
//
// Deliberately a SEPARATE gate from bareQueryGate, not folded into it — this
// one fires earlier and on a narrower condition (route.ts's own explicit-
// tool-pick / isBulkPurchase check), before it's even settled that this
// request becomes a Shopping Plan at all, while bareQueryGate's budget/style
// ask is unconditional on any bare query. Merging the two would mean asking
// about a plan's deadline on requests that never qualify for one.
//
// Fails toward the ORIGINAL fixed question on any error or unusable output —
// same "must only ever ADD, never be the reason a buyer sees nothing" rule
// every other gate in this codebase follows.

const TIMEOUT_MS = 6000;
const PROVIDER_ORDER = ["openai", "groq"] as const;
const MAX_QUESTION_LENGTH = 400;

function gateTool() {
  return tool({
    description:
      "Call this exactly once to write the single natural-language message asking the buyer when they need this by.",
    inputSchema: z.object({
      question: z
        .string()
        .describe(
          "One short, warm, natural message, in your own words, asking WHEN the buyer needs this — phrase it grounded in their actual request (e.g. 'ready by' for something physical, 'need this sorted by' for a service) so it reads as a real follow-up, not a generic form question. Must make clear: (1) a rough answer is fine — a date, 'next week', 'before my trip', (2) they can say something like 'no rush' or skip it entirely if timing doesn't matter, since answering is optional. Never explain WHY you're asking (no mention of tracking, plans, or monitoring) — that's an implementation detail, not something to surface here. One or two sentences, never a list.",
        ),
    }),
    execute: async (v) => v,
  });
}

function systemPromptFor(goalText: string): string {
  return [
    `A buyer on Velte, a Nigerian shopping assistant, just asked: "${goalText}"`,
    "",
    "Before searching, write the one short message asking when they need this by — see the schema's own rule for exactly what it must and must not do.",
    "",
    "Ground it in what they actually asked for rather than a generic 'when do you need this by?' — e.g. for furnishing an apartment, something like 'When would you like your apartment fully furnished by?' reads far more naturally than a bare timing question with no connection to the request.",
  ].join("\n");
}

function isUsableQuestion(s: string | undefined): s is string {
  if (!s) return false;
  const t = s.trim();
  return t.length > 0 && t.length <= MAX_QUESTION_LENGTH;
}

/**
 * The dynamic deadline-ask question, written entirely by the model. Returns
 * null on ANY failure — the caller already has a working static fallback
 * (composeDeadlineAskReply), so this can only ever ADD to that, never be the
 * reason a buyer sees nothing. Never throws.
 */
export async function buildDeadlineAskGate(
  goalText: string,
): Promise<string | null> {
  const goal = goalText.trim();
  if (!goal) return null;

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: systemPromptFor(goal),
          messages: [{ role: "user", content: goal }],
          tools: { deadlineAskGate: gateTool() },
          toolChoice: "required",
        },
        [...PROVIDER_ORDER],
        "deadline-ask-gate",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("deadline-ask gate timed out")),
          TIMEOUT_MS,
        ),
      ),
    ]);

    const output = result.toolResults.find(
      (r) => r.toolName === "deadlineAskGate",
    )?.output as { question?: string } | undefined;

    if (!isUsableQuestion(output?.question)) return null;
    return output.question.trim();
  } catch (err) {
    console.error(
      "[search] deadline-ask gate generation failed, falling back to the fixed question:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * The reply text a buyer actually reads. `dynamic` is null on a
 * failed/timed-out/unusable call, which collapses to a plain, static
 * fallback — clearer than the original wording it replaced (2026-09-19:
 * "when do you need this by?" alone, ahead of any results, read as a
 * confusing non-sequitur), and still names the skip/no-rush option
 * explicitly since a freeform model line isn't guaranteed to.
 */
export function composeDeadlineAskReply(dynamic: string | null): string {
  const question =
    dynamic ??
    'Before I search — is there a date you\'d like this sorted by? A rough answer is fine ("today", "in 2 weeks", "by September 25").';
  return `${question} No particular deadline? Just say "no rush" or skip this and I'll search right away.`;
}
