import type { InstagramLead } from "@/types/search";

// Instagram business leads for a genuine STORE dead end (2026-09-15,
// explicit request) — nothing on Velte, no real Google Places result
// either. Many small Nigerian vendors (caterers, tailors, event stylists,
// small-batch food sellers) run entirely off an Instagram page, with no
// website and often no Google Places listing at all, so Places alone
// misses a real, findable slice of exactly the businesses a buyer is
// asking about.
//
// PUBLIC SEARCH ONLY, deliberately, and that boundary is the whole design
// — see the Jumia automation request this repo's own conversation history
// already declined: reusing a saved login session to act on a private
// account is what made that one unacceptable, not "talking to a
// third-party site" in general. This is the opposite shape: a plain
// `site:instagram.com` Google search via serper.dev (the SAME API and the
// SAME technique connectors/serper.ts already uses to find e-commerce
// product pages), returning only what Instagram already serves to an
// anonymous, logged-out visitor and Google already indexed. No login, no
// stored session, no cookie, no action taken on anyone's account — just a
// search result naming a public page, same as a Google Places business
// listing is a public record naming a place.
//
// Kept as its OWN connector, not folded into serper.ts's product-offer
// one, because the two answer genuinely different questions with
// genuinely different result shapes: that file returns ExternalOffer
// (price, direct product page, merchant) for a PRODUCT dead end, and
// explicitly EXCLUDES instagram.com from its own results (see serper.ts's
// NOT_A_SHOP) because a social page is not a shop with a checkout. This
// file answers "is there a real BUSINESS page for this", for a STORE/
// vendor dead end — no price, no product, just a name and a place to look.

const SEARCH_URL = "https://google.serper.dev/search";

// Same instinct as serper.ts's own TIMEOUT_MS: the buyer has already been
// told Velte has nothing by the time this runs, so a hung request must not
// make a bad moment worse by making them wait even longer for it. Doubled
// from 6000 (2026-09-22) now that this can run up to two passes (see
// searchInstagramBusinesses' own header) — still a single ceiling shared
// across both, never per-pass, so a slow first pass can't double the total
// wait on its own.
const TIMEOUT_MS = 10000;

// Raised from 4 (2026-09-22, explicit request: "search Instagram very very
// well and deep") — this is now the FIRST fallback tier for a buyer who
// explicitly opted into a real vendor (route.ts's own isAnsweringVendorSearchOffer,
// Google Places demoted to Instagram's own fallback there), not a
// second-string list shown alongside Places, so it's worth surfacing more
// of what a deeper search finds.
const DEFAULT_LIMIT = 6;

interface SerperOrganicItem {
  title?: string;
  link?: string;
  snippet?: string;
}

/** True when a SERPER_API_KEY is configured — same gate serper.ts's own
 *  isEnabled() uses, since this shares that one key. */
export function isInstagramLeadSearchEnabled(): boolean {
  return Boolean(process.env.SERPER_API_KEY);
}

