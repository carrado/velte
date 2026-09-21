import { USER_AGENT } from "@/lib/server/connectors/pageMeta";
import type { ExternalConnector } from "@/lib/server/connectors/types";
import type { ExternalOffer } from "@/types/search";

// A dedicated Jiji connector (2026-09-21), replacing serper.ts's own
// buildJijiOffer — that function only ever produced ONE thing, a plain link
// to Jiji's own search results page, never a matched listing (see its own
// removed header comment, and NOT_A_SHOP's still-current one, on the
// 2026-08-27 incident that got Jiji pulled out of the matching pipeline in
// the first place: a phone search's top pick was a Jiji listing whose FIRST
// photo was clean and whose later photos showed a broken screen, and every
// comparable listing sampled that day had the seller declaring "No
// cracks" — meaning a Jiji listing's own claims can't be trusted the way a
// real Shopify/WooCommerce store's structured product page can).
//
// Explicit product decision (2026-09-21) to build real matching back, WITH
// the mitigation that incident actually calls for: always fetch and show
// the FULL photo gallery (never just photo one — see
// ExternalOfferCard's own jiji disclaimer, and ExternalOffer.galleryUrls's
// header, for the buyer-facing half of this), and mark a matched listing as
// what it actually is — a real, individual peer's ad, not a checked retailer
// — rather than pretending it carries the same confidence as a Jumia/
// Shopify/WooCommerce match. The plain search-link fallback (this file's own
// buildSearchFallback) stays as the last resort when nothing here matches
// or the page can't be read — a dead end must never come back with nothing
// to try, same rule every connector in this codebase already follows.
//
// NEEDS NO API KEY, unlike serper.ts — this reads Jiji's own public search
// page directly rather than going through Google/Serper, so `isEnabled`
// only ever checks the kill switch below, not a credential. That's also a
// real cost saving: every dead end used to spend one Serper request just to
// build a single unmatched search link.
//
// A KILL SWITCH exists because this is inherently more fragile than the
// other connectors: `serper.ts` sits behind a stable third-party API
// contract, but this file parses a first-party page Jiji itself could
// restructure, rate-limit or start challenging with a bot wall at any time,
// with no upstream changelog to warn this codebase first. `JIJI_SCRAPE_ENABLED`
// unset or anything other than the literal string "false" means enabled —
// same "absence means the old/safe behavior" direction every other flag in
// this codebase defaults to — so a production incident (Jiji blocking the
// UA, the page shape changing and `extractListings` silently returning
// nothing) can be killed instantly without a deploy: unset it and this
// connector falls back to being exactly the old plain-search-link behavior,
// forever, with no code change.
function scrapeEnabled(): boolean {
  return process.env.JIJI_SCRAPE_ENABLED !== "false";
}

const SEARCH_URL = "https://jiji.ng/search";
const ORIGIN = "https://jiji.ng";
const TIMEOUT_MS = 6000;
// The __NUXT_DATA__ blob for a well-populated results page measured well
// under 100kb live; this leaves real headroom without buffering an
// unbounded response from a page that starts serving something unexpected.
const MAX_BYTES = 900_000;
const MAX_GALLERY = 6;
const MAX_ATTRIBUTES = 6;
const DEFAULT_LIMIT = 6;

/**
 * The one-way relevance check this file uses instead of serper.ts's own
 * two-way `titleOverlap` — deliberately different, not a copy that drifted.
 * `titleOverlap` compares two TITLES of similar length and richness to each
 * other (a Google Shopping result against a Google organic result for what
 * should be the same product) and requires the shorter direction to clear
 * 60%, which is right for that comparison. Here the buyer's QUERY ("iphone
 * 12") is being checked against a much longer, more descriptive Jiji title
 * ("Apple iPhone 12 Pro 128 GB Gray, used, no cracks...") — applying the
 * same two-way rule would reject almost every genuine match, since the
 * TITLE's own word count will rarely be 60%+ covered by a 2-3 word query no
 * matter how correct the match is. What actually matters here is simpler:
 * does the title contain what was searched for. Jiji's own search engine
 * already does the primary relevance ranking (unlike Google Shopping, which
 * is a generic aggregator with no idea this is a Nigerian classifieds
 * query) — this is a backstop against the occasional loosely-related
 * result any search engine returns, not the main defense.
 */
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "new",
  "buy",
  "in",
  "of",
  "nigeria",
  "a",
  "an",
  "used",
  "price",
  "online",
]);
function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );
}
const QUERY_RECALL_THRESHOLD = 0.6;
function looksRelevant(query: string, title: string): boolean {
  const q = tokens(query);
  if (!q.size) return true;
  const t = tokens(title);
  let hits = 0;
  for (const w of q) if (t.has(w)) hits += 1;
  return hits / q.size >= QUERY_RECALL_THRESHOLD;
}

