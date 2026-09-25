import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { fail, applySetCookies } from "@/lib/server/guards";
import { backendFetchWithCookies } from "@/lib/server/backend";
import { AUTH_COOKIE } from "@/lib/server/session";
import { BUYER_AUTH_COOKIE } from "@/lib/server/buyerSession";

// POST /api/auth/logout   (clears the session cookie)
//
// Ends the BUYER session too, when there is one (2026-09-25). Found live: a
// vendor whose Google sign-in on /chat shares their email logged out of the
// dashboard, opened /chat, and was still signed in — as their Google buyer
// account, because only `auth_token` was cleared and `buyer_auth_token` sat
// there untouched. "Log out" means one thing to the person pressing it;
// /chat's own sign-out (useAccountSignOut) already ends both for exactly
// this reason, and this is the dashboard's side of the same rule — just as
// sign-in pairs the two cookies, sign-out clears them together.
export async function POST() {
  const jar = await cookies();
  const vendorToken = jar.get(AUTH_COOKIE)?.value;
  const buyerToken = jar.get(BUYER_AUTH_COOKIE)?.value;

  // Independently — a failed buyer logout must not stop the vendor one (the
  // one this button is for), and vice versa.
  const [vendor, buyer] = await Promise.allSettled([
    backendFetchWithCookies("/auth/logout", {
      method: "POST",
      body: {},
      cookie: vendorToken ? `${AUTH_COOKIE}=${vendorToken}` : undefined,
    }),
    buyerToken
      ? backendFetchWithCookies("/buyer-auth/logout", {
          method: "POST",
          cookie: `${BUYER_AUTH_COOKIE}=${buyerToken}`,
        })
      : Promise.resolve({ setCookie: [] as string[] }),
  ]);

  if (vendor.status === "rejected") {
    return fail(vendor.reason, "Logout failed.");
  }
  const setCookie = [
    ...vendor.value.setCookie,
    ...(buyer.status === "fulfilled" ? buyer.value.setCookie : []),
  ];
  const res = applySetCookies(NextResponse.json({ ok: true }), setCookie);
  // Belt and braces: if the backend's buyer logout failed, still expire the
  // cookie here, so the browser never keeps the half this was meant to end.
  if (buyerToken && buyer.status === "rejected") {
    res.cookies.delete(BUYER_AUTH_COOKIE);
  }
  return res;
}
