// Open Graph enrichment for external offers (2026-08-26).
//
// Why this exists: the connector's two sources each carry half a card.
// Google Shopping has price + thumbnail but only a google.com redirect for
// a link; Google organic has the real product-page URL but no image and no
// price at all. Once the connector started preferring direct links (so
// buyers land on Jumia/Konga instead of back in a search engine), most
// offers came from the organic side — and rendered as grey placeholder
// tiles. A product card with no product on it is barely a card.
//
// So the missing half is read from the product page itself. Every Nigerian
// retailer in the connector's list publishes `og:image` (checked live on
// Jumia, Konga and oraimo), which is exactly the thing that was missing and
// costs no API credits — just an HTTP GET of a page we are already about to
// send the buyer to.
//
// Three rules, same spirit as the connector contract:
//   1. NEVER THROW, never reject. A page that is slow, blocked or malformed
//      leaves the offer exactly as it was.
//   2. NEVER FABRICATE. Only tags the page itself publishes are read, and
//      a price is only taken from the explicit, machine-readable
//      `product:price:amount` + `product:price:currency` PAIR — never
//      scraped out of visible text or guessed from a JSON blob, where
//      picking the wrong number is a real risk (Jumia's markup carries
//      several unrelated "price" keys).
//   3. NEVER BLOCK THE TURN. One short timeout for all pages together, and
//      whatever has arrived by then is what gets used.
//
// Widened 2026-08-27 from "the missing half of a card" to "everything the
// evaluation needs": the listing's FULL photo gallery and its description,
// not just one image and a price. Reported live — a phone search's top pick
// was a Jiji listing whose first photo was clean and whose later photos
// showed a broken screen. The pick call only ever saw photo one.
//
// What the probe found (real pages, that day), because it decided the shape
// of everything below:
//   - Jiji  — 3-5 photos, server-rendered, bytes ~1.9k-14.5k. Also the
//             fastest of the three. Its og:description is the SELLER's own
//             words, which is the most useful text of the three.
//   - Konga — 4 photos under /media/catalog/product/, first at byte ~2.3k.
//   - Jumia — photo #1 only; the rest of its gallery is loaded by JS and is
//             simply not in the HTML. Guessing 2.jpg/3.jpg would violate
//             rule 2, so Jumia stays single-image and honest about it.
//   - Seller-declared condition is worthless: 7/7 Jiji iPhone 12 listings
//             declared "No cracks". Only the photos carry the truth, which
//             is why the gallery matters more than any text field.
//   - JSON-LD (Jumia/Konga only, absent on Jiji) sits at byte 110k-147k,
//             past this file's cap, and carries only marketing copy. Not
//             worth a 300kb read, so it is deliberately NOT parsed.

// Deliberately tight. This runs after the buyer has already been told Velte
// had nothing, on top of a search that has already spent its time — a
// prettier card is not worth another two seconds of waiting.
const TIMEOUT_MS = 5000;

// These offers cluster on two hosts — five of six results are routinely
// Jumia — and firing all of them at once got most of a batch dropped
// (measured: 1 image out of 6 on a burst, while the same pages fetched
// individually all returned in under a second). A small pool is both
// politer and, in practice, faster than being throttled.
const CONCURRENCY = 3;

// Product pages are large (Jumia's runs past 150kb, Konga's past 290kb) and
// the stream is dropped once nothing we want can still appear, so a heavy
// page still costs a fraction of its real size.
//
// Raised from 60kb when galleries arrived, because measurement said so and
// a first guess said otherwise. Where each page's photos actually sit:
//   - Jiji  — the whole gallery inside ~14.5kb.
//   - Konga — photo 1 at byte ~2.3k, but photos 2-4 at bytes 74.9k, 76.6k
//             and 78.2k. Under the old 60kb cap Konga returned its primary
//             and NOTHING else, which looked exactly like a site that
//             publishes one photo.
// 100kb clears Konga's tail with room to spare and still stops well short
// of these pages' real size. The batch timeout, not this number, is what
// ultimately bounds the work.
//
// The other half of the same fix was deleting the </head> early-exit below:
// </head> lands at bytes 3.8k-13k, i.e. BEFORE every gallery here, so
// stopping there found nothing at all.
const MAX_BYTES = 100_000;

// A hard ceiling on how many photos leave here for one offer. The gallery
// feeds a multimodal comparison call that fetches every image it's handed,
// so an unusually generous listing must not turn one card into a dozen
// image downloads in front of a waiting buyer. Enough to catch a defect a
// seller buried in a later photo, which is the whole point.
const MAX_GALLERY = 6;

// The listing's own words, clipped — long enough to carry "UK used, Grade
// A, minor scratches", short enough that marketing boilerplate (Konga's
// runs past 5,000 characters) can't crowd out the comparison prompt.
const MAX_DESCRIPTION = 400;

// A browser-ish UA: several of these storefronts sit behind bot protection
// that serves an interstitial to an unrecognised agent, which would leave
// every offer image-less for a reason invisible in the output.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface PageMeta {
  imageUrl: string | null;
  /** Additional photos, primary excluded, already deduped and capped. */
  galleryUrls: string[];
  description: string | null;
  priceText: string | null;
}

function metaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    // Both attribute orders and both spellings — `property=` is the Open
    // Graph convention, `name=` is what several of these sites actually
    // emit (Konga's price tags among them).
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
// page has none of its own — Konga serves
// `website_assets/icons/favicon/og-image.jpg` this way. That is a logo, not
// the product, and putting it on a card is worse than the honest empty
// state: it looks like a real photo of the wrong thing. Recognised by the
// shapes those fallbacks actually take rather than by host.
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

