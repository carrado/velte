import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";

// A second, single-purpose look at classifyScope's `isBulkPurchase`
// (2026-09-23). Found live: "Like 3 plots of land.. Around 10-20 million"
// was read as a bulk purchase and sent into the Shopping Plan deadline ask.
// Tested directly, that field came back true for EVERYTHING — "I need 20
// office chairs" included — and rewording its description (quantity rule
// first, the "prefer true" lean narrowed) changed nothing across repeated
// runs. It is one field among a dozen in one call, and the model isn't
// weighing it; the same reason classifyScope itself was split out of the
// main prompt (see its own header).
//
// Only ever runs when that field says true, so an ordinary turn pays
// nothing. The model LISTS the different kinds of thing the need implies
// and CODE counts them — "translate, don't decide", the same discipline
// resolveBudgetNaira follows — rather than asking the same yes/no again.
//
// Fails toward the classifier's own answer on any error or timeout: this
// can only ever take a false positive away, never be the reason a real
// furnishing project loses its plan.

const TIMEOUT_MS = 6000;
const PROVIDER_ORDER = ["openai", "groq"] as const;
/** classifyScope's own threshold: exactly two needs is a dual-intent
 *  search, not a plan. */
const MIN_KINDS_FOR_BULK = 3;

function kindsTool() {
  return tool({
    description:
      "Call this exactly once with the distinct KINDS of thing the buyer needs to buy or hire to satisfy their request.",
    inputSchema: z.object({
      kinds: z
        .array(z.string())
        .describe(
          [
            "Each DIFFERENT kind of item or service, once, as a short noun ('sofa', 'bed', 'wardrobe'). Quantity never adds entries: '3 plots of land' is ['land'], '20 office chairs' is ['office chair'], '5 bags of rice' is ['rice'].",
            "A goal that clearly implies a set of different things gets its typical set even when none are named — 'furnish my 2 bedroom apartment' is ['sofa', 'bed', 'wardrobe', 'dining set', ...]; 'kit out my new office' is ['desk', 'office chair', 'printer', ...].",
            "Hiring one professional to do a job is ONE entry ('interior decorator'), not the things they'd use.",
          ].join(" "),
        ),
    }),
    execute: async (v) => v,
  });
}

/**
 * Whether the request really needs several different kinds of thing.
 * `conversation` is the recent turns, oldest first — a follow-up like
 * "3 plots of land" only makes sense next to the request it answers.
 */
export async function confirmBulkPurchase(
  conversation: { role: "user" | "assistant"; content: string }[],
): Promise<boolean> {
  if (!conversation.length) return true;
  try {
    const result = await Promise.race([
      callLLM(
        {
          system:
            "A buyer on Velte, a Nigerian shopping assistant, is describing what they need. Report the distinct kinds of thing it takes to satisfy their CURRENT request — see the tool's schema for exactly how to count.",
          messages: conversation,
          tools: { reportKinds: kindsTool() },
          toolChoice: "required",
        },
        [...PROVIDER_ORDER],
        "bulk-purchase-confirm",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("bulk-purchase confirm timed out")),
          TIMEOUT_MS,
        ),
      ),
    ]);
    const output = result.toolResults.find((r) => r.toolName === "reportKinds")
      ?.output as { kinds?: unknown } | undefined;
    if (!Array.isArray(output?.kinds)) return true;
    const distinct = new Set(
      output.kinds
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
    );
    return distinct.size >= MIN_KINDS_FOR_BULK;
  } catch (err) {
    console.error(
      "[search] bulk-purchase confirm failed, keeping the classifier's answer:",
      err instanceof Error ? err.message : err,
    );
    return true;
  }
}
