"use client";

import { useEffect } from "react";

import { useUserStore } from "@/store/userStore";
import { useBuyerStore } from "@/store/buyerStore";
import type { User } from "@/types/user";
import type { Buyer } from "@/types/buyer";

// Hydrates BOTH the vendor and buyer identity on /chat in ONE round trip
// (2026-09-16) — "the single auth API" backing this is /api/auth/session
// (renamed from /api/auth/whoami 2026-09-17; see that route's own comment:
// it's a lenient BFF wrapper around velte-backend's existing GET /auth/me,
// not a separate backend endpoint).
//
// Replaces two separate components/hooks that used to fire independent,
// racing requests: VendorSessionSync's getMeSilent() (vendor only) and
// ChatHeader's useBuyerSession() (buyer only). Firing them separately is
// exactly what let a mismatch go unnoticed in the first place — two
// cookies, checked by two unrelated calls, with nothing comparing them.
// /auth/me now reads both cookies together and is trustworthy doing so
// BECAUSE login itself (loginAsVendor, firebaseSignIn) pairs or clears the
// other cookie the moment either account signs in — by the time this runs,
// the two cookies in the browser are guaranteed to already agree.
//
// Silent by design, same as the two things it replaces: a signed-out
// visitor (guest or a buyer with no vendor, or vice versa) must never see
// this as an error — it just leaves whichever store has nothing to fill
// exactly as it was.
//
// Runs at most once per mount — guarded on BOTH stores already being
// empty, so navigating within the chat shell costs no repeat request.
export function IdentitySessionSync() {
  useEffect(() => {
    if (useUserStore.getState().user || useBuyerStore.getState().buyer) return;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const { vendor, buyer } = (await res.json()) as {
          vendor: User | null;
          buyer: Buyer | null;
        };
        if (vendor) useUserStore.getState().setUser(vendor);
        if (buyer) useBuyerStore.getState().setBuyer(buyer);
      } catch {
        /* best-effort, same as getMeSilent/useBuyerSession before this */
      }
    })();
  }, []);

  return null;
}
