import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";
import type { SearchIntentKind } from "@/types/search";

// The DYNAMIC bare-query gate (2026-09-05) — the "how it's asked" half of
// the budget-only gate shipped 2026-09-04 (route.ts's own comment on that
// gate explains WHY budget alone was the first cut). Widened per explicit
// request, modeled on a live example: "I need a good laptop for my work as
// a developer" should get spec-target guidance plus budget/dev-type/OS
// asked together as one natural question — not a generic "what's your
// budget?" with nothing else.
//
// Deliberately NOT drawn from sectorClarifiers.ts's fixed per-sector field
// pools (Processor/RAM/Storage/...) — that's what generateItemClarifiers.ts
// used to do before it was deleted 2026-09-04 for feeling like a spec-sheet
// interrogation rather than a shopping consultant's question. This asks
// about USE and PREFERENCE ("what kind of development", "new or used"),
// chosen dynamically per item + whatever use case the buyer already named,
// never a raw spec off a list.
//
// OPTION B, confirmed by the user (2026-09-05): general buying-criteria
// guidance (spec targets — RAM, storage, capacity, material — general
// knowledge, never a claim about anything specific) is shown alongside the
// question, but NEVER a named product, brand, or model. That stays
// reserved for suggestBuyingGuidance.ts's own narrower exception, which
// only ever fires on a genuine dead end — after a real search already ran
// and found nothing — specifically so it can never sit ahead of, or
// contradict, a real Velte match. Firing that same kind of content before
// any search has even happened would risk exactly that: a buyer anchoring
// on "ThinkPad or MacBook" from generic advice, then a real result from a
// different, perfectly good brand reading as if Velte contradicted itself.
// Named products still only ever come from an actual search result, or the
// existing dead-end exception — never from here.
//
// Fails toward the ORIGINAL 2026-09-04 gate (budget alone, no criteria, no
// extra questions) on any error or unusable output — same "must only ever
// ADD to the existing flow, never be the reason a buyer sees nothing" rule
// suggestBuyingGuidance.ts already follows. The final reply text is
// composed in CODE (composeBareQueryReply below) from this call's
// structured output, never from raw model prose — same split as every
// other deterministic-vs-model line in this codebase.

const TIMEOUT_MS = 6000;
const PROVIDER_ORDER = ["openai", "groq"] as const;

const MAX_CRITERIA = 4;
const MAX_EXTRA_QUESTIONS = 2;
const MAX_CRITERION_LENGTH = 100;
const MAX_QUESTION_FRAGMENT_LENGTH = 100;

// Same defensive pattern as suggestBuyingGuidance's own CONTAINS_PRICE — a
// model mostly obeying "never a price" still occasionally slips one in, and
// it goes straight to a buyer if not caught here.
const CONTAINS_PRICE = /₦|\bnaira\b|\bprice\b|\d{4,}/i;

function gateTool() {
  return tool({
    description:
      "Call this exactly once to provide brief buying-criteria guidance and up to two follow-up questions (beyond budget, which is always asked separately) for what the buyer described.",
    inputSchema: z.object({
      criteria: z
        .array(z.string())
        .max(MAX_CRITERIA)
        .describe(
          "0-4 short, general buying-criteria bullets for this category (and use case, if the buyer named one) — e.g. '32GB+ RAM for smooth multitasking with Docker and multiple IDEs'. GENERAL KNOWLEDGE about what to look FOR — specs, capacity, materials, features — never a specific product, brand, or model name (never 'Ryzen', 'ThinkPad', 'Samsung', etc.), never a price. Return an empty array when the category is too broad or ordinary to say anything specific and useful (e.g. plain 'rice', a bare 'a plumber' with no stated use case) — an empty array is correct and expected, not a failure.",
        ),
      extraQuestions: z
        .array(z.string())
        .max(MAX_EXTRA_QUESTIONS)
        .describe(
          'Up to 2 short lowercase question fragments (never a full sentence, never about budget — that is asked separately) about the things most likely to change which specific option fits, e.g. "what kind of development you\'ll mostly be doing — web, mobile, or AI/ML" or "any OS preference, or either works". Ask about USE and PREFERENCE, never a spec the buyer would have to go look up (never "what processor generation", never "how many GB of RAM"). Return an empty array when nothing beyond budget is genuinely worth asking yet.',
        ),
    }),
    execute: async (v) => v,
  });
}

