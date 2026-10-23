import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";
import type { SearchIntentKind } from "@/types/search";
import type { ClarifierField } from "@/types/sectors";

// The DYNAMIC pre-search details gate (2026-09-05, rewritten 2026-09-09,
// templated 2026-10-05).
//
// Found live: "I need a good black sneakers" searched nationwide after
// location was declined, THEN asked "Would you like me to filter by size,
// brand, or price?" — the filtration that should have happened FIRST so
// those answers could actually retrieve the right listing. Colour / "good"
// is not matching detail; size, brand, and budget are.
//
// The WORDING is still the model's own, in one natural message. WHAT it
// asks is now a sector template (route.ts passes the unanswered clarifier
// fields — Brand, Shoe Size, … — plus budget for a purchase). Asked ONCE
// before search, never after cards. route.ts's `askedBudget` structural
// flag is what guarantees it is never re-asked.
//
// Fails toward a static fallback that still names the template fields on
// any error or unusable output — same "must only ever ADD to the existing
// flow, never be the reason a buyer sees nothing" rule
// suggestBuyingGuidance.ts already follows.

const TIMEOUT_MS = 6000;
const PROVIDER_ORDER = ["openai", "groq"] as const;
const MAX_QUESTION_LENGTH = 500;

function fieldLabel(f: ClarifierField): string {
  if (!f.example) return f.name;
  const example = f.example.replace(/^e\.?g\.?\s*/i, "");
  return `${f.name} (e.g. ${example})`;
}

function gateTool() {
  return tool({
    description:
      "Call this exactly once to write the single natural-language message asking the buyer what you need before searching.",
    inputSchema: z.object({
      asksBudget: z
        .boolean()
        .describe(
          "Whether this message actually asks about budget — see the system prompt's rule on which requests genuinely need one. Must match the message you actually wrote: true only if the message really does ask about budget/price range somewhere in it, false if it doesn't.",
        ),
      question: z
        .string()
        .describe(
          "One short, friendly, natural message asking the buyer the template details needed BEFORE searching — written in your own words. Cover the listed fields that aren't already in their message, plus budget when the system prompt says to. Keep it ONE cohesive message — conversational prose or a short natural numbered list, never a rigid form, never more than 3 things total.",
        ),
    }),
    execute: async (v) => v,
  });
}

function systemPromptFor(
  itemTerm: string,
  isService: boolean,
  fields: ClarifierField[],
): string {
  const templateNote = fields.length
    ? `This request's details template (ask about these, skip any the buyer's own words already answered): ${fields.map(fieldLabel).join("; ")}.`
    : "No extra product fields are still missing — only ask what the rules below require (budget, or the actual problem/need).";

  return [
    `A buyer on Velte, a Nigerian shopping assistant, just asked for "${itemTerm}" without enough matching detail yet — before searching, write the ONE message asking what matters so the search can use their answer.`,
    "",
    isService
      ? "This is a SERVICE request. Anything beyond budget you ask about should be about the actual job — the specific problem, who's doing it, experience, turnaround, materials/process — never a business name."
      : "This is a purchase. Ask the template fields that actually match a listing (size, brand, model, spec) — not a vague use/preference stand-in, and never a colour they already named.",
    "",
    templateNote,
    "",
    "Hard rules, no exceptions:",
    "- Read the buyer's own words and NEVER re-ask something they already answered (a colour already named, a brand already named, a size already named, a use already stated).",
    isService
      ? // Explicit product direction (2026-09-17, found live on "I need a good
        // mechanic nearby" getting asked for a budget, which reads as odd
        // for a bounded repair job priced by diagnosis, not by how much the
        // buyer chooses to spend): budget genuinely only varies with SCALE
        // for a narrow class of services — the buyer choosing more/bigger/
        // longer directly and substantially changes what it costs (an event
        // planner, a DJ, a caterer, a decorator, event photography, a large
        // print run, a construction/renovation job). For an ordinary bounded
        // job — a mechanic, a plumber, an electrician, a phone repair, a
        // single tailoring job, a haircut — the price is set by DIAGNOSING
        // the actual problem, not by a budget the buyer names upfront, and
        // asking one reads as a non-sequitur. Judge this per request, not
        // from a fixed list: is the eventual cost mostly a function of scale/
        // scope the buyer controls (ask budget), or mostly a function of
        // what's actually wrong/needed (skip budget, ask about THAT instead —
        // e.g. for a mechanic: what's wrong with the vehicle, or its make/
        // model, never a business name or a price of your own).
        "- Decide first whether this request's cost genuinely scales with the buyer's own choices (an event's size, a job's duration/scope) — if so, ask budget. If the cost is really set by diagnosing a specific problem rather than by how much the buyer wants to spend, do NOT ask budget at all — ask about the actual problem/need instead (what's wrong, what kind, which model/make — whatever a vendor would actually need to help). Set `asksBudget` to match whichever you actually did."
      : "- Budget MUST be part of the message, phrased however feels natural — this is always asked for a purchase. Set `asksBudget` to true.",
    isService
      ? "- Anything else you ask about is the PROBLEM/NEED or CATEGORY — never a business name, never a price estimate of your own."
      : "- Cover the template fields that are still missing (size, brand, model, spec — whatever is listed above). Asking brand or size HERE is correct; those answers get used to search. Never invent a price of your own.",
    "- This is the only details round — one short, natural message. Never a form, never a wall of bullet points, never filler advice about what to look for, never more than 3 things total.",
  ].join("\n");
}

