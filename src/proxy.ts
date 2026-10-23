// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { clearSessionCookies } from "@/lib/server/clearSessionCookies";

// Infra/utility routes — always accessible, full stop, regardless of auth
// state. Not "public pages" in the sense the other lists below are about.
const alwaysPublicRoutes = [
  "/_next",
  "/favicon.ico",
  "/site.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/payment/callback",
  "/cart/callback",
  "/s", // branded short-link redirector (see src/app/s/[code]/route.ts)
  // The "Chat on WhatsApp" redirect (src/app/api/chat/route.ts) — same
  // shape as /s above (a real link meant for direct navigation, not a JS
  // fetch call), but under /api, so without this it also falls through to
  // the protected-dashboard-route branch at the bottom of this file and
  // sends every anonymous buyer to /auth/login instead of WhatsApp. Must
  // work for a buyer with NO session at all, same as search itself.
  "/api/chat",
];

// Genuinely public PAGES that stay viewable even by a logged-in user — each
// for its own concrete reason, not just "it's public":
//  - /store and /track are public-facing pages with their own separate
//    access model (a store handle, a tracking key) — a logged-in vendor
//    checking another store, or their own tracking link, is normal.
//  - /privacy and /terms are reference documents linked FROM INSIDE the
//    authenticated app itself (the wallet top-up / funding-method modals'
//    "Privacy Policy" link, opened in a new tab) — blocking these would
//    break that existing link.
//  - /chat and /marketplace are the deliberate "Buy on Velte" hand-offs
//    (see Header.tsx's own comment) letting a logged-in VENDOR use the
//    buyer-facing search/browse themselves — blocking either would remove
//    a real, intentional feature. /chat's route history: /search → /velux
//    (renamed to match the AI's own persona name at the time) → /chat
//    (2026-08-16, once that persona — "Velux" — was retired for colliding
//    with the real Velux trademark; see chat/page.tsx's own comment).
//  - /updates is what a super-admin broadcast SMS links a vendor to (see
//    velte-super-admin's BroadcastMessageView.vue) — almost always opened
//    by an already-logged-in vendor on their phone. Putting it in
//    marketingRoutes below would bounce that vendor straight to their
//    dashboard instead of showing the notice, defeating the whole point.
const publicRegardlessOfAuth = [
  "/store",
  "/track",
  "/privacy",
  "/terms",
  "/chat",
  "/marketplace",
  // Shared Hub. A vendor session sees the vendor page; a buyer session
  // sees the directory. Not a dashboard id, so it must not fall through
  // to the /:id branch.
  "/hub",
  "/updates",
  // The installed PWA's entry point (2026-08-29, see app/launch/page.tsx).
  // MUST be listed here: it is a single-segment path, so without this it
  // falls all the way through to the "/:id" branch at the bottom — a
  // logged-out buyer would be bounced to /auth/login (a login wall on app
  // open, for people who have no vendor account at all) and a vendor would
  // be redirected to /products before the route could decide anything.
  "/launch",
  // No /plans entry since 2026-08-31: buyer plans became a full-screen modal
  // inside /chat (components/credits/CreditsModal.tsx) and the route was deleted,
  // so there is nothing left here to make public. /chat above already covers
  // every surface that can open it. Not to be confused with /pricing, which
  // is the vendor-facing pay-per-lead page and stays a marketing route.
  // No /buyer/auth entry anymore (2026-08-18) — there's no buyer-facing
  // page tree left at all. A buyer's only touchpoint is the inline
  // phone+OTP capture inside /chat itself (already covered by the /chat
  // entry above), verified via its own separate buyer_auth_token cookie
  // (requireBuyerAuth in the BFF layer) — this middleware never needs to
  // know about it.
];

