import { tool } from "ai";
import { z } from "zod";

const inputSchema = z.object({
  question: z
    .string()
    .describe(
      "The exact clarifying question to show the buyer, phrased conversationally — this IS your reply text for the turn, not a separate label. One short, focused question.",
    ),
  kind: z
    .enum(["choice", "text"])
    .describe(
      "'choice': the answer is one of a small discrete/closed set (gender, size category, color family, a plan/action fork) — provide 2-5 short concrete options. 'text': genuinely open-ended (budget, an exact address, a brand, a free-form description) with no fixed small set of answers — omit options.",
    ),
  options: z
    .array(z.string())
    .min(2)
    .max(5)
    .optional()
    .describe(
      "Required when kind is 'choice'; omit for 'text'. Each option must read as a complete, standalone reply exactly as the buyer would say it themselves (e.g. 'Men's', 'Search nationwide anyway') — never a bare 'Yes'/'No' — since the chosen option becomes the buyer's literal next message verbatim, with no other context attached.",
    ),
});

/**
 * Structured stand-in for today's plain-text clarifying question — called
 * INSTEAD OF a search tool when the buyer's request needs one more piece of
 * information first (see systemPrompt.ts's "ask ONE short question" rule).
 * `execute` is a pure echo: there's nothing to fetch, this tool exists only
 * so the model's choice of question TYPE (a discrete pick vs. free text) is
 * validated structured output the frontend can render as real buttons or a
 * dedicated input, rather than something parsed out of prose.
 */
export function askClarifyingQuestionTool() {
  return tool({
    description:
      "Call this INSTEAD OF searchProducts/searchStores/getVendorProducts when the buyer's request is too thin to answer well and needs ONE more piece of information first. Never call this alongside another tool in the same turn.",
    inputSchema,
    execute: async (input) => input,
  });
}
