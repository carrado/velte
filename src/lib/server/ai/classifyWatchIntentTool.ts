import { tool } from "ai";
import { z } from "zod";

import type { WatchCandidate } from "@/types/search";

/**
 * Did the buyer just ask Velte to watch the prices it offered to watch — and
 * if so, which ones? (2026-08-29)
 *
 * A signal-only forced tool, the same technique classifyScopeTool.ts uses and
 * for the same documented reason: this pipeline never trusts prose alone for
 * anything a downstream decision branches on. The decision here spends a
 * buyer's paid quota, so it least of all.
 *
 * WHY THIS IS RELIABLE, which is the whole design and not a hope:
 *
 * The hard version of this question — "is this a watch request, a follow-up,
 * or a new search?" — is open-ended, and no amount of prompting gets an
 * open-ended intent classifier to 100%. So it is never asked. This call only
 * ever runs when Velte has JUST offered, on the immediately preceding turn, to
 * watch two or three NAMED products, and the only question is whether this
 * message is about that offer. That is a binary with the candidates listed in
 * front of it.
 *
 * Crucially, "is an offer live?" is NOT itself judged by a model. It is
 * structured client state (SearchHistoryTurn.watchOffer), set by SearchHome
 * from the turn it actually rendered — exactly like awaitingBuyerRequestReply,
 * whose own comment records that inferring it from text failed live twice
 * before it was made structural. No offer live → this call never happens →
 * the message flows through the ordinary pipeline, which already knows how to
 * tell a follow-up from a new search.
 *
 * Anything that is not clearly about the offer must come back false. A false
 * negative costs one extra sentence ("just say the word"); a false positive
 * silently spends a watch slot on something the buyer never asked for, on a
 * feature they are paying for.
 */
export function classifyWatchIntentTool() {
  return tool({
    description:
      "Call this exactly once to report whether the buyer's latest message is asking Velte to watch the price of the products it just offered to watch, and if so which of them.",
    inputSchema: z.object({
      wantsWatch: z
        .boolean()
        .describe(
          "true ONLY if this message is asking Velte to track/watch/monitor the price of one or more of the numbered products above, or to be told when they get cheaper — including short replies that only make sense as an answer to that offer ('yes please', 'the first one', 'both of them', 'watch the Tecno', 'yes do it'). false for ANYTHING else: a new search, a follow-up question about the products, a question about price or delivery, a greeting, a complaint, or a plain 'no'. When you are not sure, answer false.",
        ),
      selectedNumbers: z
        .array(z.number().int())
        .describe(
          "Which of the numbered products above they want watched, by NUMBER, when wantsWatch is true — [1] for 'the first one', [1,2] for 'the first two', every number for 'all of them'/'yes please'/'both'. Match by what they named: a brand, model or word from the product's own title picks that product. Empty array when wantsWatch is false. Never include a number that isn't in the list above.",
        ),
    }),
    execute: async (verdict) => verdict,
  });
}

/**
 * The single-purpose system prompt for that call. Nothing else competes for
 * the model's attention here — the whole reason classifyScopeTool exists as
 * its own round trip rather than a paragraph inside the main prompt.
 *
 * The candidates are numbered rather than passed by id: a short integer is far
 * harder to hallucinate or mangle than a Mongo ObjectId, and the mapping back
 * to real candidates happens in code, where an out-of-range number is simply
 * dropped.
 */
export function buildWatchIntentPrompt(candidates: WatchCandidate[]): string {
  const list = candidates
    .map(
      (c, i) =>
        `${i + 1}. ${c.label} (₦${(c.priceKobo / 100).toLocaleString("en-NG")})`,
    )
    .join("\n");

  return `You are a strict pre-filter for Velte, a Nigerian marketplace assistant.

On the PREVIOUS turn, Velte offered to keep an eye on the price of these products and tell the buyer if any of them gets cheaper:

${list}

Your ONLY job this turn is to call classifyWatchIntent, reporting whether the buyer's latest message is taking Velte up on that offer, and which of the numbered products they mean.

Rules:
- A short reply that only makes sense as an answer to that offer IS taking it up: "yes", "yes please", "go ahead", "do it", "the first one", "the first two", "both", "all of them", "the Tecno one", "track it for me", "tell me when it drops".
- Naming a brand, model, or any distinctive word from a product's own title selects THAT product.
- "All", "both", "yes" with no product named means ALL of the numbered products.
- A message that asks a QUESTION about the products is NOT a watch request — "is it original?", "how far is that one?", "can they deliver?", "why is that one cheaper?" are all follow-ups, not watch requests.
- A message naming something new to buy is NOT a watch request, even if it mentions price: "find me a cheaper one", "what about iPhone 13", "anything under 200k" are new searches.
- A plain refusal is NOT a watch request: "no", "not now", "maybe later".
- Nigerian English and Pidgin count the same way: "abeg watch am", "make you tell me when e drop", "yes now" are all taking up the offer.
- If the message is ambiguous, or you are weighing it up, answer false. Being wrong in that direction costs one extra sentence; being wrong the other way spends the buyer's paid watch allowance on something they never asked for.

Call classifyWatchIntent exactly once, with no other text and no other tool call.`;
}
