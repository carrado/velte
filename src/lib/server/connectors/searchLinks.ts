import { looksLikeServiceTask } from "@/lib/server/ai/sectorClarifiers";
import type { ExternalOffer } from "@/types/search";

// "Keep looking yourself" links (2026-09-24) — a pre-filled search on the
// sites a Nigerian buyer would actually try next, shown as one plain line
// under the results (SearchHome), never as a result card. Replaces
// jiji.ts's old single search-page fallback, which only ever offered Jiji
// and — when Jiji's page couldn't be read on velte-dev — rendered as an
// image-less "result" card.
//
// No network call and nothing to fail: each link is just the site's own
// search URL with the query filled in, so these are attached to every
// dead end regardless of what the connectors managed to fetch.
//
// WHICH sites depends on what is being looked for — Jumia doesn't sell land
// and PropertyPro doesn't sell phones, and a link to a site that can't have
// the thing is worse than no link. Every URL shape below was checked live
// to actually apply the query (2026-09-24); Nigeria Property Centre was
// tried and dropped because its search page ignores the query string.

type LinkKind = "goods" | "property" | "service";

// Deliberately narrow and literal — detectSector can't place "land
// Independence Layout" at all, and a missed property query only costs the
// buyer Jumia/Konga links next to Jiji, while a false positive would hide
// the retail sites from a real product search.
const PROPERTY_PATTERN =
  /\b(land|lands|plot|plots|acre|acres|hectares?|duplex|bungalow|apartment|apartments|flat|flats|bedroom|self[- ]?contain(ed)?|real estate|property|properties|house for (rent|sale|lease)|shop space|office space|for rent|for lease)\b/i;

function kindOf(query: string): LinkKind {
  if (PROPERTY_PATTERN.test(query)) return "property";
  if (looksLikeServiceTask(query)) return "service";
  return "goods";
}

interface SearchSite {
  merchant: string;
  platform: ExternalOffer["platform"];
  /** Nationwide stores ignore location — "iphone 12 Enugu" on Jumia only
   *  narrows the match for no reason. Classifieds and property listings
   *  are where a place name genuinely filters. */
  usesLocation: boolean;
  url: (q: string) => string;
}

const JUMIA: SearchSite = {
  merchant: "Jumia",
  platform: "jumia",
  usesLocation: false,
  url: (q) => `https://www.jumia.com.ng/catalog/?q=${encodeURIComponent(q)}`,
};
const KONGA: SearchSite = {
  merchant: "Konga",
  platform: "konga",
  usesLocation: false,
  url: (q) => `https://www.konga.com/search?search=${encodeURIComponent(q)}`,
};
const JIJI: SearchSite = {
  merchant: "Jiji",
  platform: "jiji",
  usesLocation: true,
  url: (q) => `https://jiji.ng/search?query=${encodeURIComponent(q)}`,
};
const PROPERTYPRO: SearchSite = {
  merchant: "PropertyPro",
  platform: "propertypro",
  usesLocation: true,
  url: (q) =>
    `https://propertypro.ng/property-for-${/\b(rent|lease)\b/i.test(q) ? "rent" : "sale"}?search=${encodeURIComponent(q)}`,
};

const SITES_BY_KIND: Record<LinkKind, SearchSite[]> = {
  goods: [JUMIA, KONGA, JIJI],
  property: [PROPERTYPRO, JIJI],
  service: [JIJI],
};

/** The search links for `query`, in display order. Every one has
 *  `isDirectLink: false` — that flag is how route.ts and SearchHome tell
 *  them apart from real listings. */
export function buildSearchLinks(
  query: string,
  location?: string | null,
): ExternalOffer[] {
  const q = query.trim();
  if (!q) return [];
  const place = location?.trim();
  return SITES_BY_KIND[kindOf(q)].map((site) => ({
    id: `search-${site.platform}`,
    title: q,
    priceText: null,
    imageUrl: null,
    galleryUrls: [],
    description: null,
    attributes: [],
    merchant: site.merchant,
    platform: site.platform,
    source: "search-link",
    url: site.url(site.usesLocation && place ? `${q} ${place}` : q),
    isDirectLink: false,
  }));
}