// Marketing/onboarding pages — meant for a prospective or logged-out
// visitor. A genuinely logged-in user landing here (via back-navigation, a
// bookmark, or typing the URL directly) is bounced straight to their
// dashboard instead of being shown the page at all.
const marketingRoutes = [
  "/about",
  "/auth",
  "/blog",
  "/careers",
  "/contact",
  "/pricing",
  "/faq",
  "/welcome",
  // How It Works (2026-08-16) — same treatment as /about/pricing/faq: pure
  // explanatory content for a prospective visitor. Was missing from every
  // list here entirely, which meant it fell through to the "protected
  // dashboard route" branch at the bottom and redirected straight to
  // /auth/login for anyone without a session — i.e. everyone.
  "/how-it-works",
  // The unified "Join Velte" chooser (2026-08-14) — same treatment as
  // /auth: a logged-in vendor lands on their dashboard instead, a
  // logged-out visitor picks Buyer or Business from here.
  "/join",
];

const VENDOR_COOKIE = "auth_token";
const BUYER_COOKIE = "buyer_auth_token";

async function readSessions(request: NextRequest) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const vendorToken = request.cookies.get(VENDOR_COOKIE)?.value;
  const buyerToken = request.cookies.get(BUYER_COOKIE)?.value;
  let userId: string | null = null;
  let buyerId: string | null = null;
  const dead: string[] = [];

  if (vendorToken) {
    try {
      const { payload } = await jwtVerify(vendorToken, secret);
      userId = (payload.userId as string) || null;
      if (!userId) dead.push(VENDOR_COOKIE);
    } catch {
      dead.push(VENDOR_COOKIE);
    }
  }

  if (buyerToken) {
    try {
      const { payload } = await jwtVerify(buyerToken, secret);
      if (payload.type === "buyer" && typeof payload.buyerId === "string") {
        buyerId = payload.buyerId;
      } else {
        dead.push(BUYER_COOKIE);
      }
    } catch {
      dead.push(BUYER_COOKIE);
    }
  }

  return { userId, buyerId, dead };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🚫 Block direct browser navigation to API routes.
  // Real app calls go through fetch() (Sec-Fetch-Dest: empty / Sec-Fetch-Mode: cors|same-origin).
  // Pasting an /api URL into the address bar is a top-level navigation
  // (Sec-Fetch-Dest: document) — forbid those so the endpoint can't be loaded directly.
  //
  // /api/chat is the ONE deliberate exception (found live: every "Chat on
  // WhatsApp" CTA 403'd here). It's not called from JS at all — buildChatLink
  // (src/lib/chatLink.ts) renders it as a real `<a href="/api/chat?...">`,
  // target="_blank", specifically so it survives as an ordinary link with no
  // JS required (see that route's own header comment) — which makes it a
  // genuine top-level navigation by design, not the thing this block exists
  // to stop. Blocking it here meant every WhatsApp handoff in the app 403'd
  // as soon as this rule shipped.
  if (pathname.startsWith("/api") && pathname !== "/api/chat") {
    const dest = request.headers.get("sec-fetch-dest");
    const mode = request.headers.get("sec-fetch-mode");
    if (dest === "document" || mode === "navigate") {
      return new NextResponse("Forbidden", {
        status: 403,
        headers: { "content-type": "text/plain" },
      });
    }
    // Leave the cookie alone on fetch(). A page navigation is what notices
    // an expired session and sends the person home; clearing it here first
    // would make the next click look like a guest and leave them on the page.
    return NextResponse.next();
  }

  // ✅ Allow all static assets (images, etc.) – no authentication needed
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|manifest)$/i.test(pathname)) {
    return NextResponse.next();
  }

  // Callbacks, the short-link redirector, and /api/chat must keep working
  // even when a session has died — clearing the cookie here is enough, and
  // a redirect would swallow the Paystack return or the WhatsApp handoff.
  if (alwaysPublicRoutes.some((route) => pathname.startsWith(route))) {
    const { dead } = await readSessions(request);
    return clearSessionCookies(NextResponse.next(), dead);
  }

  const { userId, buyerId, dead } = await readSessions(request);
  const pass = (response: NextResponse) => clearSessionCookies(response, dead);

  // A cookie was presented and none of it still verifies. That is a logged-in
  // session that has expired (or been tampered with). Drop it and leave the
  // app: every later click otherwise renders the page as if the session were
  // still there, because /chat, /hub and the other public screens never
  // looked at the cookie. "/" itself is the destination, so it stays.
  if (dead.length > 0 && !userId && !buyerId && pathname !== "/") {
    return pass(NextResponse.redirect(new URL("/", request.url)));
  }

  if (publicRegardlessOfAuth.some((route) => pathname.startsWith(route))) {
    return pass(NextResponse.next());
  }

  const token = request.cookies.get(VENDOR_COOKIE)?.value;

  // A genuinely logged-in user gets bounced to their dashboard instead of
  // ever seeing a marketing/onboarding page — "on no account can they view
  // public pages [besides the exceptions above] until they are logged out."
  if (
    marketingRoutes.some((route) => pathname.startsWith(route) && route !== "/")
  ) {
    if (userId) {
      return pass(
        NextResponse.redirect(new URL(`/${userId}/products`, request.url)),
      );
    }
    return pass(NextResponse.next());
  }

  // If user visits "/" without a valid session, allow the landing page —
  // UNLESS this is the installed PWA launching (manifest start_url is
  // "/?source=pwa", see site.webmanifest): redirect server-side, before any
  // HTML ships, straight to /welcome instead of the marketing homepage.
  // A client-side guard alone could only act after hydration — by then the
  // browser had already painted the SSR'd marketing page, so a logged-out PWA
  // launch visibly flashed it before bouncing to /welcome. This removes that
  // flash for the launch path.
  //
  // Still here even though start_url now points at /launch (2026-08-29): an
  // app installed before that change has "/?source=pwa" cached in its own
  // manifest until the browser re-fetches it, so this is what serves those
  // installs. In-app navigation to "/" — and to every OTHER marketing page —
  // is handled by the root layout's pre-paint script + StandalonePublicGuard.
  if (pathname === "/") {
    if (!userId) {
      if (request.nextUrl.searchParams.get("source") === "pwa") {
        return pass(NextResponse.redirect(new URL("/welcome", request.url)));
      }
      // A signed-in BUYER belongs in the chat, not on the marketing site
      // (2026-09-05, per explicit request — the same rule the block above
      // has always applied to vendors, extended to the other kind of
      // account). Until now it only ever checked `auth_token`, so a buyer
      // with a perfectly good session still got the landing page, pitched
      // at them as though they had never signed up.
      //
      // Scoped to "/" ALONE, deliberately. The vendor rule covers every
      // marketing route, but /auth is on that list, and a buyer reaching
      // for vendor sign-in is a real thing this product actively wants —
      // a buyer who decides to start selling. Blocking their way to it to
      // be symmetrical would break the more valuable path.
      //
      // An expired buyer cookie never reaches this branch with buyerId set:
      // the expiry gate above already cleared it and, on any page but this
      // one, sent them home.
      if (buyerId) {
        return pass(NextResponse.redirect(new URL("/chat", request.url)));
      }
      return pass(NextResponse.next());
    }
    // Logged-in user visits "/" -> "/:id/products", UNLESS this is the
    // installed PWA launching, which always opens straight to the wallet
    // instead — same page login itself already redirects to (see
    // auth/login/page.tsx).
    const dest =
      request.nextUrl.searchParams.get("source") === "pwa"
        ? "wallet"
        : "products";
    return pass(
      NextResponse.redirect(new URL(`/${userId}/${dest}`, request.url)),
    );
  }

  // Everything below this point is a protected dashboard route.
  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return pass(NextResponse.redirect(loginUrl));
  }
  if (!userId) {
    // Vendor cookie failed verification. A still-valid buyer session belongs
    // in chat; otherwise the expiry gate already sent them home, and this is
    // the leftover.
    const dest = buyerId ? "/chat" : "/";
    return pass(NextResponse.redirect(new URL(dest, request.url)));
  }

  // Break path into segments
  const segments = pathname.split("/").filter(Boolean);

  // Logged-in user visits "/:id" -> redirect to "/:id/products"
  if (segments.length === 1) {
    // No need to compare with userId – just redirect to the products home
    return pass(
      NextResponse.redirect(new URL(`/${userId}/products`, request.url)),
    );
  }

  // Logged-in user visits "/:id/anything" -> verify id matches token
  const routeId = segments[0];
  if (routeId !== userId) {
    return pass(
      NextResponse.redirect(new URL(`/${userId}/products`, request.url)),
    );
  }

  const response = NextResponse.next();
  response.headers.set("x-user-id", userId);
  return pass(response);
}
