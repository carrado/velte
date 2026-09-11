import { compareQuotes, leadTimeLabel } from "@/lib/quoteCompare";
import type { BuyerRequestResponder } from "@/types/buyerRequest";

let fails = 0;
const check = (name: string, cond: boolean, extra?: unknown) => {
  if (!cond) {
    fails++;
    console.log("FAIL", name, extra ?? "");
  } else console.log("ok  ", name);
};

const v = (
  id: string,
  priceNaira: number | null,
  leadTimeDays: number | null = null,
): BuyerRequestResponder => ({
  vendorId: id,
  name: id,
  avatar: null,
  storeHandle: null,
  area: null,
  state: null,
  respondedAt: "2026-09-03T10:00:00Z",
  priceKobo: priceNaira == null ? null : priceNaira * 100,
  leadTimeDays,
  note: null,
});

// 1. nobody quoted
let c = compareQuotes([v("A", null), v("B", null)]);
check(
  "no quotes -> no comparison",
  c.cheapest === null && c.recommendation === null && c.spreadKobo === null,
);
check(
  "  unquoted still listed",
  c.unquoted.length === 2 && c.quoted.length === 0,
);

// 2. a single quote is a price, not a choice
c = compareQuotes([v("A", 450_000), v("B", null)]);
check(
  "one quote -> cheapest set, NO recommendation",
  c.cheapest?.vendorId === "A" && c.recommendation === null,
  c.recommendation,
);

// 3. plain cheapest wins
c = compareQuotes([v("A", 590_000), v("B", 560_000), v("C", 575_000)]);
check(
  "cheapest recommended",
  c.recommendation?.responder.vendorId === "B",
  c.recommendation,
);
check("  sorted ascending", c.quoted.map((q) => q.vendorId).join() === "B,C,A");
check(
  "  spread is high minus low",
  c.spreadKobo === 30_000 * 100,
  c.spreadKobo,
);
check(
  "  reason cites the spread",
  c.recommendation!.reason.includes("₦30,000"),
  c.recommendation!.reason,
);

// 4. the speed override: barely dearer, meaningfully sooner
c = compareQuotes([v("Cheap", 500_000, 7), v("Fast", 520_000, 2)]);
check(
  "speed override fires",
  c.recommendation?.responder.vendorId === "Fast",
  c.recommendation,
);
check(
  "  reason states both halves",
  /₦20,000 more/.test(c.recommendation!.reason) &&
    /5 days sooner/.test(c.recommendation!.reason),
  c.recommendation!.reason,
);

// 5. too dear to justify — 11% over the 10% ceiling
c = compareQuotes([v("Cheap", 500_000, 7), v("Fast", 560_000, 2)]);
check(
  "11% dearer -> stays with cheapest",
  c.recommendation?.responder.vendorId === "Cheap",
  c.recommendation,
);

// 6. faster but not meaningfully (1 day)
c = compareQuotes([v("Cheap", 500_000, 3), v("Fast", 505_000, 2)]);
check(
  "1 day sooner is not enough",
  c.recommendation?.responder.vendorId === "Cheap",
  c.recommendation,
);

// 7. cheapest is also fastest -> no second badge
c = compareQuotes([v("A", 500_000, 1), v("B", 600_000, 5)]);
check(
  "cheapest also fastest -> fastest badge suppressed",
  c.fastest === null,
  c.fastest,
);

// 8. missing lead times can't trigger the override
c = compareQuotes([v("Cheap", 500_000, null), v("Other", 505_000, 1)]);
check(
  "no lead time on cheapest -> no override",
  c.recommendation?.responder.vendorId === "Cheap",
  c.recommendation,
);

// 9. mixed quoted + unquoted
c = compareQuotes([v("A", 500_000), v("B", null), v("C", 400_000)]);
check(
  "mixed: quoted ranked, unquoted separate",
  c.quoted.length === 2 &&
    c.unquoted.length === 1 &&
    c.cheapest?.vendorId === "C",
);

// 10. a zero/negative price is not a quote
c = compareQuotes([v("A", 0), v("B", 500_000), v("C", 600_000)]);
check(
  "zero price treated as unquoted",
  c.quoted.length === 2 && c.unquoted.some((u) => u.vendorId === "A"),
  { q: c.quoted.length, u: c.unquoted.length },
);

// 11. labels
check("leadTimeLabel: null -> null", leadTimeLabel(null) === null);
check(
  "leadTimeLabel: 0 -> Available now",
  leadTimeLabel(0) === "Available now",
);
check("leadTimeLabel: 1 -> singular", leadTimeLabel(1) === "In 1 day");
check("leadTimeLabel: 4 -> plural", leadTimeLabel(4) === "In 4 days");

// 12. never throws on empty
c = compareQuotes([]);
check("empty input safe", c.quoted.length === 0 && c.recommendation === null);

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
