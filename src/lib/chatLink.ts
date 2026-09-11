import type { LeadSource } from "@/types/common";
import { generateUUID } from "@/lib/uuid";
import {
  getSearchDeviceId,
  getStoredConversationId,
} from "@/lib/searchConversation";

// Builds the href for every buyer-facing "Chat on WhatsApp" button
// (2026-08-27). It points at /api/chat, which resolves the vendor's number
// server-side, bills the lead, and redirects.
//
// This replaces the old pairing of buildWhatsappLink (in the href) with
// reportLead (in onClick). That pairing had two holes:
//
//   - the vendor's number was IN the href, so it showed in the hover status
//     bar and came out of "copy link address" without a click;
//   - billing rode on navigator.sendBeacon, which reportLead's own comment
//     admitted ad-blockers drop silently — an unbilled lead with no trace.
//
// Both close by making the link itself the billable event. See
// src/app/api/chat/route.ts.
//
// buildWhatsappLink still exists and is still correct — it's what the SERVER
// uses to build the final wa.me URL, and what the vendor-side buyer-request
// chat route uses. It just shouldn't be called from a buyer-facing component
// any more.

// Anonymous, per-browser buyer id — never tied to an account, just enough for
// the backend to recognise "the same buyer clicked again" and apply the
// 15-minute same-buyer/same-vendor cooldown instead of billing every click.
// localStorage, not sessionStorage, so the cooldown holds across tabs and
// reloads. Moved here verbatim from reportLead: the value and its key must
// stay identical or every existing browser's cooldown resets.
const BUYER_ID_KEY = "velte-buyer-id";

function getBuyerId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem(BUYER_ID_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(BUYER_ID_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage disabled — no id just means this click
    // isn't cooldown-deduped, not that it fails.
    return null;
  }
}

export interface ChatLinkParams {
  vendorId: string;
  /** The listing being asked about, when there is one. Also what lets the
   *  server attach a /s/p/<id> photo link to the prefill. */
  productId?: string;
  /** Which surface produced the click — see LeadSource. */
  source: LeadSource;
  /** The prefilled WhatsApp message. Composed by the CALLER because each
   *  surface words it differently; nothing in it is sensitive. */
  message: string;
  /** Only for source: "buyer_request". */
  requestId?: string;
}

/**
 * The href for a buyer's WhatsApp CTA. Safe to render into an `<a>`: it
 * carries no phone number, only ids the backend already knows.
 *
 * Returns null when there's no vendor to chat — callers render their own
 * "no contact" state, exactly as they did when buildWhatsappLink returned
 * null for a missing number.
 */
export function buildChatLink(params: ChatLinkParams): string | null {
  const { vendorId, productId, source, message, requestId } = params;
  if (!vendorId) return null;

  const query = new URLSearchParams({ v: vendorId, s: source, m: message });
  if (productId) query.set("p", productId);
  if (requestId) query.set("r", requestId);

  const buyerId = getBuyerId();
  if (buyerId) query.set("b", buyerId);

  // The AI-search surface's click also ends the persisted shopping task, and
  // the server can only do that if it knows which conversation. Search-source
  // only — a browse click has no conversation to conclude — and simply
  // omitted when there isn't one (stateless session, storage unavailable).
  if (source === "search") {
    try {
      const conversationId = getStoredConversationId();
      const deviceId = getSearchDeviceId();
      if (conversationId && deviceId) {
        query.set("c", conversationId);
        query.set("d", deviceId);
      }
    } catch {
      /* task bookkeeping never blocks the handoff itself */
    }
  }

  return `/api/chat?${query.toString()}`;
}
