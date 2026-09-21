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
  BadgeCheckIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  FlameIcon,
  ShoppingCartIcon,
  TargetIcon,
  WalletIcon,
} from "@/components/icons/hero";
import { PackageIllustration } from "@/components/icons";
import type { IconComponent } from "@/types/common";
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
// Redesigned 2026-09-19 (several passes) — briefly went sharp-cornered
// (rounded-2xl/3xl dropped everywhere) per an explicit direction that was
// reversed the same day ("add back the border radius, I just want much
// better designs, very compatible with dark mode"), so every card/tile/
// panel below is back to its rounded-2xl/xl language. The plan grid also
// briefly widened to 3 columns at `xl`, then back down to 2 (2026-09-20,
// explicit request) — the deeper `xl`/`2xl` padding/type scale from that
// same pass stayed.
//
// That same pass also fixed the dark-mode gaps that prompted the "very
// compatible with dark mode" request — search this file for `bg-surface`
// where a literal `bg-white` used to sit: a hardcoded white doesn't ride the
// app's dark-mode colour-token remap the way `bg-surface`/the numbered
// Tailwind scale does (see globals.css's own `.dark` block), so it stayed
// glaring-white on a dark background while everything around it correctly
// went dark.
//
// Given a further pass (2026-09-20) to match the detail page's own hero
// (ShoppingPlanDetailPage.tsx), which went from the same pale orange-50 wash
// this page used to a solid vivid orange fill so it reads as an unmistakable
// "hero" rather than one more softly-tinted card among many — see that
// file's own comment on why the gradient is a LOCKED hex pair rather than
// the `orange-500`/`orange-600` utility classes (the dark-mode remap
// repoints `orange-600` to a paler shade meant for text on a tint, not a
// large fill). The hero's own stat chips went from `bg-surface` tiles to a
// frosted white-glass treatment to stay legible on that fill in both
// themes, same reasoning.
//
// Also grouped the plan grid by status (2026-09-20) — Active/Monitoring
// plans get their own section ahead of anything paused/completed/cancelled/
// expired, mirroring the detail page's own category-header treatment
// (tinted bar, icon, count) rather than a flat grid mixing "still being
// worked on" with "done" once a buyer has both kinds. Only shows up once
// there's actually a mix — a buyer with only active plans (the common case)
// still sees the plain flat grid, unchanged.
//
// Still purely presentational — every data source and handler is unchanged.
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

// The "monitoring" status pill's own content, replacing its text label
// entirely (2026-09-20, explicit request) — a plan that's actively being
// watched reads more immediately as "live" from a broadcasting signal than
// from the word "Monitoring" sitting static next to five other status
// words. Every OTHER status keeps its plain text label; this is
// deliberately only for the one status that's an ongoing, live process
// rather than a settled state (paused/completed/cancelled/expired all
// already read as "this isn't moving right now", which text conveys just
// fine). Icon only, no pill/background around it any more (2026-09-20,
// explicit follow-up) — the caller renders this bare against whatever
// surface it's already on, in whatever text colour it chooses, rather than
// this component boxing it in its own chip.
//
// An actual satellite dish (2026-09-20, explicit follow-up on the first
// version, which read as a plain WiFi glyph rather than "a dish with a
// signal coming out of it") — the dish/receiver/stand stay STATIC, since
// they're the physical object; only the two signal-wave arcs pulse
// outward, staggered, so the animation reads as the dish actively
// broadcasting rather than the whole icon just blinking. Always green
// (`text-green-500` from the caller) regardless of what it's sitting on —
// unlike the badge colours elsewhere on this page, "live" is its own fixed
// signal, not something that should shift with a surrounding card's own
// status tint.
function LiveSignalDot() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Monitoring"
    >
      <path
        d="M4 10a7.31 7.31 0 0 0 10 10Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M9 15l3-3"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M17 13a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        className="animate-pulse"
        style={{ animationDelay: "0ms" }}
      />
      <path
        d="M21 13A10 10 0 0 0 11 3"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        className="animate-pulse"
        style={{ animationDelay: "250ms" }}
      />
    </svg>
  );
}

// One glance-level colour per status, carried on the card's badge gradient.
// A left accent bar in the same colour was tried alongside this and dropped
// the same day (explicit feedback: it read as a stray border rather than a
// status signal). The badge alone still carries the colour.
const STATUS_BADGE_GRADIENT: Record<ShoppingPlanStatus, string> = {
  active: "from-amber-400 to-amber-600",
  monitoring: "from-orange-400 to-orange-600",
  paused: "from-gray-300 to-gray-400",
  completed: "from-green-400 to-green-600",
  cancelled: "from-gray-300 to-gray-400",
  expired: "from-red-400 to-red-600",
};