interface JijiListing {
  id: number;
  title: string;
  url: string;
  priceText: string | null;
  images: string[];
  description: string | null;
  attributes: { name: string; value: string }[];
  regionName: string | null;
}

/** Devalue's own convention (see extractListings' header): a small integer
 *  inside a field means "the real value is at this array index", checked by
 *  bounds alone rather than a real devalue parser. This holds for every
 *  field this connector reads (verified live before writing this file) —
 *  the one place it could misfire is a genuinely large literal number
 *  small enough to also be a valid index, which none of title/url/price
 *  text/images/attrs/region ever are. */
function deref(arr: unknown[], v: unknown): unknown {
  return typeof v === "number" &&
    Number.isInteger(v) &&
    v >= 0 &&
    v < arr.length
    ? arr[v]
    : v;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** True for an array element that duck-types as one of Jiji's own listing
 *  cards — requires every field this connector actually reads, not merely
 *  some of them, so nothing else in the page's much larger reactive-state
 *  tree (icons, i18n config, unrelated component state — roughly 1500
 *  entries on an ordinary results page) is mistaken for one. */
function looksLikeListingCard(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    "title" in o &&
    "url" in o &&
    "price_title" in o &&
    "images" in o &&
    "id" in o &&
    "slug" in o
  );
}

/**
 * Reads Jiji's own embedded search-results state rather than the rendered
 * DOM. Verified live before a line of this was written (2026-09-21): Jiji
 * is a client-hydrated Nuxt 3 SPA whose initial `window.__NUXT__` is empty
 * (`{}`) — nothing about a listing exists in static markup for a
 * DOM-selector scrape to find — but the page also carries a SEPARATE
 * `<script id="__NUXT_DATA__">` holding Nuxt 3's actual SSR payload: the
 * page's full reactive state, `devalue`-serialized into one flat array with
 * small-integer cross-references in place of repeated values. That array is
 * syntactically valid JSON (confirmed live — `JSON.parse` succeeds against
 * it), so this reads it as plain JSON and resolves references by hand with
 * `deref` rather than pulling in the `devalue` package for one page's worth
 * of data — a real, deliberate shortcut, not an oversight: a full devalue
 * decode would reconstruct the ENTIRE reactive tree (icons, i18n config,
 * everything), when all this needs is roughly a dozen fields off the
 * ~40-80 listing-shaped entries actually in it.
 */
function extractListings(html: string): JijiListing[] {
  const match = html.match(
    /<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/,
  );
  if (!match) return [];

  let arr: unknown[];
  try {
    const parsed: unknown = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return [];
    arr = parsed;
  } catch {
    return [];
  }

  const out: JijiListing[] = [];
  for (const entry of arr) {
    if (!looksLikeListingCard(entry)) continue;
    const o = entry;

    const title = asString(deref(arr, o.title));
    const rawUrl = asString(deref(arr, o.url));
    const id = deref(arr, o.id);
    if (!title || !rawUrl || typeof id !== "number") continue;

    const imagesRef = deref(arr, o.images);
    const images: string[] = Array.isArray(imagesRef)
      ? imagesRef
          .map((ref) => {
            const img = deref(arr, ref);
            if (!img || typeof img !== "object") return null;
            return asString(deref(arr, (img as Record<string, unknown>).url));
          })
          .filter((u): u is string => Boolean(u))
          .slice(0, MAX_GALLERY)
      : [];

    const attrsRef = "attrs" in o ? deref(arr, o.attrs) : null;
    const attributes: { name: string; value: string }[] = [];
    const regionName =
      "region_name" in o ? asString(deref(arr, o.region_name)) : null;
    if (regionName) attributes.push({ name: "Location", value: regionName });
    if (Array.isArray(attrsRef)) {
      for (const ref of attrsRef) {
        if (attributes.length >= MAX_ATTRIBUTES) break;
        const a = deref(arr, ref);
        if (!a || typeof a !== "object") continue;
        const name = asString(deref(arr, (a as Record<string, unknown>).name));
        const value = asString(
          deref(arr, (a as Record<string, unknown>).value),
        );
        if (name && value) attributes.push({ name, value });
      }
    }

    out.push({
      id,
      title,
      url: rawUrl,
      priceText: asString(deref(arr, o.price_title)),
      images,
      description: "details" in o ? asString(deref(arr, o.details)) : null,
      attributes,
      regionName,
    });
  }
  return out;
}

