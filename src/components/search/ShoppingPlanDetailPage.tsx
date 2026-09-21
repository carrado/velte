"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "motion/react";

import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { CardCarousel } from "@/components/search/CardCarousel";
import {
  fetchShoppingPlan,
  markShoppingPlanItemPurchased,
} from "@/services/shoppingPlan";
import { fmt } from "@/lib/product-price";
import { cn } from "@/lib/utils";
import {
  AlertTriangleIcon,
  BabyIcon,
  BadgeCheckIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  ChefHatIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  FlameIcon,
  ImageIcon,
  MapPinIcon,
  MonitorIcon,
  PackageIcon,
  PartyPopperIcon,
  RouteIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  SparkleIcon,
  StoreIcon,
  TagIcon,
  TrendingUpIcon,
  UserIcon,
  WalletIcon,
  WrenchIcon,
  ZapIcon,
} from "@/components/icons/hero";
import { PackageIllustration } from "@/components/icons";
import { ImageLightbox } from "@/components/ImageLightbox";
import { pickBadgesFor } from "@/components/search/RecommendationPicks";
import { fetchShoppingPlanRecommendations } from "@/services/shoppingPlan";
import type { IconComponent } from "@/types/common";
import type { SearchRecommendation } from "@/types/search";
import type {
  ShoppingPlanCandidate,
  ShoppingPlanItem,
  ShoppingPlanItemStatus,
  ShoppingPlanRecommendations,
  ShoppingPlanStatus,
} from "@/types/shoppingPlan";
import {
  estimatedTotalWithRecommendations,
  latestPrice,
  purchasedCandidateOf,
  recommendedCandidate,
  sortedAvailableCandidates,
  topPickIdAmong,
} from "@/lib/shoppingPlanCandidates";

// Shopping Plan detail (2026-09-18, several visual passes since) — one
// plan's full item/candidate data (spec §17). Deliberately reads the raw
// candidate `snapshot` defensively (see ShoppingPlanCandidate's own
// comment) rather than importing the full VendorMatch/StoreMatch/
// ExternalOffer types — candidateDetail() below picks out the handful of
// fields this page actually renders (name/price/image plus description,
// attributes, seller, location, an outbound link), optimistically, never
// assuming either shape has all of them.
//
// Restructured 2026-09-20 against a reference layout the buyer shared
// (category tabs, items grouped under per-category headers, compact rows
// instead of a flat card grid, an items-found ring alongside the stat
// tiles). Built ONLY the parts that reflect real, already-persisted data —
// several things in that reference had no backing data at all and were
// deliberately left out rather than faked:
//   - No hero product photo: a plan has no image field, only `goalText`.
//   - No "Must have / Preferred / Optional" tag: `item.priority` is a
//     SEARCH-ORDERING signal ("check this one first"), not a necessity
//     classification — relabelling it would misrepresent what the number
//     means (see manageShoppingPlanTool.ts's own "focus on the shoes
//     first" example).
//   - No "Fair Price Check" / "Trust Check" tools: `fairPriceMinNaira`/
//     `fairPriceMaxNaira` exist on the model but nothing currently
//     populates them (ShoppingPlan.model.js's own comment says as much),
//     and no vendor-trust data reaches a candidate at all — a button for
//     either would open onto zeros or nothing.
//   - No page-level "Compare"/"More Tools" toolbar or a "..." menu — no
//     real destination for them yet (pause/resume/cancel exist on the
//     backend but nothing in this frontend calls them today).
// The categories, counts, prices, statuses and next-check time below are
// all read straight off the plan exactly as before; only the layout around
// them changed.
//
// "Select" removed entirely (2026-09-20, explicit product decision,
// covering this file, its service/type/route layers, and the backend
// model/controller/job in velte-backend) — reasoning: Velte's own agent
// never executes a purchase on the buyer's behalf, so a standing "this is
// my pick" state ahead of actually buying it (and the "your pick went
// unavailable, approve this replacement" flow that state existed to
// protect) added a step without the app doing anything with that
// intermediate state. `purchased` moved from the item onto the CANDIDATE
// instead — see ShoppingPlanCandidate's own comment in
// types/shoppingPlan.ts. There is currently no "mark as purchased" CONTROL
// anywhere in this UI (removed again 2026-09-21, see this file's own
// "RESTRUCTURED AGAIN" comment below) — a candidate's `purchased` flag can
// still be UNDONE from here once true, just not set true from this page.
//
// ShoppingCartIcon is the hero's own icon on purpose, matching
// ShoppingPlansIndexPage.tsx exactly — see that file's own comment on why
// it, not a generic sparkle/package glyph, is what "Shopping Plan" means
// everywhere else in the app (ConversationSidebar, the composer's own tool
// picker). PackageIcon stays on individual item rows/category headers below
// — a different concept (one thing, or one group of things, in the plan)
// from the plan/cart itself.
//
// RESTRUCTURED AGAIN 2026-09-21 (explicit product decision) — an item's
// expanded body used to show its top 3 available candidates side by side,
// always, as one flat "comparison". Replaced with three layers a buyer
// opens into on purpose, matching how a shopping AGENT should behave rather
// than a search engine: ONE recommended pick by default (ItemComparison's
// hero card), "Compare N alternatives" to see the rest, and a plain
// deterministic "full comparison table" (buildPlanComparisonRows) beyond
// that. The recommendation itself reuses ordinary chat search's OWN "Top
// pick" call unchanged (recommendResults.ts's pickRecommendation/
// pickExternalRecommendation, via the new GET .../recommendations route) —
// no separate scoring system, no invented multi-factor weighting.
//
// HONEST ABOUT WHAT IT ACTUALLY IS: a candidate only wears the "Top pick"
// badge when a genuine model verdict resolved to it THIS load. Every other
// case — the call hasn't returned yet, failed, timed out, or fewer than 2
// candidates existed for it to judge between — falls back to the exact
// cheapest-available ordering this page always used, labelled "Cheapest
// available" rather than pretending a judgment happened that didn't. This
// is the same "never claim more than the data supports" rule the model
// prompt itself is held to (recommendResults.ts's own header) applied to
// the UI layer too.
//
// "Mark as purchased" had a brief life on these cards the same day: found
// wired-but-missing while rebuilding this exact markup (the file's own
// comment above had promised it since 2026-09-20, but the button was never
// actually there), added back, then removed again a few hours later by
// explicit follow-up request. Net effect versus 2026-09-20: no change —
// this page still has no way to SET `purchased` true, only to undo it once
// true (see the comment above this one). Recorded here so a future reader
// doesn't "fix" this same gap a third time without checking first.

