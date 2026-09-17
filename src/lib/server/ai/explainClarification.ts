import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";

// Found live (2026-09-17): "Where can I get a good fashion designer" →
// bareQueryGate asked "What kind of fashion design services are you
// looking for? Are you planning this for a specific event or project?" →
// "Please explain" got a SECOND, near-identical clarifying question
// instead of an actual explanation. Nothing in the pipeline was wrong on
// its own terms — bareQueryGate.ts (and askClarifyingQuestion, and the
// Shopping List clarify gate) all just see the buyer's next message and
// react to it fresh; none of them know they're being asked to elaborate on
// what THEY just said, so a detail-free "please explain" reads exactly
// like a detail-free "I need a fashion designer" and produces the same
// kind of question again.
//
// This is the dedicated repair for that: given the ORIGINAL question the
// buyer didn't understand, rewrite it with concrete examples so it can
// actually be answered — WITHOUT abandoning what it was asking for. route.ts
// re-renders the result under the exact same clarification metadata
// (skippable/listDetails/budgetAsked) the original question carried, so the
// buyer can still skip it or answer it exactly as before; only the WORDING
// changes.

const TIMEOUT_MS = 6000;
const PROVIDER_ORDER = ["openai", "groq"] as const;
const MAX_QUESTION_LENGTH = 500;

function explainTool() {
  return tool({
    description:
      "Call this exactly once to rewrite your own last question so the buyer, who didn't understand it, can actually answer it.",
    inputSchema: z.object({
      question: z
        .string()
        .describe(
          "A warmer, plainer rewrite of your own last question, with 1-2 concrete, relatable EXAMPLES of the kind of answer that would help — enough that someone confused by the original wording can now answer. Must ask for the SAME underlying information as the original question, never a new or different one.",
        ),
    }),
    execute: async (v) => v,
  });
}

function systemPromptFor(originalQuestion: string, itemTerm: string): string {
  return [
    `You are Velte, a Nigerian shopping assistant. You just asked a buyer looking for "${itemTerm}" this question: "${originalQuestion}"`,
    "",
    "The buyer didn't understand it and asked you to explain or clarify — they are NOT declining, and NOT asking about something new. Rewrite the SAME question so they can actually answer it.",
    "",
    "Hard rules, no exceptions:",
    "- Ask for the exact same underlying information as the original question. Never introduce a new question, never ask about something different, never abandon the topic — the buyer still wants help finding/hiring the same thing, they just need the question explained.",
    "- Add 1-2 concrete, relatable EXAMPLES of what kind of answer would help (e.g. for a vague 'what kind of service' question about a fashion designer: bespoke tailoring for an event, everyday wear, a uniform for a business) — real, generic categories, never inventing a specific brand/vendor/price.",
    "- Warmer and simpler than the original, not longer — one short, natural paragraph, never a bullet list, never an apology-heavy preamble ('Sorry for the confusion...').",
    "- Never restate the original question verbatim — if you can't improve on it, add examples to it instead of repeating it unchanged.",
  ].join("\n");
}

function isUsableQuestion(s: string | undefined): s is string {
  if (!s) return false;
  const t = s.trim();
  return t.length > 0 && t.length <= MAX_QUESTION_LENGTH;
}

/**
 * Rewrites `originalQuestion` with concrete examples so a buyer who asked
 * "please explain" can actually answer it. Returns null on ANY failure or
 * unusable output — the caller falls back to re-showing the original
 * question verbatim, which keeps the conversation's intent intact even
 * when this call itself doesn't work. Never throws.
 */
export async function explainClarification(params: {
  originalQuestion: string;
  itemTerm: string;
}): Promise<string | null> {
  const originalQuestion = params.originalQuestion.trim();
  if (!originalQuestion) return null;

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: systemPromptFor(
            originalQuestion,
            params.itemTerm.trim() || "this",
          ),
          messages: [
            {
              role: "user",
              content: "Please explain what you mean.",
            },
          ],
          tools: { explainClarification: explainTool() },
          toolChoice: "required",
        },
        [...PROVIDER_ORDER],
        "explain-clarification",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("explain-clarification timed out")),
          TIMEOUT_MS,
        ),
      ),
    ]);

    const output = result.toolResults.find(
      (r) => r.toolName === "explainClarification",
    )?.output as { question?: string } | undefined;

    return isUsableQuestion(output?.question) ? output.question.trim() : null;
  } catch (err) {
    console.error(
      "[search] explain-clarification failed, re-showing original question:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
