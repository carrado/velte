"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { useNavigation } from "@/components/chat/ChatNavigationProgressContext";
import { fetchShoppingListJobs } from "@/services/shoppingList";
import { fmt } from "@/lib/product-price";
import { cn } from "@/lib/utils";
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  SearchIcon,
  ShoppingCartIcon,
  TagIcon,
} from "@/components/icons/hero";
// Own illustration, distinct from RequestsPage's ClipboardListIllustration —
// same duotone set, per that file's own precedent for buyer-empty-states.
import { PackageIllustration } from "@/components/icons";
import {
  ShoppingListStatusPill,
  toneForShoppingList,
} from "@/components/search/ShoppingListStatus";
import type { ShoppingListJobSummary } from "@/types/shoppingList";

// "My Shopping Lists" (spec §20) — every background search job a buyer has
// ever started ("Get these items"), newest first. A list GENERATED but
// never started (the draft card still sitting in a chat turn, jobId null)
// has no row here — the only thing this codebase persists past the chat
// turn itself is a started job (see ShoppingListSnapshot's own comment in
// types/search.ts). That's a real, known gap, not an oversight: fixing it
// would mean persisting an un-started draft somewhere of its own, which
// nothing has asked for yet.
//
// Redesigned again 2026-09-12 (v2) — a full-width TILE GRID instead of the
// first redesign's single stacked column of rows: full width with only one
// narrow column per row just leaves the right two-thirds of a desktop
// screen empty, and a project ("furnish my apartment", "stock the kiosk")
// reads better as a card you scan a grid of than a line in a list. The
// status-pill logic itself now lives in ShoppingListStatus.tsx, shared with
// the per-job inner page, so the same job never reads two different colours
// on two different screens.

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
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

function ShoppingListTile({ job }: { job: ShoppingListJobSummary }) {
  const tone = toneForShoppingList(job.status, job.selectedCount);
  const created = new Date(job.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const running = job.status === "queued" || job.status === "running";
  const progress = job.totalItems > 0 ? job.foundCount / job.totalItems : 0;
  const { navigate } = useNavigation();

  return (
    // A button, not a Link (matches the sidebar's own MenuRow convention,
    // and NotificationsPage's NotificationRow) — navigate() prefetches the
    // job detail page before pushing, so it lands already rendered instead
    // of showing its own loading state a beat after arriving.
    <button
      type="button"
      onClick={() => navigate(`/chat/shopping-list/${job.id}`)}
      className="group flex h-full flex-col gap-3 rounded-2xl border border-gray-100 bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
            tone === "searching"
              ? "bg-amber-50 text-amber-600"
              : tone === "failed"
                ? "bg-red-50 text-red-500"
                : "bg-orange-50 text-orange-600 group-hover:bg-orange-100",
          )}
        >
          {tone === "selected" ? (
            <CheckCircleIcon size={20} />
          ) : (
            // The same ShoppingCartIcon the sidebar's own "Shopping Lists"
            // menu row uses (2026-09-12) — was PackageIcon (Heroicons'
            // CubeIcon, which reads as a hexagon outline) for every
            // non-selected tone; one consistent glyph for the whole
            // feature instead of two competing ones.
            <ShoppingCartIcon size={20} />
          )}
        </span>
        <ShoppingListStatusPill
          status={job.status}
          selectedCount={job.selectedCount}
        />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-ink transition-colors group-hover:text-orange-600">
          {job.goalText}
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
          <span className="inline-flex items-center gap-1">
            <ClockIcon size={12} />
            {created}
          </span>
          <span className="inline-flex items-center gap-1">
            <TagIcon size={12} />
            {job.totalItems} item{job.totalItems === 1 ? "" : "s"}
          </span>
        </div>

        {job.budgetNaira != null && (
          <p className="mt-2 text-xs font-medium text-gray-500">
            Budget{" "}
            <span className="font-semibold text-ink">
              {fmt(job.budgetNaira, "₦")}
            </span>
          </p>
        )}
      </div>

      {running ? (
        <div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-amber-400 transition-[width] duration-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            {job.foundCount} of {job.totalItems} checked so far
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t border-gray-50 pt-2.5 text-xs font-semibold text-gray-400 transition-colors group-hover:text-orange-600">
          <span>
            {job.categoryCount} categor{job.categoryCount === 1 ? "y" : "ies"}
          </span>
          <span className="inline-flex items-center gap-0.5">
            View list
            <ChevronRightIcon
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </div>
      )}
    </button>
  );
}

