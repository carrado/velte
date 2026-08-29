import { fetchPageMeta } from "@/lib/server/connectors/pageMeta";
import type { ExternalConnector } from "@/lib/server/connectors/types";
import type { ExternalOffer } from "@/types/search";

// Google Shopping + Google organic via serper.dev — the first external
// connector (Phase 4). Chosen over SerpAPI on price: same data at roughly
// 1/25th the cost, with 2,500 free searches a month, which comfortably
// covers the only path that calls this (dead ends, never every search).
//
// TWO lookups per dead end, not one, and the reason is the whole point of
// this file. `/shopping` has what a card needs — price, image, merchant —
// but its `link` is ALWAYS a google.com/search?ibp=oshop redirect back
// into Google Shopping, never the shop itself. Found live: a buyer told
// "here's where it's selling" tapped through and landed on a Google
// results page, having to start shopping over again. `/search`, restricted
// to a curated list of Nigerian retailers, returns what was actually
// wanted: direct product-page URLs on jumia/konga/slot/oraimo/etc.
//
// So the two are merged — shopping supplies the card, organic supplies the
// destination — and anything that can't be given a real merchant
// destination is DROPPED rather than shipped with a Google link. A shorter
// honest list beats a longer one that lands the buyer back in a search
// engine.
//
// Unconfigured is a first-class state, not an error: no SERPER_API_KEY
// means isEnabled() is false and the orchestrator never calls this, so the
// product behaves exactly as it did before Phase 4.

const SHOPPING_URL = "https://google.serper.dev/shopping";
const SEARCH_URL = "https://google.serper.dev/search";

// Hard ceiling on how long a dead-end turn will wait. By the time this
// runs the buyer has already been told Velte has nothing; making them wait
// much longer for a consolation list is a worse experience than not
// showing one. Both lookups run in parallel and share it.
const TIMEOUT_MS = 6000;

const DEFAULT_LIMIT = 6;

// Which sites an offer may point at, how to recognise one of their product
// pages, and where their own search lives.
//
// Widened 2026-08-26, after "gas cooker" returned zero offers: a tally of
// 20 real queries showed the original seven-shop list was missing most of
// the market — jiji, electromart, alabamart, hogfurniture, zit, fouani,
// mumzcentral, kultra and a long tail besides.
//
// Two layers:
//   1. NAMED merchants below — the ones worth knowing individually, either
//      because their URL shape needs decoding (Jumia hides the product id
//      in a `.html` suffix; Jiji buries it under city/category segments) or
//      because their search page has been checked BY HAND against a live
//      query. Every `search` here was verified to actually return the
//      searched product, not merely to return HTTP 200 — several shops
//      answer 200 with an empty result page, which is a worse destination
//      than none.
//   2. A GENERIC rule (isNigerianShop + GENERIC_PRODUCT_PATH) for any other
//      recognisably Nigerian storefront whose URL matches the shapes the
//      common shop platforms use. Shopify, WooCommerce and Wix all put
//      products under a recognisable path, so most of the tail is reachable
//      without naming anyone.
//
// What is deliberately NOT widened is the market. Google Shopping's results
// for these queries are full of eBay, Alibaba, made-in-china, desertcart
// and US retailers — the single most common `source` in the whole tally was
// a paint shop on Long Island. A buyer in Enugu can act on none of it, so a
// site has to be recognisably Nigerian to appear at all.

interface Merchant {
  /** Matched against the result URL's hostname (substring). */
  domain: string;
  /** What the buyer sees on the card. */
  label: string;
  productPath: RegExp;
  /** The shop's own search page — the destination for a priced Google
   *  Shopping result whose exact product page wasn't in the organic set.
   *  OPTIONAL: a merchant with no verified search page drops its unmatched
   *  shopping results rather than sending a buyer somewhere blank. */
  search?: (query: string) => string;
  /** Display names Google Shopping uses for this shop instead of its
   *  domain. `source` arrives as "electromart nigeria" or "fouani store"
   *  about as often as it arrives as a hostname, and without these those
   *  results have no destination and are thrown away. */
  aliases?: string[];
}