interface CandidateDetail {
  name: string;
  image: string | null;
  /** `image` first, then every other photo the source published
   *  (VendorMatch.thumbnailUrls / ExternalOffer.galleryUrls) — what
   *  ImageLightbox's own carousel needs. Deduped; empty only when the
   *  candidate genuinely has no photo at all. */
  gallery: string[];
  description: string | null;
  attributes: { name: string; value: string }[];
  /** Vendor name (Velte) or merchant name (external) — who's actually
   *  selling this, distinct from Velte itself. */
  sellerLabel: string | null;
  /** "Area, State" — only ever set for a Velte-sourced candidate; an
   *  external listing carries no buyer-facing location. */
  locationLabel: string | null;
  /** Only set for `source: "velte_store"/"velte_product"` with a real
   *  handle — links to that vendor's own public storefront, same route
   *  VendorResultCard.tsx already uses elsewhere in this app. Never a
   *  guessed product-detail URL this app doesn't actually have. */
  storeHandle: string | null;
  /** Only set for `source: "external"` — the listing's OWN page, verified
   *  by the connector to be a direct product link (see ExternalOffer.url's
   *  own comment), safe to send a buyer straight to. */
  externalUrl: string | null;
  quoteOnRequest: boolean;
}

/** Reads a candidate's raw `snapshot` defensively — it's either a
 *  VendorMatch/StoreMatch (searchProductsCore) or an ExternalOffer
 *  (Serper), two differently-shaped objects this page deliberately never
 *  imports the full types for (see this file's own top comment) — so every
 *  field is read optimistically and just omitted if the shape doesn't have
 *  it, never assumed. */
function candidateDetail(candidate: ShoppingPlanCandidate): CandidateDetail {
  const s = candidate.snapshot as Record<string, unknown> | null;
  const name =
    (s?.name as string | undefined) ||
    (s?.title as string | undefined) ||
    "Option";
  const image =
    (s?.mainImageUrl as string | null | undefined) ||
    (s?.imageUrl as string | null | undefined) ||
    null;
  const otherPhotos =
    (s?.thumbnailUrls as string[] | undefined) ||
    (s?.galleryUrls as string[] | undefined) ||
    [];
  const gallery = Array.from(
    new Set([image, ...otherPhotos].filter((u): u is string => Boolean(u))),
  );
  const description = (s?.description as string | null | undefined) ?? null;
  const attributes =
    (s?.attributes as { name: string; value: string }[] | undefined) ?? [];
  const area = s?.area as string | null | undefined;
  const state = s?.state as string | null | undefined;
  const locationLabel =
    area || state ? [area, state].filter(Boolean).join(", ") : null;
  return {
    name,
    image,
    gallery,
    description,
    attributes,
    sellerLabel:
      (s?.vendorName as string | undefined) ||
      (s?.merchant as string | undefined) ||
      null,
    locationLabel,
    storeHandle: (s?.storeHandle as string | null | undefined) ?? null,
    externalUrl:
      candidate.source === "external"
        ? ((s?.url as string | undefined) ?? null)
        : null,
    quoteOnRequest: Boolean(s?.quoteOnRequest),
  };
}

// Same fix as ShoppingPlansIndexPage's own toLocalMidnight — `iso` is a
// full ISO datetime off the backend's Mongoose `Date` field, not the bare
// "YYYY-MM-DD" this was originally written against.
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

