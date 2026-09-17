"use client";

import { useQuery } from "@tanstack/react-query";

import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { useNavigation } from "@/components/chat/ChatNavigationProgressContext";
import { CardCarousel } from "@/components/search/CardCarousel";
import { VendorResultCard } from "@/components/search/VendorResultCard";
import { ExternalOfferCard } from "@/components/search/ExternalOfferCard";
import {
  RecommendationPicks,
  pickBadgesFor,
} from "@/components/search/RecommendationPicks";
import { ShoppingListStatusPill } from "@/components/search/ShoppingListStatus";
import { fetchShoppingListJob } from "@/services/shoppingList";
import { fmt } from "@/lib/product-price";
import { cn } from "@/lib/utils";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  LoaderIcon,
  TagIcon,
} from "@/components/icons/hero";
import { PackageIllustration } from "@/components/icons";
import type {
  ShoppingListJob,
  ShoppingListJobItem,
} from "@/types/shoppingList";

// Shopping Lists (2026-09-12) — where a completed background job's results
// actually render (reached via the notification/toast "View" CTA, or the
// summary line appended back into the original conversation — see
// notify-complete/route.ts). The RESULTS themselves still only ever render
// here, never inline in the conversation: this page has no dependency on
// staffly-ai-backend or the buyer still having that thread open, and works
// for as long as the job document exists. The conversation only ever gets a
// short summary pointing here, not the vendor/offer data itself.
//
// Reuses the EXISTING result-card components verbatim (VendorResultCard,
// ExternalOfferCard, CardCarousel, RecommendationPicks) — confirmed
// standalone-callable outside the live search-turn machinery, driven here
// entirely by the job's own already-fetched, already-persisted results.
//
// Redesigned again 2026-09-12 (v2), alongside the index page's own tile-grid
// redesign — a header that matches it (back breadcrumb, status pill from the
// now-shared ShoppingListStatus.tsx, stat tiles, a progress bar instead of
// only a sentence), each item in its own card with a small status badge
// instead of a bare heading, and full width like every other sidebar-menu
// page.

const RUNNING_STATUSES = new Set(["queued", "running"]);

function itemStatusLine(status: string): string {
  switch (status) {
    case "no_match":
      return "Nothing matched this one — worth widening the details and asking again.";
    case "failed":
      return "Couldn't check this one after a few tries — try asking about it directly.";
    default:
      return "Still checking this one…";
  }
}

/** Per-ITEM status badge — a different, smaller vocabulary from the job-level
 *  ShoppingListStatusPill (found/no-match/failed/still-checking, not
 *  searching/complete/selected), so kept local rather than folded into that
 *  shared module. */
function ItemStatusBadge({
  status,
}: {
  status: ShoppingListJobItem["status"];
}) {
  if (status === "found_velte" || status === "found_external") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        <CheckCircleIcon size={12} />
        Found
      </span>
    );
  }
  if (status === "no_match") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
        <AlertTriangleIcon size={12} />
        No match
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
        <AlertTriangleIcon size={12} />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
      <LoaderIcon size={12} className="animate-spin" />
      Checking
    </span>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-surface px-4 py-3">
      <p
        className={cn(
          "text-xl font-bold",
          accent ? "text-orange-600" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-gray-400">{label}</p>
    </div>
  );
}