/** The two search-URL shapes almost every Nigerian storefront uses —
 *  Shopify/Wix on the left, WooCommerce on the right. Each merchant below
 *  is pinned to whichever one was verified against it, never assumed from
 *  the platform. */
const shopifySearch = (host: string) => (q: string) =>
  `https://${host}/search?q=${encodeURIComponent(q)}`;
const wooSearch = (host: string) => (q: string) =>
  `https://${host}/?s=${encodeURIComponent(q)}&post_type=product`;

// Product-page shapes used by the common shop platforms, checked against
// real results: `/product/`, `/products/` (Shopify, Woo), `/product-page/`
// (Wix), `/item/`, `/p/`, and Jumia's trailing numeric id. A category or
// collection page matches none of these, which is the whole point.
const GENERIC_PRODUCT_PATH =
  /(\/(products?|product-page|item|dp)\/[^/]+)|(\/p\/[^/]+)|(-\d{6,}\.html$)/i;

// Nigerian shops on a generic TLD — the `.ng` test below can't see these.
// A missing entry costs one shop's results; it can never produce a wrong
// one, which is why this list is safe to grow casually.
const NG_SHOPS_ON_GENERIC_TLDS = new Set([
  "konga.com",
  "alabamart.com",
  "fouanistore.com",
  "hogfurniture.co",
  "jamarahome.com",
  "maybrands.co",
  "mumzcentral.com",
  "shopinverse.com",
  "pointek.net",
  "shoelayers.com",
  "ashluxury.com",
  "komback.com",
  "sojionet.com",
  "polystarelectronics.com",
  "printivo.com",
]);

// Sites that rank for product queries and are not shops a Nigerian buyer
// can use. Social platforms and news sites dominate because they rank well
// for exactly the queries a dead end produces; the international
// marketplaces are here because Google Shopping surfaces them constantly
// for `gl: "ng"` and none of them ships here on terms worth showing.
const NOT_A_SHOP =
  /(^|\.)(facebook|instagram|twitter|youtube|tiktok|pinterest|reddit|linkedin|wikipedia|blogspot|wordpress|medium|quora|nairaland|naijatechguide|legit|punchng|vanguardngr|dailypost|businessday|guardian|amazon|ebay|aliexpress|alibaba|made-in-china|desertcart|ubuy|u-buy|microless|raptorsupplies|temu|wish)\./i;

