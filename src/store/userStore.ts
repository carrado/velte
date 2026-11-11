import { create } from "zustand";
import { exhaustGuestCredits } from "@/lib/guestCredits";
import { markSessionSettled, resetSessionSync } from "@/lib/sessionSync";
import type { User } from "@/types/user";

export type { User };

// A stable reference for selectors that need an array fallback (e.g.
// `s.user?.sectors ?? EMPTY_SECTORS`) — `?? []` allocates a new array on
// every read, which breaks Zustand/useSyncExternalStore's referential-equality
// check and causes an infinite render loop ("getServerSnapshot should be
// cached"). Never mutate this.
export const EMPTY_SECTORS: string[] = [];

/** The vendor's storefront identity — name/handle/avatar visible on Hub cards.
 *  Stored separately from User so profile changes (which touch User) and store
 *  changes (handle, avatar, description) can each be patched independently
 *  without a full re-fetch on every page mount. */
export interface VendorStore {
  name: string;
  handle: string | null;
  avatar: string | null;
  verified: boolean;
  description: string | null;
}

interface UserStore {
  user: User | null;
  /** The vendor's Hub storefront profile. Populated once from GET /api/hub/home
   *  on the first Hub visit, then kept in sync whenever profile edits touch
   *  avatar, description or handle. Never re-fetched on its own. */
  vendorStore: VendorStore | null;
  setUser: (user: User | null) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  clearUser: () => void;
  setVendorStore: (store: VendorStore | null) => void;
  updateVendorStore: (fields: Partial<VendorStore>) => void;
}

export const useUserStore = create<UserStore>()((set) => ({
  user: null,
  vendorStore: null,
  setUser: (user) => {
    set({ user });
    // Same reason as buyerStore.ts's setBuyer: a browser known to belong to a
    // signed-in vendor must not keep an untouched guest allowance to cash in
    // by logging out. See guestCredits.ts's exhaustGuestCredits.
    if (user) {
      exhaustGuestCredits();
      markSessionSettled();
    }
  },

  updateUser: (updatedFields) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedFields } : null,
    })),

  clearUser: () => {
    resetSessionSync();
    set({ user: null, vendorStore: null });
  },

  setVendorStore: (vendorStore) => set({ vendorStore }),

  updateVendorStore: (fields) =>
    set((state) => ({
      vendorStore: state.vendorStore
        ? { ...state.vendorStore, ...fields }
        : null,
    })),
}));
