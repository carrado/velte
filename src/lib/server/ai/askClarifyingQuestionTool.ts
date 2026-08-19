import { tool } from "ai";
import { z } from "zod";

// `options` deliberately has no unconditional `.min(2)` here (moved into
// the `superRefine` below, scoped to `kind === "choice"` only) — a model
// that sends a stray empty/short `options` array alongside `kind: "text"`
// or `kind: "location"` (neither of which needs it) must never fail this
// whole tool call's validation over a field it wasn't required to fill
// correctly in the first place. Found live: an invalid tool call here has
// no visible failure mode to the buyer — the model just falls back to
// writing the question as plain reply text with no tool call at all, which
// means no clarification widget ever renders, silently.
const inputSchema = z
  .object({
    question: z
      .string()
      .describe(
        "The exact clarifying question to show the buyer, phrased conversationally — this IS your reply text for the turn, not a separate label. One short, focused question.",
      ),
    kind: z
      .enum(["choice", "text", "location", "name"])
      .describe(
        "'choice': the answer is one of a small discrete/closed set (gender, size category, color family, a plan/action fork) — provide 2-5 short concrete options. 'text': genuinely open-ended (budget, an exact address, a brand, a free-form description) with no fixed small set of answers — omit options. 'location': neither a named place nor the buyer's device location exists for a search that needs one (see systemPrompt.ts's location rule) — omit options; the frontend renders a one-tap \"share my location\" action (real device geolocation, not a typed answer) plus a plain decline, never buttons built from your own text. 'name': specifically asking for the buyer's own name (the createBuyerRequest agreement flow — see systemPrompt.ts) — omit options; the frontend swaps its composer into a dedicated single-line name input for this, the same treatment the phone/OTP identity capture already gets, rather than a generic text box. Never use 'text' for a name ask.",
      ),
    options: z
      .array(z.string())
      .max(5)
      .optional()
      .describe(
        "Required (2-5 entries) when kind is 'choice'; omit for 'text' and 'location'. Each option must read as a complete, standalone reply exactly as the buyer would say it themselves (e.g. 'Men's', 'Search nationwide anyway') — never a bare 'Yes'/'No' — since the chosen option becomes the buyer's literal next message verbatim, with no other context attached.",
      ),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "choice" && (data.options?.length ?? 0) < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "kind 'choice' requires at least 2 options.",
        path: ["options"],
      });
    }
  });

/**
 * Structured stand-in for today's plain-text clarifying question — called
 * INSTEAD OF a search tool when the buyer's request needs one more piece of
 * information first (see systemPrompt.ts's "ask ONE short question" rule),
 * or instead of createBuyerRequest when the conversation so far wouldn't
 * give a VENDOR enough to act on (see that tool's own rule) — same
 * question/answer mechanic either way, just gating a different next tool.
 * `execute` is a pure echo: there's nothing to fetch, this tool exists only
 * so the model's choice of question TYPE (a discrete pick vs. free text) is
 * validated structured output the frontend can render as real buttons or a
 * dedicated input, rather than something parsed out of prose.
 */
export function askClarifyingQuestionTool() {
  return tool({
    description:
      "Call this INSTEAD OF searchProducts/searchStores/getVendorProducts/createBuyerRequest when the buyer's request (or, for createBuyerRequest specifically, what a vendor reading its description would need) is too thin and needs ONE more piece of information first. Never call this alongside another tool in the same turn.",
    inputSchema,
    execute: async (input) => input,
  });
}