// Named entities these three storefronts actually emit. `&amp;` is decoded
// LAST so an "&amp;lt;" in the source can't be turned into a real tag.
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

/** A meta value as readable prose. Konga publishes its og:description as
 *  ESCAPED HTML ("&lt;p&gt;Original Apple iPhone…"), so entities are decoded
 *  first and only then are tags stripped — the other order leaves the markup
 *  sitting in the text handed to the model.
 *
 *  Decoded TWICE because Konga is doubly escaped: its markup arrives as
 *  "&amp;ndash;", which one pass turns into "&ndash;" and leaves there. Two
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

function base64urlDecode(value: string): string | null {
  try {
    const norm = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = norm.length % 4 === 0 ? "" : "=".repeat(4 - (norm.length % 4));
    return atob(norm + pad);
  } catch {
    return null;
  }
}

// ---- Per-merchant gallery extraction --------------------------------
//
// Each shape below was read off a real product page (2026-08-27), never
// inferred from the platform. A merchant with no entry here falls through to
// the generic pass, which can only find what the page publishes about itself
// — so an unknown shop degrades to the old single-image behaviour rather
// than to something wrong.

const JIJI_PHOTO =
  /https?:\/\/pictures-nigeria\.jijistatic\.net\/(\d+)_([A-Za-z0-9_-]+)\.(?:jpe?g|png|webp)/gi;

const KONGA_PHOTO =
  /https?:\/\/www-konga-com-res\.cloudinary\.com\/(?:image\/upload\/[^/]*\/)?media\/catalog\/product\/([A-Za-z0-9]\/[A-Za-z0-9]\/[A-Za-z0-9_]+\.(?:jpe?g|png|webp))/gi;

// Big enough to see a cracked screen, small enough that six of them don't
// stall the comparison call that fetches every one.
const TARGET_WIDTH = 512;

/** A stable identity for one PHOTO, independent of whichever size/format
 *  variant a URL points at. Without it the primary image reappears as its
 *  own first gallery entry — Jiji serves the same shot as both a 300px jpg
 *  (its og:image) and a 1600px webp (its slider). */
function photoKey(url: string): string {
  const jiji = /pictures-nigeria\.jijistatic\.net\/(\d+)_/i.exec(url);
  if (jiji) return `jiji:${jiji[1]}`;
  const konga =
    /media\/catalog\/product\/([A-Za-z0-9]\/[A-Za-z0-9]\/[A-Za-z0-9_]+)\./i.exec(
      url,
    );
  if (konga) return `konga:${konga[1]}`;
  return url.split("?")[0].toLowerCase();
}

/** Jiji's variant token is base64url of "<width>-<height>-<hash>", so the
 *  same photo can be requested at any published size. The smallest variant
 *  at or above TARGET_WIDTH wins; when none qualifies the largest available
 *  does, which still beats dropping the photo. */
function pickJijiVariant(variants: { url: string; token: string }[]): string {
  const sized = variants.map((v) => {
    const decoded = base64urlDecode(v.token);
    const width = decoded ? Number(/^(\d+)-/.exec(decoded)?.[1]) : NaN;
    return { url: v.url, width: Number.isFinite(width) ? width : 0 };
  });
  const big = sized
    .filter((v) => v.width >= TARGET_WIDTH)
    .sort((a, b) => a.width - b.width)[0];
  if (big) return big.url;
  return sized.sort((a, b) => b.width - a.width)[0].url;
}

/** Every distinct photo on the page, in document order — one canonical URL
 *  per photo, not one per size variant. */
function extractGallery(html: string, pageUrl: string): string[] {
  let host = "";
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    host = "";
  }

  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (url: string) => {
    if (GENERIC_IMAGE.test(url)) return;
    const key = photoKey(url);
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(url);
  };

  if (host.includes("jiji.ng")) {
    // Group every size variant under its photo id, then choose one each.
    const byPhoto = new Map<string, { url: string; token: string }[]>();
    const order: string[] = [];
    for (const m of html.matchAll(JIJI_PHOTO)) {
      const [url, photoId, token] = m;
      if (!byPhoto.has(photoId)) {
        byPhoto.set(photoId, []);
        order.push(photoId);
      }
      byPhoto.get(photoId)!.push({ url, token });
    }
    for (const photoId of order) push(pickJijiVariant(byPhoto.get(photoId)!));
  } else if (host.includes("konga.com")) {
    // Normalised onto one transform so a w_32 sprite and a w_3840 original
    // of the same shot collapse to a single, sensibly-sized request.
    for (const m of html.matchAll(KONGA_PHOTO)) {
      push(
        `https://www-konga-com-res.cloudinary.com/image/upload/f_auto,q_auto,w_${TARGET_WIDTH},c_limit/media/catalog/product/${m[1]}`,
      );
    }
  }

  // The generic pass, and the ONLY pass for Jumia: whatever the page
  // publishes about itself. Jumia's gallery is rendered client-side and is
  // simply not in the HTML — inventing /2.jpg, /3.jpg from the /1.jpg it
  // does publish would break this file's second rule, so Jumia stays
  // single-image.
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
          const photos = extractGallery(html, url)
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

          // Everything that isn't the primary, compared by PHOTO rather
          // than by URL so a different size of the same shot doesn't come
          // back as a second image.
          const primaryKey = primary ? photoKey(primary) : null;
          const galleryUrls = photos
            .filter((u) => photoKey(u) !== primaryKey)
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
          if (!primary && !galleryUrls.length && !description && !priceText) {
            continue;
          }
          out.set(url, {
            imageUrl: primary,
            galleryUrls,
            description,
            priceText,
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