const MERCHANTS: Merchant[] = [
  {
    domain: "jumia.com.ng",
    label: "Jumia",
    productPath: /-\d{6,}\.html$/i,
    search: (q) =>
      `https://www.jumia.com.ng/catalog/?q=${encodeURIComponent(q)}`,
  },
  {
    domain: "konga.com",
    label: "Konga",
    productPath: /\/product\//i,
    search: (q) =>
      `https://www.konga.com/search?search=${encodeURIComponent(q)}`,
  },
  {
    // The most common source of direct product links in the tally, and the
    // only one whose product URLs carry no product-ish path segment at all
    // — they're /city/category/slug-HASH, sometimes with an extra region
    // segment. Recognised by the trailing hash instead: a category page has
    // neither the depth nor the suffix.
    domain: "jiji.ng",
    label: "Jiji",
    // The trailing token must carry an UPPERCASE letter. Depth and a
    // hyphenated tail alone are not enough: /lagos/furniture/office-chairs
    // satisfies both and is a category grid, which would have been shown
    // to the buyer as a specific product. Jiji's real product slugs end in
    // a mixed-case hash (-yKiHZx7, -gdWHHH3Hs9t2VfJ3viCBUmZ0); its category
    // slugs are plain lowercase words.
    productPath:
      /\/[^/]+\/[^/]+\/[^/]+-(?=[A-Za-z0-9]*[A-Z])[A-Za-z0-9]{6,}(\.html)?$/,
    search: (q) => `https://jiji.ng/search?query=${encodeURIComponent(q)}`,
  },
  {
    // ng., not bare oraimo.com: the brand runs a storefront per country and
    // the Kenyan and Ugandan ones both surfaced in a Nigerian search (live,
    // on "power bank"). A page a buyer here can't order from is worse than
    // no card at all.
    domain: "ng.oraimo.com",
    label: "oraimo",
    productPath: /\/products?\//i,
    // No `search`: both /search?q= and the WooCommerce ?s= form answer 200
    // with none of the searched product on the page.
  },
  {
    domain: "slot.ng",
    label: "Slot",
    productPath: /\/products?\//i,
    search: wooSearch("slot.ng"),
    aliases: ["slot systems", "slot nigeria"],
  },
  {
    domain: "pointek.net",
    label: "Pointek",
    productPath: /\/products?\//i,
    search: wooSearch("pointek.net"),
    aliases: ["pointek online store", "pointek nigeria"],
  },
  {
    // Bare top-level slugs for products (/furgle-ergonomic-gaming-chair)
    // and equally bare ones for categories (/chairs) — shape alone can't
    // separate them, so slug length does: a product name here always runs
    // to several hyphenated words, a category never does.
    domain: "kara.com.ng",
    label: "Kara",
    productPath: /^\/[a-z0-9]+(-[a-z0-9]+){3,}\/?$/i,
    search: wooSearch("kara.com.ng"),
  },
  {
    domain: "justfones.ng",
    label: "Justfones",
    productPath: /\/products?\//i,
    search: wooSearch("justfones.ng"),
  },
  {
    domain: "electromart.com.ng",
    label: "Electromart",
    productPath: GENERIC_PRODUCT_PATH,
    search: wooSearch("electromart.com.ng"),
    aliases: ["electromart nigeria", "electromart"],
  },
  {
    domain: "fouanistore.com",
    label: "Fouani",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("fouanistore.com"),
    aliases: ["fouani store", "fouani nigeria", "fouani"],
  },
  {
    domain: "alabamart.com",
    label: "Alabamart",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("alabamart.com"),
    aliases: ["alabamart"],
  },
  {
    domain: "hogfurniture.co",
    label: "HOG Furniture",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("hogfurniture.co"),
    aliases: ["hog furniture"],
  },
  {
    domain: "zit.ng",
    label: "Zit",
    productPath: GENERIC_PRODUCT_PATH,
    search: wooSearch("zit.ng"),
    aliases: ["zit online store", "zit nigeria"],
  },
  {
    domain: "kultra.com.ng",
    label: "Kultra",
    productPath: GENERIC_PRODUCT_PATH,
    search: wooSearch("kultra.com.ng"),
    aliases: ["kultra"],
  },
  {
    domain: "shopinverse.com",
    label: "Shopinverse",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("shopinverse.com"),
    aliases: ["shopinverse"],
  },
  {
    domain: "jamarahome.com",
    label: "Jamara Home",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("jamarahome.com"),
    aliases: ["jamarahome", "jamara home"],
  },
  {
    domain: "maybrands.co",
    label: "Maybrands",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("maybrands.co"),
    aliases: ["maybrands", "maybrands nigeria"],
  },
  {
    domain: "mumzcentral.com",
    label: "Mumzcentral",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("mumzcentral.com"),
    aliases: ["mumzcentral"],
  },
];

// The organic call's site restriction. Only the highest-yield shops go in:
// Google honours a handful of OR'd `site:` terms far more reliably than a
// long list, and these five accounted for most direct product links in the
// tally. Everything else still reaches the buyer through the shopping call
// plus its merchant search page.
const SITE_RESTRICTED_DOMAINS = [
  "jumia.com.ng",
  "konga.com",
  "jiji.ng",
  "kara.com.ng",
  "alabamart.com",
];

/** Prettified from the hostname for shops reached by the generic rule —
 *  "electromart.com.ng" -> "Electromart". Never a guess at branding, just
 *  the domain the buyer is about to be sent to, capitalised. */
