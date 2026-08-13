import { create } from "zustand";
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
  setBuyer: (buyer) => set({ buyer }),
  clearBuyer: () => set({ buyer: null }),
}));
