"use client";

import { useQuery } from "@tanstack/react-query";

export interface CurrentPlan {
  /** "anonymous" | "free" | "plus" | "business" | "vendor" */
  plan: string;
  ownerType: "guest" | "buyer" | "vendor";
  periodKey: string | null;
  text: number;
  photo: number;
  /** Is there a tier above this one? Decided server-side from the plan table
   *  (see api/usage/route.ts) — the client never hardcodes which plan is the
   *  top one, because that answer changes whenever a tier is added. */
  canUpgrade: boolean;
}

// What plan the current account is on, for anything that needs to show or
// hide an upgrade path (2026-08-29).
//
// One query key, shared — the header CTA and the plans page both ask, and
// they must never disagree about whether someone has upgraded.
export function useCurrentPlan() {
  return useQuery<CurrentPlan>({
    queryKey: ["current-plan"],
    queryFn: async () => {
      const res = await fetch("/api/usage");
      if (!res.ok) throw new Error("Couldn't read your plan.");
      return res.json();
    },
    // A plan changes on the order of once a month, and only ever as a result
    // of an action this app took. Refetching it on every window focus would
    // be noise on a route people leave open for a long time.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Never retry: a failed read already falls back to a free-tier shape
    // server-side (see api/usage/route.ts), so a retry loop would just be
    // repeating a decision that was already made safely.
    retry: false,
  });
}

/** Is there a tier above this one?
 *
 *  Hidden on exactly one plan — the highest (per explicit request,
 *  2026-08-29). Everyone else sees it: guests, free buyers, vendors, and Plus
 *  subscribers, who can still move to Business.
 *
 *  The decision itself comes from the server, which owns the plan table; this
 *  only handles the not-loaded-yet case. Defaulting to FALSE while loading is
 *  deliberate — showing "Upgrade" to someone already on the top tier, even
 *  for a moment, is the one wrong answer worth avoiding. */
export function canUpgrade(current: CurrentPlan | undefined): boolean {
  return current?.canUpgrade ?? false;
}