// Compact currency, for the hero strip only — a full-precision ₦2,000,000
// in a three-across grid on a narrow phone (a budget Android around 320–360px
// wide is the real target here, not just "mobile") either wrapped ugly or
// hit `truncate` and clipped to something unreadable like "₦2,00…" (found
// live, 2026-09-19). PlanRow's own per-card budget chip has a full row to
// itself and keeps full precision via `fmt` — only the cramped grid needs
// this.
function compactNaira(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `₦${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `₦${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }
  return fmt(amount, "₦");
}

// `iso` arrives as whatever the backend's Mongoose `Date` field serialized
// to — a full ISO datetime ("2026-09-21T00:00:00.000Z"), not the bare
// "YYYY-MM-DD" this was originally written against. Slicing to the date
// portion first makes both shapes parse the same way; appending it straight
// to "T00:00:00" left a stray "Z" in the middle of the string and silently
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

/** A gradient progress bar — items found vs total — with its own percentage
 *  read directly off the end of the fill rather than a separate line of
 *  text, so a thumb scanning a narrow phone gets the number and the shape
 *  of it in one glance. 0% still paints a visible track rather than
 *  nothing. Kept as a rounded capsule on purpose — see this file's own
 *  header comment on what did and didn't lose its rounding. */
function ItemProgressBar({ found, total }: { found: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((found / total) * 100)) : 0;
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
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
  const pct =
    plan.totalItems > 0
      ? Math.min(100, Math.round((plan.foundCount / plan.totalItems) * 100))
      : 0;
  // `complete` always overrides the stored status here — a plan that found
  // everything reads as a success at a glance regardless of whether the
  // backend has flipped it to "completed" yet.
  const badgeGradient = complete
    ? STATUS_BADGE_GRADIENT.completed
    : STATUS_BADGE_GRADIENT[plan.status];

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
      whileTap={{ scale: 0.99 }}
      className="group relative flex w-full flex-col gap-3.5 overflow-hidden rounded-2xl border border-gray-100 bg-surface p-4 text-left shadow-sm transition-shadow hover:shadow-lg sm:p-5 xl:p-6 cursor-pointer"
    >
      {/* A quiet accent wash in the corner — brand orange, never loud. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-orange-50/70 blur-2xl transition-opacity group-hover:opacity-100 opacity-0"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm transition-transform group-hover:scale-105 bg-gradient-to-br xl:h-14 xl:w-14",
              badgeGradient,
            )}
          >
            <ShoppingCartIcon size={21} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-snug text-ink xl:text-base">
              {plan.goalText}
            </p>
            {plan.status === "monitoring" ? (
              // No pill/background around it, and always green regardless
              // of surface (2026-09-20, explicit follow-up) — see
              // LiveSignalDot's own comment on why green is fixed rather
              // than matching the surrounding card the way the old pill's
              // tint did.
              <span className="mt-1 inline-flex text-green-500">
                <LiveSignalDot />
              </span>
            ) : (
              <span
                className={cn(
                  "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                  STATUS_TONE[plan.status],
                )}
              >
                {STATUS_LABEL[plan.status]}
              </span>
            )}
          </div>
        </div>
        <ChevronRightIcon
          size={18}
          className="mt-1.5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-400"
        />
      </div>

      {/* Meta as pill chips, not bare inline icon+text — each one truncates
          independently on a very narrow phone instead of the whole row
          silently wrapping mid-word, and it reads as more deliberately
          designed than plain text floating in the card. Kept fully round —
          these are pills, not cards. */}
      <div className="relative flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            urgent ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-500",
          )}
        >
          {urgent ? <FlameIcon size={13} /> : <CalendarIcon size={13} />}
          {deadlineLabel(plan.deadlineDate)}
        </span>
        {plan.budgetNaira != null && (
          <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
            <WalletIcon size={13} className="shrink-0" />
            <span className="truncate">{fmt(plan.budgetNaira, "₦")}</span>
          </span>
        )}
      </div>

      <div className="relative">
        <div className="flex items-center justify-between text-[11px] font-medium text-gray-400">
          <span className="flex items-center gap-1.5">
            <ClockIcon size={12} />
            {plan.foundCount}/{plan.totalItems} found
          </span>
          <span className="truncate pl-2">
            {plan.foundCount > 0
              ? `Est. ${fmt(plan.estimatedTotalNaira, "₦")}`
              : "Searching…"}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <div className="flex-1">
            <ItemProgressBar found={plan.foundCount} total={plan.totalItems} />
          </div>
          <span className="w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums text-gray-400">
            {pct}%
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// One per status group (2026-09-20) — same tinted-bar-with-icon-and-count
// language as ShoppingPlanDetailPage.tsx's own category headers, so the
// list and a plan's own page read as one consistent feature rather than
// two different visual systems. Only two tints exist because there are
// only ever two groups here (unlike categories, which are freeform and
// need a wider deterministic palette) — "orange" for the section actively
// being worked on, "gray" for everything wound down.
const SECTION_TINTS = {
  orange: {
    bar: "from-orange-50 to-transparent",
    badge: "bg-gradient-to-br from-orange-400 to-orange-600",
  },
  gray: {
    bar: "from-gray-100 to-transparent",
    badge: "bg-gradient-to-br from-gray-400 to-gray-500",
  },
} as const;

