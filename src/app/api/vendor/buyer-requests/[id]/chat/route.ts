import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import { buildWhatsappLink } from "@/lib/whatsapp";
import type { BuyerRequest } from "@/types/buyerRequest";

// GET /api/vendor/buyer-requests/:id/chat → 302 to WhatsApp
//
// The buyer's number never reaches the browser (2026-08-27). It used to: the
// CTA was a plain `<a href="https://wa.me/234...">`, which puts the number in
// the DOM, in the status bar on hover, and one right-click away via "copy
// link address". So the number was gated on ACCEPTING only in the sense that
// it was gated on rendering — anyone could read it off the page, and the
// detail payload carried it besides.
//
// Now the CTA points here, the vendor's own session is checked, the number is
// resolved server-side, and the browser only ever sees a redirect. Accepting
// buys a way to CHAT, which is what it was always meant to buy — not a phone
// number to keep.
//
// A redirect route rather than a POST + JSON because it has to survive being
// a real link: target="_blank" from a click, no fetch, no JS required, and
// WhatsApp opens in a new tab exactly as it did before. Same shape as
// /s/p/[id] already uses for the photo links inside wa.me prefills.

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;

  try {
    // The backend strips buyerPhone unless THIS vendor accepted this request
    // (see withGatedPhone) — so the gate is enforced there, on the data,
    // and this route can't hand out a number the vendor hasn't earned even
    // if it wanted to.
    const { request } = await backendData<{ request: BuyerRequest }>(
      `/vendor/buyer-requests/${id}`,
      { cookie: gate.cookie },
    );

    const href = buildWhatsappLink(
      request.buyerPhone ?? null,
      `Hi ${request.buyerName}, I saw your request on Velte for: ${request.description}`,
    );
    if (!href) {
      // Either they haven't accepted (no number in the payload) or the
      // stored number can't be normalised. Send them back to the request
      // itself rather than to a broken WhatsApp page — that page's own state
      // explains where they are far better than an error here could.
      return NextResponse.redirect(
        new URL(`/${gate.userId}/buyer-requests/${id}`, _req.url),
        302,
      );
    }

    // 302, not 307/permanent: this is a one-time resolution whose target
    // depends on request state, and it must never be cached by the browser
    // or an intermediary — a cached redirect would leak the number to a
    // later request that shouldn't get it.
    const res = NextResponse.redirect(href, 302);
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch {
    return NextResponse.redirect(
      new URL(`/${gate.userId}/buyer-requests/${id}`, _req.url),
      302,
    );
  }
}
