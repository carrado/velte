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
// to a curated list of Nigerian Shopify/WooCommerce retailers, returns what
// was actually wanted: direct product-page URLs on slot/kara/alabamart/etc.
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
// SHOPIFY + WOOCOMMERCE NIGERIAN STORES, PLUS JUMIA BY NAME (2026-09-13,
// explicit product decision; Jumia re-added 2026-09-14, also explicit —
// see its MERCHANTS entry below). Konga and oraimo's own storefront stay
// REMOVED — neither ran on either platform (Konga is a custom-built
// marketplace like Jumia; oraimo's store answered neither a Shopify nor a
// WooCommerce search page), and the earlier "no search fallback,
// direct-link-only" carve-out that let Konga through isn't a distinction
// worth keeping now that it doesn't belong in the list at all. Bumpa's
// generic-domain carve-out (`NG_SHOPS_ON_GENERIC_TLDS`'s `bumpa.shop`
// suffix) is dropped for the same reason: Bumpa is its own SaaS platform,
// not Shopify or WooCommerce, however close the storefronts it powers may
// look to one. Jumia is the one deliberate exception to the platform rule
// among NAMED merchants — a custom-built marketplace, not Shopify/
// WooCommerce, but named explicitly rather than left out, unlike Konga: too
// large a share of Nigerian shopping traffic to drop from the external list
// on platform grounds alone. See git history for the removed entries and
// the reasoning that first added, then re-added, Konga/Jiji before the
// 2026-09-13 decision.
//
// JIJI IS BACK (2026-09-20, explicit product decision) but NOT here, and
// that distinction is the whole point. It still never appears as a NAMED
// merchant and is still explicitly blocked from the generic Layer-2 match
// below (see NOT_A_SHOP) — a classifieds listing is still not something
// this file will match to a specific "product page" and show a price/photo
// for as if confirmed (see the live "broken screen past photo one" case in
// ExternalOffer.galleryUrls's own comment; that risk hasn't gone anywhere).
// What changed: `search()` now always appends ONE extra offer — a plain
// link to Jiji's own search results for the buyer's exact query, no listing
// matched, `isDirectLink: false` — because Jiji's own category breadth
// (used goods, services, anything informal) covers most of what this file's
// narrow curated list of shops structurally cannot, and a dead end with
// nothing to try at all is worse than one honest "keep looking here" link.
// See jijiOffer's own comment further down for the implementation.
//
// Two layers remain:
//   1. NAMED merchants below — real shops worth knowing individually,
//      either because their search page has been checked BY HAND against a
//      live query, or (Jumia) because their URL shape needs decoding.
//      Every `search` here was verified to actually return the searched
//      product, not merely to return HTTP 200 — several shops answer 200
//      with an empty result page, which is a worse destination than none.
//      CORRECTION (2026-09-14): that verification was against each shop's
//      SEARCH RESULTS, never its underlying platform — `search` is no
//      longer even called (see the direct-link-only rule further down),
//      so it stopped mattering, but the PLATFORM half of this list was
//      never actually checked. It was wrong for six of these fourteen —
//      slot.ng, pointek.net, kara.com.ng, justfones.ng, fouanistore.com and
//      mumzcentral.com are a custom Next.js site, a near-bare WordPress
//      install, another custom Next.js site, Magento, another custom
//      Next.js site, and Wix respectively — verified live per-entry below.
//      Lesson: a helper NAME (`wooSearch`/`shopifySearch`) is not evidence
//      of the platform it's named after; only checking the live site is.
//   2. A GENERIC rule (isNigerianShop + GENERIC_PRODUCT_PATH) for any other
//      recognisably Nigerian storefront whose URL matches the `/product/`
//      or `/products/` shape Shopify and WooCommerce both default to — this
//      is what carries every small Shopify/WooCommerce merchant that isn't
//      named below. Deliberately narrower than it used to be: it no longer
//      matches Wix's `/product-page/` shape, Jumia's `-123456.html` suffix,
//      or the generic `/item/`/`/dp/`/`/p/` shapes other platforms use,
//      since none of those tell you the store is Shopify or WooCommerce.
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
  /** Which of the three MATCHED-listing buckets this shows up under in the
   *  dead-end UI (2026-09-14) — Jiji is a fourth bucket at the
   *  ExternalOffer level (2026-09-20, see buildJijiOffer) but is never a
   *  `Merchant` at all, so it has no place in this union. Jumia gets its
   *  own, since it's a custom-built marketplace and neither of the other
   *  two; every NAMED merchant below is pinned to whichever it actually is,
   *  matching whichever of shopifySearch/wooSearch it's built with.
   *  REQUIRED for every named
   *  entry — deliberately absent (not guessed) on the generic Layer-2
   *  match built in merchantFor, since a shop caught only by
   *  GENERIC_PRODUCT_PATH's shared shape could be either platform and
   *  there's no way to tell from the URL alone. An offer with no `platform`
   *  is dropped rather than shown in a bucket it might not belong to — see
   *  the filter at the end of `search()` below. Typed optional so the
   *  Layer-2 generic match (merchantFor's own return, below) can leave it
   *  out entirely; every literal in MERCHANTS sets it. */
  platform?: "jumia" | "shopify" | "woocommerce";
  /** The shop's own search page. NOT currently read when building an offer
   *  (2026-09-14) — a shopping result that can't be matched to a real
   *  product page is dropped now rather than falling back here (see
   *  `search()`'s own comment on the direct-link-only rule) — but kept on
   *  each merchant as a fact about the shop, worth having if a future
   *  feature wants "see more from Slot" even without an exact match. */
  search?: (query: string) => string;
  /** Display names Google Shopping uses for this shop instead of its
   *  domain. `source` arrives as "electromart nigeria" or "fouani store"
   *  about as often as it arrives as a hostname, and without these those
   *  results have no destination and are thrown away. */
  aliases?: string[];
}