/** Strips Jiji's own search-position tracking params (page/pos/lid/…) off
 *  a listing URL — same reasoning as serper.ts's cleanUrl stripping
 *  Google's srsltid: the listing's own path is the real identity, the
 *  query string is just where-in-the-list noise. */
function cleanListingUrl(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl, ORIGIN);
    return `${u.origin}${u.pathname}`;
  } catch {
    return null;
  }
}

const jijiSearchLink = (q: string) =>
  `${ORIGIN}/search?query=${encodeURIComponent(q)}`;

/** The last-resort offer this connector always has ready — a plain link to
 *  Jiji's own search results for the buyer's exact query, no listing
 *  matched. Needs no network call and can't fail, so it's safe to hand back
 *  whenever real matching finds nothing or the page can't be read at all —
 *  see this file's own header on why a dead end must never come back with
 *  literally nothing to try. Exactly what serper.ts's buildJijiOffer used
 *  to be, moved here since Jiji now has its own connector. */
function buildSearchFallback(q: string): ExternalOffer {
  return {
    id: "jiji-search",
    title: q,
    priceText: null,
    imageUrl: null,
    galleryUrls: [],
    description: null,
    attributes: [],
    merchant: "Jiji",
    platform: "jiji",
    source: "jiji",
    url: jijiSearchLink(q),
    isDirectLink: false,
  };
}

export const jijiConnector: ExternalConnector = {
  name: "jiji",

  isEnabled() {
    return scrapeEnabled();
  },

  async search({ query, limit = DEFAULT_LIMIT }) {
    const q = query.trim();
    if (!q) return [];
    const fallback = buildSearchFallback(q);
    if (!scrapeEnabled()) return [fallback];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${SEARCH_URL}?query=${encodeURIComponent(q)}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: controller.signal,
        cache: "no-store",
        redirect: "follow",
      });
      if (!res.ok || !res.body) {
        console.error(`[connectors/jiji] search page responded ${res.status}`);
        return [fallback];
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let html = "";
      try {
        while (html.length < MAX_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          html += decoder.decode(value, { stream: true });
        }
      } finally {
        await reader.cancel().catch(() => {});
      }

      const listings = extractListings(html).filter((l) =>
        looksRelevant(q, l.title),
      );
      if (!listings.length) return [fallback];

      const offers: ExternalOffer[] = listings.slice(0, limit).map((l) => {
        const cleanUrl = cleanListingUrl(l.url) ?? jijiSearchLink(q);
        return {
          id: `jiji-${l.id}`,
          title: l.title,
          priceText: l.priceText,
          imageUrl: l.images[0] ?? null,
          galleryUrls: l.images.slice(1),
          description: l.description,
          attributes: l.attributes,
          merchant: "Jiji",
          platform: "jiji",
          source: "jiji",
          url: cleanUrl,
          isDirectLink: cleanListingUrl(l.url) !== null,
        };
      });

      // The plain search link still rides along at the end, capacity
      // permitting — matched listings are real, individual ads (see this
      // file's own header on why that's a lower confidence tier than a
      // Jumia/Shopify/WooCommerce match, never a reason to hide the option
      // to keep looking on Jiji directly).
      if (offers.length < limit) offers.push(fallback);
      return offers;
    } catch (err) {
      // Timeout, DNS, a bot wall, Jiji restructuring the page — all the
      // same thing here: never throw (see ExternalConnector's own
      // contract), always still hand back something to try.
      console.error(
        "[connectors/jiji] lookup failed:",
        err instanceof Error ? err.message : err,
      );
      return [fallback];
    } finally {
      clearTimeout(timer);
    }
  },
};
