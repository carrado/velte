// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const publicRoutes = [
  "/",
  "/about",
  "/auth",
  "/careers",
  "/contact",
  "/privacy",
  "/pricing",
  "/terms",
  "/_next",
  "/favicon.ico",
  "/site.webmanifest",
  "/payment/callback",
  "/api",
  "/track",
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

  // Allow public assets and public pages first
  if (
    publicRoutes.some((route) => pathname.startsWith(route) && route !== "/")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;

  // If user visits "/" without token, allow landing page
  if (pathname === "/" && !token) {
    return NextResponse.next();
  }

  // No token for protected routes -> redirect to login
  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.userId as string;

    if (!userId) {
      const response = NextResponse.redirect(
        new URL("/auth/login", request.url),
      );
      response.cookies.delete("auth_token");
      return response;
    }

    // 1) Logged-in user visits "/" -> "/:id/products"
    if (pathname === "/") {
      return NextResponse.redirect(new URL(`/${userId}/products`, request.url));
    }

    // Break path into segments
    const segments = pathname.split("/").filter(Boolean);

    // 2) Logged-in user visits "/:id" -> redirect to "/:id/products"
    if (segments.length === 1) {
      // No need to compare with userId – just redirect to the products home
      return NextResponse.redirect(new URL(`/${userId}/products`, request.url));
    }

    // 3) Logged-in user visits "/:id/anything" -> verify id matches token
    const routeId = segments[0];
    if (routeId !== userId) {
      return NextResponse.redirect(new URL(`/${userId}/products`, request.url));
    }

    const response = NextResponse.next();
    response.headers.set("x-user-id", userId);
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    // Optionally clear the invalid token
    response.cookies.delete("auth_token");
    return response;
  }
}
