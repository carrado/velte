"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";

import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { useNavigation } from "@/components/chat/ChatNavigationProgressContext";
import { fetchShoppingPlans } from "@/services/shoppingPlan";
import { fmt } from "@/lib/product-price";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  FlameIcon,
  ShoppingCartIcon,
  TargetIcon,
  WalletIcon,
} from "@/components/icons/hero";
import { PackageIllustration } from "@/components/icons";
import type {
  ShoppingPlanStatus,
  ShoppingPlanSummary,
} from "@/types/shoppingPlan";

// Shopping Plan (2026-09-18) — the buyer's control center for every plan
// they've ever started (spec §4). A plan is created entirely server-side,
// inside /api/search/route.ts's own deadline branch, so there is no
// "create" affordance here — this page only ever lists and opens existing
// plans; the chat is what starts one.
//
// Redesigned 2026-09-19, then pushed further the same day per explicit
// "very very rich" direction: each plan is now a full gradient-badged card
// (status pill, a real progress bar, deadline/budget chips) rather than a
// plain row, with a hero summary strip up top, a staggered entrance and a
// skeleton loading state, matching the polish of the rest of the
// buyer-facing shell (see CreditsDonut.tsx for the same card/ring visual
// language this borrows from). Purely presentational — every data source
// and handler is unchanged.
//
// ShoppingCartIcon, specifically — not a generic sparkle/package glyph — is
// the icon EVERYWHERE ELSE in the app that means "Shopping Plan"
// (ConversationSidebar's own nav entry, SearchHome.tsx's composer tool
// picker), so this page and its detail page use the exact same icon rather
// than inventing a third visual identity for the same feature.