type FilterId = "all" | "searching" | "complete";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "searching", label: "Searching" },
  { id: "complete", label: "Complete" },
];

function matchesFilter(job: ShoppingListJobSummary, filter: FilterId): boolean {
  switch (filter) {
    case "searching":
      return job.status === "queued" || job.status === "running";
    case "complete":
      return job.status === "completed" || job.status === "completed_partial";
    default:
      return true;
  }
}

export function ShoppingListsIndexPage() {
  const buyer = useBuyerStore((s) => s.buyer);
  // A vendor with no linked buyer account is a real, signed-in owner of
  // their own shopping lists too (2026-09-17 — velte-backend's
  // ShoppingListJob widened the same way; see its own model comment).
  // Explicit product direction: "what buyer can do, vendor can do".
  const vendor = useUserStore((s) => s.user);
  const identity = buyer ?? vendor ?? null;
  const { navigate } = useNavigation();
  const [filter, setFilter] = useState<FilterId>("all");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["shopping-list", "mine"],
    queryFn: fetchShoppingListJobs,
    enabled: Boolean(identity),
    staleTime: 30_000,
  });

  const jobs = useMemo(() => data?.jobs ?? [], [data]);
  const stats = useMemo(
    () => ({
      total: jobs.length,
      searching: jobs.filter((j) => matchesFilter(j, "searching")).length,
      complete: jobs.filter((j) => matchesFilter(j, "complete")).length,
    }),
    [jobs],
  );

  // Same shell rule every /chat sub-page follows — chat/layout.tsx is
  // overflow-hidden, so a page with no scroller of its own gets clipped.
  if (!identity) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <PackageIllustration size={64} className="mx-auto" />
          <h1 className="mt-4 text-lg font-bold text-ink">
            Sign in to see your shopping lists
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Every shopping project you start with Velte is saved here.
          </p>
          <div className="mt-6 flex justify-center">
            <GoogleSignInButton />
          </div>
        </div>
      </div>
    );
  }

  const visible = jobs.filter((j) => matchesFilter(j, filter));

  return (
    <div className="h-full overflow-y-auto">
      {/* Full width, not centered — this and Notifications/Your requests are
          the pages reached from the sidebar menu rather than the narrow
          chat thread, so there's no reason to cap them to reading width. */}
      <div className="px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-ink">My Shopping Lists</h1>
          <p className="mt-1 text-sm text-gray-500">
            Every project you asked Velte to shop for, and how it went.
          </p>
        </header>

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
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
              Couldn&apos;t load your shopping lists just now.
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

        {!isLoading && !isError && jobs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <PackageIllustration size={56} className="mx-auto" />
            <p className="mt-4 text-sm font-semibold text-ink">
              No shopping lists yet
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-gray-500">
              Describe a project in chat — like &quot;furnish my apartment&quot;
              — and tap Get these items once Velte builds your list.
            </p>
            <button
              type="button"
              onClick={() => navigate("/chat")}
              className="mt-5 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              <SearchIcon size={14} />
              Start a search
            </button>
          </div>
        )}

        {jobs.length > 0 && (
          <>
            <div className="mb-5 grid grid-cols-3 gap-2">
              <StatTile label="Total lists" value={stats.total} />
              <StatTile label="Searching" value={stats.searching} />
              <StatTile label="Complete" value={stats.complete} accent />
            </div>

            {/* Only once there is enough to sort through — three tabs over
                two lists is furniture, not navigation. */}
            {jobs.length > 2 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {FILTERS.map((tab) => {
                  const count = jobs.filter((j) =>
                    matchesFilter(j, tab.id),
                  ).length;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className={cn(
                        "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        filter === tab.id
                          ? "border-orange-200 bg-orange-50 text-orange-700"
                          : "border-gray-200 bg-surface text-gray-500 hover:bg-gray-50",
                      )}
                    >
                      {tab.label}
                      <span className="ml-1.5 text-gray-400">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {visible.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                Nothing here under that filter.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((job) => (
                  <ShoppingListTile key={job.id} job={job} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
