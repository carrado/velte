"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  BarChartIcon,
  CheckIcon,
  CloseIcon,
  ContactIcon,
  CrownIcon,
  HeadphonesIcon,
  ImageIcon,
  InfoIcon,
  LockIcon,
  MegaphoneIcon,
  SendIcon,
  StarIcon,
  TrendingUpIcon,
  ZapIcon,
} from "@/components/icons";
import type { IconComponent } from "@/types/common";
import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchHubAdverts,
  fetchHubContext,
  fetchHubHome,
  hubPageQueryOptions,
} from "@/services/hub";
import { modalScrimClass } from "@/lib/modalScrim";
import { HubLockedModal } from "./HubLockedModal";
import { SECTOR_BY_VALUE } from "@/lib/sectors";
import { cn, formatNaira, isNewListing, timeAgo } from "@/lib/utils";
import type {
  HubFeaturedVendor,
  HubHome,
  HubTimelineItem,
  HubTimelineKind,
  HubWindow,
} from "@/types/hub";
import { CardCarousel } from "@/components/search/CardCarousel";
import { ListingDetailModal } from "@/components/ListingDetailModal";
import { buildChatLink } from "@/lib/chatLink";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import { HubHero } from "./HubHero";
import { HubBroadcastComposer } from "./HubBroadcastComposer";

type Sheet = "card" | "poster" | "advert" | "broadcast" | "boost" | null;
type TimelineFilter = "all" | HubTimelineKind | "recent";

const ENTERPRISE_LOCKS = {
  advert: {
    title: "Place Advert is on Enterprise",
    body: "An advert stays at the top of the Hub, and it is labelled as sponsored. Enterprise places one at a subsidised rate.",
  },
  analytics: {
    title: "Insights are on Enterprise",
    body: "Your storefront counts stay on this page. Business insights and vendor leaderboards are on Enterprise.",
  },
} as const;

const ACTIONS: {
  sheet: Exclude<Sheet, null>;
  label: string;
  hint: string;
  icon: IconComponent;
  badge?: "sponsored" | "special";
  /** Enterprise only. A Basic vendor sees the control and gets the lock. */
  enterpriseOnly?: boolean;
}[] = [
  {
    sheet: "card",
    label: "Contact Card",
    hint: "Edit your store card",
    icon: ContactIcon,
  },
  {
    sheet: "poster",
    label: "Create Poster",
    hint: "Artwork / listing photo / AI",
    icon: ImageIcon,
  },
  {
    sheet: "advert",
    label: "Place Advert",
    hint: "New creative. Top of Hub.",
    icon: MegaphoneIcon,
    badge: "sponsored",
  },
  {
    sheet: "broadcast",
    label: "Broadcast",
    hint: "Reach people who are online",
    icon: SendIcon,
  },
  {
    sheet: "boost",
    label: "Boost / Promote",
    hint: "Sponsor an existing listing",
    icon: ZapIcon,
    badge: "special",
  },
];

function sectorLabel(value: string) {
  return SECTOR_BY_VALUE[value]?.label ?? value.replace(/_/g, " ");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "V";
}

function deltaLabel(window: HubWindow) {
  if (window.previous === 0) return window.current > 0 ? "New" : null;
  const pct = Math.round(
    ((window.current - window.previous) / window.previous) * 100,
  );
  return { pct, up: pct >= 0 };
}

function Delta({ window }: { window: HubWindow }) {
  const label = deltaLabel(window);
  if (!label) return null;
  if (label === "New") {
    return <span className="text-xs font-semibold text-orange-600">New</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        label.up ? "text-orange-600" : "text-red-500",
      )}
    >
      <TrendingUpIcon size={12} className={label.up ? "" : "rotate-180"} />
      {Math.abs(label.pct)}%
    </span>
  );
}

