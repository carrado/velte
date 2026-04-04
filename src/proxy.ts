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
  "/terms",
  "/_next",
  "/favicon.ico",
  "/site.webmanifest",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

    // 1) Logged-in user visits "/" -> "/:id/dashboard"
    if (pathname === "/") {
      return NextResponse.redirect(
        new URL(`/${userId}/dashboard`, request.url),
      );
    }

    // Break path into segments
    const segments = pathname.split("/").filter(Boolean);

    // 2) Logged-in user visits "/:id" -> redirect to "/:id/dashboard"
    if (segments.length === 1) {
      const routeId = segments[0];
      // No need to compare with userId – just redirect to dashboard
      return NextResponse.redirect(
        new URL(`/${userId}/dashboard`, request.url),
      );
    }

    // 3) Logged-in user visits "/:id/anything" -> verify id matches token
    const routeId = segments[0];
    if (routeId !== userId) {
      return NextResponse.redirect(
        new URL(`/${userId}/dashboard`, request.url),
      );
    }

    const response = NextResponse.next();
    response.headers.set("x-user-id", userId);
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    // Optionally clear the invalid token
    // response.cookies.delete("auth_token");
    return response;
  }
}
