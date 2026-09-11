// THE definition of what counts as a genuine Shopping Plan request, in one
// place.
//
// TWO callers now read it, and they must never drift into disagreeing about
// it (exactly the shape comparisonRule.ts's own header describes):
//   - toolAlignment.ts, when the buyer explicitly picked the Shopping Plan
//     tool and we're deciding whether their message honours that promise,
//     and
//   - classifyScopeTool / buildScopeCheckSystemPrompt, which judges every
//     message-bearing turn so a plan request typed with NO tool selected is
//     still treated as one.
//
// That second caller is new (2026-09-10, per explicit product direction) and
// reverses what this file used to say: a plan was deliberately
// explicit-tool-only, on the reasoning that inferring one wrongly would hand
// a buyer a whole checklist they never asked for. What changed is that the
// cost of the OTHER error turned out to be higher — "I want to set up an
// office space, what and what do I need" is unmistakably a plan, and
// answering it with a single generic search (or worse, a location question)
// misses the entire feature. The false-positive risk is handled where it
// belongs instead: in the rule below, which is written as a decision
// procedure with the not-a-plan cases spelled out, and by the plan flow
// itself asking for a budget before it commits to anything.
export const PLAN_TOOL_RULE = [
  "A SHOPPING PLAN request states a GOAL and a BUDGET the buyer wants to spend across MULTIPLE things, not a single item to find right now.",
  "",
  "Decide it with ONE test: is the buyer describing a broader need that resolves into a whole list of things to buy, with a total amount of money in mind for all of it together? If yes, it fits. If they are naming ONE specific thing to buy or find, it does not — that is an ordinary search, not a plan.",
  "",
  "Apply that test with these in mind:",
  "",
  "- A real budget figure is what makes this workable, but its ABSENCE does not disqualify the request — 'I'm moving into a new apartment, need the essentials' still fits even with no naira figure yet; the flow itself asks for one before building anything.",
  "- The goal can be phrased as a LIFE EVENT ('moving into a new apartment', 'starting a new office', 'setting up a small restaurant') or as a plain list request ('help me plan out everything I need for my kitchen') — either counts.",
  "- A stated PRIORITY word ('essentials only', 'the basics', 'everything') still fits — it shapes how big the resulting list is, not whether this is a plan at all.",
  "",
  "It is NOT a shopping plan when the buyer names ONE specific product or service to find, however they phrase the budget alongside it — 'a laptop under ₦500k', 'find me a fridge, I have ₦300k' are ordinary single-item searches with a budget attached, not a plan across multiple categories.",
].join("\n");