function PlanSectionHeader({
  icon: Icon,
  title,
  count,
  tint,
  className,
}: {
  icon: IconComponent;
  title: string;
  count: number;
  tint: keyof typeof SECTION_TINTS;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl bg-gradient-to-r px-3 py-2.5",
        SECTION_TINTS[tint].bar,
        className,
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm",
          SECTION_TINTS[tint].badge,
        )}
      >
        <Icon size={15} />
      </span>
      <p className="text-sm font-bold text-ink">{title}</p>
      <span className="ml-auto shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-gray-500 shadow-sm">
        {count}
      </span>
    </div>
  );
}

function PlanRowSkeleton({ index }: { index: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gray-100 bg-surface p-4 shadow-sm sm:p-5 xl:p-6"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-gray-100 xl:h-14 xl:w-14" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-gray-100" />
          <div className="h-4 w-16 animate-pulse rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="mt-3.5 flex gap-1.5">
        <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
      </div>
      <div className="mt-3.5 h-2.5 w-full animate-pulse rounded-full bg-gray-100" />
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
  // A hero summary strip — three glance-level totals across every plan,
  // giving this page something to lead with beyond a bare list the moment
  // there's more than one plan to show. Active = still being worked (not
  // completed/cancelled/expired), since a wound-down plan shouldn't inflate
  // "what Velte is doing for me right now".
  const activePlans = plans.filter(
    (p) => p.status === "active" || p.status === "monitoring",
  );
  // The other half of the grid's own status split, just below — everything
  // NOT still being actively worked on. Reuses `activePlans`' exact
  // definition rather than a separate "is this wound down" check, so the
  // two lists can never disagree about where a given plan belongs.
  const otherPlans = plans.filter(
    (p) => p.status !== "active" && p.status !== "monitoring",
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
      {/* Full width, not centered, and no outer max-width cap at any
          breakpoint — reached from the sidebar menu rather than the narrow
          chat thread, same reasoning RequestsPage.tsx/NotificationsPage.tsx
          already give for their own identical choice. */}
      <div className="px-4 py-8 sm:px-6 lg:px-10 xl:px-16 2xl:px-20">
        {/* Hero banner — matched to the vendor dashboard's own WalletHero
            (components/wallet/redesign/WalletHero.tsx) per explicit request
            (2026-09-20), replacing the solid vivid-orange fill this went
            through a few passes earlier. Same recipe as that component:
            a plain light card (not a colour block) carrying its presence
            through two layered ambient glow blobs and a faint dot-grid
            texture instead — "bold" comes from the DECORATION here, not
            from painting the whole card one loud colour. Copied faithfully
            rather than reinvented, including the dot texture's literal
            `rgba(2,51,55,...)` (WalletHero's own choice, not tokenised for
            dark mode there either) — matching the existing pattern exactly
            is the point of this change. */}
        <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-surface p-4 shadow-sm sm:p-6 xl:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-28 -right-24 h-80 w-80 rounded-full bg-orange-100/70 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-amber-50 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(2,51,55,0.06) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="relative">
            {/* Icon + title on one line, description on its own line below
                spanning the card's full width — nesting the paragraph
                inside the same flex item as the title left it squeezed into
                whatever space remained beside the icon instead of using the
                width actually available. */}
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-sm shadow-orange-200 xl:h-12 xl:w-12">
                <ShoppingCartIcon size={20} />
              </span>
              <h1 className="text-lg font-bold text-ink sm:text-xl xl:text-2xl">
                Shopping Plans
              </h1>
            </div>
            <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-gray-500 sm:text-sm xl:text-[15px]">
              Ask Velte for something with a deadline 2+ days away, and it
              becomes a plan here — Velte keeps searching and checking real
              prices against your budget until then.
            </p>
          </div>

          {activePlans.length > 0 && (
            // Each stat is its own small tile, not a bare text column — a
            // 3-way grid of plain numbers got uneven fast once one value
            // ("Budget") ran longer than the others on a narrow phone, and
            // `truncate` alone just clipped it to something unreadable
            // like "₦2,00…". A tile per stat gives each one a fixed, honest
            // amount of room, and the compact "₦2M" formatting here means
            // that room is never actually exceeded in normal use —
            // full-precision naira still shows on each plan's own card
            // below, where it has a full row.
            //
            // Frosted-on-light (2026-09-20, following the hero's own
            // return to a light card), corrected the same day to
            // `bg-surface/70` instead of a literal `bg-white/70` — the
            // latter is WalletHero.tsx's own exact choice, copied faithfully
            // at first, but a literal white doesn't ride this app's
            // dark-mode colour-token remap the way `bg-surface` does (see
            // globals.css's own ".dark" block), so it stayed a glaring
            // light patch on a dark card — the same bug this page has hit
            // twice before, on its stat chips and its progress track.
            // Un-capped width too (was `xl:max-w-2xl`) — three tiles that
            // could span the hero's own full width had no reason to stop
            // partway across it on a wide screen.
            <div className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-3 xl:mt-8">
              <div className="flex flex-col items-center gap-1 rounded-2xl border border-gray-100 bg-surface/70 py-3 text-center shadow-sm backdrop-blur sm:flex-row sm:items-center sm:gap-2.5 sm:px-3 sm:text-left xl:py-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <ShoppingCartIcon size={13} />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-bold leading-none text-ink sm:text-[15px] xl:text-lg">
                    {activePlans.length}
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-gray-400 sm:text-[11px]">
                    Active
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl border border-gray-100 bg-surface/70 py-3 text-center shadow-sm backdrop-blur sm:flex-row sm:items-center sm:gap-2.5 sm:px-3 sm:text-left xl:py-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <TargetIcon size={13} />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-bold leading-none text-ink sm:text-[15px] xl:text-lg">
                    {itemsTracked}
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-gray-400 sm:text-[11px]">
                    Tracked
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl border border-gray-100 bg-surface/70 py-3 text-center shadow-sm backdrop-blur sm:flex-row sm:items-center sm:gap-2.5 sm:px-3 sm:text-left xl:py-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <WalletIcon size={13} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold leading-none text-ink sm:text-[15px] xl:text-lg">
                    {totalBudget > 0 ? compactNaira(totalBudget) : "—"}
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-gray-400 sm:text-[11px]">
                    Budget
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <PlanRowSkeleton key={i} index={i} />
            ))}
          </div>
        ) : plans.length === 0 ? (
          // Given its own glow + illustration + example bubble treatment
          // rather than a bare dashed box — this is very likely the FIRST
          // thing a new visitor to this page ever sees, and a page whose
          // only content is "nothing here" is exactly the moment it most
          // needs to feel designed rather than unfinished.
          <div className="relative mt-6 flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-gray-100 bg-surface px-5 py-14 text-center xl:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-orange-50 to-transparent"
            />
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 scale-150 rounded-full bg-orange-50 blur-2xl"
              />
              <PackageIllustration size={80} />
            </div>
            <p className="relative text-[15px] font-bold text-ink">
              No Shopping Plans yet
            </p>
            <p className="relative max-w-xs text-sm leading-relaxed text-gray-500">
              Ask Velte for something with a deadline, and it shows up here.
            </p>
            <p className="relative mt-1 max-w-xs rounded-2xl bg-gray-50 px-4 py-2.5 text-[13px] font-medium text-gray-600">
              &ldquo;I need an office set up by Monday&rdquo;
            </p>
          </div>
        ) : otherPlans.length > 0 ? (
          // Split into two sections only once there's an actual mix to
          // split (2026-09-20) — a buyer whose plans are all still active
          // (the common case) sees the plain flat grid below, unchanged.
          // Mirrors ShoppingPlanDetailPage.tsx's own category-header
          // treatment (tinted bar, icon, count) so a plan's own page and
          // this list use the same visual language for "this is a group,
          // not just the first row of one".
          <>
            <PlanSectionHeader
              icon={ShoppingCartIcon}
              title="Active"
              count={activePlans.length}
              tint="orange"
            />
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:gap-4">
              {activePlans.map((plan, i) => (
                <PlanRow key={plan.id} plan={plan} index={i} />
              ))}
            </div>
            <PlanSectionHeader
              icon={BadgeCheckIcon}
              title="Completed & other"
              count={otherPlans.length}
              tint="gray"
              className="mt-6"
            />
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:gap-4">
              {otherPlans.map((plan, i) => (
                <PlanRow key={plan.id} plan={plan} index={i} />
              ))}
            </div>
          </>
        ) : (
          // A grid, not a stacked list, now that this page runs full width
          // — a single column of cards stretched across a wide desktop
          // viewport would waste the space it actually has. Capped at 2
          // columns (2026-09-20, reversed back from a brief 3-at-`xl`
          // widening the same day, explicit request) — matching
          // ShoppingPlanDetailPage.tsx's own item grid, which stayed at 2
          // the whole time for the same reason: a card carrying this much
          // per-plan content reads better with more width per card than
          // with a 3rd column squeezed in.
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:gap-4">
            {plans.map((plan, i) => (
              <PlanRow key={plan.id} plan={plan} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
