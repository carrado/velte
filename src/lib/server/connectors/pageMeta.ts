// Open Graph enrichment for external offers (2026-08-26).
//
// Why this exists: the connector's two sources each carry half a card.
// Google Shopping has price + thumbnail but only a google.com redirect for
// a link; Google organic has the real product-page URL but no image and no
// price at all. Once the connector started preferring direct links (so
// buyers land on the shop itself instead of back in a search engine), most
// offers came from the organic side — and rendered as grey placeholder
// tiles. A product card with no product on it is barely a card.
//
// So the missing half is read from the product page itself. Every Shopify/
// WooCommerce Nigerian retailer in the connector's list publishes
// `og:image`, which is exactly the thing that was missing and costs no API
// credits — just an HTTP GET of a page we are already about to send the
// buyer to.
//
// Three rules, same spirit as the connector contract:
//   1. NEVER THROW, never reject. A page that is slow, blocked or malformed
//      leaves the offer exactly as it was.
//   2. NEVER FABRICATE. Only tags the page itself publishes are read, and
//      a price is only taken from the explicit, machine-readable
//      `product:price:amount` + `product:price:currency` PAIR — never
//      scraped out of visible text or guessed from a JSON blob, where
//      picking the wrong number is a real risk.
//   3. NEVER BLOCK THE TURN. One short timeout for all pages together, and
//      whatever has arrived by then is what gets used.
//
// Widened 2026-08-27 from "the missing half of a card" to "everything the
// evaluation needs": the listing's FULL photo gallery and its description,
// not just one image and a price. Reported live — a phone search's top pick
// had a clean first photo and damage further down its gallery. The pick
// call only ever saw photo one.
//
// SHOPIFY + WOOCOMMERCE ONLY (2026-09-13) — the connector's merchant list in
// serper.ts no longer carries Jumia, Konga, Jiji or oraimo, and the
// hand-verified per-merchant extractors this file used to carry for them
// (photo-gallery readers, an attribute-table parser) were removed with them
// rather than left as dead code pointing at shops no longer in the list —
// see git history if either is ever worth rebuilding for a real Shopify/
// WooCommerce listing page (read it BY HAND first, same as every rule in
// this file). Every merchant now goes through the generic pass below only —
// og:image/twitter:image/itemprop=image for photos, and no attribute
// extractor at all until one is verified against a real Shopify or
// WooCommerce listing page. That's a real regression in richness for
// whatever those old sources used to surface (their gallery and spec-table
// reading were the best this file ever did), traded for not carrying
// scraper code for shops no longer in the list — never fabricate or assume
// Shopify/WooCommerce share the old markup shape.
//
// A checkout hand-off (a one-tap add-to-cart link, built from each
// platform's own public URL convention with no merchant opt-in) lived here
// briefly on 2026-09-14 and was removed the same day — explicit product
// decision, made after a wider strategy discussion concluded the plain
// product-page hand-off is the right shape for now rather than building
// the product around checkout automation. See git history if it's ever
// worth rebuilding; the underlying tricks (WooCommerce's `?add-to-cart=`,
// Shopify's `/cart/<variant>:<qty>` permalink) were real and hand-verified
// against live carts, not a dead end technically — this was a product
// scope call, not a "it didn't work" one.

// Deliberately tight. This runs after the buyer has already been told Velte
// had nothing, on top of a search that has already spent its time — a
// prettier card is not worth another two seconds of waiting.
const TIMEOUT_MS = 5000;

// Firing every page fetch at once got most of a batch dropped in practice
// (measured: 1 image out of 6 on a burst, while the same pages fetched
// individually all returned in under a second). A small pool is both
// politer and, in practice, faster than being throttled.
//
// Raised from 3 to 4 (2026-09-15, explicit request) — a modest bump, not a
// re-run of the failed "fire everything at once" experiment above. If a
// throttling regression ever shows up (the same "most of a batch dropped"
// symptom), this is the first number to check and roll back — re-verify
// against a real burst the same way the original 3 was measured, don't
// just guess a smaller number back in.
const CONCURRENCY = 4;

// Product pages can run large and the stream is dropped once nothing we
// want can still appear, so a heavy page still costs a fraction of its real
// size.
//
// Raised from 60kb when galleries arrived, because measurement on real
// pages (since retired from the connector's list, see the header comment
// above) said the old cap returned only a primary photo and nothing else —
// a later gallery photo sat well past 60kb, which looked exactly like a
// site that publishes one photo. 100kb is a reasonable starting point for
// whatever a Shopify/WooCommerce page's gallery markup turns out to need;
// revisit by reading a real listing page BY HAND if it proves too tight.
// The batch timeout, not this number, is what ultimately bounds the work.
//
// The other half of the same fix was deleting the </head> early-exit below:
// </head> lands well before where a gallery typically sits in the HTML, so
// stopping there found nothing at all.
const MAX_BYTES = 100_000;

