"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  ClipboardListIcon,
  ClipboardListIllustration,
  PackageIcon,
  ShoppingCartIcon,
  SignalIcon,
  WalletIcon,
} from "@/components/icons";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { useNavigation } from "@/components/chat/ChatNavigationProgressContext";
import {
  PlanProgressBar,
  ShoppingPlanProgressIcon,
} from "@/components/search/ShoppingPlanProgress";
import { fetchMyShoppingPlans } from "@/services/shoppingPlans";
import { useBuyerStore } from "@/store/buyerStore";
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import type { ShoppingPlanSummary } from "@/types/search";

// "Your plans" — the buyer's own list of Shopping Plans (2026-09-06), the
// counterpart to RequestsPage.tsx for this feature. A plan is built inside
// a conversation (composer's Shopping Plan tool) and never created from
// here — this page reports and lets the buyer reopen one to keep editing
// it, same read-mostly shape RequestsPage already holds to.
//
// REDESIGNED 2026-09-11 — full width (was a narrow `max-w-2xl` centred
// column, the same recipe every other /chat sub-page happened to reuse
// without ever revisiting whether a LIST page actually wants that) plus a
// richer, dashboard-flavoured presentation: a stat strip up top, and cards
// laid out in a grid rather than a single stacked column, so the extra
// width is actually spent on more plans per glance rather than more empty
// margin either side of a skinny list.
//
// Buyer session ONLY — see ShoppingPlan.model.js (velte-backend) on why
// there's no vendor-side view to reconcile with, unlike Buyer Requests.

// The one-line verdict on a finished plan. Honest about partials: a plan
// where 2 of 9 items found something is DONE, but it is not "complete" in any
// sense the buyer would recognise, so it never says so.
function statusLabel(plan: ShoppingPlanSummary): string {
  if (plan.status === "archived") return "Archived";
  if (plan.status === "building") return "Searching…";
  if (plan.foundCount === 0) return "No results";
  if (plan.foundCount < plan.itemCount)
    return `${plan.foundCount}/${plan.itemCount} found`;
  return plan.spentKobo > plan.totalBudgetKobo ? "Over budget" : "Complete";
}

