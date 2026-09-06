"use client";

import { useEffect } from "react";

import { useCreditsStore, type TopUpSource } from "@/store/creditsStore";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";

// Reading the credit balance, for anything that displays or spends it.
//
// Replaces useCurrentPlan, which asked "which tier is this?" — a question with
// no answer any more.
//
// This is now a thin read over store/creditsStore (2026-09-01). It used to own
// the state itself, which meant each meter fetched its own copy: the header
// bar and the floating ring mount together on desktop, so one page load asked
// /api/usage twice. The store dedupes concurrent reads, so every consumer here
// can call this without counting how many of them there are.
//
// A GUEST is answered from their own browser, not from the server: they have
// no row, and the API replies with the STARTING allowance for shape
// consistency, which would be wrong to show. Deciding which of the two applies
// is this hook's only real job — the identity lives in the buyer/user stores,
// which the store itself has no business reaching into.

interface CreditsState {
  balance: number | null;
  used: number;
  isGuest: boolean;
  walletBalanceKobo: number | null;
  busyPack: string | null;
  topUpError: string | null;
  topUp: (packId: string, source?: TopUpSource) => void;
}

export function useCredits(active = true): CreditsState {
  const buyer = useBuyerStore((s) => s.buyer);
  const vendor = useUserStore((s) => s.user);
  const isGuest = !(buyer || vendor);

  const balance = useCreditsStore((s) => s.balance);
  const used = useCreditsStore((s) => s.used);
  const walletBalanceKobo = useCreditsStore((s) => s.walletBalanceKobo);
  const busyPack = useCreditsStore((s) => s.busyPack);
  const topUpError = useCreditsStore((s) => s.topUpError);
  const topUp = useCreditsStore((s) => s.topUp);
  const load = useCreditsStore((s) => s.load);
  const loadGuest = useCreditsStore((s) => s.loadGuest);

  useEffect(() => {
    // Only when something is actually showing it. The modal passes its own
    // open state, so a closed panel costs no request — and opening it later
    // re-reads, which matters because the balance moves with every search.
    if (!active) return;
    if (isGuest) {
      // Reading localStorage is the side effect, and it belongs after commit:
      // a lazy initialiser would read storage during render (impure, and
      // double-invoked by StrictMode in dev), and reading during render
      // without state reintroduces a hydration mismatch, since the server has
      // no localStorage and cannot render the same balance.
      loadGuest();
      return;
    }
    void load();
  }, [active, isGuest, load, loadGuest]);

  return {
    balance,
    used,
    isGuest,
    walletBalanceKobo,
    busyPack,
    topUpError,
    topUp,
  };
}
