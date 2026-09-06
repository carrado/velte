// THE definition of what counts as a comparison, in one place.
//
// Two separate calls have to answer this same question and must never drift
// into disagreeing about it:
//   - toolAlignment.ts, when the buyer explicitly picked the Compare tool
//     and we're deciding whether their message honours that promise, and
//   - classifyScopeTool / buildScopeCheckSystemPrompt, which judges every
//     message-bearing turn so a comparison typed with no tool selected is
//     still treated as one.
//
// Written as a DECISION PROCEDURE, not a list of examples (rewritten
// 2026-09-05). The example-led version missed three real buyer messages in a
// row — brand-level options ("Between iPhone and Samsung"), a message whose
// opening sentence looked like a plain search ("I need a good phone for my
// content creation. Between iPhone and Samsung..."), and model-year options
// with a constraint attached ("2026 Toyota Camry and 2025 Lexus Jeep, which
// one should I go for, considering Nigerian roads"). Each miss was answered
// by adding another example, which is whack-a-mole: the model was matching
// against the shape of the examples instead of understanding the question.
// The rule below states the actual test once and lists examples only as
// illustrations of it.
export const COMPARE_TOOL_RULE = [
  "A COMPARISON is a request to weigh options against each other, rather than simply to find one thing.",
  "",
  "Decide it with ONE test: has the buyer put two or more alternatives in play, and are they asking which to pick? If yes, it is a comparison. If no, it is not.",
  "",
  "Apply that test with these in mind:",
  "",
  "- The alternatives can be named at ANY level of specificity, and none of these is ever 'too vague' to count: exact models ('Infinix Hot 50i vs Samsung Galaxy A15'), brands or makes ('iPhone and Samsung', 'Tecno or Infinix'), product families ('Galaxy S vs Galaxy A'), model years or trims ('2026 Toyota Camry and 2025 Lexus'), or whole categories ('a laptop or a tablet for school'). Brand-against-brand is one of the most common real comparisons buyers ask.",
  "- The ask can be phrased ANY way a real person would phrase it: 'which is better', 'which should I go for', 'which one do I pick', 'help me decide', 'X or Y?', \"what's the difference\", or simply naming two things side by side and asking which to choose. Never require a particular wording.",
  "- EXTRA CONTEXT DOES NOT DISQUALIFY IT. A need, use case, budget or constraint stated in the same message ('...for content creation', '...considering Nigerian roads', '...under ₦500k') still leaves it a comparison. Read the WHOLE message — never judge it from its opening sentence alone, which very often reads like an ordinary search ('I need a good phone...') before the alternatives are named.",
  "- It is still a comparison when the alternatives were named EARLIER in the conversation and this message only asks which to pick ('so which one?', 'which of those is better for me?').",
  "",
  "It is NOT a comparison when no alternatives are in play at all — a single thing named, or a plain 'find me X' ('I need a phone', 'where can I get rice'). A search for one thing routinely ends up SHOWING several options, but being shown options is not the same as being ASKED to weigh named ones.",
  "",
  "It is also NOT a comparison when the buyer is asking what EXISTS rather than which is better, even if they say 'or'. The tell is the verb: 'do you have…', 'do you sell…', 'any … in stock?', 'can I get…', 'are there…' all ask you to CHECK AVAILABILITY, and the buyer would happily take either thing — 'do you have rice or beans', 'do you sell chargers or power banks', 'any Tecno or Infinix in stock?'. Compare that with 'which should I…', 'which is better…', 'help me decide…', 'is X better than Y', which ask you to JUDGE. Asking what you stock is never a comparison, however many things get listed.",
  "",
  "One boundary to keep straight: comparison alternatives are MUTUALLY EXCLUSIVE — the buyer will end up picking ONE of them. Two things they want BOTH of is not a comparison at all ('a phone repair shop that also sells iPhone chargers', 'fix my laptop and I also need a caterer' — those are two separate needs, and they are counted elsewhere). Ask yourself whether the buyer walks away with one of these or with all of them.",
].join("\n");