// A hard ceiling on how many photos leave here for one offer. The gallery
// feeds a multimodal comparison call that fetches every image it's handed,
// so an unusually generous listing must not turn one card into a dozen
// image downloads in front of a waiting buyer. Enough to catch a defect a
// seller buried in a later photo, which is the whole point.
const MAX_GALLERY = 6;

// The listing's own words, clipped — long enough to carry "UK used, Grade
// A, minor scratches", short enough that marketing boilerplate on a shop's
// own description tag can't crowd out the comparison prompt.
const MAX_DESCRIPTION = 400;

// A browser-ish UA: several of these storefronts sit behind bot protection
// that serves an interstitial to an unrecognised agent, which would leave
// every offer image-less for a reason invisible in the output. Exported
// (2026-09-21) so search-item/route.ts's own verifyGoneExternalUrls hits
// the same storefronts with the same UA this file already relies on,
// rather than a second string that could quietly drift from it.
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface PageMeta {
  imageUrl: string | null;
  /** Additional photos, primary excluded, already deduped and capped. */
  galleryUrls: string[];
  description: string | null;
  priceText: string | null;
  /** See ExternalOffer.attributes — real spec pairs the page itself
   *  published, not marketing copy. Empty for a merchant with no
   *  extractor written for it. */
  attributes: { name: string; value: string }[];
}

function metaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    // Both attribute orders and both spellings — `property=` is the Open
    // Graph convention, `name=` is what several of these sites actually
    // emit for the same tag.
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`,
        "i",
      ),
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(html);
      const value = match?.[1]?.trim();
      if (value) return value;
    }
  }
  return null;
}

// Some storefronts fall back to a site-wide social image when a product
// page has none of its own (a favicon or a generic og-image path is the
// usual shape). That is a logo, not the product, and putting it on a card
// is worse than the honest empty state: it looks like a real photo of the
// wrong thing. Recognised by the shapes those fallbacks actually take
// rather than by host.
const GENERIC_IMAGE =
  /(website_assets|placeholder|no[-_]?image|default[-_]?(image|product)|(^|\/)og[-_]image\.|logo\.(png|jpe?g|svg|webp))/i;

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

/** Every value for a meta key, not just the first. Some pages publish
 *  several og:image tags, which is the one gallery source that needs no
 *  per-merchant knowledge at all. */
function allMetaContent(html: string, keys: string[]): string[] {
  const out: string[] = [];
  for (const key of keys) {
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`,
        "gi",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`,
        "gi",
      ),
    ];
    for (const pattern of patterns) {
      for (const match of html.matchAll(pattern)) {
        const value = match[1]?.trim();
        if (value) out.push(value);
      }
    }
  }
  return out;
}

// Named entities these storefronts actually emit. `&amp;` is decoded LAST
// so an "&amp;lt;" in the source can't be turned into a real tag.
function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&(?:apos|#0?39);/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&amp;/gi, "&");
}

/** A meta value as readable prose. Some storefronts publish their
 *  og:description as ESCAPED HTML ("&lt;p&gt;Original Apple iPhone…"), so
 *  entities are decoded first and only then are tags stripped — the other
 *  order leaves the markup sitting in the text handed to the model.
 *
 *  Decoded TWICE because some of these pages are doubly escaped: markup
 *  arriving as "&amp;ndash;" only turns into "&ndash;" after one pass. Two
 *  passes is deliberate rather than a loop — it's what these pages actually
 *  need, and an unbounded "decode until stable" would keep chewing through
 *  text that legitimately contains "&amp;". Tags are stripped after both
 *  passes, so nothing a second decode reveals survives as markup. */
function plainText(value: string): string {
  return decodeEntities(decodeEntities(value))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---- Per-merchant gallery/attribute extraction ----------------------
//
// Historically held a hand-verified extractor per merchant here, each shape
// read off a real product page, never inferred from the platform — see git
// history if one is ever worth rebuilding. Those merchants were removed
// from the connector's list 2026-09-13 (see serper.ts's own header: only
// Shopify/WooCommerce Nigerian stores remain) and their extractors removed
// with them rather than left as dead code pointing at a shop no longer in
// the list.
//
// What's left is ONLY the generic pass every merchant already fell back to
// when it had no dedicated entry here: whatever og:image/twitter:image/
// itemprop=image tags the page itself publishes.
//
// A Shopify/WooCommerce-specific extractor (multi-photo gallery, real spec
// attributes) is a real gap this leaves — deliberately not guessed at here.
// If it's worth building, read a real listing page from each platform BY
// HAND first, and never assume one platform's markup shape from another's.

/** Real spec pairs (Condition, RAM, Storage, …) the listing's own page
 *  published — see ExternalOffer.attributes. Always empty today: no
 *  merchant currently in the connector's list has a verified extractor.
 *  Kept as its own function, rather than deleted outright, so a future
 *  Shopify/WooCommerce extractor has an obvious place to land — cap
 *  whatever it returns at around a dozen pairs: plenty for a comparison
 *  call, small enough that a long table can't crowd out everything else in
 *  the prompt. */
function extractAttributes(): { name: string; value: string }[] {
  return [];
}

/** Every distinct photo on the page, in document order — one canonical URL
 *  per photo, not one per size variant. */
function extractGallery(html: string): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (url: string) => {
    if (GENERIC_IMAGE.test(url)) return;
    const key = url.split("?")[0].toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(url);
  };

  for (const value of allMetaContent(html, [
    "og:image",
    "og:image:secure_url",
    "twitter:image",
  ])) {
    push(value);
  }
  for (const m of html.matchAll(
    /itemprop=["']image["'][^>]*content=["']([^"']+)["']/gi,
  )) {
    push(m[1]);
  }

  return ordered;
}

/** The explicit amount+currency meta pair, rendered the way the rest of the
 *  app renders money. Both tags are required: an amount with no currency is
 *  a number of unknown units, which is worse than showing no price. */
function priceFromMeta(html: string): string | null {
  const amount = metaContent(html, ["product:price:amount", "og:price:amount"]);
  const currency = metaContent(html, [
    "product:price:currency",
    "og:price:currency",
  ]);
  if (!amount || !currency) return null;
  const value = Number(amount.replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()];
  if (!symbol) return null;
  return `${symbol}${value.toLocaleString("en-NG")}`;
}

async function readHead(url: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal,
    cache: "no-store",
    redirect: "follow",
  });
  if (!res.ok || !res.body) return "";
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
    // Abandoning a half-read body leaks the connection otherwise.
    await reader.cancel().catch(() => {});
  }
  return html;
}

/**
 * Reads each product page for its photo gallery, its description, and an
 * explicit price pair when the page publishes one. Returns a map keyed by
 * the SAME url string passed in — missing entries simply mean nothing usable
 * was found, which callers must treat as normal rather than as an error.
 *
 * Partial results are the norm, not a failure: the whole batch shares one
 * short timeout, so a slow shop yields nothing while its neighbours yield
 * everything, and each offer independently keeps whatever it already had.
 */
export async function fetchPageMeta(
  urls: string[],
): Promise<Map<string, PageMeta>> {
  const out = new Map<string, PageMeta>();
  const unique = [...new Set(urls.filter(Boolean))];
  if (!unique.length) return out;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // A shared cursor rather than a chunked loop: a slow page holds up only
    // its own worker, not a whole wave of them.
    let next = 0;
    const worker = async () => {
      for (;;) {
        const index = next++;
        if (index >= unique.length) return;
        const url = unique[index];
        try {
          const html = await readHead(url, controller.signal);
          if (!html) continue;

          // A relative or protocol-relative image URL is useless to a
          // browser on another origin, so every photo is resolved against
          // the page it came from rather than shipped broken. One that
          // won't resolve is dropped, never passed through.
          const photos = extractGallery(html)
            .map((raw) => resolve(raw, url))
            .filter((u): u is string => Boolean(u));

          // The page's own og:image stays the primary when it published
          // one, so the card keeps showing exactly what it showed before
          // this file learned about galleries. Only when there is no
          // og:image does the first gallery photo take that role.
          const declared = metaContent(html, [
            "og:image",
            "og:image:secure_url",
            "twitter:image",
          ]);
          const primary =
            declared && !GENERIC_IMAGE.test(declared)
              ? resolve(declared, url)
              : (photos[0] ?? null);

          // Everything that isn't the primary. extractGallery already dedupes
          // by URL (minus its query string), and there's no per-merchant
          // notion of "same photo, different size" left to collapse here, so
          // a plain URL comparison is enough.
          const primaryKey = primary
            ? primary.split("?")[0].toLowerCase()
            : null;
          const galleryUrls = photos
            .filter((u) => u.split("?")[0].toLowerCase() !== primaryKey)
            .slice(0, MAX_GALLERY);

          const rawDescription = metaContent(html, [
            "og:description",
            "description",
          ]);
          const cleaned = rawDescription ? plainText(rawDescription) : "";
          const description = cleaned
            ? cleaned.slice(0, MAX_DESCRIPTION)
            : null;

          const priceText = priceFromMeta(html);
          const attributes = extractAttributes();
          if (
            !primary &&
            !galleryUrls.length &&
            !description &&
            !priceText &&
            !attributes.length
          ) {
            continue;
          }
          out.set(url, {
            imageUrl: primary,
            galleryUrls,
            description,
            priceText,
            attributes,
          });
        } catch {
          // Timeout, DNS, bot wall, malformed HTML — all the same thing
          // here: this offer keeps the data it already had.
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, unique.length) }, worker),
    );
  } finally {
    clearTimeout(timer);
  }
  return out;
}

function resolve(candidate: string, base: string): string | null {
  try {
    const url = new URL(candidate, base);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
