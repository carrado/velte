"use client";

import { useCallback, useEffect, useState } from "react";

import { guestCredits } from "@/lib/guestCredits";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";

// The credit balance, for anything that displays or spends it (2026-08-31).
//
// Replaces useCurrentPlan, which asked "which tier is this?" — a question with
// no answer any more.
//
// A GUEST's balance is read from their own browser, not from the server: they
// have no row, and their credits live in localStorage (guestCredits.ts). The
// API answers with the starting allowance for shape consistency, which would
// be wrong to show, so it is deliberately ignored for guests.

interface CreditsState {
  balance: number | null;
  isGuest: boolean;
  busyPack: string | null;
  topUp: (packId: string) => void;
  refresh: () => void;
}

export function useCredits(active = true): CreditsState {
  const buyer = useBuyerStore((s) => s.buyer);
  const vendor = useUserStore((s) => s.user);
  const isGuest = !(buyer || vendor);

  const [balance, setBalance] = useState<number | null>(null);
  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    // Only when something is actually showing it. The modal passes its own
    // open state, so a closed panel costs no request — this is polled from a
    // header that renders on every page in the chat.
    if (!active) return;

    /* eslint-disable react-hooks/set-state-in-effect --
       Reading localStorage is the side effect, and it belongs after commit
       for the same two reasons PriceBand.tsx documents: a lazy useState
       initialiser would read storage during render (impure, and
       double-invoked by StrictMode in dev), and reading during render
       without state reintroduces a hydration mismatch — the server has no
       localStorage, so it cannot render the same balance. */
    if (isGuest) {
      setBalance(guestCredits());
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/usage");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { balance?: number };
        if (!cancelled && typeof data.balance === "number") {
          setBalance(data.balance);
        }
      } catch {
        // Leaves the balance as it was rather than showing zero — telling
        // someone they are out of credits because a fetch failed is the one
        // wrong answer here.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, isGuest, tick]);

  const topUp = useCallback(
    (packId: string) => {
      if (busyPack) return;
      setBusyPack(packId);
      void (async () => {
        try {
          const res = await fetch("/api/credits/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packId }),
          });
          const data = (await res.json().catch(() => null)) as {
            authorizationUrl?: string;
          } | null;
          if (data?.authorizationUrl) {
            // Full-page redirect, not a popup — popups are unreliable for
            // buyers on mobile, the same reasoning as the pay page.
            window.location.href = data.authorizationUrl;
            return;
          }
          setBusyPack(null);
        } catch {
          setBusyPack(null);
        }
      })();
    },
    [busyPack],
  );

  return { balance, isGuest, busyPack, topUp, refresh };
}