function isUsableQuestion(s: string | undefined): s is string {
  if (!s) return false;
  const t = s.trim();
  return t.length > 0 && t.length <= MAX_QUESTION_LENGTH;
}

export interface BareQueryGateResult {
  question: string;
  /** Whether `question` actually asks about budget — false for a bounded
   *  service (a mechanic, a repair) whose cost is set by diagnosing the
   *  problem, not by what the buyer chooses to spend. See
   *  systemPromptFor's own rule. route.ts stamps this onto the turn's
   *  clarification (`budgetAsked`) so a later request in the SAME
   *  conversation that genuinely does need a budget ask still gets one —
   *  see alreadyAskedBudgetThisConversation's own comment. */
  asksBudget: boolean;
}

/**
 * The dynamic pre-search details question, written by the model from the
 * sector template route.ts passed in. Returns null on ANY failure — the
 * caller already has a working static fallback, so this can only ever ADD
 * to that, never be the reason a buyer sees nothing. Never throws.
 */
export async function buildBareQueryGate(params: {
  itemTerm: string;
  seekingKind: SearchIntentKind;
  /** The buyer's own message this turn — carries any use case already
   *  stated ("for my work as a developer"), which the model reads so it
   *  doesn't re-ask what's already been said. */
  message: string;
  /** Unanswered sector/general clarifier fields for this item. Empty when
   *  detection found nothing extra to ask beyond budget / the problem. */
  fields?: ClarifierField[];
}): Promise<BareQueryGateResult | null> {
  const itemTerm = params.itemTerm.trim();
  if (!itemTerm) return null;
  const fields = params.fields ?? [];

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: systemPromptFor(
            itemTerm,
            params.seekingKind === "get_service",
            fields,
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
    )?.output as { question?: string; asksBudget?: boolean } | undefined;

    if (!isUsableQuestion(output?.question)) return null;
    return {
      question: output.question.trim(),
      asksBudget: output?.asksBudget === true,
    };
  } catch (err) {
    console.error(
      "[search] bare-query gate generation failed, falling back to budget-only:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

function staticFallback(itemTerm: string, fields: ClarifierField[]): string {
  const names = fields
    .map((f) => f.name.toLowerCase())
    .filter((n) => n !== "color" && n !== "colour");
  if (names.length === 0) {
    return `Before I search for "${itemTerm}" — tell me a bit more about what you need (and your budget, if you have one in mind). That'll help me match you with the right option.`;
  }
  const listed =
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  return `Before I search for "${itemTerm}" — what's your ${listed}, and do you have a budget in mind? I'll use that to find the right match.`;
}

/**
 * The reply text a buyer actually reads. `result` is null on a
 * failed/timed-out/unusable call, which collapses to a static fallback
 * that still names the template fields so a model outage doesn't skip
 * the details round entirely.
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
  result: BareQueryGateResult | null,
  fields: ClarifierField[] = [],
): string {
  return result?.question ?? staticFallback(itemTerm, fields);
}
