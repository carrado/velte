// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Infra/utility routes — always accessible, full stop, regardless of auth
// state. Not "public pages" in the sense the other lists below are about.
const alwaysPublicRoutes = [
  "/_next",
  "/favicon.ico",
  "/site.webmanifest",
  "/payment/callback",
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
//  - /search is the deliberate "Buy on Velte" hand-off (see Header.tsx's
//    own comment) letting a logged-in VENDOR use the buyer-facing search
//    themselves — blocking it would remove a real, intentional feature.
const publicRegardlessOfAuth = [
  "/store",
  "/track",
  "/privacy",
  "/terms",
  "/search",
];

// Marketing/onboarding pages — meant for a prospective or logged-out
// visitor. A genuinely logged-in user landing here (via back-navigation, a
// bookmark, or typing the URL directly) is bounced straight to their
// dashboard instead of being shown the page at all.
const marketingRoutes = [
  "/about",
  "/auth",
  "/careers",
  "/contact",
  "/pricing",
  "/faq",
  "/welcome",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🚫 Block direct browser navigation to API routes.
  // Real app calls go through fetch() (Sec-Fetch-Dest: empty / Sec-Fetch-Mode: cors|same-origin).
  // Pasting an /api URL into the address bar is a top-level navigation
  // (Sec-Fetch-Dest: document) — forbid those so the endpoint can't be loaded directly.
  if (pathname.startsWith("/api")) {
    const dest = request.headers.get("sec-fetch-dest");
    const mode = request.headers.get("sec-fetch-mode");
    if (dest === "document" || mode === "navigate") {
      return new NextResponse("Forbidden", {
        status: 403,
        headers: { "content-type": "text/plain" },
      });
    }
    return NextResponse.next();
  }

  // ✅ Allow all static assets (images, etc.) – no authentication needed
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|manifest)$/i.test(pathname)) {
    return NextResponse.next();
  }

  if (alwaysPublicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (publicRegardlessOfAuth.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;

  // Resolve a VALID userId up front (an expired/tampered token is treated
  // the same as no token at all) — both the marketing-route block below and
  // the dashboard routing further down need to know this.
  let userId: string | null = null;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      const { payload } = await jwtVerify(token, secret);
      userId = (payload.userId as string) || null;
    } catch {
      userId = null;
    }
  }

  // A genuinely logged-in user gets bounced to their dashboard instead of
  // ever seeing a marketing/onboarding page — "on no account can they view
  // public pages [besides the exceptions above] until they are logged out."
  if (
    marketingRoutes.some((route) => pathname.startsWith(route) && route !== "/")
  ) {
    if (userId) {
      return NextResponse.redirect(new URL(`/${userId}/products`, request.url));
    }
    return NextResponse.next();
  }

  // If user visits "/" without a valid session, allow the landing page —
  // UNLESS this is the installed PWA launching (manifest start_url is
  // "/?source=pwa", see site.webmanifest): redirect server-side, before any
  // HTML ships, straight to /welcome instead of the marketing homepage.
  // StandaloneHomeRedirect used to be the only guard against this and could
  // only act client-side after hydration — by then the browser had already
  // painted the SSR'd marketing page, so a logged-out PWA launch visibly
  // flashed it before bouncing to /welcome. This redirect removes that
  // flash entirely for the launch path; StandaloneHomeRedirect stays in
  // place for in-app navigation back to "/" (e.g. the logo Link) while
  // already running standalone.
  if (pathname === "/") {
    if (!userId) {
      if (request.nextUrl.searchParams.get("source") === "pwa") {
        return NextResponse.redirect(new URL("/welcome", request.url));
      }
      return NextResponse.next();
    }
    // Logged-in user visits "/" -> "/:id/products", UNLESS this is the
    // installed PWA launching, which always opens straight to the wallet
    // instead — same page login itself already redirects to (see
    // auth/login/page.tsx).
    const dest =
      request.nextUrl.searchParams.get("source") === "pwa"
        ? "wallet"
        : "products";
    return NextResponse.redirect(new URL(`/${userId}/${dest}`, request.url));
  }

  // Everything below this point is a protected dashboard route.
  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (!userId) {
    // A cookie existed but failed verification (expired/tampered).
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    response.cookies.delete("auth_token");
    return response;
  }

  // Break path into segments
  const segments = pathname.split("/").filter(Boolean);

  // Logged-in user visits "/:id" -> redirect to "/:id/products"
  if (segments.length === 1) {
    // No need to compare with userId – just redirect to the products home
    return NextResponse.redirect(new URL(`/${userId}/products`, request.url));
  }

  // Logged-in user visits "/:id/anything" -> verify id matches token
  const routeId = segments[0];
  if (routeId !== userId) {
    return NextResponse.redirect(new URL(`/${userId}/products`, request.url));
  }

  const response = NextResponse.next();
  response.headers.set("x-user-id", userId);
  return response;
}
