import type {
  ShownProduct,
  StoreProductItem,
  VendorMatch,
} from "@/types/search";

const CATALOG_CAP = 40;

function attributeLabels(
  attributes: VendorMatch["attributes"] | string[] | undefined,
): string[] {
  if (!Array.isArray(attributes)) return [];
  return attributes
    .map((a) => (typeof a === "string" ? a : a?.value ? String(a.value) : ""))
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function compactVendorMatch(match: VendorMatch): ShownProduct {
  return {
    productId: match.productId,
    name: match.name,
    vendorId: match.vendorId,
    vendorName: match.vendorName,
    checkoutEligible: Boolean(match.checkoutEligible),
    attributes: attributeLabels(match.attributes),
  };
}

export function compactStoreProduct(
  item: StoreProductItem,
  store: { vendorId: string; name: string },
): ShownProduct {
  return {
    productId: item.productId,
    name: item.name,
    vendorId: store.vendorId,
    vendorName: store.name,
    checkoutEligible: Boolean(item.checkoutEligible),
    attributes: [],
  };
}

export function rememberShown(
  catalog: ShownProduct[],
  incoming: ShownProduct[],
): ShownProduct[] {
  const next = new Map(catalog.map((row) => [row.productId, row]));
  for (const row of incoming) {
    if (!row.productId) continue;
    next.set(row.productId, row);
  }
  return Array.from(next.values()).slice(-CATALOG_CAP);
}

const ORDINAL: Record<string, number> = {
  first: 1,
  "1st": 1,
  second: 2,
  "2nd": 2,
  third: 3,
  "3rd": 3,
  fourth: 4,
  "4th": 4,
  fifth: 5,
  "5th": 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  last: -1,
};

export function pickDefaultShown(catalog: ShownProduct[]): ShownProduct | null {
  if (catalog.length === 0) return null;
  return catalog.find((row) => row.checkoutEligible) ?? catalog[0] ?? null;
}

export function resolveShownProduct(
  catalog: ShownProduct[],
  input: {
    productId?: string | null;
    ordinal?: number | null;
    nameHint?: string | null;
  },
): ShownProduct | null {
  if (catalog.length === 0) return null;

  const id = String(input.productId ?? "").trim();
  if (id) {
    const exact = catalog.find((row) => row.productId === id);
    if (exact) return exact;
  }

  const ordinal = input.ordinal;
  if (typeof ordinal === "number" && Number.isInteger(ordinal)) {
    if (ordinal === -1) return catalog[catalog.length - 1] ?? null;
    if (ordinal >= 1 && ordinal <= catalog.length) {
      return catalog[ordinal - 1] ?? null;
    }
  }

  const hint = String(input.nameHint ?? "")
    .trim()
    .toLowerCase();
  // Bare "add it" / "add to cart" / "the exact match" — first checkout-
  // eligible listing the buyer was just shown, not a new search.
  if (
    !hint ||
    /^(the\s+)?(exact(\s+match|\s+one)?|it|this|that|this one|that one|them)$/.test(
      hint,
    )
  ) {
    return pickDefaultShown(catalog);
  }

  const fromWord = ORDINAL[hint.replace(/^(the|that)\s+/, "")];
  if (fromWord != null) {
    return resolveShownProduct(catalog, { ordinal: fromWord });
  }

  const hay = (row: ShownProduct) =>
    `${row.name} ${row.attributes.join(" ")} ${row.vendorName}`.toLowerCase();

  const includes = catalog.filter((row) => hay(row).includes(hint));
  if (includes.length === 1) return includes[0];

  const tokens = hint
    .replace(/^(the|that|this)\s+/, "")
    .replace(/\s+one$/, "")
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (tokens.length === 0) return includes[0] ?? null;
  const scored = catalog.filter((row) => {
    const h = hay(row);
    return tokens.every((t) => h.includes(t));
  });
  return scored.length === 1 ? scored[0] : null;
}

export function catalogPromptLines(catalog: ShownProduct[]): string {
  if (catalog.length === 0) return "";
  const rows = catalog.slice(-20).map((row, i) => {
    const attrs = row.attributes.length
      ? ` · ${row.attributes.join(", ")}`
      : "";
    const cart = row.checkoutEligible ? "can add to cart" : "WhatsApp only";
    return `${i + 1}. ${row.productId} — ${row.name} at ${row.vendorName || "a store"} (${cart})${attrs}`;
  });
  return rows.join("\n");
}