/** The two search-URL shapes Shopify and WooCommerce each default to. Each
 *  merchant below is pinned to whichever one was verified against it, never
 *  assumed from the platform. */
const shopifySearch = (host: string) => (q: string) =>
  `https://${host}/search?q=${encodeURIComponent(q)}`;
const wooSearch = (host: string) => (q: string) =>
  `https://${host}/?s=${encodeURIComponent(q)}&post_type=product`;
/** Verified live 2026-09-20 (`jiji.ng/search?query=...` returns a real
 *  "N results for <query> in Nigeria" page) — see jijiOffer's own comment on
 *  why this is the ONLY thing Jiji ever contributes here, never a matched
 *  listing. */
const jijiSearch = (q: string) =>
  `https://jiji.ng/search?query=${encodeURIComponent(q)}`;

// Product-page shape Shopify and WooCommerce both default to: `/product/`
// or `/products/`. Deliberately just this one shape (see the header comment
// above) — a category or collection page matches neither, which is the
// whole point.
const GENERIC_PRODUCT_PATH = /\/products?\/[^/]+/i;

// Nigerian shops on a generic TLD — the `.ng` test below can't see these.
// A missing entry costs one shop's results; it can never produce a wrong
// one, which is why this list is safe to grow casually.
//
// Bumpa's own free-tier storefront suffix ("bumpa.shop") deliberately does
// NOT go here (2026-09-13) — Bumpa is its own SaaS platform, not Shopify or
// WooCommerce, and this file only surfaces those two now (see the header
// comment above).
const NG_SHOPS_ON_GENERIC_TLDS = new Set([
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
//
// konga/jiji are listed explicitly (2026-09-13) as belt-and-braces on top
// of removing their MERCHANTS entries below — GENERIC_PRODUCT_PATH never
// matched either, so this is redundant today, but a future widening of
// that pattern must not be able to quietly let them back in through the
// generic layer. jiji STAYS here even after 2026-09-20's search-link
// re-add (see this file's header) — that re-add is a hardcoded search URL
// built straight from the query, entirely outside merchantFor/isNigerianShop,
// so this line still does its original job of keeping an actual jiji.ng
// result from Google Shopping/organic search from ever being matched as a
// confirmed listing. jumia is NOT here (removed 2026-09-14, see its
// MERCHANTS entry above) — it's named explicitly and must resolve there
// instead.
const NOT_A_SHOP =
  /(^|\.)(facebook|instagram|twitter|youtube|tiktok|pinterest|reddit|linkedin|wikipedia|blogspot|wordpress|medium|quora|nairaland|naijatechguide|legit|punchng|vanguardngr|dailypost|businessday|guardian|amazon|ebay|aliexpress|alibaba|made-in-china|desertcart|ubuy|u-buy|microless|raptorsupplies|temu|wish|konga|jiji)\./i;

const MERCHANTS: Merchant[] = [
  {
    // Re-added 2026-09-14 (explicit product decision) after being removed
    // 2026-09-13 along with Konga/Jiji/oraimo for not running on Shopify or
    // WooCommerce — Jumia doesn't either, but it's too large a share of
    // Nigerian shopping traffic to leave out of the external list on
    // platform grounds alone. Its product id lives in a trailing `.html`
    // suffix, not a `/product/` path, so it needs its own productPath
    // rather than the generic rule.
    domain: "jumia.com.ng",
    label: "Jumia",
    platform: "jumia",
    productPath: /-\d{6,}\.html$/i,
    search: (q) =>
      `https://www.jumia.com.ng/catalog/?q=${encodeURIComponent(q)}`,
  },
  {
    // NO `platform` (2026-09-14, corrected — was wrongly tagged
    // "woocommerce"): checked live, slot.ng serves `X-Powered-By: Next.js`
    // on every page, not WordPress at all. `wooSearch` below was never a
    // real search endpoint for this shop either, and is dead now that
    // nothing calls it — left in place as merchant metadata, not evidence
    // this is a WooCommerce store. Still matchable and still shown, just
    // never bucketed as Jumia/Shopify/WooCommerce, per the same
    // never-guess rule the generic Layer 2 match already follows.
    domain: "slot.ng",
    label: "Slot",
    productPath: /\/products?\//i,
    search: wooSearch("slot.ng"),
    aliases: ["slot systems", "slot nigeria"],
  },
  {
    // NO `platform` (2026-09-14) — checked live: pointek.net is a near-bare
    // default WordPress install (an Italian placeholder logo, no shop
    // navigation, barely indexed by Google at all). `wp-content` shows up,
    // but nothing confirms an actual WooCommerce storefront lives here, so
    // this is one worth a closer look (a different domain for the real
    // shop?) rather than trusting the platform tag it carried before.
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
    //
    // NO `platform` (2026-09-14, corrected — was wrongly tagged
    // "woocommerce"): checked live, kara.com.ng serves `x-powered-by:
    // Next.js` — a custom storefront, not WordPress.
    domain: "kara.com.ng",
    label: "Kara",
    productPath: /^\/[a-z0-9]+(-[a-z0-9]+){3,}\/?$/i,
    search: wooSearch("kara.com.ng"),
  },
  {
    // NO `platform` (2026-09-14, corrected — was wrongly tagged
    // "woocommerce"): checked live against a real product page — this is
    // Magento (its markup is full of `Mage.` references), and its product
    // URLs end in a bare `.html` suffix, never `/product/` or `/products/`
    // — meaning the productPath below never actually matched a real page
    // either. Left as-is rather than guessed at; worth fixing by hand
    // against a real listing if this merchant is worth keeping at all.
    domain: "justfones.ng",
    label: "Justfones",
    productPath: /\/products?\//i,
    search: wooSearch("justfones.ng"),
  },
  {
    domain: "electromart.com.ng",
    label: "Electromart",
    platform: "woocommerce",
    productPath: GENERIC_PRODUCT_PATH,
    search: wooSearch("electromart.com.ng"),
    aliases: ["electromart nigeria", "electromart"],
  },
  {
    // NO `platform` (2026-09-14, corrected — was wrongly tagged
    // "shopify"): checked live, fouanistore.com serves `x-powered-by:
    // Next.js` and zero `cdn.shopify.com` references — a custom
    // storefront, not Shopify.
    domain: "fouanistore.com",
    label: "Fouani",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("fouanistore.com"),
    aliases: ["fouani store", "fouani nigeria", "fouani"],
  },
  {
    domain: "alabamart.com",
    label: "Alabamart",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("alabamart.com"),
    aliases: ["alabamart"],
  },
  {
    domain: "hogfurniture.co",
    label: "HOG Furniture",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("hogfurniture.co"),
    aliases: ["hog furniture"],
  },
  {
    // NO `platform` (2026-09-14, corrected — was wrongly tagged
    // "woocommerce"): checked live, zit.ng is served by `gunicorn` — a
    // Python backend, not WordPress/WooCommerce at all.
    domain: "zit.ng",
    label: "Zit",
    productPath: GENERIC_PRODUCT_PATH,
    search: wooSearch("zit.ng"),
    aliases: ["zit online store", "zit nigeria"],
  },
  {
    domain: "kultra.com.ng",
    label: "Kultra",
    platform: "woocommerce",
    productPath: GENERIC_PRODUCT_PATH,
    search: wooSearch("kultra.com.ng"),
    aliases: ["kultra"],
  },
  {
    domain: "shopinverse.com",
    label: "Shopinverse",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("shopinverse.com"),
    aliases: ["shopinverse"],
  },
  {
    domain: "jamarahome.com",
    label: "Jamara Home",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("jamarahome.com"),
    aliases: ["jamarahome", "jamara home"],
  },
  {
    domain: "maybrands.co",
    label: "Maybrands",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("maybrands.co"),
    aliases: ["maybrands", "maybrands nigeria"],
  },
  // Four added 2026-09-17 (explicit request: Jumia was dominating dead-end
  // results because every OTHER named merchant sat in the same two niches —
  // furniture and electronics — so it was structurally the only site in
  // SITE_RESTRICTED_DOMAINS that carried most categories at all. These were
  // picked specifically to sit OUTSIDE those two niches (groceries, hair/
  // beauty, fashion accessories, apparel) and each was checked live the same
  // way every entry above was: a plain `curl -I` confirmed a real
  // `powered-by: Shopify` response header (not guessed from the domain),
  // and `/products.json` (Shopify's own public product feed, on by default)
  // returned real items with a `/products/<handle>` URL — the shape
  // GENERIC_PRODUCT_PATH already expects, same as every other Shopify entry
  // here.
  {
    // products.json came back 423-locked (Shopify's own bot checkpoint, not
    // a platform question) — confirmed via the response headers instead:
    // `powered-by: Shopify` on both `/` and `/products` (the latter tagged
    // `pageType: list-collections`), which is what every other Shopify
    // entry in this file is trusted on.
    domain: "yds.com.ng",
    label: "YDS",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("yds.com.ng"),
    aliases: ["yds", "your daily store", "yds nigeria"],
  },
  {
    // Groceries/household — the category with the most direct overlap
    // against Jumia of anything in this file, and previously carried by
    // nothing else here at all.
    domain: "supermart.ng",
    label: "Supermart",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("supermart.ng"),
    aliases: ["supermart", "supermart nigeria"],
  },
  {
    domain: "thedivashop.ng",
    label: "The Diva Shop",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("thedivashop.ng"),
    aliases: ["the diva shop", "diva shop"],
  },
  {
    // Generic .com, not .ng — matched by MERCHANTS' own domain lookup
    // regardless (see merchantFor), so it doesn't need a
    // NG_SHOPS_ON_GENERIC_TLDS entry the way an unnamed Layer-2 match would.
    domain: "shopbcode.com",
    label: "ShopBCode",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("shopbcode.com"),
    aliases: ["shopbcode"],
  },
  // Ten added 2026-09-17 (explicit request, following straight on from the
  // four added earlier the same day) — that round widened OUT of the
  // furniture/electronics pair into groceries/beauty/fashion/apparel; this
  // round goes deeper into categories this file still had ZERO or ONE entry
  // in, found live: a photo-searched dress dead-ended with nothing on
  // Velte AND nothing external, because the only two apparel-ish entries
  // (ShopBCode, The Diva Shop) don't carry womenswear/dresses specifically.
  // Same verification method as every entry in this file: a live
  // `powered-by: Shopify` header or a `wp-content`/`woocommerce` body
  // signature, PLUS a real product page confirmed either via `/products.json`
  // (Shopify) or a live `/product/<slug>/` link scraped off the shop's own
  // listing page (WooCommerce) — never guessed from the platform's
  // reputation or the shop's name alone.
  {
    // Women's fashion/dresses specifically — the exact category gap that
    // prompted this round. `/products.json` returned a real midi dress
    // ("ALICANTE DRESS - PINK") at request time.
    domain: "dosclothing.co",
    label: "DOS Clothing",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("dosclothing.co"),
    aliases: ["dos clothing"],
  },
  {
    domain: "ozinna.com",
    label: "Ozinna",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("ozinna.com"),
    aliases: ["ozinna"],
  },
  {
    // On its bare myshopify.com subdomain (2026-09-17 check: no custom
    // domain, no redirect) — unusual against every other entry here, but a
    // `site:` restriction and a `search` URL both work identically against
    // a myshopify.com subdomain as against a custom one, and the store
    // itself is real and live (confirmed via `/products.json`). Multi-
    // category (men/women/kids fashion, shoes, bags), so it's listed once
    // here rather than duplicated across the fashion/footwear groups.
    domain: "brandlyng.myshopify.com",
    label: "Brandly",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("brandlyng.myshopify.com"),
    aliases: ["brandly", "brandlyng"],
  },
  {
    domain: "naijafootstore.com",
    label: "NaijaFootStore",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("naijafootstore.com"),
    aliases: ["naijafootstore", "naija foot store"],
  },
  {
    domain: "ninostyle.com",
    label: "Ninostyle",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("ninostyle.com"),
    aliases: ["ninostyle"],
  },
  {
    domain: "shoepifystore.com",
    label: "Shoepify",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("shoepifystore.com"),
    aliases: ["shoepify"],
  },
  {
    // WooCommerce, confirmed via body (`wp-content`/`woocommerce`) plus a
    // real live `/product/<slug>/` link off its own `/shop/` page — the
    // WordPress-plain-domain shape this file's header explains is why
    // `search`'s `wooSearch` helper exists (no `.myshopify.com`-style
    // giveaway the way Shopify has one).
    domain: "babyshopnigeria.com",
    label: "Baby Shop Nigeria",
    platform: "woocommerce",
    productPath: GENERIC_PRODUCT_PATH,
    search: wooSearch("babyshopnigeria.com"),
    aliases: ["baby shop nigeria"],
  },
  {
    domain: "mindville.ng",
    label: "Mindville",
    platform: "woocommerce",
    productPath: GENERIC_PRODUCT_PATH,
    search: wooSearch("mindville.ng"),
    aliases: ["mindville"],
  },
  {
    domain: "vogandwodbooks.com",
    label: "Vog and Wod Books",
    platform: "woocommerce",
    productPath: GENERIC_PRODUCT_PATH,
    search: wooSearch("vogandwodbooks.com"),
    aliases: ["vog and wod", "vog and wod books"],
  },
  {
    // Sports/fitness equipment — a category this file had nothing in at
    // all. `/products.json` returned a real treadmill listing at request
    // time.
    domain: "jumbosportsng.com",
    label: "Jumbo Sports",
    platform: "shopify",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("jumbosportsng.com"),
    aliases: ["jumbo sports"],
  },
  {
    // NO `platform` (2026-09-14, corrected — was wrongly tagged
    // "shopify"): checked live — its own product links are shaped
    // `/product-page/<slug>`, which is WIX's URL convention, the exact
    // shape GENERIC_PRODUCT_PATH was deliberately narrowed to exclude (see
    // this file's header comment). productPath below never matched a real
    // page here either, for the same reason.
    domain: "mumzcentral.com",
    label: "Mumzcentral",
    productPath: GENERIC_PRODUCT_PATH,
    search: shopifySearch("mumzcentral.com"),
    aliases: ["mumzcentral"],
  },
];

// The organic call's site restriction. Only the highest-yield shops go in:
// Google honours a handful of OR'd `site:` terms far more reliably than a
// long list.
//
// jumia.com.ng re-added 2026-09-14 alongside its MERCHANTS entry — it
// accounted for a large share of direct product links in the original
// tally that first built this list, back when it also carried konga.com
// and jiji.ng (still removed; see the header comment above).
//
// EVERY PLATFORM-TAGGED MERCHANT NOW LISTED HERE (2026-09-15, found live:
// "Jumia is returned for products and Shopify stores don't return
// anymore"). The comment this replaced said unmatched merchants "still
// reach the buyer through the shopping call plus its merchant search
// page" — true the day it was written, false since DIRECT-LINK-ONLY
// shipped (2026-09-14, this file's own header): a shopping result that
// can't be matched to a real organic product page is now DROPPED, not
// sent to a search page. `directLinks` (below) is built ENTIRELY from
// organic results within this site restriction, and Pass 1/Pass 2 both
// require a `directLinks` match before a merchant can ever produce an
// offer — so a platform-tagged merchant simply left out of this list can
// now NEVER appear, no matter how often Google Shopping surfaces it. Six
// real Shopify/WooCommerce merchants (electromart, hogfurniture, kultra,
// shopinverse, jamarahome, maybrands) were silently unreachable for
// exactly this reason, leaving Jumia — the one merchant an ordinary query
// reliably surfaces on its own — as effectively the only source a buyer
// ever saw.
//
// kara.com.ng DROPPED from this list (was here, contributing nothing): it
// carries no `platform` tag (corrected 2026-09-14 — it's a custom Next.js
// storefront, not WooCommerce) and the `!merchant?.platform` guard in both
// passes below means it could never have produced an offer regardless of
// being site-restricted — one of the three "handful" slots was spent on a
// domain that structurally could not contribute.
//
// WIDENED 2026-09-17 (found live: buyers kept seeing mostly Jumia, with few
// other options) — every domain above this point covers furniture or
// electronics, so for any query outside those two categories Jumia was the
// only site in this list that carried the product AT ALL; the "handful of
// OR'd terms" ceiling was being spent almost entirely on one category pair.
// The four added (see their own MERCHANTS comment above) sit in categories
// this list had none of before: groceries, hair/beauty, fashion accessories,
// apparel.
//
// WIDENED AGAIN, SAME DAY (explicit request: "add more fashion retailers,
// add more retailers of different sectors") — found live immediately after
// the first round: a photo-searched dress still dead-ended with nothing
// external, because ShopBCode/The Diva Shop don't carry womenswear/dresses.
// Ten more added spanning fashion/dresses, footwear, baby/kids, books, and
// sports/fitness — categories this list had zero or one entry in.
//
// This round is a real, acknowledged tradeoff against the "handful of OR'd
// terms" reliability note at the top of this comment block — 22 domains is
// no longer a handful by any reading of that word. Accepted deliberately:
// the alternative measured worse (a buyer getting nothing, or getting the
// wrong category's one available store) than whatever reliability Google
// loses honouring a longer OR list. If this list needs to shrink again, cut
// by CATEGORY coverage lost, not by picking the newest additions first —
// several of these are the ONLY entry in their category, so removing them
// reopens the exact gap this round exists to close.
const SITE_RESTRICTED_DOMAINS = [
  "jumia.com.ng",
  "alabamart.com",
  "electromart.com.ng",
  "hogfurniture.co",
  "kultra.com.ng",
  "shopinverse.com",
  "jamarahome.com",
  "maybrands.co",
  "yds.com.ng",
  "supermart.ng",
  "thedivashop.ng",
  "shopbcode.com",
  "dosclothing.co",
  "ozinna.com",
  "brandlyng.myshopify.com",
  "naijafootstore.com",
  "ninostyle.com",
  "shoepifystore.com",
  "babyshopnigeria.com",
  "mindville.ng",
  "vogandwodbooks.com",
  "jumbosportsng.com",
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
  // `source` on a shopping item is sometimes a domain ("slot.ng") and
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
    // result from here is dropped rather than guessed at. No `platform`
    // either (2026-09-14) — GENERIC_PRODUCT_PATH's shape is shared by both
    // Shopify and WooCommerce, so which one this actually is can't be told
    // from the URL, and the offer-building loops below drop anything with
    // no confirmed platform rather than guess. This shop simply never
    // produces an offer in the three-bucket view any more; it would need
    // to be named in MERCHANTS with a verified platform to qualify.
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

/** How confidently two titles name the SAME product, 0-1 (0 = no match).
 *
 *  Measured in both directions, and the second direction is not optional.
 *  A one-way "does the organic title contain the shopping title's words"
 *  check scored 1.0 on "Samsung Galaxy A15" vs "Generic Rugged Shield CASE
 *  For Samsung Galaxy A15" — found live — and would have sent a buyer
 *  shopping for a ₦320k phone to a phone-case listing at a plausible-
 *  looking ₦168k. The forward ratio stays the lenient one (an organic page
 *  title routinely carries "... | Buy Online | Slot Nigeria" tails that
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

/**
 * The one Jiji offer this file ever produces (2026-09-20) — a plain link to
 * Jiji's own search results for the buyer's exact query, never a matched
 * listing. See this file's header ("JIJI IS BACK...") for why a search link
 * and not a matched product page, and NOT_A_SHOP's own comment for why an
 * actual jiji.ng result from Google Shopping/organic search still can't
 * become one of THOSE by a different route.
 *
 * Deliberately needs no network call and can't fail, so it's cheap enough to
 * build unconditionally and safe to hand back even when the real lookup
 * below times out or errors — a dead end should never come back with
 * literally nothing to try next.
 */
function buildJijiOffer(q: string): ExternalOffer {
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
    source: "serper",
    url: jijiSearch(q),
    isDirectLink: false,
  };
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
    const jijiOffer = buildJijiOffer(q);

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
        if (!merchant?.platform) continue;
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
      //
      // DIRECT-LINK-ONLY (2026-09-14, explicit product decision): a
      // shopping result that can't be matched to a real organic product
      // page is now DROPPED rather than falling back to the shop's own
      // search page — no more "View on Slot" that actually lands on a
      // results page for the item's name. Together with the `platform`
      // gate below, this makes every offer here a confirmed page on a
      // confirmed Jumia/Shopify/WooCommerce store.
      for (const [index, item] of (shoppingRes?.shopping ?? []).entries()) {
        if (offers.length >= limit) break;
        const title = item.title?.trim();
        if (!title) continue;
        const merchant = merchantFor(item.source);
        if (!merchant?.platform) continue;

        const tokens = titleTokens(title);
        const match = directLinks
          .filter((l) => l.merchant.domain === merchant.domain)
          .map((l) => ({ link: l, score: titleOverlap(tokens, l.tokens) }))
          .filter((m) => m.score >= TITLE_MATCH_THRESHOLD)
          .sort((a, b) => b.score - a.score)[0]?.link;
        if (!match || usedUrls.has(match.url)) continue;
        usedUrls.add(match.url);
        offers.push({
          id: item.productId?.trim() || `serper-shop-${index}`,
          title,
          // Kept as the source's own string on purpose — see ExternalOffer.
          priceText: item.price?.trim() || null,
          imageUrl: item.imageUrl?.trim() || null,
          // All three filled from the product page below — Google Shopping
          // carries one thumbnail and no description or spec table at all.
          galleryUrls: [],
          description: null,
          attributes: [],
          merchant: merchant.label,
          platform: merchant.platform,
          source: "serper",
          url: match.url,
          // Always true now — see the direct-link-only comment above.
          isDirectLink: true,
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
          attributes: [],
          merchant: link.merchant.label,
          // Non-null: directLinks only ever holds entries whose merchant
          // already passed the `platform` gate above, when it was built.
          platform: link.merchant.platform!,
          source: "serper",
          url: link.url,
          // Always a real product page — this whole pass exists to surface
          // organic direct links Google Shopping didn't already cover.
          isDirectLink: true,
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
      // PRECEDENCE REVERSED (2026-09-14, found live: "the image/title/price
      // didn't match what I saw when I clicked the link"). This used to
      // keep the CONNECTOR's own data (Google Shopping's price string and
      // thumbnail) over whatever the page itself said, on the theory that
      // Google's data was already there and the page could only fill a
      // gap. That was backwards for exactly the offers it mattered most
      // for: a Pass-1 offer that matched a real organic page already
      // arrives with BOTH a shopping price and a shopping thumbnail
      // filled in — so the old rule meant the page's own (fresher, and
      // actually-what-the-buyer-is-about-to-see) price/photo was NEVER
      // used for precisely those offers, while `galleryUrls` two lines
      // below it — pulled from the SAME page — was already being trusted
      // outright. Confirmed live on a real Jumia power bank: the card's
      // primary photo was Google's own re-hosted thumbnail
      // (gstatic.com/shopping?...), while photos 2 onward in its own
      // gallery were the real jumia.is CDN images from the actual page —
      // two different sources sitting in one card, one of which doesn't
      // match what the link opens to. The page now wins whenever it has
      // an answer; the connector's own value is the FALLBACK, for the
      // ordinary case where a page is slow, blocked, or genuinely
      // publishes neither.
      if (clean.length) {
        // Offers with NO image at all go first (2026-09-15, explicit
        // request) — fetchPageMeta shares one timeout across a small
        // concurrent pool (see its own CONCURRENCY/TIMEOUT_MS), so which
        // URL gets processed first genuinely decides which offer is more
        // likely to finish before the deadline. A Google-Shopping-sourced
        // offer already has a real thumbnail to fall back on if its own
        // page fetch runs out of time; an organic-only offer has nothing
        // to fall back to, so it's the one whose share of the shared
        // budget actually matters. Costs nothing extra — same total work,
        // just spent where an empty card is the alternative.
        const priority = clean.filter((o) => !o.imageUrl).map((o) => o.url);
        const rest = clean.filter((o) => o.imageUrl).map((o) => o.url);
        const meta = await fetchPageMeta([...priority, ...rest]);
        for (const offer of clean) {
          const found = meta.get(offer.url);
          if (!found) continue;
          offer.imageUrl = found.imageUrl ?? offer.imageUrl;
          offer.priceText = found.priceText ?? offer.priceText;
          // Not `??` — none of these three ever arrive from the connector
          // itself, and an empty one is a real "found nothing", not a gap
          // to preserve.
          offer.galleryUrls = found.galleryUrls;
          offer.description = found.description;
          offer.attributes = found.attributes;
        }
      }
      // Appended LAST, always — see buildJijiOffer's own comment. Last so
      // fetchExternalOffers' own per-connector cap (see connectors/index.ts)
      // fills confirmed matches first and only reaches this when there's
      // still room; a turn that already found `limit` real listings has no
      // real need for it, and one that found few or none is exactly the
      // case it exists for.
      return [...clean, jijiOffer];
    } catch (err) {
      // Includes the abort above. Never rethrown — see the connector
      // contract's "never throw" rule. Still hands back the Jiji link even
      // on a total lookup failure (see buildJijiOffer) — a dead end
      // shouldn't come back with nothing just because Serper itself is down.
      console.error(
        "[connectors/serper] lookup failed:",
        err instanceof Error ? err.message : err,
      );
      return [jijiOffer];
    } finally {
      clearTimeout(timer);
    }
  },
};