const STATUS_LABEL: Record<ShoppingPlanStatus, string> = {
  active: "Setting up",
  monitoring: "Monitoring",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

const STATUS_TONE: Record<ShoppingPlanStatus, string> = {
  active: "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100",
  monitoring: "bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-100",
  paused: "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200",
  completed: "bg-green-50 text-green-600 ring-1 ring-inset ring-green-100",
  cancelled: "bg-gray-100 text-gray-400 ring-1 ring-inset ring-gray-200",
  expired: "bg-red-50 text-red-500 ring-1 ring-inset ring-red-100",
};

// `iso` arrives as whatever the backend's Mongoose `Date` field serialized
// to — a full ISO datetime ("2026-09-21T00:00:00.000Z"), not the bare
// "YYYY-MM-DD" this was written against. Slicing to the date portion first
// makes both shapes parse the same way; appending it straight to
// "T00:00:00" left a stray "Z" in the middle of the string and silently
// produced "Invalid Date" the first time a real plan ever reached this page
// (2026-09-19, found live).
function toLocalMidnight(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

function daysUntil(iso: string): number {
  const target = toLocalMidnight(iso);
  const now = new Date();
  const diffMs =
    Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) -
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

function deadlineLabel(iso: string): string {
  const days = daysUntil(iso);
  const formatted = toLocalMidnight(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  if (days < 0) return `${formatted} (passed)`;
  if (days === 0) return `${formatted} (today)`;
  if (days === 1) return `${formatted} (tomorrow)`;
  return `${formatted} (${days} days)`;
}

/** A slim gradient progress bar — items found vs total. Purely
 *  presentational; 0% still paints a visible track rather than nothing. */
function ItemProgressBar({ found, total }: { found: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((found / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PlanRow({
  plan,
  index,
}: {
  plan: ShoppingPlanSummary;
  index: number;
}) {
  const { navigate } = useNavigation();
  const urgent =
    daysUntil(plan.deadlineDate) <= 3 && plan.status === "monitoring";
  const complete = plan.totalItems > 0 && plan.foundCount >= plan.totalItems;

  return (
    <motion.button
      type="button"
      onClick={() => navigate(`/chat/shopping-plan/${plan.id}`)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28,
        delay: Math.min(index, 8) * 0.05,
        ease: "easeOut",
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.995 }}
      className="group relative flex w-full flex-col gap-4 overflow-hidden rounded-2xl border border-gray-100 bg-surface p-5 text-left transition-colors hover:border-orange-200 cursor-pointer"
    >
      {/* A quiet accent wash in the corner — brand orange, never loud. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-orange-50/70 blur-2xl transition-opacity group-hover:opacity-100 opacity-0"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white transition-transform group-hover:scale-105",
              complete
                ? "bg-gradient-to-br from-green-400 to-green-600"
                : "bg-gradient-to-br from-orange-400 to-orange-600",
            )}
          >
            <ShoppingCartIcon size={19} />
          </span>
          <p className="min-w-0 truncate text-sm font-semibold text-ink">
            {plan.goalText}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium",
              STATUS_TONE[plan.status],
            )}
          >
            {STATUS_LABEL[plan.status]}
          </span>
          <ChevronRightIcon
            size={18}
            className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-400"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-400">
        <span
          className={cn(
            "flex items-center gap-1.5",
            urgent ? "font-medium text-amber-600" : undefined,
          )}
        >
          {urgent ? <FlameIcon size={13} /> : <CalendarIcon size={13} />}
          {deadlineLabel(plan.deadlineDate)}
        </span>
        {plan.budgetNaira != null && (
          <span className="flex items-center gap-1.5">
            <WalletIcon size={13} />
            {fmt(plan.budgetNaira, "₦")}
          </span>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] font-medium text-gray-400">
          <span className="flex items-center gap-1.5">
            <ClockIcon size={12} />
            {plan.foundCount}/{plan.totalItems} items found
          </span>
          <span>
            {plan.foundCount > 0
              ? `Est. ${fmt(plan.estimatedTotalNaira, "₦")}`
              : "Searching for prices…"}
          </span>
        </div>
        <div className="mt-2">
          <ItemProgressBar found={plan.foundCount} total={plan.totalItems} />
        </div>
      </div>
    </motion.button>
  );
}

function PlanRowSkeleton({ index }: { index: number }) {
  return (
    <div
      className="animate-pulse rounded-2xl border border-gray-100 bg-surface p-5"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded-full bg-gray-100" />
          <div className="h-2.5 w-1/3 rounded-full bg-gray-100" />
        </div>
        <div className="h-5 w-16 shrink-0 rounded-full bg-gray-100" />
      </div>
      <div className="mt-4 h-1.5 w-full rounded-full bg-gray-100" />
    </div>
  );
}

export function ShoppingPlansIndexPage() {
  const buyer = useBuyerStore((s) => s.buyer);
  const vendor = useUserStore((s) => s.user);
  const identity = buyer ?? vendor ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["shopping-plan", "mine"],
    queryFn: fetchShoppingPlans,
    enabled: Boolean(identity),
  });

  if (!identity) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-5 py-16 text-center">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 scale-150 rounded-full bg-orange-50 blur-2xl"
            />
            <PackageIllustration size={96} />
          </div>
          <h1 className="text-lg font-bold text-ink">
            Sign in to see your Shopping Plans
          </h1>
          <p className="text-sm text-gray-500">
            Shopping Plans track a background search until your deadline — sign
            in to create and follow one.
          </p>
          <GoogleSignInButton />
        </div>
      </div>
    );
  }

  const plans = data?.plans ?? [];
  // A hero summary strip (2026-09-19, "very very rich" direction) — three
  // glance-level totals across every plan, giving this page something to
  // lead with beyond a bare list the moment there's more than one plan to
  // show. Active = still being worked (not completed/cancelled/expired),
  // since a wound-down plan shouldn't inflate "what Velte is doing for me
  // right now".
  const activePlans = plans.filter(
    (p) => p.status === "active" || p.status === "monitoring",
  );
  const itemsTracked = activePlans.reduce((sum, p) => sum + p.totalItems, 0);
  const totalBudget = activePlans.reduce(
    (sum, p) => sum + (p.budgetNaira ?? 0),
    0,
  );

  return (
    // The chat shell's own content slot is `overflow-hidden` (SearchHome.tsx
    // owns its own internal scroll there) — every OTHER full-page view under
    // /chat (RequestsPage, NotificationsPage) supplies its own `h-full
    // overflow-y-auto` for exactly that reason, and this page needs the same
    // wrapper or a plan list taller than the viewport just gets clipped with
    // no way to reach the rest (found live, 2026-09-19).
    <div className="h-full overflow-y-auto">
      {/* Full width, not centered (2026-09-19, explicit request) — same
          "reached from the sidebar menu rather than the narrow chat
          thread" reasoning RequestsPage.tsx/NotificationsPage.tsx already
          give for their own identical choice; there's no reason to cap
          this one to the thread's own reading width either. */}
      <div className="px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
        {/* Hero banner — a gradient wash rather than a flat card, the same
            "quiet, never loud" brand-orange treatment each plan row's own
            corner glow uses, just at page scale. Typography/spacing pass
            (2026-09-19, explicit "congested and too bold" correction on a
            small phone): only the page TITLE is font-bold now — the stat
            VALUES that used to match it were competing for the same amount
            of attention despite being secondary information; everything
            else got a beat more room to breathe instead of sitting flush
            against its neighbour. */}
        <div className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-surface to-surface p-5 sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-orange-200/30 blur-3xl"
          />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
              <ShoppingCartIcon size={20} />
            </span>
            <div>
              <h1 className="text-lg font-bold text-ink sm:text-xl">
                Shopping Plans
              </h1>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-500 sm:text-sm">
                Ask Velte for something with a deadline 2+ days away, and it
                becomes a plan here — Velte keeps searching and checking real
                prices against your budget until then.
              </p>
            </div>
          </div>

          {activePlans.length > 0 && (
            <div className="relative mt-6 grid grid-cols-3 gap-4 border-t border-orange-100/80 pt-5">
              <div>
                <p className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                  <ShoppingCartIcon size={11} />
                  Active
                </p>
                <p className="mt-1 text-[15px] font-semibold text-ink">
                  {activePlans.length}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                  <TargetIcon size={11} />
                  Tracked
                </p>
                <p className="mt-1 text-[15px] font-semibold text-ink">
                  {itemsTracked}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                  <WalletIcon size={11} />
                  Budget
                </p>
                <p className="mt-1 truncate text-[15px] font-semibold text-ink">
                  {totalBudget > 0 ? fmt(totalBudget, "₦") : "—"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* A grid, not a stacked list, now that this page runs full width
            (2026-09-19) — a single column of cards stretched across a wide
            desktop viewport would read as sparse. Capped at 2 per row
            (2026-09-19, explicit correction — a 3rd column at xl made a
            lone card in a mostly-empty grid look orphaned rather than
            simply "not full yet"), matching the detail page's own item
            grid below. */}
        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <PlanRowSkeleton key={i} index={i} />
            ))
          ) : plans.length === 0 ? (
            <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 py-14 text-center">
              <PackageIllustration size={72} />
              <p className="text-sm font-medium text-ink">
                No Shopping Plans yet
              </p>
              <p className="max-w-xs text-sm text-gray-500">
                Ask Velte for something with a deadline — like &ldquo;I need an
                office set up by Monday&rdquo; — to start one.
              </p>
            </div>
          ) : (
            plans.map((plan, i) => (
              <PlanRow key={plan.id} plan={plan} index={i} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