// Matches ONLY a bare profile URL (instagram.com/<handle>, optionally with
// a trailing slash or query string) — never a post (/p/...), a reel, a
// hashtag, or one of Instagram's own static pages. A post can mention a
// business without BEING its page, and a hashtag/explore URL names no
// business at all; a profile is the one shape that's actually a lead worth
// showing.
const PROFILE_URL =
  /^https:\/\/(?:www\.)?instagram\.com\/([^/?#]+)\/?(?:\?.*)?$/i;
const NON_PROFILE_HANDLES = new Set([
  "p",
  "reel",
  "reels",
  "tv",
  "explore",
  "accounts",
  "about",
  "legal",
  "stories",
  "direct",
  "web",
]);

/** One Serper `/search` call against `site:instagram.com`, parsed down to
 *  real profile leads. Split out from searchInstagramBusinesses (2026-09-22)
 *  so that function can run it TWICE with different query shapes — see its
 *  own header for why one pass was never enough. Never throws — same
 *  connector contract as every other external source here; a failure just
 *  means this particular pass found nothing. */
async function runInstagramQuery(
  q: string,
  apiKey: string,
  businessType: string,
  location: string | null,
  signal: AbortSignal,
): Promise<InstagramLead[]> {
  try {
    const res = await fetch(SEARCH_URL, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      // gl: "ng" — same reasoning as serper.ts's own product search: without
      // it this returns whatever ranks well globally, not for a Nigerian
      // buyer. num raised from 10 to 20 (2026-09-22, "search very very well
      // and deep") — more candidates for the PROFILE_URL filter below to
      // sift through before this pass gives up.
      body: JSON.stringify({ q, gl: "ng", hl: "en", num: 20 }),
      signal,
      cache: "no-store",
    });
    if (!res.ok) {
      // 401/429 are the two worth recognising — see serper.ts's own note on
      // why this stays a log line rather than a thrown error.
      console.error(
        `[connectors/instagramBusinessSearch] request failed: ${res.status}`,
      );
      return [];
    }
    const data = (await res.json()) as { organic?: SerperOrganicItem[] };
    const leads: InstagramLead[] = [];
    for (const item of data.organic ?? []) {
      const url = item.link?.trim();
      const title = item.title?.trim();
      if (!url || !title) continue;
      const match = PROFILE_URL.exec(url);
      if (!match) continue;
      if (NON_PROFILE_HANDLES.has(match[1].toLowerCase())) continue;
      leads.push({
        url,
        handle: match[1],
        title,
        snippet: item.snippet?.trim() || null,
        need: businessType,
        location,
      });
    }
    return leads;
  } catch (err) {
    // Includes an abort. Never rethrown — same connector contract as every
    // other external source here.
    console.error(
      "[connectors/instagramBusinessSearch] lookup failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/**
 * Searches for real, public Instagram business pages matching a business
 * type (and, when the buyer named one, a place) — the FIRST fallback tier
 * for a buyer who's explicitly opted into a real vendor (route.ts's own
 * isAnsweringVendorSearchOffer), with Google Places demoted to Instagram's
 * OWN fallback there (2026-09-22, explicit product decision — most small
 * Nigerian vendors this offer exists for run off an Instagram page with no
 * separate listing Places would ever index).
 *
 * TWO PASSES, not one (2026-09-22, explicit request: "search Instagram very
 * very well and deep") — a real bakery's own bio is far more likely to say
 * "Cakes", "Custom Cakes", "Confectionery" or "Baker" than the buyer's own
 * exact phrase ("birthday cake"), and the original single exact-phrase-AND
 * query required BOTH the business type AND the location to appear
 * verbatim, which is precise but easily misses a real, findable page. Pass
 * 1 stays exact-phrase (fast, high-precision — most business types DO
 * appear close to verbatim in a real bio, e.g. "tailor", "caterer") and
 * only Pass 2 — run ONLY when Pass 1 found nothing — drops the quotes
 * around `businessType` for a broader keyword match. The LOCATION
 * constraint is NEVER loosened in either pass — see the query-building
 * code below for why (the live Sacramento-appliance-shop incident this
 * guard already exists for).
 *
 * Never throws: a failed or unconfigured lookup returns an empty array,
 * exactly like every other external connector in this codebase, so a dead
 * end simply shows one fewer section rather than breaking the turn.
 */
export async function searchInstagramBusinesses(params: {
  /** The kind of business searched — e.g. "caterer", "tailor". */
  businessType: string;
  /** The place name the buyer's own words gave, if any (e.g. "Enugu") —
   *  never a raw lat/lng; there is no coordinate this text search can use,
   *  only a place NAME to fold into the query the same way the buyer
   *  would type it themselves. When none was named, this does NOT mean
   *  "search with no location constraint at all" — see the query-building
   *  code just below for why. */
  location?: string | null;
  limit?: number;
}): Promise<InstagramLead[]> {
  const apiKey = process.env.SERPER_API_KEY;
  const businessType = params.businessType.trim();
  if (!apiKey || !businessType) return [];

  // ALWAYS a country-or-place constraint, never bare `site:instagram.com
  // "${businessType}"` with nothing else (2026-09-15, found live: "a small
  // chest freezer" — no location named — surfaced "Appliance Warehouse",
  // a real business, but a Sacramento, California one, its own bio
  // stuffed with #sacramento/#norcal hashtags). `gl: "ng"` below only
  // biases Google's RANKING toward Nigeria; it never filters OUT a
  // non-Nigerian page that otherwise matches well on the business-type
  // words alone, and a generic English phrase like "appliance store" or
  // "caterer" matches businesses worldwide. Velte is Nigeria-only (see
  // serper.ts's own header on why its product connector rejects
  // non-Nigerian shops the same way) — a quoted "Nigeria" is a REAL
  // filter, not a ranking hint: Google's `site:` search only returns
  // pages where that exact term actually appears. Only falls back to the
  // bare "Nigeria" when the buyer named no specific place — a real
  // Nigerian city name (e.g. "Enugu") is already at least as strong a
  // signal on its own, and stacking both would risk excluding a genuine
  // local business whose bio never spells out the country.
  const location = params.location?.trim() || "Nigeria";
  const locationOut = params.location?.trim() || null;
  const limit = params.limit ?? DEFAULT_LIMIT;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const preciseQuery = `site:instagram.com "${businessType}" "${location}"`;
    let leads = await runInstagramQuery(
      preciseQuery,
      apiKey,
      businessType,
      locationOut,
      controller.signal,
    );
    if (!leads.length) {
      // Pass 2 — broader keyword match, location still quoted/required.
      // Deliberately only reached when Pass 1 found literally nothing: the
      // exact-phrase query is the higher-confidence read, and running both
      // unconditionally would just double the API cost for no benefit on
      // the (common) case where Pass 1 already worked.
      const broadQuery = `site:instagram.com ${businessType} "${location}"`;
      leads = await runInstagramQuery(
        broadQuery,
        apiKey,
        businessType,
        locationOut,
        controller.signal,
      );
    }
    return leads.slice(0, limit);
  } finally {
    clearTimeout(timer);
  }
}
