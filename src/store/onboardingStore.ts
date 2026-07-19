import { create } from "zustand";
import type { OnboardingStep } from "@/types/onboarding";

// Pure click-through tour over the persistent shell chrome (Sidebar on
// desktop, BottomNav on mobile) — every target here is mounted on every
// dashboard page, so unlike the old action-gated tour this never needs to
// navigate the buyer/vendor between pages or wait on a real action; it's
// just Next/Skip walking a fixed list of spotlights.
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "add-listing",
    selectors: ["#add-listing-nav", "#add-listing-mobile"],
    title: "Add your first listing",
    body: "Start here — add a product or service. This is exactly what buyers searching on Velte will be matched against.",
  },
  {
    id: "my-listings",
    selectors: ["#my-listings-nav", "#my-listings-mobile"],
    title: "Manage your listings",
    body: "Everything you've listed lives here — edit details, update stock, or remove something anytime.",
  },
  {
    id: "my-store",
    selectors: ["#store-nav", "#store-mobile"],
    title: "Your storefront",
    body: "Your public store page — this is what a buyer sees when they tap through from a search result to chat with you.",
  },
  {
    id: "wallet",
    selectors: ["#wallet-nav", "#wallet-mobile"],
    title: "Your wallet",
    body: "Velte charges a small fee per buyer lead sent your way. Keep this funded, or turn on auto-recharge, so you never miss one.",
  },
  {
    id: "settings",
    selectors: ["#settings-nav", "#settings-mobile"],
    title: "Account settings",
    body: "Update your profile, location, and notification preferences here whenever you need to.",
  },
];

interface OnboardingStore {
  currentStep: number;
  next: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>()((set) => ({
  currentStep: 0,
  next: () =>
    set((s) => ({
      currentStep: Math.min(s.currentStep + 1, ONBOARDING_STEPS.length - 1),
    })),
  reset: () => set({ currentStep: 0 }),
}));