function systemPromptFor(itemTerm: string, isService: boolean): string {
  return [
    `A buyer on Velte, a Nigerian shopping assistant, just asked for "${itemTerm}" with no distinguishing detail yet — before searching, you get to say a little about what matters and ask a couple of quick follow-ups.`,
    "",
    isService
      ? "This is a SERVICE request. Buying criteria here means what to look for in whoever does the job — experience, turnaround, materials/process, licensing where relevant — never a business name."
      : "This is a purchase. Buying criteria here means real, general spec/quality targets for this kind of item.",
    "",
    "Hard rules, no exceptions:",
    "- Read the buyer's own words for a stated USE CASE (e.g. 'for my work as a developer', 'for content creation') and let it shape both the criteria and the questions — never ask about something the buyer's own words already answered.",
    "- Criteria are GENERAL KNOWLEDGE about what to look for. Never name a specific product, brand, or model. Never state or estimate a price.",
    "- Questions ask about USE, PREFERENCE, or CATEGORY (e.g. what kind of development, new or used, which room it's for) — never a raw spec the buyer would have to go look up.",
    "- Never ask about budget — that is already asked separately, every time, by the caller.",
    "- If the request is too generic to say anything specific and useful, return empty arrays rather than generic filler ('good quality', 'durable') that could apply to anything.",
  ].join("\n");
}

function isUsableCriterion(s: string): boolean {
  const t = s.trim();
  return (
    t.length > 0 && t.length <= MAX_CRITERION_LENGTH && !CONTAINS_PRICE.test(t)
  );
}

function isUsableFragment(s: string): boolean {
  const t = s.trim();
  return (
    t.length > 0 &&
    t.length <= MAX_QUESTION_FRAGMENT_LENGTH &&
    !/budget/i.test(t)
  );
}

export interface BareQueryGate {
  criteria: string[];
  extraQuestions: string[];
}

/**
 * Dynamic content for the bare-query gate — criteria bullets (Option B: no
 * named products) plus up to 2 extra question fragments to fold in next to
 * the always-asked budget question. Returns null on ANY failure — the
 * caller already has a working budget-only question with no extras, so
 * this can only ever ADD to that, never be the reason a buyer sees nothing.
 * Never throws.
 */
export async function buildBareQueryGate(params: {
  itemTerm: string;
  seekingKind: SearchIntentKind;
  /** The buyer's own message this turn — carries any use case already
   *  stated ("for my work as a developer"), which the model reads so it
   *  doesn't re-ask what's already been said. */
  message: string;
}): Promise<BareQueryGate | null> {
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
    )?.output as { criteria?: string[]; extraQuestions?: string[] } | undefined;

    const criteria = (output?.criteria ?? [])
      .filter(isUsableCriterion)
      .slice(0, MAX_CRITERIA);
    const extraQuestions = (output?.extraQuestions ?? [])
      .filter(isUsableFragment)
      .slice(0, MAX_EXTRA_QUESTIONS);

    return { criteria, extraQuestions };
  } catch (err) {
    console.error(
      "[search] bare-query gate generation failed, falling back to budget-only:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Assembles the reply text a buyer actually reads, in CODE — never from raw
 * model prose (see this file's own top comment). `gate` is null on a
 * failed/timed-out call, or has empty arrays when the model genuinely had
 * nothing to add; both collapse to the exact same plain budget-only
 * question the 2026-09-04 gate always asked, so this is a strict superset,
 * never a regression when the dynamic call comes back empty.
 *
 * Numbered-list shape when there's more than one thing to ask (matching the
 * live example this was modeled on — "tell me just these 3 things: 1. ...
 * 2. ... 3. ..." reads as one quick round, not three separate interrogations
 * fused into one run-on sentence). With nothing extra to ask, falls back to
 * the exact, byte-identical sentence the 2026-09-04 budget-only gate always
 * used — the safest possible degrade when the dynamic call fails or the
 * model genuinely has nothing to add.
 *
 * Always contains the literal phrase "what's your budget" — route.ts's
 * BUDGET_CLARIFY_PATTERN scans prior replies for exactly that substring to
 * decide whether budget's already been asked this conversation, so both
 * branches below carry it verbatim to stay detected.
 */
function budgetOnlyQuestion(itemTerm: string): string {
  return `Before I search for "${itemTerm}" — what's your budget? Even a rough figure (like "around ₦400k" or "under ₦200k") helps me match you with the right option instead of just the highest specs.`;
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

export function composeBareQueryReply(
  itemTerm: string,
  gate: BareQueryGate | null,
): string {
  const extraQuestions = gate?.extraQuestions ?? [];
  const criteria = gate?.criteria ?? [];

  let question: string;
  if (extraQuestions.length === 0) {
    question = budgetOnlyQuestion(itemTerm);
  } else {
    const items = [
      `What's your budget? Even a rough figure (like "around ₦400k" or "under ₦200k") helps me match you with the right option instead of just the highest specs.`,
      ...extraQuestions.map(
        (q) => `${capitalize(q.trim().replace(/[?.]+$/, ""))}?`,
      ),
    ];
    const list = items.map((item, i) => `${i + 1}. ${item}`).join("\n");
    question = `Before I search for "${itemTerm}" — tell me just these ${items.length} things:\n${list}`;
  }

  if (!criteria.length) return question;

  const bullets = criteria.map((c) => `- ${c}`).join("\n");
  return `For ${itemTerm}, worth prioritizing:\n${bullets}\n\n${question}`;
}
