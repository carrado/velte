import { create } from "zustand";
import type { Subscription } from "@/types/subscription";

interface SubscriptionStore {
  subscription: Subscription | null;
  hasFetched: boolean;
  setSubscription: (s: Subscription) => void;
  markSubscribed: () => void;
  clear: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>()((set) => ({
  subscription: null,

  hasFetched: false,

  setSubscription: (subscription) =>
    set({
      subscription,
      hasFetched: true,
    }),

  markSubscribed: () =>
    set((state) => ({
      subscription: state.subscription
        ? {
            ...state.subscription,
            isSubscribed: true,
          }
        : {
            isSubscribed: true,
            trialEndsAt: null,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            plan: null,
            transactions: [],
          },

      hasFetched: true,
    })),

  clear: () =>
    set({
      subscription: null,
      hasFetched: false,
    }),
}));