function ShoppingListResults({ initialJob }: { initialJob: ShoppingListJob }) {
  // Polls only while the job is still going — a buyer who follows the
  // "View" link before the background sweep has fully finished (or opens
  // it again mid-run out of curiosity) sees it fill in live rather than a
  // frozen partial snapshot; stops the moment a terminal status lands.
  const { data } = useQuery({
    queryKey: ["shopping-list", initialJob.id],
    queryFn: () => fetchShoppingListJob(initialJob.id),
    initialData: { job: initialJob },
    refetchInterval: (query) =>
      RUNNING_STATUSES.has(query.state.data?.job.status ?? "") ? 5000 : false,
  });
  const activeJob = data?.job ?? initialJob;

  const foundItems = activeJob.items.filter(
    (i) => i.status === "found_velte" || i.status === "found_external",
  );
  const stillRunning = RUNNING_STATUSES.has(activeJob.status);
  const pickedCount = activeJob.items.filter((i) => i.recommendation).length;
  const progress =
    activeJob.totalItems > 0
      ? activeJob.nextItemIndex / activeJob.totalItems
      : 0;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-gray-100 bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-ink">{activeJob.goalText}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1">
                <TagIcon size={12} />
                {activeJob.totalItems} item
                {activeJob.totalItems === 1 ? "" : "s"}
              </span>
              {activeJob.budgetNaira != null && (
                <span className="font-medium text-gray-500">
                  Budget {fmt(activeJob.budgetNaira, "₦")}
                </span>
              )}
            </div>
          </div>
          <ShoppingListStatusPill
            status={activeJob.status}
            selectedCount={pickedCount}
          />
        </div>

        {stillRunning && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-amber-400 transition-[width] duration-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Still working through it — {activeJob.nextItemIndex} of{" "}
              {activeJob.totalItems} items checked so far.
            </p>
          </div>
        )}

        {!stillRunning && (
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            {foundItems.length > 0
              ? `Found options for ${foundItems.length} of ${activeJob.totalItems} items. I checked Velte vendors first and explored other sources where needed — here they are, grouped by item.`
              : "Nothing matched this time — here's what was checked for each item."}
          </p>
        )}

        {!stillRunning && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatTile label="Total items" value={activeJob.totalItems} />
            <StatTile label="Found" value={foundItems.length} accent />
            <StatTile label="Selected" value={pickedCount} />
          </div>
        )}
      </div>

      <div className="space-y-4">
        {[...activeJob.items]
          .sort((a, b) => a.order - b.order)
          .map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-100 bg-surface p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="min-w-0 truncate text-sm font-semibold text-ink">
                  {item.label}
                </h2>
                <ItemStatusBadge status={item.status} />
              </div>
              {item.status === "found_velte" ||
              item.status === "found_external" ? (
                <div className="space-y-3" data-results-group>
                  {item.recommendation &&
                    (item.status === "found_velte" ? (
                      <RecommendationPicks
                        recommendation={item.recommendation}
                        products={item.velteResults}
                      />
                    ) : (
                      <RecommendationPicks
                        recommendation={item.recommendation}
                        products={[]}
                        offers={item.externalOffers}
                        valueLabel="Best price"
                      />
                    ))}
                  {item.status === "found_velte" ? (
                    <CardCarousel
                      items={item.velteResults}
                      getKey={(m) => m.productId}
                      renderItem={(m) => (
                        <VendorResultCard
                          match={m}
                          pickBadges={pickBadgesFor(
                            m.productId,
                            item.recommendation,
                          )}
                        />
                      )}
                    />
                  ) : (
                    <CardCarousel
                      items={item.externalOffers}
                      getKey={(o) => o.id}
                      renderItem={(o) => <ExternalOfferCard offer={o} />}
                    />
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  {itemStatusLine(item.status)}
                </p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

export function ShoppingListResultsPage({ jobId }: { jobId: string }) {
  const buyer = useBuyerStore((s) => s.buyer);
  // See ShoppingListsIndexPage's own comment — Shopping Lists ownership
  // widened 2026-09-17 to buyer OR vendor.
  const vendor = useUserStore((s) => s.user);
  const identity = buyer ?? vendor ?? null;
  const { navigate } = useNavigation();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["shopping-list", jobId],
    queryFn: () => fetchShoppingListJob(jobId),
    enabled: Boolean(identity),
  });

  // Same shell rule every /chat sub-page follows (see RequestsPage's own
  // comment) — chat/layout.tsx is overflow-hidden, so a page with no
  // scroller of its own gets clipped at the fold.
  if (!identity) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-lg font-bold text-ink">
            Sign in to see this shopping list
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Your shopping lists and their results are tied to your account.
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
      {/* Full width, not centered — matches the index page and every other
          sidebar-menu page (Notifications, Your requests). */}
      <div className="px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
        {/* Back breadcrumb — a navigate() button (the navbar's own
            prefetch-then-push convention), not a plain Link, since this
            inner page sits a level below the sidebar's own "Shopping
            Lists" row and that row's active-state check doesn't light up
            on a job-detail URL. */}
        <button
          type="button"
          onClick={() => navigate("/chat/shopping-list")}
          className="mb-4 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-gray-500 transition-colors hover:text-orange-600"
        >
          <ChevronLeftIcon size={14} />
          My Shopping Lists
        </button>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />
            <div className="h-40 animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />
            <div className="h-40 animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />
          </div>
        ) : isError || !data?.job ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <PackageIllustration size={56} className="mx-auto" />
            <p className="mt-4 text-sm font-semibold text-ink">
              Couldn&apos;t find that shopping list
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-gray-500">
              It may have been removed, or the link is off.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-5 cursor-pointer text-sm font-semibold text-orange-600 transition-colors hover:text-orange-700"
            >
              Try again
            </button>
          </div>
        ) : (
          <ShoppingListResults initialJob={data.job} />
        )}
      </div>
    </div>
  );
}
