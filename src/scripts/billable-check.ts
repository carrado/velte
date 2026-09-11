import { isBillableTurn, type BillableTurnShape } from "@/lib/turnBillable";

let fails = 0;
const check = (name: string, cond: boolean, extra?: unknown) => {
  if (!cond) {
    fails++;
    console.log("FAIL", name, extra ?? "");
  } else console.log("ok  ", name);
};

const base: BillableTurnShape = {
  clarification: null,
  products: [],
  weakProducts: [],
  stores: [],
  furtherStores: [],
  productStores: [],
  vendorProducts: [],
  externalOffers: [],
  externalStoreSuggestions: [],
};
const t = (o: Partial<BillableTurnShape>) => ({ ...base, ...o });

// The exemption this change exists for
check(
  "clarification with nothing shown -> FREE",
  !isBillableTurn(t({ clarification: { question: "which?" } })),
);

// ...and it must not become a loophole
check(
  "clarification WITH products -> charged",
  isBillableTurn(t({ clarification: { question: "which?" }, products: [{}] })),
);
check(
  "clarification WITH stores -> charged",
  isBillableTurn(t({ clarification: { question: "which?" }, stores: [{}] })),
);
check(
  "clarification WITH external offers -> charged",
  isBillableTurn(
    t({ clarification: { question: "which?" }, externalOffers: [{}] }),
  ),
);
check(
  "clarification WITH weak products -> charged",
  isBillableTurn(
    t({ clarification: { question: "which?" }, weakProducts: [{}] }),
  ),
);
check(
  "clarification WITH vendor products -> charged",
  isBillableTurn(
    t({ clarification: { question: "which?" }, vendorProducts: [{}] }),
  ),
);

// The pre-existing exemption must survive untouched
check(
  "nearby-businesses path -> FREE",
  !isBillableTurn(t({ externalStoreSuggestions: [{}] })),
);
check(
  "  ...but not when Serper also ran",
  isBillableTurn(t({ externalStoreSuggestions: [{}], externalOffers: [{}] })),
);

// A dead end is charged, deliberately (it called Serper)
check(
  "dead end with external offers -> charged",
  isBillableTurn(t({ externalOffers: [{}] })),
);

// A plain successful search
check("normal results -> charged", isBillableTurn(t({ products: [{}, {}] })));

// The edge that decides the whole thing: no clarification, nothing shown.
// A genuine "I found nothing at all" turn still did the work, so it pays.
check("no clarification and nothing shown -> charged", isBillableTurn(base));

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