function labelFromHost(host: string): string {
  const name = host.replace(/^www\./, "").split(".")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function isNigerianShop(host: string): boolean {
  if (NOT_A_SHOP.test(host)) return false;
  if (/\.ng$/i.test(host)) return true;
  const bare = host.replace(/^www\./, "");
  return [...NG_SHOPS_ON_GENERIC_TLDS].some(
    (d) => bare === d || bare.endsWith(`.${d}`),
  );
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function merchantFor(value: string | null | undefined): Merchant | null {
  if (!value) return null;
  // `source` on a shopping item is sometimes a domain ("jumia.com.ng") and
  // sometimes a display name ("Electromart Nigeria"), so both a hostname
  // and a raw string arrive here — and BOTH have to resolve. Before the
  // aliases below, every display-name result was thrown away: a third of
  // the Nigerian shopping sources in a 20-query tally arrive that way.
  const raw = value.trim();
  const host = hostOf(raw) ?? (raw.includes(".") ? raw.toLowerCase() : null);
  if (host) {
    const byDomain = MERCHANTS.find((m) => host.includes(m.domain));
    if (byDomain) return byDomain;
    // Layer 2: any other recognisably Nigerian storefront, judged by URL
    // shape alone (see GENERIC_PRODUCT_PATH). No `search` — nobody has
    // checked this shop even has a search page, so an unmatched shopping
    // result from here is dropped rather than guessed at.
    if (!isNigerianShop(host)) return null;
    return {
      domain: host.replace(/^www\./, ""),
      label: labelFromHost(host),
      productPath: GENERIC_PRODUCT_PATH,
    };
  }

  const name = normalizeName(raw);
  if (!name) return null;
  return (
    MERCHANTS.find(
      (m) =>
        m.aliases?.some((a) => normalizeName(a) === name) ||
        normalizeName(m.label) === name,
    ) ?? null
  );
}

// Google appends its own click-tracking parameter to organic links. It
// isn't needed for the page to load and only makes an already-long URL
// worse, so it's stripped; anything else in the query string is left alone
// (some shops genuinely need theirs).
function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("srsltid");
    return u.toString();
  } catch {
    return url;
  }
}

const TITLE_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "new",
  "buy",
  "in",
  "of",
  "nigeria",
  "price",
  "prices",
  "online",
  "shop",
]);

function titleWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !TITLE_STOPWORDS.has(w));
}

function titleTokens(title: string): Set<string> {
  return new Set(titleWords(title));
}

// What actually goes into a merchant's own search box. A Google Shopping
// title is a full spec sheet ("Samsung Galaxy A15 - 6.5" - 128GB - 4GB RAM
// - 4G - Blue/Black") and pasting it verbatim into Jumia's search reliably
// returns nothing, which turns the fallback destination into a dead page.
// The first handful of meaningful words is the product; the rest is the
// variant.
const SEARCH_TERM_WORDS = 6;

function searchTerm(title: string): string {
  const words = titleWords(title).slice(0, SEARCH_TERM_WORDS);
  return words.length ? words.join(" ") : title;
}

/** How confidently two titles name the SAME product, 0-1 (0 = no match).
 *
 *  Measured in both directions, and the second direction is not optional.
 *  A one-way "does the organic title contain the shopping title's words"
 *  check scored 1.0 on "Samsung Galaxy A15" vs "Generic Rugged Shield CASE
 *  For Samsung Galaxy A15" — found live — and would have sent a buyer
 *  shopping for a ₦320k phone to a phone-case listing at a plausible-
 *  looking ₦168k. The forward ratio stays the lenient one (an organic page
 *  title routinely carries "... | Buy Online | Jumia Nigeria" tails that
 *  shouldn't count against it); the reverse ratio is what catches a short
 *  product name sitting inside a longer, DIFFERENT product's name. */
function titleOverlap(shopping: Set<string>, organic: Set<string>): number {
  if (!shopping.size || !organic.size) return 0;
  let hits = 0;
  for (const t of shopping) if (organic.has(t)) hits += 1;
  const forward = hits / shopping.size;
  const reverse = hits / organic.size;
  return reverse >= REVERSE_MATCH_THRESHOLD ? forward : 0;
}

