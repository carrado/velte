import { extractQuotedPrice, buildPriceBand } from "@/lib/server/ai/priceBand";
import { buildNegotiationBrief } from "@/lib/server/ai/negotiationBrief";

const N = (kobo: number | null) => (kobo == null ? "—" : "₦" + (kobo / 100).toLocaleString());

const quotes: [string, number | null][] = [
  // Budgets — must NEVER be read as a quote.
  ["I need a laptop under ₦700k", null],
  ["looking for a phone, budget is 200k", null],
  ["something between 100k and 150k", null],
  ["max 80k please", null],
  ["I have 500k for a laptop", null],
  // Not money at all.
  ["iPhone 12 pro max", null],
  ["size 42 shoes", null],
  ["I want 2 bags", null],
  // Real quotes.
  ["they quoted me 135k", 135_000_00],
  ["he's asking 250k for it", 250_000_00],
  ["the seller is asking ₦135,000", 135_000_00],
  ["they said 95,000", 95_000_00],
  ["selling at ₦95,000", 95_000_00],
  ["shop is charging N450,000", 450_000_00],
  ["it goes for 1.2m", 1_200_000_00],
  // Bare replies to "what were you quoted?"
  ["₦120,000", 120_000_00],
  ["135k", 135_000_00],
  // Last figure wins.
  ["I saw it for 120k but he's asking 135k", 135_000_00],
  // Below the band floor.
  ["they quoted me ₦900", null],
];

let bad = 0;
console.log("── extractQuotedPrice ──");
for (const [message, expected] of quotes) {
  const got = extractQuotedPrice(message);
  const ok = got === expected;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${JSON.stringify(message).padEnd(44)} → ${N(got)}${ok ? "" : `   expected ${N(expected)}`}`);
}

console.log("\n── band + verdict + brief ──");
const band = buildPriceBand({
  products: [
    { name: "Tecno Spark 20 Pro", price: 168_000, quoteOnRequest: false } as never,
    { name: "Tecno Spark 20 Pro 256GB", price: 175_000, quoteOnRequest: false } as never,
    { name: "Tecno Spark 20 Pro", price: 182_000, quoteOnRequest: false } as never,
  ],
  offers: [
    { title: "Tecno Spark 20 Pro", priceText: "₦215,000", merchant: "Jumia", source: "jumia.com.ng", url: "a", description: null } as never,
    { title: "Tecno Spark 20 Pro 8/256", priceText: "₦229,900", merchant: "Konga", source: "konga.com", url: "b", description: null } as never,
    { title: "Tecno Spark 20 Pro UK used", priceText: "₦120,000", merchant: "Jiji", source: "jiji.ng", url: "c", description: null } as never,
    { title: "Tecno Spark 20 Pro", priceText: "₦219,000", merchant: "Slot", source: "slot.ng", url: "d", description: null } as never,
  ],
  query: "Tecno Spark 20 Pro",
  message: "they're asking ₦235,000",
});

console.log(JSON.stringify(band, null, 2));
console.log("\nbrief:", JSON.stringify(band && buildNegotiationBrief(band), null, 2));

process.exit(bad ? 1 : 0);
