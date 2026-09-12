import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";

// The Shopping List "intelligent layer" (2026-09-13, explicit request,
// modeled on a live example — see this file's own git history/PR for the
// exact reference message; NOT reproduced verbatim here, only its shape).
// Same idea as bareQueryGate.ts's dynamic bare-query gate, applied one level
// up: a bare PROJECT description ("help me shop for school resumption",
// "furnish my apartment") used to go straight into buildShoppingListSnapshot
// with nothing to tailor it — the same gap bareQueryGate closed for a bare
// single-ITEM search, just never closed for a whole-project one.
//
// ONE call decides BOTH whether asking helps and what to ask, rather than
// two round trips — `needsMoreDetails: false` lets route.ts draft the list
// on this SAME turn when the buyer already gave enough to tailor it (e.g.
// "university student, staying in a hostel, ₦150k budget for resumption"
// arriving as the very first message needs no follow-up question at all).
// `needsMoreDetails: true` pairs with a `question` — one warm, natural
// message that may briefly gesture at the KINDS of things a project like
// this commonly involves (never a priced item, never the actual list) and
// asks for the 2-3 things that would most change what gets drafted, budget
// among them. route.ts marks that turn structurally (Clarification's own
// `listDetails: true`, mirroring `skippable` for the budget gate) so the
// buyer's next message resolves as an ANSWER rather than a fresh project,
// and its text gets appended to the original goal rather than replacing it.
//
// Fails toward drafting immediately (`needsMoreDetails: false`) on any
// error/timeout/unusable output — same "must only ever ADD to the existing
// flow, never be the reason a buyer sees nothing" rule every other gate in
// this directory follows. A skipped clarifying question is a smaller loss
// than a stalled shopping list.

const TIMEOUT_MS = 8000;
const PROVIDER_ORDER = ["openai", "groq"] as const;
const MAX_QUESTION_LENGTH = 700;

function gateTool() {
  return tool({
    description:
      "Call this exactly once to decide whether to ask the buyer anything before drafting their shopping list, and if so, write that one message.",
    inputSchema: z.object({
      needsMoreDetails: z
        .boolean()
        .describe(
          "true if asking a couple of quick questions would meaningfully change what belongs on this list or at what price tier (the common case for a bare project description). false ONLY when the buyer's own words already give enough to draft a well-tailored list — who/what it's for, the setting, and ideally a budget.",
        ),
      question: z
        .string()
        .nullable()
        .describe(
          "Required when needsMoreDetails is true, null otherwise. ONE warm, natural message, entirely in your own words: briefly show you understood the scope of the project (you may mention 2-4 example categories it commonly involves, plain prose or a short list, your choice — but never a priced item and never the actual list), then ask the 2-3 things that would most change what gets drafted for THIS specific project (e.g. who it's for, the setting/living situation, how many people, an occasion's date or guest count — whatever genuinely applies). Always include budget somewhere in it, phrased naturally, unless the buyer already stated one. Never a rigid form, never more than what a buyer would enjoy reading in one message.",
        ),
    }),
    execute: async (v) => v,
  });
}

function systemPromptFor(goalText: string): string {
  return [
    `A buyer on Velte, a Nigerian shopping assistant, just described a whole shopping PROJECT rather than a single item: "${goalText}". Decide whether to ask anything before a list gets drafted for it.`,
    "",
    "Read the buyer's own words first: if they already named enough for a well-tailored list (who/what it's for, the setting, a budget), there is nothing to ask — set needsMoreDetails false and let the list get drafted immediately. Don't ask just to ask.",
    "",
    "When something genuinely useful is still missing, set needsMoreDetails true and write ONE natural message. Never draft or name actual items/prices here — that happens after, in a separate step. Never a generic 'tell me more' with nothing concrete to react to; ground it in what THIS project actually is.",
    "",
    "Budget is the one thing worth asking almost every time it hasn't been given — it changes both what makes the list and which quality tier gets priced. Everything else you ask about should be the 1-2 facts that most change the SHAPE of this specific project (not a raw spec list).",
  ].join("\n");
}

function isUsableQuestion(s: string | null | undefined): s is string {
  if (!s) return false;
  const t = s.trim();
  return t.length > 0 && t.length <= MAX_QUESTION_LENGTH;
}

export interface ShoppingListClarifyResult {
  needsMoreDetails: boolean;
  /** Non-null exactly when needsMoreDetails is true and the model's output
   *  was usable. */
  question: string | null;
}

/**
 * The shopping-list "should we ask first?" gate. Never throws; returns null
 * on any failure/timeout, which route.ts treats as "draft immediately" —
 * the safe degrade, since that's exactly what happened before this gate
 * existed.
 */
export async function buildShoppingListClarifyGate(params: {
  goalText: string;
}): Promise<ShoppingListClarifyResult | null> {
  const goalText = params.goalText.trim();
  if (!goalText) return null;

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: systemPromptFor(goalText),
          messages: [{ role: "user", content: goalText }],
          tools: { shoppingListClarifyGate: gateTool() },
          toolChoice: "required",
        },
        [...PROVIDER_ORDER],
        "shopping-list-clarify-gate",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("shopping-list clarify gate timed out")),
          TIMEOUT_MS,
        ),
      ),
    ]);

    const output = result.toolResults.find(
      (r) => r.toolName === "shoppingListClarifyGate",
    )?.output as
      | { needsMoreDetails?: boolean; question?: string | null }
      | undefined;
    if (!output) return null;

    if (output.needsMoreDetails && isUsableQuestion(output.question)) {
      return { needsMoreDetails: true, question: output.question.trim() };
    }
    // Either genuinely ready to draft, or the model said "ask" without
    // giving a usable question — the latter degrades to "draft anyway"
    // rather than asking a blank/broken question.
    return { needsMoreDetails: false, question: null };
  } catch (err) {
    console.error(
      "[shopping-list] clarify gate failed, drafting immediately:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