function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src: string | null;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={cn("object-cover bg-gray-100", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center bg-orange-100 text-orange-700 font-bold",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function HubDashboard({
  scope,
  userId: userIdProp,
  onAuthClose,
}: {
  /** Vendor shell. The shared /hub page passes the signed-in vendor id
   *  because the path is /hub, not /{userId}/hub. */
  scope?: "vendor";
  userId?: string;
  onAuthClose?: () => void;
}) {
  const pathname = usePathname();
  const { navigate } = useNavigation();
  const pathId = pathname.split("/").filter(Boolean)[0] ?? "";
  const userId = userIdProp || (pathId === "hub" ? "" : pathId);
  const walletHref = "/wallet";
  const storeHref = "/store";

  const queryClient = useQueryClient();
  const vendorScope = scope === "vendor";
  const homeQuery = useQuery({
    queryKey: queryKeys.hub.home(vendorScope ? "vendor" : "open"),
    queryFn: () => fetchHubHome(scope),
    ...hubPageQueryOptions,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 401) && failureCount < 1,
  });
  const contextQuery = useQuery({
    queryKey: queryKeys.hub.context,
    queryFn: fetchHubContext,
    enabled: vendorScope,
    ...hubPageQueryOptions,
  });
  const advertsQuery = useQuery({
    queryKey: queryKeys.hub.adverts,
    queryFn: fetchHubAdverts,
    enabled: vendorScope,
    ...hubPageQueryOptions,
  });
  const home = homeQuery.data ?? null;
  const context = contextQuery.data ?? null;
  const adverts = advertsQuery.data ?? [];
  const loading =
    homeQuery.isPending ||
    (vendorScope && (contextQuery.isPending || advertsQuery.isPending));
  const locked =
    homeQuery.error instanceof ApiError && homeQuery.error.status === 401;
  const failed = (homeQuery.isError && !locked) || contextQuery.isError;
  const reload = () => {
    void queryClient.invalidateQueries({ queryKey: ["hub"] });
  };
  const [sheet, setSheet] = useState<Sheet>(null);
  const [upgradeLock, setUpgradeLock] = useState<
    (typeof ENTERPRISE_LOCKS)[keyof typeof ENTERPRISE_LOCKS] | null
  >(null);
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [openUpdate, setOpenUpdate] = useState<HubTimelineItem | null>(null);
  const now = Date.now();

  const timeline = useMemo(() => {
    const items = home?.timeline ?? [];
    if (filter === "all" || filter === "recent") return items;
    if (filter === "product") {
      return items.filter(
        (item) => item.kind === "product" && isNewListing(item.at, now),
      );
    }
    return items.filter((item) => item.kind === filter);
  }, [home, filter, now]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 animate-pulse">
        <div className="space-y-4">
          <div className="h-52 rounded-3xl bg-gray-100" />
          <div className="h-24 rounded-2xl bg-gray-100" />
          <div className="h-72 rounded-2xl bg-gray-100" />
        </div>
        <div className="h-80 rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (locked) {
    return (
      <HubLockedModal
        variant="auth"
        title="Sign up to open the Hub"
        body="The Hub is open to vendors and to buyers with an account. Sign up to see the businesses, their listings, and their promotions."
        onClose={() => onAuthClose?.()}
        onSignedIn={reload}
      />
    );
  }

  if (failed || !home) {
    return (
      <div>
        <div className="bg-surface rounded-2xl border border-gray-200 p-10 text-center">
          <p className="font-semibold text-ink">Couldn&apos;t load the Hub</p>
          <p className="text-sm text-gray-500 mt-1">
            Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const vendor = home.role === "vendor";

  const openSheet = (next: Exclude<Sheet, null>) => {
    if (next === "boost") {
      navigate("/hub/boost");
      return;
    }
    // Create Poster + Place Advert share /hub/advert (mockup + hub-backlog).
    if (next === "advert" || next === "poster") {
      navigate("/hub/advert");
      return;
    }
    const action = ACTIONS.find((item) => item.sheet === next);
    if (action?.enterpriseOnly && !home.enterprise) {
      setUpgradeLock(ENTERPRISE_LOCKS.advert);
      return;
    }
    setSheet(next);
  };

  return (
    <div className="space-y-4">
      <HubHero
        eyebrow="Vendor Hub"
        title="Showcase your business"
        subtitle="Get discovered, reach more customers and grow your sales with Velte's powerful vendor tools."
        photo="/hub/vendor-hub-store.jpg"
        action={
          <Link
            href={storeHref}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            View My Contact Card
            <ArrowRight size={16} />
          </Link>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {vendor && (
            <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4 sm:p-5">
              <h3 className="text-base font-bold text-ink">Your Tools</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Everything you need to manage and grow your business.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {ACTIONS.map((action) => (
                  <button
                    key={action.sheet}
                    type="button"
                    onClick={() => openSheet(action.sheet)}
                    className="relative flex min-h-[148px] flex-col rounded-2xl border border-gray-200 bg-surface px-3.5 py-4 text-left transition-colors hover:border-orange-300"
                  >
                    {action.badge === "sponsored" && (
                      <span className="absolute top-3 right-3 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        Sponsored
                      </span>
                    )}
                    {action.badge === "special" && (
                      <span className="absolute top-3 right-3 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                        Special
                      </span>
                    )}
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                      <action.icon size={18} />
                    </span>
                    <span className="mt-3 block text-sm font-semibold text-ink">
                      {action.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-gray-500">
                      {action.hint}
                    </span>
                    <ChevronRight
                      size={16}
                      className="mt-auto self-end text-gray-300"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="bg-surface border border-gray-200 rounded-none lg:rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-ink">
                  Featured Vendors
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Top businesses on Velte. Sponsored listings appear first.
                </p>
              </div>
              {home.featured.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllFeatured((open) => !open)}
                  className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-orange-600 hover:text-orange-700"
                >
                  {showAllFeatured ? "Show less" : "View all"}
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
            {home.featured.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Vendors show up here as they publish a store.
              </p>
            ) : showAllFeatured ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {home.featured.map((vendor) => (
                  <VendorCard key={vendor.vendorId} vendor={vendor} fluid />
                ))}
              </div>
            ) : (
              <CardCarousel
                items={home.featured}
                getKey={(vendor) => vendor.vendorId}
                slideClassName="w-[260px]"
                renderItem={(vendor) => <VendorCard vendor={vendor} fluid />}
              />
            )}
          </section>

          <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">Latest Updates</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  New listings, promotions and updates from your business.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ["all", "All"],
                    ["promotion", "Promotions"],
                    ["product", "New Products"],
                    ["update", "Updates"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      filter === key
                        ? "bg-ink text-canvas"
                        : "border border-gray-200 bg-surface text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFilter("recent")}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    filter === "recent"
                      ? "bg-ink text-canvas"
                      : "border border-gray-200 bg-surface text-gray-600 hover:bg-gray-50",
                  )}
                >
                  Most Recent
                </button>
              </div>
            </div>
            {timeline.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                Posts show up here when a vendor lists, promotes, or sends an
                update.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {timeline.map((item) => (
                  <UpdateCard
                    key={item.id}
                    item={item}
                    now={now}
                    onOpen={
                      item.listing ? () => setOpenUpdate(item) : undefined
                    }
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {vendor && home.performance && (
            <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">
                  Store Performance
                </h3>
                <span className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-500">
                  Last 30 days
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 bg-canvas p-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                    <TrendingUpIcon size={14} />
                  </span>
                  <p className="mt-2 text-[11px] text-gray-500">
                    Leads Received
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-ink">
                    {home.performance.leads.current.toLocaleString("en-NG")}
                  </p>
                  <Delta window={home.performance.leads} />
                  <p className="text-[11px] text-gray-400">
                    vs. previous 30 days
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-canvas p-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <BarChartIcon size={14} />
                  </span>
                  <p className="mt-2 text-[11px] text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold tracking-tight text-ink">
                    {formatNaira(home.performance.salesKobo.current)}
                  </p>
                  <Delta window={home.performance.salesKobo} />
                  <p className="text-[11px] text-gray-400">
                    vs. previous 30 days
                  </p>
                </div>
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-800">
                <InfoIcon size={14} className="mt-0.5 shrink-0" />
                Store visits and contact views are not measured at this time.
              </p>
            </section>
          )}

          {vendor && (
            <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4">
              <h3 className="text-sm font-bold text-ink">Quick Actions</h3>
              <ul className="mt-1">
                {ACTIONS.map((action) => (
                  <li key={action.sheet}>
                    <button
                      type="button"
                      onClick={() => openSheet(action.sheet)}
                      className="flex w-full items-center gap-3 border-b border-gray-100 py-3 text-left"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                        <action.icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-ink">
                            {action.label}
                          </span>
                          {action.badge === "sponsored" && (
                            <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              Sponsored
                            </span>
                          )}
                          {action.badge === "special" && (
                            <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">
                              Special
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {action.hint}
                        </span>
                      </span>
                      {action.enterpriseOnly && !home.enterprise ? (
                        <LockIcon
                          size={14}
                          className="shrink-0 text-gray-400"
                        />
                      ) : (
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-gray-300"
                        />
                      )}
                    </button>
                  </li>
                ))}
                <li>
                  {home.enterprise ? (
                    <Link
                      href="/reports"
                      className="flex w-full items-center gap-3 py-3"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                        <BarChartIcon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">
                          View Analytics
                        </span>
                        <span className="block text-xs text-gray-500">
                          Store performance & insights
                        </span>
                      </span>
                      <ChevronRight
                        size={16}
                        className="shrink-0 text-gray-300"
                      />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUpgradeLock(ENTERPRISE_LOCKS.analytics)}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                        <BarChartIcon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">
                          View Analytics
                        </span>
                        <span className="block text-xs text-gray-500">
                          Store performance & insights
                        </span>
                      </span>
                      <LockIcon size={14} className="shrink-0 text-gray-400" />
                    </button>
                  )}
                </li>
              </ul>
            </section>
          )}

          {vendor && !home.enterprise && (
            <section className="rounded-none lg:rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                <CrownIcon size={18} />
              </span>
              <h3 className="mt-3 text-base font-bold text-ink">
                Grow with Enterprise
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                Get more insights, better reach and exclusive features to grow
                your business.
              </p>
              <button
                type="button"
                onClick={() => navigate("/pricing?for=vendors")}
                className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90"
              >
                Upgrade to Enterprise
                <ArrowRight size={16} aria-hidden />
              </button>
              <ul className="mt-4 space-y-2 text-sm text-ink">
                {[
                  "Advert pins included / subsidised",
                  "Business insights & vendor leaderboards",
                  "Extra poster templates",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckIcon size={14} className="shrink-0 text-orange-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <HeadphonesIcon size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-ink">Need Help?</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Get support or send feedback.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm font-semibold text-orange-600">
              <Link href="/settings">Support</Link>
              <Link href="/settings">Settings</Link>
              <Link href="/settings">Feedback</Link>
            </div>
          </section>
        </aside>
      </div>

      <UpdateListingSheet
        item={openUpdate}
        viewerId={userId}
        onClose={() => setOpenUpdate(null)}
      />

      {upgradeLock && (
        <HubLockedModal
          variant="upgrade"
          title={upgradeLock.title}
          body={upgradeLock.body}
          ctaLabel="Upgrade to Enterprise"
          ctaHref="/pricing?for=vendors"
          onClose={() => setUpgradeLock(null)}
        />
      )}

      {sheet && context && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            ACTIONS.find((action) => action.sheet === sheet)?.label ?? "Hub"
          }
          className={`fixed inset-0 z-50 h-dvh w-dvw flex items-end sm:items-center justify-center ${modalScrimClass()}`}
          onClick={() => setSheet(null)}
        >
          <div
            className="bg-canvas w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-ink">
                {sheet === "card"
                  ? "Contact card"
                  : ACTIONS.find((action) => action.sheet === sheet)?.label}
              </h3>
              <button
                type="button"
                onClick={() => setSheet(null)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <CloseIcon size={18} />
              </button>
            </div>
            {sheet === "card" ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Your contact card is your store: the name, the description,
                  the photos, and the sectors buyers see.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={storeHref}
                    className="inline-flex rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    Edit contact card
                  </Link>
                  {home.store?.handle && (
                    <Link
                      href={`/store/${home.store.handle}`}
                      className="inline-flex rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-ink hover:border-orange-300"
                    >
                      View public card
                    </Link>
                  )}
                </div>
              </div>
            ) : sheet === "broadcast" ? (
              <HubBroadcastComposer
                context={context}
                adverts={adverts}
                onSaved={() => {
                  setSheet(null);
                  reload();
                }}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function VendorCard({
  vendor,
  fluid,
}: {
  vendor: HubFeaturedVendor;
  fluid?: boolean;
}) {
  const category = vendor.sectors[0] ? sectorLabel(vendor.sectors[0]) : null;
  return (
    <article
      className={cn(
        "border border-gray-200 rounded-2xl overflow-hidden bg-surface flex flex-col h-full",
        fluid ? "w-full" : "shrink-0 w-[260px]",
      )}
    >
      <div className="relative h-40 bg-gray-100">
        {vendor.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vendor.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
        {vendor.sponsored && (
          <span className="absolute top-2 right-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
            Sponsored
          </span>
        )}
        <Avatar
          name={vendor.name}
          src={vendor.avatar}
          className="absolute left-3 -bottom-4 h-10 w-10 rounded-full border-2 border-surface text-xs"
        />
      </div>
      <div className="flex flex-1 flex-col p-3 pt-6">
        <h4 className="truncate text-sm font-bold text-ink">{vendor.name}</h4>
        {category && (
          <p className="truncate text-xs text-gray-500">{category}</p>
        )}
        {vendor.verified && (
          <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
            <CheckIcon size={12} />
            Verified Vendor
          </span>
        )}
        {vendor.description && (
          <p className="mt-2 line-clamp-2 text-xs text-gray-600">
            {vendor.description}
          </p>
        )}
        <span className="mt-2 inline-flex items-center gap-0.5 text-xs">
          {Array.from({ length: 5 }, (_, index) => {
            const rated = vendor.ratingCount > 0 && vendor.ratingAvg != null;
            const filled =
              rated && index < Math.round(vendor.ratingAvg as number);
            return (
              <StarIcon
                key={index}
                size={12}
                weight={filled ? "fill" : "regular"}
                className={filled ? "text-amber-400" : "text-gray-300"}
              />
            );
          })}
          {vendor.ratingCount > 0 && vendor.ratingAvg != null && (
            <span className="ml-0.5 font-semibold text-ink">
              {vendor.ratingAvg.toFixed(1)}
            </span>
          )}
          <span className="font-normal text-gray-400">
            ({vendor.ratingCount})
          </span>
        </span>
        <Link
          href={`/store/${vendor.handle}`}
          className="mt-auto inline-flex w-full items-center justify-center rounded-xl border border-orange-500 py-2 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-50"
        >
          View Contact Card
        </Link>
      </div>
    </article>
  );
}

const COVER_INTERVAL_MS = 3200;

function updateGallery(item: HubTimelineItem) {
  return [
    ...new Set([item.imageUrl, ...(item.images ?? [])].filter(Boolean)),
  ] as string[];
}

function UpdateCover({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, COVER_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [images.length]);

  if (images.length === 0) {
    return <div className="h-full w-full bg-gray-100" />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="flex h-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, imageIndex) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${imageIndex}`}
            src={src}
            alt={name}
            className="h-full w-full shrink-0 object-cover"
          />
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-2 right-2.5 flex gap-1">
          {images.map((_, dotIndex) => (
            <span
              key={dotIndex}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                dotIndex === index ? "w-3.5 bg-surface" : "w-1.5 bg-white/50",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function placeParts(place: string | null) {
  if (!place) return { area: null, state: null };
  const [area, state] = place.split(",").map((part) => part.trim());
  return { area: area || null, state: state || null };
}

function UpdateListingSheet({
  item,
  viewerId,
  onClose,
}: {
  item: HubTimelineItem | null;
  viewerId: string;
  onClose: () => void;
}) {
  if (!item || !item.listing) return null;
  const listing = item.listing;
  const storeName = item.storeName || "Vendor";
  const isOwn = Boolean(viewerId) && item.vendorId === viewerId;
  const chatHref =
    !isOwn && item.vendorId
      ? buildChatLink({
          vendorId: item.vendorId,
          productId: listing.productId,
          source: "browse",
          message:
            listing.kind === "service"
              ? `Hi ${storeName}! I'm interested in your "${listing.name}" service. I found you on Velte.`
              : `Hi ${storeName}! Is "${listing.name}" still available? I found you on Velte.`,
        })
      : null;
  const place = placeParts(item.place);

  return (
    <ListingDetailModal
      item={{
        name: listing.name,
        kind: listing.kind,
        quoteOnRequest: listing.quoteOnRequest,
        price: listing.price,
        priceMax: listing.priceMax,
        currency: listing.currency,
        images: listing.images.length ? listing.images : item.images,
        description: listing.description,
        attributes: listing.attributes,
      }}
      open
      onClose={onClose}
      isOwn={isOwn}
      vendor={{
        name: storeName,
        handle: item.storeHandle,
        area: place.area,
        state: place.state,
        avatar: item.avatar,
      }}
      chatHref={chatHref}
      chatLabel={
        listing.kind === "service"
          ? "Enquire about this service"
          : "Chat with vendor"
      }
      cart={
        !isOwn && listing.checkoutEligible
          ? {
              productId: listing.productId,
              vendorId: item.vendorId,
              vendorName: storeName,
              unitPrice: listing.price / 100,
            }
          : null
      }
    />
  );
}

function UpdateCard({
  item,
  now,
  onOpen,
}: {
  item: HubTimelineItem;
  now: number;
  onOpen?: () => void;
}) {
  const gallery = updateGallery(item);
  const storeName = item.storeName || "Vendor";
  const category = item.sectors[0] ? sectorLabel(item.sectors[0]) : null;
  const rated = item.ratingCount > 0 && item.ratingAvg != null;
  const fresh = item.kind === "product" && isNewListing(item.at, now);
  const badge = item.sponsored
    ? "Sponsored"
    : fresh
      ? "New Product"
      : item.kind === "product"
        ? "Listing"
        : item.kind === "update"
          ? "Update"
          : "Promotion";
  const badgeClass = item.sponsored
    ? "bg-orange-500 text-white"
    : fresh
      ? "bg-sky-100 text-sky-700"
      : item.kind === "product"
        ? "bg-gray-100 text-gray-600"
        : "bg-violet-100 text-violet-700";

  const card = (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-surface">
      <div className="relative h-40 bg-gray-100">
        <UpdateCover images={gallery} name={item.title} />
        <span
          className={cn(
            "absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold",
            badgeClass,
          )}
        >
          {badge}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-center gap-2">
          <Avatar
            name={storeName}
            src={item.avatar}
            className="h-8 w-8 shrink-0 rounded-full text-[10px]"
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-sm font-semibold text-ink">
              <span className="truncate">{storeName}</span>
              {item.verified && (
                <CheckIcon size={12} className="shrink-0 text-orange-500" />
              )}
            </p>
            <p className="text-[11px] text-gray-400">
              Posted {timeAgo(item.at, now)}
            </p>
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-bold text-ink">
          {item.title}
        </p>
        {category && (
          <p className="truncate text-xs text-gray-500">{category}</p>
        )}
        {item.body && item.body !== item.title && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">{item.body}</p>
        )}
        {item.listing &&
          !item.listing.quoteOnRequest &&
          item.listing.currency === "NGN" && (
            <p className="mt-1 text-sm font-bold text-ink">
              {item.listing.priceMax != null &&
              item.listing.priceMax > item.listing.price
                ? `${formatNaira(item.listing.price)} � ${formatNaira(item.listing.priceMax)}`
                : formatNaira(item.listing.price)}
            </p>
          )}
        {item.listing?.quoteOnRequest && (
          <p className="mt-1 text-sm font-bold text-ink">Contact for quote</p>
        )}
        {(item.verified || item.trusted) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                <CheckIcon size={11} />
                Verified Vendor
              </span>
            )}
            {item.trusted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                Trusted
              </span>
            )}
          </div>
        )}
        <span className="mt-2 inline-flex items-center gap-0.5 text-xs">
          {Array.from({ length: 5 }, (_, index) => (
            <StarIcon
              key={index}
              size={12}
              weight={
                rated && index < Math.round(item.ratingAvg as number)
                  ? "fill"
                  : "regular"
              }
              className={
                rated && index < Math.round(item.ratingAvg as number)
                  ? "text-amber-400"
                  : "text-gray-300"
              }
            />
          ))}
          <span className="text-gray-400">({item.ratingCount})</span>
        </span>
      </div>
    </article>
  );

  return (
    <li>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="block h-full w-full cursor-pointer text-left"
        >
          {card}
        </button>
      ) : (
        card
      )}
    </li>
  );
}
