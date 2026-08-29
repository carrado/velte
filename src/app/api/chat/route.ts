import { NextResponse } from "next/server";

import { markSearchConversationHandoff } from "@/lib/server/searchConversations";
import { backendData } from "@/lib/server/backend";
import { buildWhatsappLink } from "@/lib/whatsapp";
import type { LeadSource } from "@/types/common";

// GET /api/chat → 302 to WhatsApp
//
// Every "Chat on WhatsApp" a BUYER clicks goes through here (2026-08-27) —
// search cards, store pages, landing previews. It does two things the browser
// used to do badly:
//
// 1. RESOLVES THE NUMBER SERVER-SIDE. The page used to build the wa.me link
//    itself, which meant the vendor's number sat in the DOM and in the href —
//    visible in the hover status bar, and one right-click from "copy link
//    address". Now the href is this route and the number never leaves the
//    server.
//
// 2. BILLS THE LEAD ON THE JOURNEY, not on a beacon. It used to be a
//    navigator.sendBeacon fired from the click; reportLead's own comment
//    admitted ad-blockers silently drop it ("a real lead goes unbilled with
//    zero visibility"), and once the href stopped being a wa.me link, a
//    copied link would have skipped billing entirely. Charging here means
//    the lead is billed exactly when the buyer is actually connected.
//
// The 15-minute same-buyer/same-vendor cooldown still applies server-side, so
// a double-click or a re-follow doesn't double-charge.
//
// A redirect route rather than a POST: it has to survive being a real link —
// target="_blank", no JS required, and WhatsApp opening in a new tab exactly
// as before.

// The prefill text is passed in rather than composed here, on purpose: each
// surface words it differently (a product card names the item, a store card
// names the shop, a service card names the service), and that copy belongs
// with the surface. Nothing about it is sensitive — unlike the number.
const MAX_MESSAGE = 700;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get("v");
  const productId = searchParams.get("p") || undefined;
  const source = (searchParams.get("s") || "search") as LeadSource;
  // Absent whenever the link was built during SERVER rendering (the store
  // page's own CTA, for one) — localStorage isn't reachable there, so
  // chatLink.ts can't stamp the per-browser id in.
  //
  // Substituted with a per-request random rather than passed through as
  // null, and that matters: the cooldown is keyed on (vendorId, buyerId), so
  // a shared null would make ONE buyer's click suppress billing for every
  // other buyer of that vendor for 15 minutes. A unique value can only ever
  // fail to dedupe a genuine repeat click by the same person — over-billing
  // one lead, versus silently under-billing all of them.
  const buyerId = searchParams.get("b") || `anon_${crypto.randomUUID()}`;
  const message = (searchParams.get("m") || "").slice(0, MAX_MESSAGE);
  const conversationId = searchParams.get("c") || null;
  const deviceId = searchParams.get("d") || null;
  const requestId = searchParams.get("r") || undefined;

  // Nothing to resolve without a vendor — send them home rather than to a
  // broken WhatsApp page.
  if (!vendorId) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }

  let whatsapp: string | null = null;
  try {
    // Bills and resolves in one call — see the backend's own note on why
    // those are the same endpoint.
    const data = await backendData<{
      billed: boolean;
      whatsapp: string | null;
    }>("/search/lead", {
      method: "POST",
      body: { vendorId, productId, buyerId, source, requestId },
    });
    whatsapp = data.whatsapp;
  } catch (err) {
    // Billing must never cost the buyer their chat. Logged, not surfaced —
    // but it does mean we have no number, so the fallback below runs.
    console.error("[chat] lead/resolve failed:", err);
  }

  // The AI-search surface's own terminal transition: a WhatsApp click ends
  // the shopping task. Was a second beacon riding alongside the billing one;
  // server-side now for the same reason, and just as best-effort — a
  // conversation that can't be flipped is not a reason to fail the handoff.
  if (source === "search" && conversationId && deviceId) {
    try {
      await markSearchConversationHandoff({ conversationId, deviceId });
    } catch {
      /* bookkeeping never blocks the handoff itself */
    }
  }

  const href = buildWhatsappLink(whatsapp, message, productId);
  if (!href) {
    // No number on file, or one that can't be normalised. Home is a poor
    // destination but a broken wa.me page is worse — WhatsApp shows a bare
    // "phone number is invalid" with no way back.
    return NextResponse.redirect(new URL("/", req.url), 302);
  }

  // Never cached: the target depends on live vendor data, and a cached
  // redirect would both stale the number and skip the billing above.
  const res = NextResponse.redirect(href, 302);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
