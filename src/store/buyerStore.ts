import { create } from "zustand";
import { exhaustGuestCredits } from "@/lib/guestCredits";
import type { Buyer } from "@/types/buyer";

export type { Buyer };

// Mirrors userStore.ts's shape exactly — kept deliberately this simple per
// spec §39/§63.3 ("do not build a complicated profile"). Not persisted
// (same as userStore.ts) — the buyer_auth_token httpOnly cookie is the real
// session; this is just an in-memory convenience so pages don't all have to
// independently fetch /api/buyer-auth/me.
interface BuyerStore {
  buyer: Buyer | null;
  setBuyer: (buyer: Buyer | null) => void;
  clearBuyer: () => void;
}

export const useBuyerStore = create<BuyerStore>()((set) => ({
  buyer: null,
  setBuyer: (buyer) => {
    set({ buyer });
    // Every call site that hands this a real buyer — a live Google sign-in,
    // a restored session on page load, the phone-gate/OTP re-sets — is a
    // moment this browser is KNOWN to belong to a signed-in account. See
    // guestCredits.ts's own comment on exhaustGuestCredits for why that
    // guest ledger must never be left standing for later: without this, a
    // buyer could burn their real balance, log out to cash in an untouched
    // guest allowance, log back in, and repeat — logging out is one click
    // every signed-in buyer already sees, not a deliberate "clear my data"
    // most people never bother with.
    if (buyer) exhaustGuestCredits();
  },
  clearBuyer: () => set({ buyer: null }),
}));
