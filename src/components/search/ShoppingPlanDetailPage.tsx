"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "motion/react";

import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { useNavigation } from "@/components/chat/ChatNavigationProgressContext";
import {
  fetchShoppingPlan,
  selectShoppingPlanItemCandidate,
  dismissShoppingPlanAlternative,
  markShoppingPlanItemPurchased,
} from "@/services/shoppingPlan";
import { fmt } from "@/lib/product-price";
import { cn } from "@/lib/utils";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BadgeCheckIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  ExternalLinkIcon,
  FlameIcon,
  ImageIcon,
  MapPinIcon,
  PackageIcon,
  RefreshIcon,
  ShoppingCartIcon,
  StoreIcon,
  TrendingUpIcon,
  UserIcon,
  WalletIcon,
} from "@/components/icons/hero";
import { PackageIllustration } from "@/components/icons";
import { ImageLightbox } from "@/components/ImageLightbox";
import type {
  ShoppingPlanCandidate,
  ShoppingPlanItem,
  ShoppingPlanItemStatus,
} from "@/types/shoppingPlan";

// Shopping Plan detail (2026-09-18, Phase 2 additions 2026-09-19, visual
// redesign 2026-09-19, pushed further the same day per explicit "very very
// rich" direction, candidate details + unselect added 2026-09-19) — one
// plan's full item/candidate data (spec §17). Deliberately reads the raw
// candidate `snapshot` defensively (see ShoppingPlanCandidate's own
// comment) rather than importing the full VendorMatch/StoreMatch/
// ExternalOffer types — candidateDetail() below picks out the handful of
// fields this page actually renders (name/price/image plus description,
// attributes, seller, location, an outbound link), optimistically, never
// assuming either shape has all of them.
//
// The redesign is presentational only — every query, mutation and piece of
// state below is unchanged; only the markup/styling around it got richer
// (a gradient hero banner, a radial budget gauge alongside the linear one,
// icon-circle stat tiles, candidate thumbnails, an expandable detail panel
// per candidate, a "Change selection" control once one's picked, staggered
// entrance motion). See CreditsDonut.tsx for the same card/ring visual
// language this borrows from.
//
// ShoppingCartIcon is the hero's own icon on purpose, matching
// ShoppingPlansIndexPage.tsx exactly — see that file's own comment on why
// it, not a generic sparkle/package glyph, is what "Shopping Plan" means
// everywhere else in the app (ConversationSidebar, the composer's own tool
// picker). PackageIcon stays on individual ITEM cards below — a different
// concept (one thing in the plan) from the plan/cart itself.

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

function latestPrice(candidate: ShoppingPlanCandidate): number | null {
  return candidate.priceHistory.length
    ? candidate.priceHistory[candidate.priceHistory.length - 1].priceNaira
    : null;
}

function latestAvailable(candidate: ShoppingPlanCandidate): boolean {
  return candidate.availabilityHistory.length
    ? candidate.availabilityHistory[candidate.availabilityHistory.length - 1]
        .available
    : true;
}

/** Cheapest-first, unavailable candidates dropped entirely — the buyer's
 *  own options list should never lead with an inflated or dead listing. */
