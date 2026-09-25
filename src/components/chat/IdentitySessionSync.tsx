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
// RETRIES until it gets a real answer (2026-09-25). Found live: lose the
// connection, come back, and the header showed a signed-in buyer as logged
// out until a manual refresh. The check ran once, failed (offline, or the
// backend still waking from a cold start), and nothing ever asked again. A
// failed fetch or a 503 now means "don't know yet": it retries on a short
// backoff, the moment the browser reports it is back online, and whenever
// the tab comes back to the foreground. A 200 is a real answer — signed in
// or signed out — and ends it.
//
// Runs until the BUYER store is filled (see alreadyKnown), so navigating
// within the chat shell after that, or a sign-in that already filled it,
// costs no repeat request. A vendor with no buyer costs one check per visit.

/** Timed retries after a failed check — generous enough to outlast a
 *  backend cold start, after which online/visibility take over. */
const RETRY_DELAYS_MS = [3_000, 10_000, 30_000];

export function IdentitySessionSync() {
  useEffect(() => {
    let settled = false;
    let inFlight = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // The BUYER is what decides it, not "either store" (2026-09-25). Found
    // live: a vendor who navigated from the dashboard into /chat already had
    // the vendor store filled (the dashboard fills it), so the old
    // either-store guard skipped this check entirely — their linked buyer
    // was never loaded, and everything gated on it ("Your requests" in the
    // sidebar) stayed missing until a full reload emptied both stores. A
    // filled vendor store says nothing about whether a buyer exists; only a
    // filled buyer store means there is nothing left to learn.
    const alreadyKnown = () => Boolean(useBuyerStore.getState().buyer);

    const check = async () => {
      if (settled || inFlight) return;
      if (alreadyKnown()) {
        settled = true;
        return;
      }
      inFlight = true;
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error(`session check ${res.status}`);
        const { vendor, buyer } = (await res.json()) as {
          vendor: User | null;
          buyer: Buyer | null;
        };
        settled = true;
        if (vendor) useUserStore.getState().setUser(vendor);
        if (buyer) useBuyerStore.getState().setBuyer(buyer);
      } catch {
        // Couldn't tell — try again shortly, unless the backoff is spent
        // (online/visibility below still retry after that).
        const delay = RETRY_DELAYS_MS[attempt++];
        if (delay != null) {
          clearTimeout(timer);
          timer = setTimeout(() => void check(), delay);
        }
      } finally {
        inFlight = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onOnline = () => void check();

    void check();
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
