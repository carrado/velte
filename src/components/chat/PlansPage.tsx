"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  ClipboardListIllustration,
  ShoppingCartIcon,
} from "@/components/icons";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { fetchMyShoppingPlans } from "@/services/shoppingPlans";
import { useBuyerStore } from "@/store/buyerStore";
import { cn, formatNaira } from "@/lib/utils";
import type { ShoppingPlanSummary } from "@/types/search";

// "Your plans" — the buyer's own list of Shopping Plans (2026-09-06), the
// counterpart to RequestsPage.tsx for this feature. A plan is built inside
// a conversation (composer's Shopping Plan tool) and never created from
// here — this page reports and lets the buyer reopen one to keep editing
// it, same read-mostly shape RequestsPage already holds to.
//
// Buyer session ONLY — see ShoppingPlan.model.js (velte-backend) on why
// there's no vendor-side view to reconcile with, unlike Buyer Requests.

function statusLabel(plan: ShoppingPlanSummary): string {
  if (plan.status === "archived") return "Archived";
  return plan.spentKobo > plan.totalBudgetKobo ? "Over budget" : "On track";
}

function PlanCard({ plan }: { plan: ShoppingPlanSummary }) {
  const overBudget = plan.spentKobo > plan.totalBudgetKobo;
  return (
    <Link
      href={`/chat/plans/${plan.id}`}
      className="block rounded-2xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#023337]">
          {plan.goalText}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            overBudget
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700",
          )}
        >
          {statusLabel(plan)}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
        <span>
          {plan.itemCount} item{plan.itemCount === 1 ? "" : "s"}
        </span>
        <span>
          {formatNaira(plan.spentKobo)} of {formatNaira(plan.totalBudgetKobo)}
        </span>
      </div>
    </Link>
  );
}

export function PlansPage() {
  const buyer = useBuyerStore((s) => s.buyer);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["buyer", "shopping-plans"],
    queryFn: fetchMyShoppingPlans,
    enabled: Boolean(buyer),
    staleTime: 30_000,
  });

  const plans = useMemo(() => data?.plans ?? [], [data]);

  if (!buyer) {
    return (
      // Same fixed-height-shell reasoning as every other /chat sub-page —
      // see RequestsPage.tsx's own comment.
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <ClipboardListIllustration size={64} className="mx-auto" />
          <h1 className="mt-4 text-lg font-bold text-[#023337]">
            Sign in to see your plans
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Build a budgeted shopping list from the composer&apos;s Shopping
            Plan tool, and reopen it here any time to keep editing it.
          </p>
          <div className="mt-6 flex justify-center">
            <GoogleSignInButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-[#023337]">Your plans</h1>
          <p className="mt-1 text-sm text-gray-500">
            Every Shopping Plan you&apos;ve built, and how close each one is to
            budget.
          </p>
        </header>

        {isLoading && (
          <ul className="space-y-3">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
              />
            ))}
          </ul>
        )}

        {isError && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
            <p className="text-sm text-gray-500">
              Couldn&apos;t load your plans just now.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 cursor-pointer text-sm font-semibold text-orange-600 transition-colors hover:text-orange-700"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && plans.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <ClipboardListIllustration size={56} className="mx-auto" />
            <p className="mt-4 text-sm font-semibold text-[#023337]">
              No shopping plans yet
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-gray-500">
              Tap the + icon in chat and pick Shopping Plan — describe a goal
              and a budget, and Velte builds the checklist from there.
            </p>
            <Link
              href="/chat"
              className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              <ShoppingCartIcon size={14} />
              Start a plan
            </Link>
          </div>
        )}

        {plans.length > 0 && (
          <div className="space-y-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