// A tiny inline stat, reused for the header strip — deliberately plain (an
// icon, a number, a label) rather than a card of its own: three or four of
// these sitting in a row already reads as a dashboard without needing
// borders around each one to say so.
function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-surface px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-base font-bold leading-tight text-ink">{value}</p>
        <p className="truncate text-[11px] text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function PlanCard({ plan, now }: { plan: ShoppingPlanSummary; now: number }) {
  const building = plan.status === "building";
  const overBudget = plan.spentKobo > plan.totalBudgetKobo;
  const partial = !building && plan.foundCount < plan.itemCount;
  // Spend ratio against the plan's own budget — a slim inline bar, distinct
  // from PlanProgressBar (which tracks SEARCH progress, not money) so the
  // two never get confused for one another on the same card.
  const spendRatio =
    plan.totalBudgetKobo > 0
      ? Math.min(1, plan.spentKobo / plan.totalBudgetKobo)
      : 0;
  const { navigate } = useNavigation();

  return (
    <button
      type="button"
      onClick={() => navigate(`/chat/plans/${plan.id}`)}
      // A button styled as the card, not an <a> (2026-09-11) — this is the
      // vendor-dashboard navigation-progress treatment: the plan's own data
      // is prefetched (top progress bar) and only THEN does the route
      // change, so the detail page lands already rendered.
      className="group flex w-full flex-col rounded-2xl border border-gray-100 bg-surface p-5 text-left transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
          <ClipboardListIcon size={18} />
        </div>
        {building ? (
          <ShoppingPlanProgressIcon
            resolvedCount={plan.resolvedCount}
            itemCount={plan.itemCount}
            size={18}
            className="mt-1 shrink-0"
          />
        ) : (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              overBudget || plan.foundCount === 0
                ? "border-red-200 bg-red-50 text-red-700"
                : partial
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            {statusLabel(plan)}
          </span>
        )}
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-sm font-medium leading-relaxed text-ink">
        {plan.goalText}
      </p>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>
          {plan.itemCount} item{plan.itemCount === 1 ? "" : "s"}
        </span>
        <span className="text-gray-400">{timeAgo(plan.createdAt, now)}</span>
      </div>

      {/* Budget read as a mini bar rather than bare text — the ratio is the
          thing worth a glance, the naira figures are the detail underneath. */}
      <div className="mt-3 space-y-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 ease-out",
              overBudget
                ? "bg-red-500"
                : spendRatio >= 0.8
                  ? "bg-amber-500"
                  : "bg-emerald-500",
            )}
            style={{ width: `${Math.round(spendRatio * 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span>
            {!building && plan.foundCount > 0
              ? `${formatNaira(plan.spentKobo)} spent`
              : "Not spent yet"}
          </span>
          <span>{formatNaira(plan.totalBudgetKobo)} budget</span>
        </div>
      </div>

      {building && (
        <PlanProgressBar
          resolvedCount={plan.resolvedCount}
          itemCount={plan.itemCount}
          className="mt-3"
        />
      )}

      {!building && plan.failedCount > 0 && (
        <p className="mt-2 text-[11px] font-medium text-amber-600">
          {plan.failedCount} to retry
        </p>
      )}
    </button>
  );
}

export function PlansPage() {
  const buyer = useBuyerStore((s) => s.buyer);
  // Only for the "X days ago" strings above — a live clock so a page left
  // open overnight doesn't keep reporting a stale "3h ago" forever, without
  // needing every card to run its own timer.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const { navigate } = useNavigation();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["buyer", "shopping-plans"],
    queryFn: fetchMyShoppingPlans,
    enabled: Boolean(buyer),
    staleTime: 30_000,
    // Live progress for anything still building (2026-09-10) — the same
    // background resolve ShoppingPlanTemplate's own in-turn card polls for,
    // just reached from Your Plans instead of the conversation. Off
    // entirely once nothing is building, so an ordinary visit here costs
    // one request like before.
    refetchInterval: (query) =>
      query.state.data?.plans.some((p) => p.status === "building")
        ? 3000
        : false,
  });

  const plans = useMemo(() => data?.plans ?? [], [data]);
  const activePlans = useMemo(
    () => plans.filter((p) => p.status === "building"),
    [plans],
  );
  const finishedPlans = useMemo(
    () => plans.filter((p) => p.status !== "building"),
    [plans],
  );
  // The header strip's own numbers — across every plan on this page, not
  // just the finished ones, since a buyer mid-build still wants to know
  // what they've committed to in total.
  const totalBudgeted = useMemo(
    () => plans.reduce((sum, p) => sum + p.totalBudgetKobo, 0),
    [plans],
  );
  const totalItemsFound = useMemo(
    () => plans.reduce((sum, p) => sum + p.foundCount, 0),
    [plans],
  );

  if (!buyer) {
    return (
      // Same fixed-height-shell reasoning as every other /chat sub-page —
      // see RequestsPage.tsx's own comment.
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <ClipboardListIllustration size={64} className="mx-auto" />
          <h1 className="mt-4 text-lg font-bold text-ink">
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
      {/* Full width now (was `max-w-2xl mx-auto`) — capped generously on
          very wide monitors so a row of cards doesn't stretch into an
          unreadable single line, but otherwise using the whole shell. */}
      <div className="mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Your plans</h1>
            <p className="mt-1 text-sm text-gray-500">
              Every Shopping Plan you&apos;ve built, and how close each one is
              to budget.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/chat")}
            className="inline-flex w-fit cursor-pointer items-center justify-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            <ShoppingCartIcon size={14} />
            Start a plan
          </button>
        </header>

        {plans.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatPill
              icon={<ClipboardListIcon size={16} />}
              label="Total plans"
              value={String(plans.length)}
            />
            <StatPill
              icon={<SignalIcon size={16} />}
              label="Still searching"
              value={String(activePlans.length)}
            />
            <StatPill
              icon={<PackageIcon size={16} />}
              label="Items found"
              value={String(totalItemsFound)}
            />
            <StatPill
              icon={<WalletIcon size={16} />}
              label="Total budgeted"
              value={formatNaira(totalBudgeted)}
            />
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-gray-100 bg-surface p-5 text-center">
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
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center sm:p-14">
            <ClipboardListIllustration size={56} className="mx-auto" />
            <p className="mt-4 text-sm font-semibold text-ink">
              No shopping plans yet
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-gray-500">
              Tap the + icon in chat and pick Shopping Plan — describe a goal
              and a budget, and Velte builds the checklist from there.
            </p>
            <button
              type="button"
              onClick={() => navigate("/chat")}
              className="mt-5 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              <ShoppingCartIcon size={14} />
              Start a plan
            </button>
          </div>
        )}

        {plans.length > 0 && (
          // Running plans first, and in their own labelled section — this
          // page is where a buyer comes to check on something mid-flight, so
          // what is still moving belongs above what has already finished.
          // Each plan is its own independent background job; nothing here
          // coordinates them.
          <div className="space-y-8">
            {activePlans.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                  Active {activePlans.length > 1 && `· ${activePlans.length}`}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {activePlans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} now={now} />
                  ))}
                </div>
              </section>
            )}
            {finishedPlans.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                  {activePlans.length > 0 ? "Finished" : "Your plans"}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {finishedPlans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} now={now} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
