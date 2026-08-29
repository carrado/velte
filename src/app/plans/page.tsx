import type { Metadata } from "next";

import { PLANS } from "@/lib/server/ai/plans";
import { PlansContent } from "@/components/plans/PlansContent";
import type { PlanCard } from "@/types/plan";

// Buyer plans (2026-08-29).
//
// Deliberately NOT /pricing — that page is the VENDOR pay-per-lead pitch
// ("no subscription, no listing fee"), aimed at someone deciding whether to
// list. This is the buyer subscription, aimed at someone already using
// Velte. Two different audiences and two contradictory messages; merging
// them would confuse both.
//
// Also deliberately at the top level rather than under /chat: it must stay
// reachable inside the installed PWA, and every marketing page is redirected
// away there (see lib/standalonePublicRoutes.ts). It is an app surface, not
// a marketing one.
//
// Read from PLANS on the SERVER and passed down, so the prices and
// allowances on this page are the same object the gate enforces — a pricing
// page that can drift from what is actually metered is worse than none.
export const metadata: Metadata = {
  title: "Plans",
  description:
    "Velte Plus — price-drop alerts, more searches, and unlimited saved items.",
  alternates: { canonical: "/plans" },
};

// The order buyers should read them in, cheapest first. `anonymous` is not a
// product and never appears.
const DISPLAY_ORDER = ["free", "plus", "business"] as const;

export default function Page() {
  const plans: PlanCard[] = DISPLAY_ORDER.map((id) => {
    const plan = PLANS[id];
    return {
      id: plan.id,
      name: plan.name,
      priceNgnMonthly: plan.priceNgnMonthly,
      priceNgnYearly: plan.priceNgnYearly,
      textSearches: plan.quotas.text,
      photoSearches: plan.quotas.photo,
      priceWatches: plan.priceWatches,
      savedLists: plan.savedLists,
      historyDays: plan.historyDays,
    };
  });

  return <PlansContent plans={plans} />;
}
