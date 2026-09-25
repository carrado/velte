import { stepCountIs, tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";
import type { AdviceAnswer } from "@/types/search";

// Answering a buying QUESTION before offering to search (2026-09-23).
// Found live: "I want to get a land in Enugu, which place will it be
// cheaper for me" went straight to "there's a vendor whose store fits
// 'land' — want me to get in touch?", with the question never answered.
//
// Same two-phase shape as a fresh comparison (route.ts's Phase 1
// short-circuit): answer from general knowledge, search nothing, and close
// by offering to find it on Velte. The follow-up "yes" then rides the
// comparison's own pendingComparisonPick path — this returns `searchTerm`
// for exactly that — so no second confirmation flow had to be built.
//
// The core rule holds here too: the model translates, the data decides. So
// no prices, no vendors, no stock — and because "never invent a price" is
// the one that matters most, a reply that states a naira figure anyway is
// replaced in code rather than trusted (containsMoneyFigure).

const PROVIDER_ORDER = ["openai-strong", "openai", "groq"] as const;
/** Same runaway backstop the comparison answer uses — the prompt itself
 *  asks for far less. */
const MAX_ADVICE_LENGTH = 2000;

function adviceSearchTool() {
  return tool({
    description:
      "Call this exactly once, after writing your answer, with what to search Velte for if the buyer says yes.",
    inputSchema: z.object({
      searchTerm: z
        .string()
        .describe(
          "The THING itself to search Velte for — the item or service, never the people who sell it — plus any place the buyer named: 'land in Enugu' (never 'land vendors in Enugu'), 'used Toyota Corolla', 'generator for a shop'.",
        ),
    }),
    execute: async (v) => v,
  });
}

function systemPrompt(): string {
  return `You are Velte, a buyer-facing shopping assistant for a Nigerian marketplace. The buyer asked a question to help them decide on a purchase. Answer THAT question first, like a knowledgeable, honest friend would, from general knowledge — you have not searched Velte's catalogue.

- Keep it to roughly 500–900 characters (it is read on a phone): a one-line direct answer, then 2–4 short, specific points of one or two sentences each. Real markdown: "- " bullets, **bold** on the few terms that matter.
- Ground it in Nigeria where the question is local (areas, road conditions, power supply, what's common in the market).
- NEVER state a price, price range, or any naira or dollar figure — you have no price data and a guessed figure misleads. If the question is about cost, explain what makes it cheaper or dearer instead, and say vendors on Velte can quote real prices.
- Never name a vendor, store, or other shopping platform, and never say anything is available or in stock.
- End by asking, in your own words, whether they'd like you to find it on Velte — e.g. "Want me to find land in Enugu on Velte?". Then call adviceSearch with that same thing as a search term.`;
}

/** A naira/dollar amount stated in the reply — the one invention this
 *  answer must never make. Deliberately broad: a false positive only costs
 *  the fallback line, a miss puts a made-up price in front of a buyer. */
function containsMoneyFigure(text: string): boolean {
  return (
    /[₦$]\s?\d/.test(text) ||
    /\b\d[\d,.]*\s?(k|m|million|billion|thousand)\b/i.test(text) ||
    /\b\d[\d,.]*\s?(naira|ngn|dollars?|usd)\b/i.test(text) ||
    /\b(naira|ngn)\s?\d/i.test(text)
  );
}

/** "land vendors in Enugu" → "land in Enugu". Tested live: the model
 *  returned the sellers rather than the thing despite the schema's own
 *  example, and a "yes" to finding VENDORS was then read as agreeing to have
 *  vendors contacted — the Buyer Request name ask — instead of a search.
 *  Plural seller words only: "shop" or "agent" is often the thing itself
 *  ("generator for a shop", "estate agent"). */
function cleanSearchTerm(term: string | undefined): string {
  return (term ?? "")
    .replace(/\s+(vendors|sellers|dealers|suppliers)(?=\s|$)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Whether the buyer's own words actually ASK something (2026-09-24,
 *  explicit product decision: explain only when asked, otherwise search).
 *
 *  Found live: "I need a good laptop for my programming work" got a four-
 *  bullet explainer on CPUs and RAM before any search, because the
 *  classifier read "good … for programming" as "how do I choose". A stated
 *  use is a requirement to search WITH — the recommendation layer already
 *  ranks results against the buyer's full message — not a question to
 *  answer first. The classifier alone decided this before; this is the
 *  in-code check it lacked, and it can only NARROW the classifier (both must
 *  agree), so a real question is never newly sent to the explainer by it.
 *
 *  "where" is deliberately absent: "where can I get a phone" is a find
 *  request, however it's phrased. Pidgin interrogatives included. */
export function looksLikeQuestion(message: string): boolean {
  if (message.includes("?")) return true;
  return /\b(which|what|what's|whats|wetin|how|why|should i|shall i|is it|is there|are there|does it|do i need|do you think|worth it|difference between|pros and cons|advise|advice|tell me about|explain)\b/i.test(
    message,
  );
}

export async function answerBuyingQuestion(
  messages: { role: "user" | "assistant"; content: string }[],
  fallbackTerm: string | null,
): Promise<AdviceAnswer | null> {
  try {
    const result = await callLLM(
      {
        system: systemPrompt(),
        messages,
        tools: { adviceSearch: adviceSearchTool() },
        stopWhen: stepCountIs(2),
      },
      [...PROVIDER_ORDER],
      "advice-answer",
    );
    const reply = result.text.trim();
    const output = result.toolResults.find((r) => r.toolName === "adviceSearch")
      ?.output as { searchTerm?: string } | undefined;
    const searchTerm =
      cleanSearchTerm(output?.searchTerm) || fallbackTerm || null;

    if (!reply || reply.length > MAX_ADVICE_LENGTH) return null;
    if (containsMoneyFigure(reply)) {
      console.warn(
        "[search] advice answer stated a money figure — replaced with the safe line",
      );
      return {
        reply: searchTerm
          ? `Prices for that vary too much for me to give you a reliable figure — vendors can quote you directly. Want me to find **${searchTerm}** on Velte?`
          : "Prices for that vary too much for me to give you a reliable figure — vendors can quote you directly. What would you like me to find on Velte?",
        searchTerm,
      };
    }
    return { reply, searchTerm };
  } catch (err) {
    console.error(
      "[search] advice answer failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
