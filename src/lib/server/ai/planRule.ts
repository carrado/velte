// THE definition of what counts as a genuine Shopping Plan request — read
// only by toolAlignment.ts today, since (unlike Compare) a plan is not also
// inferred from plain text with no tool selected; it's explicit-tool-only,
// so there is no classifyScopeTool sibling call to keep in step with. Kept
// as its own file anyway, matching comparisonRule.ts's own shape, so the
// rule stays a decision procedure and not a list of examples the model
// pattern-matches against instead of actually judging.
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
