import { create } from "zustand";

import { GUEST_CREDITS } from "@/lib/credits";
import { guestCredits } from "@/lib/guestCredits";

// The credit balance, shared (2026-09-01).
//
// It used to be per-hook state, which meant every component that showed the
// number ran its own fetch: the header bar and the floating ring mount
// together on desktop, so a page load asked /api/usage twice for one figure —
// and they could disagree for as long as the two responses were apart.
//
// One store, one request. Not persisted, like buyerStore and userStore: a
// balance read from storage would be a stale balance, and the whole point of
// showing it is that it is current.
//
// Where a guest's balance comes from is the thing to keep straight. They have
// no row on the server; their credits live in this browser (lib/guestCredits)
// and the API answers them with the STARTING allowance for shape consistency,
// which would be wrong to display. `loadGuest` reads the local ledger instead,
// and the hook decides which of the two to call.

/** Where the money for a top-up comes from. */
export type TopUpSource = "card" | "wallet";

interface CreditsStore {
  /** Credits remaining. Null until the first read lands — components render
   *  nothing rather than a zero that would libel someone who has plenty. */
  balance: number | null;
  /** Credits already spent. The other half of every meter. */
  used: number;
  /** The VENDOR's lead wallet, in kobo. Null for guests and buyers, who have
   *  no wallet — which is what the panel's funding choice branches on. */
  walletBalanceKobo: number | null;
  /** The pack currently being paid for, if any. */
  busyPack: string | null;
  /** A failed WALLET purchase, usually an empty wallet. A card top-up
   *  navigates away, so it never has an error to report. */
  topUpError: string | null;

  /** Reads this browser's guest ledger. Synchronous — no network involved. */
  loadGuest: () => void;
  /** Reads the signed-in balance. Concurrent callers share one request. */
  load: () => Promise<void>;
  topUp: (packId: string, source?: TopUpSource) => void;
}

/** The in-flight read, module-level rather than in the store, so it is not
 *  something a component can subscribe to and re-render on. This is what
 *  turns "every meter fetches" into "the first meter fetches". */
let inFlight: Promise<void> | null = null;

export const useCreditsStore = create<CreditsStore>()((set, get) => ({
  balance: null,
  used: 0,
  walletBalanceKobo: null,
  busyPack: null,
  topUpError: null,

  loadGuest: () => {
    const left = guestCredits();
    set({
      balance: left,
      // The browser stores a balance, not a counter, so what they have spent
      // is whatever is missing from the starting allowance. Clamped: a
      // hand-edited or stale value must not produce a negative meter.
      used: Math.max(GUEST_CREDITS - left, 0),
      walletBalanceKobo: null,
    });
  },

  load: () => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        const res = await fetch("/api/usage");
        if (!res.ok) return;
        const data = (await res.json()) as {
          balance?: number;
          used?: number;
          totalSpent?: number;
          walletBalanceKobo?: number | null;
        };
        const next: Partial<CreditsStore> = {};
        if (typeof data.balance === "number") next.balance = data.balance;
        if (typeof data.totalSpent === "number") next.used = data.totalSpent;
        // Only a vendor's response carries a wallet. Assigning it
        // unconditionally would be wrong on a buyer's, where its absence is
        // the answer.
        next.walletBalanceKobo =
          typeof data.walletBalanceKobo === "number"
            ? data.walletBalanceKobo
            : null;
        set(next);
      } catch {
        // Leaves the balance as it was rather than showing zero — telling
        // someone they are out of credits because a fetch failed is the one
        // wrong answer here.
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },

  topUp: (packId, source = "card") => {
    if (get().busyPack) return;
    set({ busyPack: packId, topUpError: null });
    void (async () => {
      try {
        if (source === "wallet") {
          // Settles in the request — no Paystack round trip and no webhook,
          // since the money is already Velte's. Nothing navigates away, which
          // is the point: a vendor topping up mid-conversation keeps their
          // thread.
          const res = await fetch("/api/credits/wallet-topup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packId }),
          });
          const data = (await res.json().catch(() => null)) as {
            balance?: number;
            walletBalanceKobo?: number;
            error?: string;
          } | null;
          if (!res.ok || typeof data?.balance !== "number") {
            set({
              topUpError: data?.error ?? "Couldn't pay from your wallet.",
              busyPack: null,
            });
            return;
          }
          // Both figures move together, from the one response — a refetch
          // would show a stale wallet for as long as it took. `used` is
          // untouched: a top-up grants, it does not spend, so every meter
          // simply gets more room.
          set({
            balance: data.balance,
            busyPack: null,
            ...(typeof data.walletBalanceKobo === "number"
              ? { walletBalanceKobo: data.walletBalanceKobo }
              : {}),
          });
          return;
        }

        const res = await fetch("/api/credits/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packId }),
        });
        const data = (await res.json().catch(() => null)) as {
          authorizationUrl?: string;
          error?: string;
        } | null;
        if (data?.authorizationUrl) {
          // Full-page redirect, not a popup — popups are unreliable for
          // buyers on mobile, the same reasoning as the pay page. `busyPack`
          // is deliberately left set: the page is on its way out, and
          // clearing it would flash the buttons back to life first.
          window.location.href = data.authorizationUrl;
          return;
        }
        set({
          topUpError: data?.error ?? "Couldn't start the payment.",
          busyPack: null,
        });
      } catch {
        set({
          topUpError: "Couldn't start the payment. Please try again.",
          busyPack: null,
        });
      }
    })();
  },
}));
