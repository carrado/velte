// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { clearSessionCookies } from "@/lib/server/clearSessionCookies";
import { isPublicProductSlug as isProductSlugSegment } from "@/lib/publicProductSlug";

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
  "/p",
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
  "/pricing",
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

function matchesRoutePrefix(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

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
  if (alwaysPublicRoutes.some((route) => matchesRoutePrefix(pathname, route))) {
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

  // Public product URLs are only /{slug}. The App Router page lives at
  // /p/[slug] so it does not clash with the vendor dashboard's /[id] tree —
  // that /p/ path is an implementation detail, never a public URL.
  {
    const segs = pathname.split("/").filter(Boolean);

    // Direct /p/{slug} hits → bounce to the canonical /{slug} in the bar.
    // Must run before the /p public bypass below. ObjectIds stay on /p/{id}
    // for one hop so the page can resolve the real slug (/{objectId} would
    // be treated as a vendor dashboard id).
    if (segs.length === 2 && segs[0] === "p" && isProductSlugSegment(segs[1])) {
      return pass(NextResponse.redirect(new URL(`/${segs[1]}`, request.url)));
    }

    if (segs.length === 1 && isProductSlugSegment(segs[0])) {
      const url = request.nextUrl.clone();
      url.pathname = `/p/${segs[0]}`;
      return pass(NextResponse.rewrite(url));
    }
  }

  if (
    publicRegardlessOfAuth.some((route) => matchesRoutePrefix(pathname, route))
  ) {
    return pass(NextResponse.next());
  }

  const token = request.cookies.get(VENDOR_COOKIE)?.value;

  // A genuinely logged-in user gets bounced to their dashboard instead of
  // ever seeing a marketing/onboarding page.
  if (
    marketingRoutes.some(
      (route) => matchesRoutePrefix(pathname, route) && route !== "/",
    )
  ) {
    if (userId) {
      return pass(NextResponse.redirect(new URL("/wallet", request.url)));
    }
    return pass(NextResponse.next());
  }

  // If user visits "/" without a valid session, allow the landing page —
  // UNLESS this is the installed PWA launching (manifest start_url is
  // "/?source=pwa", see site.webmanifest): redirect server-side, before any
  // HTML ships, straight to /welcome instead of the marketing homepage.
  if (pathname === "/") {
    if (!userId) {
      if (request.nextUrl.searchParams.get("source") === "pwa") {
        return pass(NextResponse.redirect(new URL("/welcome", request.url)));
      }
      if (buyerId) {
        return pass(NextResponse.redirect(new URL("/chat", request.url)));
      }
      return pass(NextResponse.next());
    }
    // Logged-in vendor visits "/" -> default route is /wallet
    return pass(NextResponse.redirect(new URL("/wallet", request.url)));
  }

  // Break path into segments
  const segments = pathname.split("/").filter(Boolean);

  // Legacy /:id/path -> redirect to clean URL without the :id
  const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
  if (segments.length >= 1 && OBJECT_ID_RE.test(segments[0])) {
    const subPath = segments.slice(1).join("/");
    const destination = subPath ? `/${subPath}` : "/";
    return pass(NextResponse.redirect(new URL(destination, request.url)));
  }

  // Protected dashboard routes
  const dashboardRoutes = [
    "/products",
    "/wallet",
    "/orders",
    "/settings",
    "/reports",
    "/referrals",
    "/buyer-requests",
    "/notifications",
  ];

  const isDashboardRoute = dashboardRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isDashboardRoute) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return pass(NextResponse.redirect(loginUrl));
    }
    if (!userId) {
      const dest = buyerId ? "/chat" : "/";
      return pass(NextResponse.redirect(new URL(dest, request.url)));
    }
    const response = NextResponse.next();
    response.headers.set("x-user-id", userId);
    return pass(response);
  }

  const response = NextResponse.next();
  if (userId) {
    response.headers.set("x-user-id", userId);
  }
  return pass(response);
}