function sortedAvailableCandidates(
  item: ShoppingPlanItem,
): ShoppingPlanCandidate[] {
  return item.candidates
    .filter((c) => latestAvailable(c))
    .sort(
      (a, b) => (latestPrice(a) ?? Infinity) - (latestPrice(b) ?? Infinity),
    );
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

function ItemCard({
  item,
  index,
  onSelect,
  onDismissAlternative,
  onTogglePurchased,
}: {
  item: ShoppingPlanItem;
  index: number;
  onSelect: (candidateId: string | null) => void;
  onDismissAlternative: () => void;
  onTogglePurchased: (purchased: boolean) => void;
}) {
  const selected = item.selectedCandidateId
    ? item.candidates.find((c) => c.id === item.selectedCandidateId)
    : null;
  const suggestedAlternative = item.suggestedAlternativeCandidateId
    ? item.candidates.find((c) => c.id === item.suggestedAlternativeCandidateId)
    : null;
  const available = sortedAvailableCandidates(item);
  // Which candidate's own detail panel is open — at most one at a time, so
  // opening a second collapses the first rather than stacking descriptions
  // the buyer already scrolled past. Never affects selection on its own;
  // only the panel's own "Select this option" button (or the row's
  // separate Select pill) does that.
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(
    null,
  );
  // The lightbox only ever shows the currently-expanded candidate's own
  // photos — no separate per-candidate state needed since at most one
  // panel is open at a time (see expandedCandidateId's own comment).
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const expandedCandidate = expandedCandidateId
    ? item.candidates.find((c) => c.id === expandedCandidateId)
    : null;
  const expandedGallery = expandedCandidate
    ? candidateDetail(expandedCandidate).gallery
    : [];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.25,
          delay: Math.min(index, 10) * 0.04,
          ease: "easeOut",
        }}
        className={cn(
          "rounded-2xl border bg-surface p-4 transition-colors",
          selected
            ? "border-green-100"
            : suggestedAlternative
              ? "border-orange-200"
              : "border-gray-100",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                selected
                  ? "bg-green-50 text-green-600"
                  : "bg-orange-50 text-orange-600",
              )}
            >
              <PackageIcon size={16} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {item.label}
                {item.quantity > 1 ? ` ×${item.quantity}` : ""}
              </p>
              <p className="text-xs text-gray-400">{item.category}</p>
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-1 text-[11px] font-medium",
              ITEM_STATUS_TONE[item.status],
            )}
          >
            {ITEM_STATUS_LABEL[item.status]}
          </span>
        </div>

        {/* Suggested alternative (spec §20) — always shown ahead of the
          ordinary selected/options states, since it's the one thing on
          this item actively awaiting the buyer's decision. */}
        {suggestedAlternative && (
          <div className="mt-3 overflow-hidden rounded-xl border border-orange-200 bg-orange-50/60 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700">
              <RefreshIcon size={13} />
              Your selection is no longer available — suggested replacement
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <CandidateThumb
                image={candidateDetail(suggestedAlternative).image}
                size={36}
              />
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                {candidateDetail(suggestedAlternative).name}
                {latestPrice(suggestedAlternative) != null
                  ? ` — ${fmt(latestPrice(suggestedAlternative)!, "₦")}`
                  : ""}
              </p>
            </div>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => onSelect(suggestedAlternative.id)}
                className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-600 transition-colors cursor-pointer"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={onDismissAlternative}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {selected ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2.5 rounded-xl bg-green-50 px-3 py-2">
              <CandidateThumb
                image={candidateDetail(selected).image}
                size={32}
              />
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-green-700">
                {candidateDetail(selected).name}
                {latestPrice(selected) != null
                  ? ` — ${fmt(latestPrice(selected)!, "₦")}`
                  : ""}
              </p>
              <CheckCircleIcon size={16} className="shrink-0 text-green-600" />
            </div>
            {/* Reverts selectedCandidateId to null (the same call the
              backend already uses to let the buyer swap candidates —
              select.ts's own `candidateId` is nullable) — hidden once
              purchased, since selectItemCandidate clears purchased/
              purchasedPriceNaira on ANY selection change, and silently
              wiping a real "bought" record needs the deliberate "Undo"
              step first, not a stray tap here. */}
            {!item.purchased && (
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="text-[11px] font-medium text-gray-400 hover:text-orange-600 transition-colors cursor-pointer"
              >
                Change selection
              </button>
            )}
            {item.purchased ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  <BadgeCheckIcon size={14} className="text-green-600" />
                  Purchased
                  {item.purchasedPriceNaira != null
                    ? ` — ${fmt(item.purchasedPriceNaira, "₦")}`
                    : ""}
                </span>
                <button
                  type="button"
                  onClick={() => onTogglePurchased(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  Undo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onTogglePurchased(true)}
                className="w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:border-orange-200 hover:bg-orange-50/40 hover:text-orange-600 transition-colors cursor-pointer"
              >
                Mark as purchased
              </button>
            )}
          </div>
        ) : available.length > 0 ? (
          <div className="mt-3 space-y-1.5">
            {available.slice(0, 3).map((candidate) => {
              const price = latestPrice(candidate);
              const detail = candidateDetail(candidate);
              const isExpanded = expandedCandidateId === candidate.id;
              return (
                <div
                  key={candidate.id}
                  className="overflow-hidden rounded-xl border border-gray-100"
                >
                  <div className="flex items-center gap-1.5 py-1 pr-1.5 pl-2.5">
                    {/* Tapping the row itself opens details WITHOUT
                      selecting — "view more before selecting" — the
                      separate Select pill on the right is the one-tap fast
                      path for a buyer who already knows they want it. */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCandidateId(isExpanded ? null : candidate.id)
                      }
                      className="flex min-w-0 flex-1 items-center gap-2.5 py-1 text-left text-xs hover:text-orange-700 transition-colors cursor-pointer"
                    >
                      <CandidateThumb image={detail.image} size={30} />
                      <span className="min-w-0 flex-1 truncate text-gray-700">
                        {detail.name}
                      </span>
                      {detail.quoteOnRequest ? (
                        <span className="shrink-0 text-[11px] text-gray-400">
                          Ask for price
                        </span>
                      ) : (
                        price != null && (
                          <span className="shrink-0 font-semibold text-ink">
                            {fmt(price, "₦")}
                          </span>
                        )
                      )}
                      <ChevronDownIcon
                        size={13}
                        className={cn(
                          "shrink-0 text-gray-300 transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelect(candidate.id)}
                      className="shrink-0 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-orange-600 transition-colors cursor-pointer"
                    >
                      Select
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-2 border-t border-gray-100 bg-gray-50/60 px-3 py-2.5">
                      {/* A real look at the thing, not just the 30px row
                        thumbnail — tapping it opens ImageLightbox's own
                        full-screen, centered view (with its own gallery/
                        arrows if the source published more than one
                        photo). Same component the rest of the app already
                        uses for "tap a product photo to see it big". */}
                      {detail.gallery.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setLightboxOpen(true)}
                          aria-label={`View ${detail.gallery.length > 1 ? "photos" : "photo"} of ${detail.name}`}
                          className="block h-32 w-full overflow-hidden rounded-lg bg-gray-100 sm:h-40 cursor-zoom-in"
                        >
                          {/* Same arbitrary-merchant-hosted-URL tradeoff as
                            CandidateThumb just below. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={detail.image ?? detail.gallery[0]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </button>
                      )}
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
                      <div className="flex items-center gap-3 pt-0.5">
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
                        <button
                          type="button"
                          onClick={() => onSelect(candidate.id)}
                          className="ml-auto rounded-full bg-orange-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-orange-600 transition-colors cursor-pointer"
                        >
                          Select this option
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : item.status === "pending" || item.status === "searching" ? (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </span>
            Velte hasn&apos;t checked this item yet — it&apos;s next in line.
          </div>
        ) : (
          <p className="mt-3 text-xs text-amber-600">
            Nothing suitable found yet — Velte will keep checking during the
            next update.
          </p>
        )}
      </motion.div>
      <ImageLightbox
        images={expandedGallery}
        open={lightboxOpen && expandedGallery.length > 0}
        onClose={() => setLightboxOpen(false)}
        alt={expandedCandidate ? candidateDetail(expandedCandidate).name : ""}
      />
    </>
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
    <div className="rounded-xl border border-gray-100 bg-surface p-3">
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg",
          iconTone,
        )}
      >
        {icon}
      </span>
      <p className="mt-2 text-[11px] font-medium text-gray-400">{label}</p>
      <p className={cn("text-sm font-semibold", tone)}>{value}</p>
    </div>
  );
}

// A compact radial gauge — the centerpiece of the hero's own budget story,
// same ring language as credits/CreditsDonut.tsx (this codebase's own
// established "how much of a limit" visual), scaled down and recoloured per
// liveBudgetStatus instead of the fixed orange that meter always uses.
// Capped visually at 100% even once the buyer is genuinely over budget —
// the ring communicates "how full", the colour (and budgetCopy's own words)
// communicate "and that's a problem now".
const GAUGE_SIZE = 96;
const GAUGE_STROKE = 9;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2 - 1;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

const BUDGET_STATUS_RING_COLOR: Record<string, string> = {
  within_budget: "#16a34a",
  slightly_over_budget: "#d97706",
  significantly_over_budget: "#dc2626",
};

function RadialBudgetGauge({
  budgetNaira,
  estimateNaira,
  status,
}: {
  budgetNaira: number;
  estimateNaira: number;
  status: keyof typeof BUDGET_STATUS_COPY;
}) {
  const ratio = budgetNaira > 0 ? estimateNaira / budgetNaira : 0;
  const pct = Math.round(ratio * 100);
  const fraction = Math.max(0, Math.min(1, ratio));
  const dash = GAUGE_CIRCUMFERENCE * fraction;
  return (
    <div
      className="relative shrink-0"
      style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}
    >
      <svg
        width={GAUGE_SIZE}
        height={GAUGE_SIZE}
        viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
        role="img"
        aria-label={`${pct}% of budget accounted for so far`}
        className="-rotate-90"
      >
        <circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={GAUGE_STROKE}
        />
        {fraction > 0 && (
          <circle
            cx={GAUGE_SIZE / 2}
            cy={GAUGE_SIZE / 2}
            r={GAUGE_RADIUS}
            fill="none"
            stroke={BUDGET_STATUS_RING_COLOR[status]}
            strokeWidth={GAUGE_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${GAUGE_CIRCUMFERENCE - dash}`}
            className="transition-[stroke-dasharray] duration-500 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-semibold text-ink">{pct}%</span>
        <span className="text-[9px] font-medium tracking-wide text-gray-400 uppercase">
          of budget
        </span>
      </div>
    </div>
  );
}

export function ShoppingPlanDetailPage({ planId }: { planId: string }) {
  const buyer = useBuyerStore((s) => s.buyer);
  const vendor = useUserStore((s) => s.user);
  const identity = buyer ?? vendor ?? null;
  const queryClient = useQueryClient();
  const { navigate } = useNavigation();

  const { data, isLoading } = useQuery({
    queryKey: ["shopping-plan", planId],
    queryFn: () => fetchShoppingPlan(planId),
    enabled: Boolean(identity),
  });

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
        <div className="px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
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
  const hasRealPrices = visibleItems.some((i) => i.status === "found");
  const budgetStatus =
    plan.budgetNaira != null && hasRealPrices
      ? liveBudgetStatus(plan.budgetNaira, plan.estimatedTotalNaira)
      : null;
  const budgetCopy = budgetStatus ? BUDGET_STATUS_COPY[budgetStatus] : null;
  const foundCount = visibleItems.filter(
    (i) => i.status === "found" || i.selectedCandidateId,
  ).length;
  const needingAttention = visibleItems.filter(
    (i) => !i.selectedCandidateId,
  ).length;

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: ["shopping-plan", planId],
    });
  }

  async function handleSelect(itemId: string, candidateId: string | null) {
    try {
      await selectShoppingPlanItemCandidate(planId, itemId, candidateId);
      await refresh();
    } catch {
      toast.error("Couldn't save that selection — try again.");
    }
  }

  async function handleDismissAlternative(itemId: string) {
    try {
      await dismissShoppingPlanAlternative(planId, itemId);
      await refresh();
    } catch {
      toast.error("Couldn't dismiss that suggestion — try again.");
    }
  }

  async function handleTogglePurchased(itemId: string, purchased: boolean) {
    try {
      await markShoppingPlanItemPurchased(planId, itemId, purchased);
      await refresh();
    } catch {
      toast.error("Couldn't update that item — try again.");
    }
  }

  return (
    // Same reasoning as ShoppingPlansIndexPage's own wrapper: the chat
    // shell's content slot is `overflow-hidden`, so a page this size needs
    // its own scroll container or the bottom of a long item list is
    // unreachable (found live, 2026-09-19). Full width, not centered
    // (2026-09-19, explicit request) — same reasoning as that file's own
    // matching wrapper.
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
        <button
          type="button"
          onClick={() => navigate("/chat/shopping-plan")}
          className="group flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-orange-600 transition-colors cursor-pointer"
        >
          <ArrowLeftIcon
            size={13}
            className="transition-transform group-hover:-translate-x-0.5"
          />
          Shopping Plans
        </button>

        {/* Hero banner — same gradient-wash treatment as
            ShoppingPlansIndexPage.tsx's own header, and the same
            ShoppingCartIcon badge, so opening a plan feels like a
            continuation of the list it came from rather than a new page
            with its own visual identity. */}
        <div className="relative mt-3 overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-surface to-surface p-5 sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-orange-200/30 blur-3xl"
          />
          <div className="relative flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
              <ShoppingCartIcon size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-ink sm:text-xl">
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
                  {plan.status === "monitoring"
                    ? days >= 0
                      ? `${days} day${days === 1 ? "" : "s"} left · monitoring`
                      : "Deadline passed"
                    : plan.status}
                </span>
              </div>
            </div>
          </div>

          {/* Item-completion progress — a quiet at-a-glance summary inside
              the hero, echoing the index page's own per-plan bar. */}
          <div className="relative mt-6">
            <div className="flex items-center justify-between text-xs font-medium text-gray-400">
              <span>
                {foundCount}/{visibleItems.length} items have suitable options
              </span>
              {visibleItems.length > 0 && (
                <span>
                  {Math.round((foundCount / visibleItems.length) * 100)}%
                </span>
              )}
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-[width] duration-500 ease-out"
                style={{
                  width: `${visibleItems.length > 0 ? Math.min(100, (foundCount / visibleItems.length) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              hasRealPrices ? fmt(plan.estimatedTotalNaira, "₦") : "Searching…"
            }
          />
          <StatTile
            icon={<BadgeCheckIcon size={13} />}
            iconTone="bg-purple-50 text-purple-600"
            label="Selected"
            value={fmt(plan.selectedTotalNaira, "₦")}
            tone={plan.selectedTotalNaira > 0 ? "text-green-600" : "text-ink"}
          />
          <StatTile
            icon={<CheckCircleIcon size={13} />}
            iconTone="bg-green-50 text-green-600"
            label="Spent"
            value={fmt(plan.spentTotalNaira, "₦")}
            tone={plan.spentTotalNaira > 0 ? "text-green-600" : "text-ink"}
          />
        </div>

        {budgetCopy && budgetStatus && plan.budgetNaira != null && (
          // Stacked (gauge above text, both centered) below `sm`, side by
          // side above it — a fixed 96px ring plus `gap-4` left almost no
          // room for the message at phone widths and forced it into a
          // cramped, badly-wrapped column (found live, 2026-09-19).
          <div
            className={cn(
              "mt-4 flex flex-col items-center gap-3 rounded-2xl p-4 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left",
              budgetCopy.tone,
            )}
          >
            <RadialBudgetGauge
              budgetNaira={plan.budgetNaira}
              estimateNaira={plan.estimatedTotalNaira}
              status={budgetStatus}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2 text-left text-xs">
                {budgetStatus === "within_budget" ? (
                  <CheckCircleIcon size={15} className="mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangleIcon size={15} className="mt-0.5 shrink-0" />
                )}
                <p>
                  {budgetCopy.message(
                    plan.budgetNaira,
                    plan.estimatedTotalNaira,
                  )}
                </p>
              </div>
              <BudgetGauge
                budgetNaira={plan.budgetNaira}
                estimateNaira={plan.estimatedTotalNaira}
                status={budgetStatus}
              />
            </div>
          </div>
        )}

        {urgent && plan.status === "monitoring" && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            <FlameIcon size={15} className="mt-0.5 shrink-0" />
            <p>
              Your deadline is in {days} day{days === 1 ? "" : "s"}.{" "}
              {needingAttention} item{needingAttention === 1 ? "" : "s"} still
              need attention — Velte has prioritized currently available options
              for them.
            </p>
          </div>
        )}

        {/* A two-column grid at wider breakpoints, same reasoning as
            ShoppingPlansIndexPage.tsx's own plan grid — full width
            (2026-09-19) means a single stretched column of item cards would
            waste the space a desktop viewport actually has. */}
        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visibleItems
            .slice()
            .sort((a, b) => b.priority - a.priority || a.order - b.order)
            .map((item, i) => (
              <ItemCard
                key={item.id}
                item={item}
                index={i}
                onSelect={(candidateId) => handleSelect(item.id, candidateId)}
                onDismissAlternative={() => handleDismissAlternative(item.id)}
                onTogglePurchased={(purchased) =>
                  handleTogglePurchased(item.id, purchased)
                }
              />
            ))}
        </div>
      </div>
    </div>
  );
}