// The plan's OWN status pill, top-right of the hero — mirrors
// ShoppingPlansIndexPage.tsx's identical STATUS_LABEL/STATUS_TONE maps for
// its plan cards, so a plan reads the same way whether you're looking at
// its row in the list or its own page.
const PLAN_STATUS_LABEL: Record<ShoppingPlanStatus, string> = {
  active: "Setting up",
  monitoring: "Monitoring",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

// The "monitoring" status pill's own content, replacing its text label
// entirely (2026-09-20, explicit request, matching ShoppingPlansIndexPage
// .tsx's identical change) — a plan that's actively being watched reads
// more immediately as "live" from a broadcasting signal than from the word
// "Monitoring" sitting static next to five other status words. Every OTHER
// status keeps its plain text label. Icon only, no pill/background around
// it any more (2026-09-20, explicit follow-up) — the caller renders this
// bare against whatever surface it's already on.
//
// An actual satellite dish (2026-09-20, explicit follow-up on the first
// version, which read as a plain WiFi glyph rather than "a dish with a
// signal coming out of it") — the dish/receiver/stand stay STATIC, since
// they're the physical object; only the two signal-wave arcs pulse
// outward, staggered, so the animation reads as the dish actively
// broadcasting rather than the whole icon just blinking. Colour comes from
// the caller, not this component — see the two call sites below and on
// ShoppingPlansIndexPage.tsx for why each picked what it did (this file's
// own hero briefly went white-on-solid-orange, then back to green once the
// hero returned to a light card; the index page's copy has always sat on a
// light card and has always been green).
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

// Back to a colour-tinted pill (2026-09-20, following the hero's own return
// to a light card) — matches ShoppingPlansIndexPage.tsx's own STATUS_TONE
// exactly. The brief "solid white regardless of theme" version only existed
// because a tinted pill would have washed out or clashed against the
// hero's own solid-orange fill in between; that fill is gone, so there's
// no longer a reason for this pill to differ from the plain colour-tint
// convention every other status pill in this app uses.
const PLAN_STATUS_TONE: Record<ShoppingPlanStatus, string> = {
  active: "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100",
  monitoring: "bg-green-50 text-green-600 ring-1 ring-inset ring-green-100",
  paused: "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200",
  completed: "bg-green-50 text-green-600 ring-1 ring-inset ring-green-100",
  cancelled: "bg-gray-100 text-gray-400 ring-1 ring-inset ring-gray-200",
  expired: "bg-red-50 text-red-500 ring-1 ring-inset ring-red-100",
};

// Full labels for the expanded item body; ROW_STATUS below has its own
// shorter set for the compact row, since "Options found" doesn't fit
// alongside a thumbnail/price/button on one line.
const ITEM_STATUS_LABEL: Record<ShoppingPlanItemStatus, string> = {
  pending: "Waiting to search",
  searching: "Searching…",
  found: "Options found",
  no_match: "No suitable option yet",
  failed: "Couldn't check this time",
};

const ITEM_STATUS_TONE: Record<ShoppingPlanItemStatus, string> = {
  pending: "bg-gray-100 text-gray-500",
  searching: "bg-amber-50 text-amber-600",
  found: "bg-green-50 text-green-600",
  no_match: "bg-amber-50 text-amber-600",
  failed: "bg-red-50 text-red-500",
};

// The compact row's own status read — deliberately not just a shorter copy
// of ITEM_STATUS_LABEL/TONE above. "Purchased" is never one of
// ShoppingPlanItemStatus's own values (it lives on the CANDIDATE, a
// separate field — an item can be `status: "found"` AND have a purchased
// candidate at once), so this combines both real fields into the one badge
// a buyer actually wants to see at a glance, the same derived-state read
// the reference layout's row list was doing.
const ROW_STATUS_LABEL: Record<ShoppingPlanItemStatus, string> = {
  pending: "Pending",
  searching: "Searching",
  found: "Found",
  no_match: "No match",
  failed: "Failed",
};

const ROW_STATUS_TONE: Record<ShoppingPlanItemStatus, string> = {
  pending: "bg-gray-100 text-gray-500",
  searching: "bg-blue-50 text-blue-600",
  found: "bg-green-50 text-green-600",
  no_match: "bg-amber-50 text-amber-600",
  failed: "bg-red-50 text-red-500",
};

const PURCHASED_ROW_TONE = "bg-violet-50 text-violet-600";

function rowStatus(item: ShoppingPlanItem): { label: string; tone: string } {
  if (purchasedCandidateOf(item)) {
    return { label: "Purchased", tone: PURCHASED_ROW_TONE };
  }
  return {
    label: ROW_STATUS_LABEL[item.status],
    tone: ROW_STATUS_TONE[item.status],
  };
}

/** The single price a row shows before its own panel is opened — the
 *  purchased candidate's frozen price if there is one, else the cheapest
 *  available one's. `null` (rendered as "—") only when nothing priced
 *  exists yet, never a guess. */
function rowPrice(item: ShoppingPlanItem): number | null {
  const purchased = purchasedCandidateOf(item);
  if (purchased) return purchased.purchasedPriceNaira;
  const cheapest = sortedAvailableCandidates(item)[0];
  return cheapest ? latestPrice(cheapest) : null;
}

/** A category's own real data, grouped from the plan's flat item list —
 *  purely a client-side `reduce`, nothing the backend needs to know about.
 *  Order follows first appearance in `items` (a Map preserves insertion
 *  order), which is already priority/order-sorted by the caller, so
 *  categories come out in the same sensible sequence the flat list did. */
interface CategoryGroup {
  name: string;
  items: ShoppingPlanItem[];
  purchasedCount: number;
  foundCount: number;
}

function groupByCategory(items: ShoppingPlanItem[]): CategoryGroup[] {
  const map = new Map<string, ShoppingPlanItem[]>();
  for (const item of items) {
    const key = item.category?.trim() || "Other";
    const existing = map.get(key);
    if (existing) existing.push(item);
    else map.set(key, [item]);
  }
  return Array.from(map.entries()).map(([name, groupItems]) => ({
    name,
    items: groupItems,
    purchasedCount: groupItems.filter((i) => purchasedCandidateOf(i)).length,
    foundCount: groupItems.filter(
      (i) => !purchasedCandidateOf(i) && i.status === "found",
    ).length,
  }));
}

// A small, deterministic palette for category header colour — categories
// are freeform text the model wrote when the plan was created ("Hostel",
// "Personal Care", ...), not a fixed enum, so there's no real mapping from
// name to a single "correct" colour the way there is for a status. Hashing
// the name to one of a few gradient tones at least gives each category its
// own consistent identity across a session, rather than every header
// looking identical.
//
// Every hue here MUST have a `-50`/`-100`/`-200` entry in globals.css's own
// `.dark` block (search it for "Tinted panels") — that's what lets
// CATEGORY_HEADER_TINTS below use the same hue as a light wash without it
// staying stuck at its light-mode value in dark mode. `rose` was tried
// first and dropped before shipping for exactly this reason: it has no
// dark-mode entry at all, so its `-50` tint would've been the same
// "glaring light patch on a dark card" bug this page already had twice
// (ShoppingPlansIndexPage.tsx's stat chips, this file's own progress
// track and gauge) — caught this time before it ever rendered once.
const CATEGORY_GRADIENTS = [
  "from-violet-400 to-violet-600",
  "from-blue-400 to-blue-600",
  "from-teal-400 to-teal-600",
  "from-amber-400 to-amber-600",
  "from-emerald-400 to-emerald-600",
  "from-orange-400 to-orange-600",
];

// The header's own faint tint, one entry per CATEGORY_GRADIENTS index (same
// hash picks both, see categoryHeaderTint below) — written out as complete,
// literal class strings rather than derived from CATEGORY_GRADIENTS at
// runtime (an earlier version of this tried `.replace()`-ing "/10" onto the
// badge gradient's own classes, which Tailwind's static build-time scan
// can't see: it only ever generates CSS for class names that appear
// verbatim somewhere in the source, so a computed string never reliably
// exists at build time — found before it ever shipped).
const CATEGORY_HEADER_TINTS = [
  "from-violet-50 to-transparent",
  "from-blue-50 to-transparent",
  "from-teal-50 to-transparent",
  "from-amber-50 to-transparent",
  "from-emerald-50 to-transparent",
  "from-orange-50 to-transparent",
];

function categoryHash(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function categoryGradient(name: string): string {
  return CATEGORY_GRADIENTS[categoryHash(name) % CATEGORY_GRADIENTS.length];
}

// Same hash as categoryGradient — a category's badge and its header tint
// are meant to visibly pair up, so they have to pick from index `i` of
// their own array together, not two independent random draws.
function categoryHeaderTint(name: string): string {
  return CATEGORY_HEADER_TINTS[
    categoryHash(name) % CATEGORY_HEADER_TINTS.length
  ];
}

// The icon DOES get a real best-effort mapping, unlike the colour above —
// keyword rules over the category text, ordered most-specific first, tried
// against a lowercased match. Best-effort by nature (the category is
// freeform LLM-written text, not an enum this app defines), so it always
// falls back to a plain package box rather than guessing wrong with false
// confidence. Add a rule here, not a one-off special case, when a new
// common category shows up wrong.
const CATEGORY_ICON_RULES: { keywords: string[]; icon: IconComponent }[] = [
  {
    keywords: ["hostel", "dorm", "bedding", "bedroom", "room"],
    icon: BuildingIcon,
  },
  {
    keywords: ["school", "education", "study", "office", "work", "stationery"],
    icon: BriefcaseIcon,
  },
  {
    keywords: [
      "personal care",
      "hygiene",
      "toiletries",
      "beauty",
      "grooming",
      "skincare",
    ],
    icon: SparkleIcon,
  },
  { keywords: ["clean", "laundry", "detergent"], icon: SparkleIcon },
  {
    keywords: ["electronic", "gadget", "computer", "laptop", "phone", "tech"],
    icon: MonitorIcon,
  },
  {
    keywords: [
      "infrastructure",
      "power",
      "electric",
      "ups",
      "generator",
      "solar",
    ],
    icon: ZapIcon,
  },
  { keywords: ["kitchen", "food", "cooking", "grocery"], icon: ChefHatIcon },
  {
    keywords: [
      "cloth",
      "wear",
      "fashion",
      "uniform",
      "apparel",
      "footwear",
      "shoe",
    ],
    icon: TagIcon,
  },
  {
    keywords: ["health", "medical", "medicine", "pharmacy", "first aid"],
    icon: ShieldCheckIcon,
  },
  { keywords: ["transport", "travel", "vehicle", "car"], icon: RouteIcon },
  { keywords: ["baby", "kid", "child", "infant"], icon: BabyIcon },
  {
    keywords: ["entertainment", "game", "toy", "leisure"],
    icon: PartyPopperIcon,
  },
  { keywords: ["tool", "hardware", "repair"], icon: WrenchIcon },
];

function categoryIcon(name: string): IconComponent {
  const lower = name.toLowerCase();
  const match = CATEGORY_ICON_RULES.find((rule) =>
    rule.keywords.some((k) => lower.includes(k)),
  );
  return match ? match.icon : PackageIcon;
}

/** "in 3h 12m" inside the next 24h (the sweep's own tightest interval tier
 *  is 12h, so this is the common case near a deadline), else a plain
 *  date+time — mirrors shoppingPlan.job.js's own INTERVAL_TIERS in spirit
 *  without needing to import backend code: this just reads the ISO instant
 *  the backend already computed and decided to check next. */
function nextUpdateLabel(iso: string): string {
  const target = new Date(iso);
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return "due now";
  const totalMinutes = Math.round(diffMs / 60000);
  if (totalMinutes < 60) return `in ${totalMinutes}m`;
  if (totalMinutes < 24 * 60) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  }
  const isToday = target.toDateString() === new Date().toDateString();
  const time = target.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return isToday
    ? `today, ${time}`
    : `${target.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

/** A small square thumbnail — a candidate's own image when it has one,
 *  otherwise a neutral placeholder box so the layout never jumps between
 *  items that do and don't have a real photo. */
function CandidateThumb({
  image,
  size = 40,
}: {
  image: string | null;
  size?: number;
}) {
  if (image) {
    // Arbitrary merchant-hosted URLs (see Avatar.tsx's own comment on the
    // same tradeoff for candidate/offer imagery elsewhere in this app) —
    // not something next/image's configured domains can cover.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        className="h-full w-full shrink-0 rounded-lg object-cover"
        style={{ height: size, width: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300"
      style={{ height: size, width: size }}
    >
      <ImageIcon size={Math.round(size * 0.45)} />
    </div>
  );
}

/** The dark-mode-safe successor to what used to be a budget-only
 *  RadialBudgetGauge (2026-09-20) — generalised so the same ring draws
 *  BOTH the items-found donut in the stat row now and, in principle, any
 *  other "how much of a whole" story this page wants later, rather than a
 *  second near-identical SVG component per metric.
 *
 *  Colours are `var(--color-*)` referencing the exact CSS custom
 *  properties Tailwind's own numbered utilities compile to (see
 *  globals.css's `.dark` block) — found live on the budget version of this
 *  ring: hardcoded hex stayed exactly as bright/light in dark mode as in
 *  light mode, glaring against a dark card the same way a literal
 *  `bg-white` would. Referencing the token means this ring follows
 *  whatever "orange-600"/"gray-200" already mean in the current theme. */
const GAUGE_TRACK = "var(--color-gray-200)";

function RadialGauge({
  pct,
  color,
  size = 88,
  stroke = 8,
  centerValue,
  centerLabel,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
  centerValue: string;
  centerLabel: string;
}) {
  const radius = (size - stroke) / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(1, pct / 100));
  const dash = circumference * fraction;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${Math.round(pct)}% — ${centerLabel}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={GAUGE_TRACK}
          strokeWidth={stroke}
        />
        {fraction > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            className="transition-[stroke-dasharray] duration-500 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold text-ink">{centerValue}</span>
        <span className="text-[9px] font-medium tracking-wide text-gray-400 uppercase">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

const BUDGET_STATUS_COPY: Record<
  string,
  {
    tone: string;
    ring: string;
    message: (budget: number, estimate: number) => string;
  }
> = {
  within_budget: {
    tone: "bg-green-50 text-green-700",
    ring: "bg-green-500",
    message: (budget, estimate) =>
      `On track — what Velte has found so far (${fmt(estimate, "₦")}) fits inside your ${fmt(budget, "₦")} budget.`,
  },
  slightly_over_budget: {
    tone: "bg-amber-50 text-amber-700",
    ring: "bg-amber-500",
    message: (budget, estimate) =>
      `What Velte has found so far (${fmt(estimate, "₦")}) is a bit above your ${fmt(budget, "₦")} budget. Velte will keep searching for lower-priced options.`,
  },
  significantly_over_budget: {
    tone: "bg-red-50 text-red-700",
    ring: "bg-red-500",
    message: (budget, estimate) =>
      `What Velte has found so far (${fmt(estimate, "₦")}) is well above your ${fmt(budget, "₦")} budget. Velte is continuing to search, but you may want to increase your budget, remove optional items, or consider alternatives.`,
  },
};

// Same thresholds as velte-backend's own budgetStatusFor (shoppingPlan.job.js)
// — mirrored client-side so this reads as "over/under budget" from the
// moment ANY real price has been found, rather than waiting for the
// backend's own digest (which only runs once every ~24h, decoupled from how
// often items are actually checked — see that job's own header). Never
// invents a verdict before there's real data to check: only used once at
// least one item has actually been priced (`hasRealPrices` below).
const WITHIN_BUDGET_MAX_RATIO = 1.0;
const SIGNIFICANTLY_OVER_BUDGET_RATIO = 1.25;
function liveBudgetStatus(
  budgetNaira: number,
  estimateNaira: number,
): "within_budget" | "slightly_over_budget" | "significantly_over_budget" {
  const ratio = estimateNaira / budgetNaira;
  if (ratio <= WITHIN_BUDGET_MAX_RATIO) return "within_budget";
  return ratio >= SIGNIFICANTLY_OVER_BUDGET_RATIO
    ? "significantly_over_budget"
    : "slightly_over_budget";
}

/** A horizontal gauge — the budget as the full track, what's been found so
 *  far as the fill, colour-coded by liveBudgetStatus. Purely a visual
 *  restatement of the same ratio budgetCopy already puts into words. */
function BudgetGauge({
  budgetNaira,
  estimateNaira,
  status,
}: {
  budgetNaira: number;
  estimateNaira: number;
  status: keyof typeof BUDGET_STATUS_COPY;
}) {
  const ratio = budgetNaira > 0 ? estimateNaira / budgetNaira : 0;
  const pct = Math.max(4, Math.min(100, Math.round(ratio * 100)));
  return (
    <div className="mt-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            BUDGET_STATUS_COPY[status].ring,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-gray-400">
        <span>{fmt(estimateNaira, "₦")} found so far</span>
        <span>{fmt(budgetNaira, "₦")} budget</span>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  iconTone = "bg-orange-50 text-orange-600",
  tone = "text-ink",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconTone?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-surface p-3 shadow-sm xl:p-4">
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg",
          iconTone,
        )}
      >
        {icon}
      </span>
      <p className="mt-2 text-[11px] font-medium text-gray-400">{label}</p>
      <p className={cn("text-sm font-semibold xl:text-base", tone)}>{value}</p>
    </div>
  );
}

/** One candidate's own row set for Layer 3 (2026-09-21, restructured from a
 *  single wide `<table>` into per-candidate cards — see ItemComparison's
 *  own Layer 3 comment for why). Everything here is checkable, read
 *  straight off the candidate's own data — never a model's judgment
 *  (that's Layer 1's job, via `recommendation`); this exists specifically
 *  so a buyer can verify the pick against real fields rather than take it
 *  on trust. `attributeNames` is passed in (computed ONCE, across every
 *  candidate being compared) so every card lists the SAME spec rows in the
 *  same order, including a "—" for one a particular listing didn't state —
 *  otherwise swiping between cards would silently reshuffle what's being
 *  compared, which defeats the point of a comparison. */
function comparisonRowsFor(
  candidate: ShoppingPlanCandidate,
  attributeNames: string[],
): { label: string; value: string }[] {
  const detail = candidateDetail(candidate);
  const price = latestPrice(candidate);
  const rows: { label: string; value: string }[] = [
    {
      label: "Price",
      value: detail.quoteOnRequest
        ? "Ask for price"
        : price != null
          ? fmt(price, "₦")
          : "—",
    },
    { label: "Seller", value: detail.sellerLabel ?? "—" },
    { label: "Location", value: detail.locationLabel ?? "—" },
  ];
  for (const name of attributeNames) {
    rows.push({
      label: name,
      value: detail.attributes.find((a) => a.name === name)?.value ?? "—",
    });
  }
  return rows;
}

/** The spec-row labels shared across every candidate's own comparisonRowsFor
 *  card — computed once from the whole set being compared. Capped at 5, the
 *  same restraint the single-candidate detail view applies to its own
 *  attribute chips (see ItemComparison's own `.slice(0, 6)`), so a listing
 *  with many vendor-entered fields can't push a card past a screenful. */
function sharedAttributeNames(candidates: ShoppingPlanCandidate[]): string[] {
  return Array.from(
    new Set(
      candidates.flatMap((c) =>
        candidateDetail(c).attributes.map((a) => a.name),
      ),
    ),
  ).slice(0, 5);
}

/** An item's own three-layer body (2026-09-21, see this file's own header
 *  on why) — ONE recommended pick by default, alternatives behind a tap,
 *  a full comparison table behind a second tap. Only ever rendered when
 *  `available.length > 0`; the "no options yet" states stay in ItemRow. */
function ItemComparison({
  available,
  recommendation,
  onShowGallery,
}: {
  available: ShoppingPlanCandidate[];
  recommendation: SearchRecommendation | null;
  onShowGallery: (candidateId: string) => void;
}) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Same shared helper recommendedCandidate/the plan-wide estimated total
  // use (see shoppingPlanCandidates.ts) — see this file's own header on why
  // a stale/failed/not-yet-loaded call must fall back to plain
  // cheapest-first rather than show a stale or invented pick.
  const topPickId = topPickIdAmong(available, recommendation);
  const recommended = topPickId
    ? available.find((c) => c.id === topPickId)!
    : available[0];
  const alternatives = available.filter((c) => c.id !== recommended.id);
  const detail = candidateDetail(recommended);
  const price = latestPrice(recommended);
  // "Top pick" is rendered separately as the hero badge below — only its
  // OTHER badges (Best value/Nearest) belong in this list.
  const otherBadges = pickBadgesFor(recommended.id, recommendation)?.filter(
    (b) => b !== "Top pick",
  );
  const reason = topPickId
    ? recommendation?.bestOverallReason ||
      "Velte's pick among the available options."
    : available.length > 1
      ? `Cheapest of ${available.length} available options.`
      : "The only option currently available.";
  // Computed once (not per Layer 3 card) so every candidate's own
  // comparisonRowsFor lists the exact same spec rows — see that function's
  // own comment on why a swipe must never reshuffle what's being compared.
  const attributeNames = sharedAttributeNames(available);

  return (
    <div className="mt-1 space-y-3">
      {/* Layer 1 — the one recommended pick. */}
      <div className="space-y-2.5 overflow-hidden rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              topPickId
                ? "bg-orange-500 text-white"
                : "bg-gray-200 text-gray-600",
            )}
          >
            {topPickId ? "Top pick" : "Cheapest available"}
          </span>
          {otherBadges?.map((b) => (
            <span
              key={b}
              className="shrink-0 rounded-full border border-orange-200 bg-surface px-2 py-0.5 text-[10px] font-semibold text-orange-600"
            >
              {b}
            </span>
          ))}
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
            {detail.name}
          </span>
          {detail.quoteOnRequest ? (
            <span className="shrink-0 text-[11px] text-gray-400">
              Ask for price
            </span>
          ) : (
            price != null && (
              <span className="shrink-0 text-sm font-bold text-ink">
                {fmt(price, "₦")}
              </span>
            )
          )}
        </div>
        <p className="text-[11px] leading-relaxed text-gray-600">{reason}</p>
        <div className="flex gap-3">
          {detail.gallery.length > 0 && (
            <button
              type="button"
              onClick={() => onShowGallery(recommended.id)}
              aria-label={`View ${detail.gallery.length > 1 ? "photos" : "photo"} of ${detail.name}`}
              className="block h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-24 sm:w-24 cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detail.image ?? detail.gallery[0]}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            {detail.description && (
              <p className="text-[11px] leading-relaxed text-gray-600">
                {detail.description}
              </p>
            )}
            {detail.attributes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {detail.attributes.slice(0, 6).map((attr) => (
                  <span
                    key={attr.name}
                    className="rounded-full border border-gray-200 bg-surface px-2 py-0.5 text-[10px] text-gray-500"
                  >
                    <span className="font-medium text-gray-700">
                      {attr.name}:
                    </span>{" "}
                    {attr.value}
                  </span>
                ))}
              </div>
            )}
            {(detail.sellerLabel || detail.locationLabel) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                {detail.sellerLabel && (
                  <span className="flex items-center gap-1">
                    <UserIcon size={11} />
                    {detail.sellerLabel}
                  </span>
                )}
                {detail.locationLabel && (
                  <span className="flex items-center gap-1">
                    <MapPinIcon size={11} />
                    {detail.locationLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {detail.storeHandle && (
            <Link
              href={`/store/${detail.storeHandle}`}
              target="_blank"
              className="flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 transition-colors"
            >
              <StoreIcon size={12} />
              View store
            </Link>
          )}
          {detail.externalUrl && (
            <a
              href={detail.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 transition-colors"
            >
              <ExternalLinkIcon size={12} />
              View listing
            </a>
          )}
        </div>
      </div>

      {/* Layer 2 — alternatives, collapsed by default. */}
      {alternatives.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowAlternatives((v) => !v)}
            className="text-[11px] font-medium text-orange-600 hover:text-orange-700 cursor-pointer"
          >
            {showAlternatives
              ? "Hide alternatives"
              : `Compare ${alternatives.length} alternative${alternatives.length === 1 ? "" : "s"}`}
          </button>
          {showAlternatives && (
            <div className="mt-2 space-y-1.5">
              {alternatives.map((candidate) => {
                const altDetail = candidateDetail(candidate);
                const altPrice = latestPrice(candidate);
                const altBadges = pickBadgesFor(candidate.id, recommendation);
                const isTradeoff =
                  recommendation?.tradeoff?.productId === candidate.id;
                return (
                  <div
                    key={candidate.id}
                    className="flex flex-col gap-1 rounded-xl border border-gray-100 px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5 text-xs">
                      <CandidateThumb image={altDetail.image} size={28} />
                      <span className="min-w-0 flex-1 truncate font-medium text-gray-700">
                        {altDetail.name}
                      </span>
                      {altBadges?.map((b) => (
                        <span
                          key={b}
                          className="shrink-0 rounded-full border border-orange-200 bg-surface px-2 py-0.5 text-[10px] font-semibold text-orange-600"
                        >
                          {b}
                        </span>
                      ))}
                      {altDetail.quoteOnRequest ? (
                        <span className="shrink-0 text-[11px] text-gray-400">
                          Ask for price
                        </span>
                      ) : (
                        altPrice != null && (
                          <span className="shrink-0 font-semibold text-ink">
                            {fmt(altPrice, "₦")}
                          </span>
                        )
                      )}
                    </div>
                    {isTradeoff && recommendation?.tradeoff && (
                      <p className="text-[11px] leading-relaxed text-amber-600">
                        <AlertTriangleIcon
                          size={11}
                          className="mr-1 inline-block align-text-bottom"
                        />
                        {recommendation.tradeoff.note}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      {altDetail.storeHandle && (
                        <Link
                          href={`/store/${altDetail.storeHandle}`}
                          target="_blank"
                          className="flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 transition-colors"
                        >
                          <StoreIcon size={12} />
                          View store
                        </Link>
                      )}
                      {altDetail.externalUrl && (
                        <a
                          href={altDetail.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 transition-colors"
                        >
                          <ExternalLinkIcon size={12} />
                          View listing
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Layer 3 — deep comparison, one card per candidate, swipeable
          (2026-09-21, replacing an earlier plain `<table>` wrapped in
          `overflow-x-auto`) — a literal data table scrolled the label
          column away with everything else, so there was nothing left
          anchoring what a swiped-to value even belonged to, and it never
          read as something a finger was MEANT to drag. CardCarousel is the
          same swipeable-row component every product/offer carousel in this
          app already uses (native touch-drag + snap, arrow buttons as a
          desktop-only convenience on top) — one candidate's full spec sheet
          per card, so swiping between cards is swiping between OPTIONS, the
          same gesture as scrolling through search results. Every card lists
          the same spec rows in the same order (see sharedAttributeNames) so
          a swipe never reshuffles what's being compared. Still
          deterministic, no extra model call — every value is read straight
          off the candidate's own data (see comparisonRowsFor). */}
      {available.length > 1 && (
        <div>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="text-[11px] font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            {showTable ? "Hide full comparison" : "See full comparison table"}
          </button>
          {showTable && (
            <div className="mt-2">
              <CardCarousel
                items={available}
                getKey={(c) => c.id}
                slideClassName="w-[min(200px,68%)] sm:w-[220px]"
                renderItem={(candidate) => {
                  const isTopPick = candidate.id === topPickId;
                  const candidateInfo = candidateDetail(candidate);
                  return (
                    <div
                      className={cn(
                        "flex h-full flex-col gap-2 rounded-xl border p-3",
                        isTopPick
                          ? "border-orange-200 bg-orange-50/30"
                          : "border-gray-100",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <CandidateThumb image={candidateInfo.image} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-ink">
                            {candidateInfo.name}
                          </p>
                          {isTopPick && (
                            <span className="text-[10px] font-semibold text-orange-600">
                              Top pick
                            </span>
                          )}
                        </div>
                      </div>
                      <dl className="space-y-1 text-[11px]">
                        {comparisonRowsFor(candidate, attributeNames).map(
                          (row) => (
                            <div
                              key={row.label}
                              className="flex items-start justify-between gap-2 border-t border-gray-100 pt-1 first:border-t-0 first:pt-0"
                            >
                              <dt className="shrink-0 text-gray-400">
                                {row.label}
                              </dt>
                              <dd className="min-w-0 text-right font-medium text-gray-700">
                                {row.value}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>
                    </div>
                  );
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One item's compact row plus its own expandable body — the reference
 *  layout's list-row treatment, replacing what used to be a full-size card
 *  per item in a grid. A purchased candidate gets a green confirmation
 *  strip with Undo (see `onTogglePurchased`'s own comment in this file's
 *  header for what setting `purchased` true is left to). */
function ItemRow({
  item,
  index,
  recommendation,
  onTogglePurchased,
}: {
  item: ShoppingPlanItem;
  index: number;
  /** This item's own "Top pick" verdict, or null — see this file's own
   *  header on where it comes from and what null means (not necessarily a
   *  failure; see ItemComparison's own fallback). */
  recommendation: SearchRecommendation | null;
  onTogglePurchased: (candidateId: string, purchased: boolean) => void;
}) {
  // Starts open (2026-09-20, explicit request) — the item row itself is
  // now the ONLY collapsible thing left in this component (no more
  // per-candidate toggle, no more collapsed-by-default rows gated on
  // candidate count), so it defaults to shown and a buyer who wants a
  // shorter list can still close it.
  const [expanded, setExpanded] = useState(true);
  const purchased = purchasedCandidateOf(item);
  const available = sortedAvailableCandidates(item);
  // Which candidate's gallery the lightbox is currently showing — set from
  // ItemComparison's own onShowGallery callback, since the lightbox itself
  // still lives at this level (one per row, not one per layer).
  const [lightboxCandidateId, setLightboxCandidateId] = useState<string | null>(
    null,
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const lightboxCandidate = lightboxCandidateId
    ? item.candidates.find((c) => c.id === lightboxCandidateId)
    : null;
  const lightboxGallery = lightboxCandidate
    ? candidateDetail(lightboxCandidate).gallery
    : [];

  const status = rowStatus(item);
  const price = rowPrice(item);
  // Same shared helper ItemComparison's own hero card and the plan-wide
  // estimated total use (see shoppingPlanCandidates.ts) — kept in sync here
  // only for the collapsed row's own thumbnail, which has to show something
  // before the row is ever expanded.
  const leadCandidate = recommendedCandidate(item, recommendation);
  const thumb = purchased
    ? candidateDetail(purchased).image
    : leadCandidate
      ? candidateDetail(leadCandidate).image
      : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-100",
        expanded && "bg-gray-50/40",
      )}
    >
      <motion.button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: Math.min(index, 10) * 0.02 }}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-gray-50/70 cursor-pointer sm:gap-3 sm:px-4"
      >
        <CandidateThumb image={thumb} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink sm:text-sm">
            {item.label}
          </p>
          <p className="truncate text-[11px] text-gray-400">
            {item.quantity > 1 ? `${item.quantity} × ` : ""}
            {item.category}
          </p>
        </div>
        <span className="hidden shrink-0 text-sm font-semibold text-ink sm:block">
          {price != null ? fmt(price, "₦") : "—"}
        </span>
        {/* Status text, not an action pill (2026-09-20, explicit request —
            "Compare"/"View" removed for good) — this slot is visible at
            every breakpoint, so it's the one place a phone always sees
            "Found"/"No match"/etc., with the desktop-only copy below
            skipped to avoid saying it twice. */}
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            status.tone,
          )}
        >
          {status.label}
        </span>
        <ChevronRightIcon
          size={16}
          className={cn(
            "hidden shrink-0 text-gray-300 transition-transform sm:block",
            expanded && "rotate-90",
          )}
        />
      </motion.button>
      {/* The price column collapses under `sm` (no room next to a
          thumbnail + label + status pill on a narrow phone) — shown here
          instead, on its own line, rather than silently disappearing.
          Status itself isn't repeated here — the pill above is already
          visible on mobile too. */}
      <div className="flex items-center gap-2 px-3 pb-2 sm:hidden">
        <span className="text-xs font-semibold text-ink">
          {price != null ? fmt(price, "₦") : "—"}
        </span>
      </div>

      {expanded && (
        <div className="px-3 pb-4 sm:px-4">
          {purchased ? (
            <div className="mt-1 flex items-center gap-2.5 rounded-xl bg-green-50 px-3 py-2">
              <CandidateThumb
                image={candidateDetail(purchased).image}
                size={32}
              />
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-green-700">
                {candidateDetail(purchased).name}
                {purchased.purchasedPriceNaira != null
                  ? ` — ${fmt(purchased.purchasedPriceNaira, "₦")}`
                  : ""}
              </p>
              <BadgeCheckIcon size={16} className="shrink-0 text-green-600" />
              <button
                type="button"
                onClick={() => onTogglePurchased(purchased.id, false)}
                className="shrink-0 text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                Undo
              </button>
            </div>
          ) : available.length > 0 ? (
            <ItemComparison
              available={available}
              recommendation={recommendation}
              onShowGallery={(candidateId) => {
                setLightboxCandidateId(candidateId);
                setLightboxOpen(true);
              }}
            />
          ) : item.status === "pending" || item.status === "searching" ? (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
              </span>
              Velte hasn&apos;t checked this item yet — it&apos;s next in line.
            </div>
          ) : (
            <p className="mt-1 text-xs text-amber-600">
              Nothing suitable found yet — Velte will keep checking during the
              next update.
            </p>
          )}
        </div>
      )}
      <ImageLightbox
        images={lightboxGallery}
        open={lightboxOpen && lightboxGallery.length > 0}
        onClose={() => setLightboxOpen(false)}
        alt={lightboxCandidate ? candidateDetail(lightboxCandidate).name : ""}
      />
    </div>
  );
}

export function ShoppingPlanDetailPage({ planId }: { planId: string }) {
  const buyer = useBuyerStore((s) => s.buyer);
  const vendor = useUserStore((s) => s.user);
  const identity = buyer ?? vendor ?? null;
  const queryClient = useQueryClient();
  // null = the "All" tab. A category name once it's picked, narrowing the
  // grouped list below to that one section — the tabs are the only filter
  // mechanism; every group still renders fully expanded rather than adding
  // a second, redundant collapse toggle per section.
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["shopping-plan", planId],
    queryFn: () => fetchShoppingPlan(planId),
    enabled: Boolean(identity),
  });

  // Fetched in PARALLEL with the plan itself, on its own query — see the
  // recommendations route's own header on why this must never block or
  // slow down showing the plan's already-fresh data. `recommendations`
  // stays `undefined` (not an error) until it resolves; every read site
  // below already treats "no verdict yet" as "fall back to cheapest-first",
  // the exact same fallback a failed or empty verdict gets.
  const { data: recommendationsData } = useQuery({
    queryKey: ["shopping-plan-recommendations", planId],
    queryFn: () => fetchShoppingPlanRecommendations(planId),
    enabled: Boolean(identity),
  });
  const recommendations: ShoppingPlanRecommendations =
    recommendationsData?.recommendations ?? {};

  if (!identity) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-5 py-16 text-center">
          <PackageIllustration size={96} />
          <h1 className="text-lg font-bold text-ink">
            Sign in to see this Shopping Plan
          </h1>
          <GoogleSignInButton />
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="px-4 py-8 sm:px-6 lg:px-10 xl:px-16 2xl:px-20">
          <div className="animate-pulse space-y-4">
            <div className="h-3 w-24 rounded-full bg-gray-100" />
            <div className="h-6 w-2/3 rounded-full bg-gray-100" />
            <div className="h-4 w-1/2 rounded-full bg-gray-100" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-100" />
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { plan } = data;
  const days = daysUntil(plan.deadlineDate);
  const urgent = days <= 7;
  // A "removed" item (conversational "I don't need sportswear anymore")
  // still comes back from the API — its own history is real, paid-for
  // data the backend keeps — but it drops out of every count/render here,
  // same as it already does in the backend's own totals.
  const visibleItems = plan.items.filter((i) => !i.removed);
  const sortedItems = visibleItems
    .slice()
    .sort((a, b) => b.priority - a.priority || a.order - b.order);
  const hasRealPrices = visibleItems.some((i) => i.status === "found");
  // The detail page's OWN total, distinct from plan.estimatedTotalNaira —
  // see estimatedTotalWithRecommendations' own header for why. Recomputes
  // as `recommendations` fills in (it's `{}` until that query resolves, so
  // this starts identical to the backend's cheapest-based number and only
  // moves once a real Top pick differs from cheapest — never a jarring
  // jump on first paint).
  const estimatedTotalNaira = estimatedTotalWithRecommendations(
    visibleItems,
    recommendations,
  );
  const budgetStatus =
    plan.budgetNaira != null && hasRealPrices
      ? liveBudgetStatus(plan.budgetNaira, estimatedTotalNaira)
      : null;
  const budgetCopy = budgetStatus ? BUDGET_STATUS_COPY[budgetStatus] : null;
  const foundCount = visibleItems.filter(
    (i) => i.status === "found" || purchasedCandidateOf(i),
  ).length;
  const foundPct =
    visibleItems.length > 0 ? (foundCount / visibleItems.length) * 100 : 0;

  const groups = groupByCategory(sortedItems);
  const displayedGroups = activeCategory
    ? groups.filter((g) => g.name === activeCategory)
    : groups;

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: ["shopping-plan", planId],
    });
  }

  async function handleTogglePurchased(
    itemId: string,
    candidateId: string,
    purchased: boolean,
  ) {
    try {
      await markShoppingPlanItemPurchased(
        planId,
        itemId,
        candidateId,
        purchased,
      );
      await refresh();
    } catch {
      toast.error("Couldn't update that item — try again.");
    }
  }

  return (
    // Same reasoning as ShoppingPlansIndexPage's own wrapper: the chat
    // shell's content slot is `overflow-hidden`, so a page this size needs
    // its own scroll container or the bottom of a long item list is
    // unreachable. Full width, not centered, matching that file's own
    // padding scale exactly.
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-8 sm:px-6 lg:px-10 xl:px-16 2xl:px-20">
        {/* Hero banner — matched to the vendor dashboard's own WalletHero
            (components/wallet/redesign/WalletHero.tsx) per explicit request
            (2026-09-20), replacing the solid vivid-orange fill this went
            through a few passes earlier — see ShoppingPlansIndexPage.tsx's
            own identical hero for the fuller reasoning (same recipe:
            layered ambient glow blobs + a faint dot-grid texture on a plain
            light card, copied faithfully rather than reinvented). The
            plan's own status still gets its own pill, top-right, matching
            how the index page's plan cards already show it. */}
        <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-surface p-5 shadow-sm sm:p-6 xl:p-8">
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
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-sm shadow-orange-200 xl:h-12 xl:w-12">
                <ShoppingCartIcon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-ink sm:text-xl xl:text-2xl">
                  {plan.goalText}
                </h1>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-gray-500 sm:gap-x-4 sm:text-sm">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon size={14} />
                    Deadline{" "}
                    {toLocalMidnight(plan.deadlineDate).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" },
                    )}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-1.5",
                      urgent && plan.status === "monitoring"
                        ? "font-medium text-amber-600"
                        : undefined,
                    )}
                  >
                    {urgent && plan.status === "monitoring" ? (
                      <FlameIcon size={14} />
                    ) : (
                      <ClockIcon size={14} />
                    )}
                    {days >= 0
                      ? `${days} day${days === 1 ? "" : "s"} left`
                      : "Deadline passed"}
                  </span>
                </div>
              </div>
            </div>
            {/* Status badge + next-update, folded back onto the hero itself
                (2026-09-21, reversing the 2026-09-20 move that pulled them
                into their own bar below) — top-right, same corner the
                plan's status pill sat in before that move. "Monitoring"
                still replaces the plain status pill with the live-signal
                treatment; every other status (including "expired") keeps
                its plain PLAN_STATUS_TONE pill. Next update is dropped
                entirely once a plan is expired — there is no next check to
                report. */}
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {plan.status === "monitoring" ? (
                <span className="flex items-center gap-1.5 text-green-600">
                  <LiveSignalDot />
                  <span className="text-sm font-semibold text-ink">
                    Monitoring
                  </span>
                </span>
              ) : (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
                    PLAN_STATUS_TONE[plan.status],
                  )}
                >
                  {PLAN_STATUS_LABEL[plan.status]}
                </span>
              )}
              {plan.status !== "expired" && (
                <span className="flex items-center gap-1 text-[11px] text-gray-500">
                  <ClockIcon size={11} className="shrink-0" />
                  Next update {nextUpdateLabel(plan.nextMonitorAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats + the items-found ring, side by side from `sm` up (stacked
            on a phone, the ring centered below the tiles) — full width
            means the ring sits beside the tiles using space that would
            otherwise just be a gutter, rather than living inside the hero
            as a thin bar the way it used to. */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row xl:gap-4">
          {/* Two tiles now, not three (2026-09-20) — "Spent" dropped along
              with the "Bought this"/"Mark as purchased" CTAs, explicit
              request, since there's no UI path left to ever populate
              `spentTotalNaira`. "Selected" dropped earlier the same day
              along with `selectedTotalNaira` itself (see this file's own
              header comment) — this stat row has now lost two of its
              original four tiles to the same "no longer anything real to
              show here" reasoning. */}
          <div className="grid flex-1 grid-cols-2 gap-3 xl:gap-4">
            {plan.budgetNaira != null && (
              <StatTile
                icon={<WalletIcon size={13} />}
                iconTone="bg-orange-50 text-orange-600"
                label="Budget"
                value={fmt(plan.budgetNaira, "₦")}
              />
            )}
            <StatTile
              icon={<TrendingUpIcon size={13} />}
              iconTone="bg-blue-50 text-blue-600"
              label="Estimated"
              value={
                hasRealPrices ? fmt(estimatedTotalNaira, "₦") : "Searching…"
              }
            />
          </div>
          {visibleItems.length > 0 && (
            <div className="flex shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-surface p-3 shadow-sm sm:w-auto xl:p-4">
              <RadialGauge
                pct={foundPct}
                color="var(--color-orange-600)"
                size={80}
                stroke={7}
                centerValue={`${foundCount}/${visibleItems.length}`}
                centerLabel="found"
              />
            </div>
          )}
        </div>

        {budgetCopy && budgetStatus && plan.budgetNaira != null && (
          // Simplified to a plain banner (2026-09-20) — the big radial
          // ring that used to live here now shows item-completion instead
          // (see the stat row above), and duplicating a second ring for
          // budget in the same view read as one gauge too many. The
          // numbers are already right there in the stat tiles above; this
          // banner's only job now is the words plus the thin comparison
          // bar.
          <div className={cn("mt-4 rounded-2xl p-4 xl:p-5", budgetCopy.tone)}>
            <div className="flex items-start gap-2 text-sm">
              {budgetStatus === "within_budget" ? (
                <CheckCircleIcon size={16} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangleIcon size={16} className="mt-0.5 shrink-0" />
              )}
              <p>{budgetCopy.message(plan.budgetNaira, estimatedTotalNaira)}</p>
            </div>
            <BudgetGauge
              budgetNaira={plan.budgetNaira}
              estimateNaira={estimatedTotalNaira}
              status={budgetStatus}
            />
          </div>
        )}

        {/* Category tabs — the reference layout's own filter mechanism.
            "All" plus one per real category on the plan (see
            groupByCategory), horizontally scrollable rather than wrapped so
            a plan with many categories never breaks the row's height. */}
        {groups.length > 1 && (
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
                activeCategory === null
                  ? "bg-orange-500 text-white"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100",
              )}
            >
              All ({visibleItems.length})
            </button>
            {groups.map((g) => (
              <button
                key={g.name}
                type="button"
                onClick={() => setActiveCategory(g.name)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
                  activeCategory === g.name
                    ? "bg-orange-500 text-white"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100",
                )}
              >
                {g.name} ({g.items.length})
              </button>
            ))}
          </div>
        )}

        {/* One card per category, each holding its own item rows — full
            width, stacked, rather than the old grid of one card per ITEM.
            A category with far more content per row (candidate lists,
            expandable detail panels) reads better as a dense list than as
            tiles competing for a fixed card width. */}
        <div className="mt-6 space-y-4">
          {displayedGroups.map((group) => {
            const total = group.items.length;
            const resolved = group.foundCount + group.purchasedCount;
            const CategoryIcon = categoryIcon(group.name);
            return (
              <div
                key={group.name}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-surface shadow-sm"
              >
                {/* Given its own tinted background + bottom border
                    (2026-09-20, explicit request) — sharing the plain
                    white the item rows below it also use left it reading
                    as just the first row rather than a header FOR them.
                    The tint also carries the category's own hue at low
                    opacity, tying the header to its icon's colour rather
                    than using one flat neutral for every category. */}
                <div
                  className={cn(
                    "flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r px-3 py-3.5 sm:px-4",
                    categoryHeaderTint(group.name),
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm bg-gradient-to-br",
                      categoryGradient(group.name),
                    )}
                  >
                    <CategoryIcon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-ink">
                      {group.name}
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      {total} item{total === 1 ? "" : "s"}
                      {group.foundCount > 0
                        ? ` · ${group.foundCount} found`
                        : ""}
                      {group.purchasedCount > 0
                        ? ` · ${group.purchasedCount} purchased`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      resolved === total
                        ? "bg-green-50 text-green-600"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {resolved}/{total}
                  </span>
                </div>
                {/* Gap between items (2026-09-21, explicit request, widened
                    same day) — each ItemRow is its own bordered/rounded
                    block rather than a border-top divider running edge to
                    edge, so this space-y reads as real separation BETWEEN
                    items instead of a divider line floating in blank space.
                    Scoped to this list only — ItemComparison's own internal
                    spacing (the recommended card, alternatives, comparison
                    table) is untouched. */}
                <div className="space-y-4 p-2 sm:space-y-5 sm:p-3">
                  {group.items.map((item, i) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      index={i}
                      recommendation={recommendations[item.id] ?? null}
                      onTogglePurchased={(candidateId, purchased) =>
                        handleTogglePurchased(item.id, candidateId, purchased)
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
