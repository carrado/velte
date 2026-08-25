import type { ExternalConnector } from "@/lib/server/connectors/types";
import type { ExternalOffer } from "@/types/search";

// Google Shopping results via serper.dev — the first external connector
// (Phase 4). Chosen over SerpAPI on price: same data at roughly 1/25th the
// cost, with 2,500 free searches a month, which comfortably covers the only
// path that calls this (dead ends and thin results, never every search).
//
// POST https://google.serper.dev/shopping, `X-API-KEY` header, JSON body
// { q, gl, hl, num }. `gl: "ng"` is what makes the results Nigerian rather
// than American — without it this returns offers nobody here can buy.
//
// Unconfigured is a first-class state, not an error: no SERPER_API_KEY
// means isEnabled() is false and the orchestrator never calls this, so the
// product behaves exactly as it did before Phase 4.

const SHOPPING_URL = "https://google.serper.dev/shopping";

// Hard ceiling on how long a dead-end turn will wait. By the time this
// runs the buyer has already been told Velte has nothing; making them wait
// much longer for a consolation list is a worse experience than not
// showing one.
const TIMEOUT_MS = 6000;

const DEFAULT_LIMIT = 6;

interface SerperShoppingItem {
  title?: string;
  source?: string;
  link?: string;
  price?: string;
  imageUrl?: string;
  productId?: string;
  position?: number;
}

/** Only offers that can actually be acted on — a result with no title or
 *  no link is not something a buyer can do anything with, so it's dropped
 *  rather than rendered as a dead card. */
function toOffer(
  item: SerperShoppingItem,
  index: number,
): ExternalOffer | null {
  const title = item.title?.trim();
  const url = item.link?.trim();
  if (!title || !url) return null;
  return {
    id: item.productId?.trim() || `serper-${index}-${url.slice(-24)}`,
    title,
    // Kept as the source's own string on purpose — see ExternalOffer.
    priceText: item.price?.trim() || null,
    imageUrl: item.imageUrl?.trim() || null,
    merchant: item.source?.trim() || null,
    source: "serper",
    url,
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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(SHOPPING_URL, {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q, gl: country, hl: "en", num: limit }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        // 401 (bad key) and 429 (free tier exhausted) are the two worth
        // recognising in logs — both mean "this is silently doing nothing
        // in production", which is otherwise invisible since the buyer
        // just sees a normal dead end.
        console.error(
          `[connectors/serper] shopping request failed: ${res.status}`,
        );
        return [];
      }
      const data = (await res.json()) as { shopping?: SerperShoppingItem[] };
      return (data.shopping ?? [])
        .slice(0, limit)
        .map(toOffer)
        .filter((o): o is ExternalOffer => o !== null);
    } catch (err) {
      // Includes the abort above. Never rethrown — see the connector
      // contract's "never throw" rule.
      console.error(
        "[connectors/serper] shopping lookup failed:",
        err instanceof Error ? err.message : err,
      );
      return [];
    } finally {
      clearTimeout(timer);
    }
  },
};
