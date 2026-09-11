import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";
import { COMPARE_TOOL_RULE } from "@/lib/server/ai/comparisonRule";
import { PLAN_TOOL_RULE } from "@/lib/server/ai/planRule";
import type { ComposerTool } from "@/types/search";

// The composer's "+" tool badge (2026-09-06) is a PROMISE, not a hint — the
// buyer explicitly picked Compare from a menu before typing a word, so this
// turn's job narrows to exactly that. If what they typed doesn't actually
// fit, the honest answer is to say so, not to quietly widen the tool's own
// scope or silently treat it like an ordinary search.
//
// A dedicated, single-purpose forced call — same reliability lesson
// classifyScopeTool's own doc comment already explains for this codebase:
// judging "does this fit" inside the big multi-tool system prompt, competing
// with everything else that prompt has to decide in the same turn, is
// exactly where a rule like this drifts. Only runs when a tool is actually
// active, which is a minority of turns, so it adds no latency to the
// ordinary path.
//
// FAILS OPEN (aligned: true) on any error or timeout. The cost of wrongly
// letting a borderline message through is a turn that runs a little more
// broadly than strictly asked; the cost of wrongly declining a genuine one
// is the buyer's request refused outright over an infrastructure hiccup.
// Same asymmetry every other gate in this codebase resolves the same way.

const TIMEOUT_MS = 6000;
const PROVIDER_ORDER = ["openai", "groq"] as const;

const TOOL_LABEL: Record<ComposerTool, string> = {
  compare: "Compare",
  plan: "Shopping Plan",
};

const TOOL_RULE: Record<ComposerTool, string> = {
  compare: COMPARE_TOOL_RULE,
  plan: PLAN_TOOL_RULE,
};

function alignmentTool() {
  return tool({
    description:
      "Call this exactly once to say whether the buyer's message can genuinely be served by the shopping tool they selected.",
    inputSchema: z.object({
      aligned: z
        .boolean()
        .describe(
          "true if the message is a real fit for the selected tool. false ONLY when it clearly is not — e.g. a bare, generic search request ('I need a phone') selected under Compare. When genuinely unsure, prefer true: a message handled a little more broadly than asked is a far smaller cost than a real request refused outright.",
        ),
    }),
    execute: async (v) => v,
  });
}

// COMPARE_TOOL_RULE is shared verbatim with the scope check (2026-09-05) —
// classifyScopeTool's own isComparison judges the SAME question for a buyer
// who never selected the tool at all, and the two may not drift into
// disagreeing definitions. See comparisonRule.ts. PLAN_TOOL_RULE has no such
// sibling — a Shopping Plan is explicit-tool-only, never auto-detected from
// plain text — but is still kept in its own file for the same reason:
// re-exported so existing importers of this module keep working; the
// definitions themselves live in their own files.
export { COMPARE_TOOL_RULE, PLAN_TOOL_RULE };

function systemPromptFor(activeTool: ComposerTool): string {
  const label = TOOL_LABEL[activeTool];

  return [
    `A buyer on Velte, a Nigerian shopping assistant, just selected the "${label}" tool from the composer's tool menu before typing this message.`,
    "",
    TOOL_RULE[activeTool],
    "",
    "Judge only whether the message's own content fits the tool selected — never invent intent that isn't there, and never require the buyer to phrase it in any particular way as long as the underlying request is genuinely one this tool serves.",
  ].join("\n");
}

/**
 * Whether `message` can genuinely be served by `activeTool`. Never throws;
 * returns `true` (let it through) on any failure — see this file's own
 * top comment on why failing open is the only safe direction here.
 */
export async function checkToolAlignment(params: {
  tool: ComposerTool;
  message: string;
}): Promise<boolean> {
  const message = params.message.trim();
  if (!message) return true;

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: systemPromptFor(params.tool),
          messages: [{ role: "user", content: message }],
          tools: { checkAlignment: alignmentTool() },
          toolChoice: "required",
        },
        [...PROVIDER_ORDER],
        "tool-alignment",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("tool alignment check timed out")),
          TIMEOUT_MS,
        ),
      ),
    ]);

    const output = result.toolResults.find(
      (r) => r.toolName === "checkAlignment",
    )?.output as { aligned?: boolean } | undefined;

    return output?.aligned ?? true;
  } catch (err) {
    console.error(
      "[search] tool alignment check failed, letting the turn through:",
      err instanceof Error ? err.message : err,
    );
    return true;
  }
}

/**
 * The reply shown when a message genuinely doesn't fit the selected tool —
 * composed in code, not model prose (same split as every other
 * deterministic-vs-model line in this codebase), so the wording of "you
 * picked X, this doesn't look like X" can never be phrased in a way that
 * accidentally answers the buyer's real request instead of declining it.
 */
export function toolMismatchReply(activeTool: ComposerTool): string {
  const label = TOOL_LABEL[activeTool];
  const example =
    activeTool === "compare"
      ? 'name two or more things to weigh against each other — e.g. "iPhone 15 vs Samsung S24"'
      : 'describe a broader goal and budget across several things — e.g. "moving into a new apartment, ₦2m, need the essentials"';
  return `That doesn't look like a ${label} request — for this tool, ${example}. You can also tap the ${label} icon again to turn it off and just search normally.`;
}
