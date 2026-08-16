import { NextResponse } from "next/server";

import { fail, applySetCookies } from "@/lib/server/guards";
import { backendFetchWithCookies, BackendError } from "@/lib/server/backend";
import type { User } from "@/types/user";
import type { Buyer } from "@/types/buyer";

// POST /api/auth/login   (public — sets the session cookie)
// Unified 2026-08-15 — one login screen/endpoint for both account types.
// `identifier` is an email or username; the backend decides whether it
// matched a vendor or a buyer and sets the matching cookie (auth_token vs
// buyer_auth_token) via the same Set-Cookie relay either way. `accountType`
// tells the frontend which store to populate and where to route.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const { data, setCookie } = await backendFetchWithCookies<{
      accountType: "vendor" | "buyer";
      user?: User;
      buyer?: Buyer;
    }>("/auth/login", { method: "POST", body });
    return applySetCookies(
      NextResponse.json({
        accountType: data.accountType,
        user: data.user,
        buyer: data.buyer,
      }),
      setCookie,
    );
  } catch (err) {
    // 403 = unverified vendor account — the identifier typed may have been
    // a USERNAME, not the email /auth/verify needs to redirect to, so the
    // backend echoes the real one back (see auth.js's loginAsVendor).
    if (err instanceof BackendError && err.status === 403) {
      const email = (err.data as { email?: string } | undefined)?.email;
      return NextResponse.json({ error: err.message, email }, { status: 403 });
    }
    return fail(err, "Login failed.");
  }
}
