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
// make a bad moment worse by making them wait even longer for it.
const TIMEOUT_MS = 6000;

const DEFAULT_LIMIT = 4;

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

/**
 * Searches for real, public Instagram business pages matching a business
 * type (and, when the buyer named one, a place) — a genuine STORE dead
 * end's third fallback tier, after Velte itself and Google Places.
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
  const q = `site:instagram.com "${businessType}" "${location}"`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SEARCH_URL, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      // gl: "ng" — same reasoning as serper.ts's own product search: without
      // it this returns whatever ranks well globally, not for a Nigerian
      // buyer.
      body: JSON.stringify({ q, gl: "ng", hl: "en", num: 10 }),
      signal: controller.signal,
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
    const limit = params.limit ?? DEFAULT_LIMIT;
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
        location: params.location?.trim() || null,
      });
      if (leads.length >= limit) break;
    }
    return leads;
  } catch (err) {
    // Includes the abort above. Never rethrown — same connector contract
    // as every other external source here.
    console.error(
      "[connectors/instagramBusinessSearch] lookup failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  } finally {
    clearTimeout(timer);
  }
}