// Above this share of matching words, two titles are treated as the same
// product. Tuned demanding on purpose: the cost of a wrong match is a
// buyer tapping "oraimo PowerBox 400" and landing on a different power
// bank's page, which is worse than the merchant-search page a non-match
// falls through to.
const TITLE_MATCH_THRESHOLD = 0.7;

// The other direction — see titleOverlap. An organic title may carry a
// modest tail of extra words and still be the same product; carrying MORE
// extra words than shared ones means it is something else that merely
// mentions the product ("case for", "screen protector for", "compatible
// with").
const REVERSE_MATCH_THRESHOLD = 0.6;

interface SerperShoppingItem {
  title?: string;
  source?: string;
  link?: string;
  price?: string;
  imageUrl?: string;
  productId?: string;
  position?: number;
}

interface SerperOrganicItem {
  title?: string;
  link?: string;
  snippet?: string;
}

/** A direct product page on a known retailer — the only organic results
 *  that survive. Category, collection, brand and blog pages are filtered
 *  out here (see Merchant.productPath). */
interface DirectLink {
  url: string;
  title: string;
  tokens: Set<string>;
  merchant: Merchant;
}

async function post<T>(
  url: string,
  apiKey: string,
  body: unknown,
  signal: AbortSignal,
): Promise<T | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
    cache: "no-store",
  });
  if (!res.ok) {
    // 401 (bad key) and 429 (free tier exhausted) are the two worth
    // recognising in logs — both mean "this is silently doing nothing in
    // production", which is otherwise invisible since the buyer just sees
    // a normal dead end.
    console.error(`[connectors/serper] ${url} failed: ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

export const serperConnector: ExternalConnector = {
  name: "serper",

  isEnabled() {
    return Boolean(process.env.SERPER_API_KEY);
  },

  async search({ query, country = "ng", limit = DEFAULT_LIMIT }) {
    const apiKey = process.env.SERPER_API_KEY;
    const q = query.trim();
    if (!apiKey || !q) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      // `gl: "ng"` is what makes the results Nigerian rather than American
      // — without it this returns offers nobody here can buy.
      // Site-restricted on purpose, and it has to be. A plain
      // shopping-intent query ("gas cooker buy online Nigeria price") was
      // tried and measured: 3 product pages out of 48 results — Google
      // answers a generic product noun with CATEGORY pages, and a category
      // page is not somewhere to send a buyer who named an item. The
      // `site:` operator is what forces depth. Only the highest-yield shops
      // are listed: Google honours a handful of OR'd terms far more
      // reliably than a long list, and everything else still reaches the
      // buyer through the shopping call plus its own search page.
      const siteFilter = SITE_RESTRICTED_DOMAINS.map((d) => `site:${d}`).join(
        " OR ",
      );
      const [shoppingRes, organicRes] = await Promise.all([
        post<{ shopping?: SerperShoppingItem[] }>(
          SHOPPING_URL,
          apiKey,
          { q, gl: country, hl: "en", num: limit * 2 },
          controller.signal,
        ),
        post<{ organic?: SerperOrganicItem[] }>(
          SEARCH_URL,
          apiKey,
          // num stays at 10. Serper's free tier rejects a larger `num`
          // alongside search operators with "Query pattern not allowed for
          // free accounts" — a 400 that this connector swallows by design,
          // so a bump to 20 silently zeroed every organic lookup and was
          // only visible as offers quietly drying up.
          { q: `${q} (${siteFilter})`, gl: country, hl: "en", num: 10 },
          controller.signal,
        ),
      ]);

      const directLinks: DirectLink[] = [];
      for (const item of organicRes?.organic ?? []) {
        const url = item.link?.trim();
        const title = item.title?.trim();
        if (!url || !title) continue;
        const merchant = merchantFor(url);
        if (!merchant) continue;
        if (!merchant.productPath.test(pathOf(url))) continue;
        directLinks.push({
          url: cleanUrl(url),
          title,
          tokens: titleTokens(title),
          merchant,
        });
      }

      const offers: ExternalOffer[] = [];
      const usedUrls = new Set<string>();

      // Pass 1 — priced shopping results, each re-pointed at the shop.
      for (const [index, item] of (shoppingRes?.shopping ?? []).entries()) {
        if (offers.length >= limit) break;
        const title = item.title?.trim();
        if (!title) continue;
        const merchant = merchantFor(item.source);
        if (!merchant) continue;

        const tokens = titleTokens(title);
        const match = directLinks
          .filter((l) => l.merchant.domain === merchant.domain)
          .map((l) => ({ link: l, score: titleOverlap(tokens, l.tokens) }))
          .filter((m) => m.score >= TITLE_MATCH_THRESHOLD)
          .sort((a, b) => b.score - a.score)[0]?.link;

        const url = match ? match.url : merchant.search?.(searchTerm(title));
        if (!url || usedUrls.has(url)) continue;
        usedUrls.add(url);
        offers.push({
          id: item.productId?.trim() || `serper-shop-${index}`,
          title,
          // Kept as the source's own string on purpose — see ExternalOffer.
          priceText: item.price?.trim() || null,
          imageUrl: item.imageUrl?.trim() || null,
          // Both filled from the product page below — Google Shopping
          // carries one thumbnail and no description at all.
          galleryUrls: [],
          description: null,
          merchant: merchant.label,
          source: "serper",
          url,
        });
      }

      // Pass 2 — direct product pages Google Shopping didn't cover. No
      // price and no image (organic results carry neither), which the card
      // renders honestly rather than filling in: a real product page with
      // an unknown price beats no result, and beats inventing one.
      for (const link of directLinks) {
        if (offers.length >= limit) break;
        if (usedUrls.has(link.url)) continue;
        usedUrls.add(link.url);
        offers.push({
          id: `serper-web-${link.url.slice(-32)}`,
          title: link.title,
          priceText: null,
          imageUrl: null,
          galleryUrls: [],
          description: null,
          merchant: link.merchant.label,
          source: "serper",
          url: link.url,
        });
      }

      // The rule this file exists to enforce, checked rather than trusted:
      // nothing leaves here pointing back at a search engine.
      const clean = offers.filter(
        (o) => !/(^|\.)google\./i.test(hostOf(o.url) ?? ""),
      );

      // Read each product page for what neither Google half supplies.
      //
      // This used to fetch only offers MISSING an image or a price, because
      // all it wanted was to fill a placeholder tile. It now fetches EVERY
      // offer, because the gallery and the description are things no offer
      // ever arrives with — a fully-formed shopping result has exactly one
      // thumbnail and no description, and one photo is not enough to judge
      // a listing (see ExternalOffer.galleryUrls for the case that forced
      // this). Skipping the complete-looking offers would mean skipping
      // precisely the ones most likely to be picked.
      //
      // The cost is bounded rather than argued away: pageMeta runs the
      // whole batch under ONE short timeout at a small concurrency, so this
      // adds a second or two on a dead-end turn and cannot add more. Every
      // page that doesn't answer in time simply leaves its offer as it was.
      //
      // The precedence rule is unchanged and still matters: the connector's
      // own data always wins, and the page can only ever fill a gap.
      if (clean.length) {
        const meta = await fetchPageMeta(clean.map((o) => o.url));
        for (const offer of clean) {
          const found = meta.get(offer.url);
          if (!found) continue;
          offer.imageUrl = offer.imageUrl ?? found.imageUrl;
          offer.priceText = offer.priceText ?? found.priceText;
          // Not `??` — these two never arrive from the connector, and an
          // empty gallery is a real "found nothing", not a gap to preserve.
          offer.galleryUrls = found.galleryUrls;
          offer.description = found.description;
        }
      }
      return clean;
    } catch (err) {
      // Includes the abort above. Never rethrown — see the connector
      // contract's "never throw" rule.
      console.error(
        "[connectors/serper] lookup failed:",
        err instanceof Error ? err.message : err,
      );
      return [];
    } finally {
      clearTimeout(timer);
    }
  },
};
