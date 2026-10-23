"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, Megaphone, Star, Target, TrendingUp } from "lucide-react";

import {
  BarChartIcon,
  CheckIcon,
  ImageIcon,
  LockIcon,
  RocketIcon,
  SendIcon,
  StoreIcon,
  ZapIcon,
} from "@/components/icons";
import { CloseIcon } from "@/components/icons/hero";
import { useCreditsModal } from "@/components/credits/CreditsModal";
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
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import type {
  HubFeaturedVendor,
  HubTimelineItem,
  HubTimelineKind,
  HubWindow,
} from "@/types/hub";
import { CardCarousel } from "@/components/search/CardCarousel";
import { HubAdvertComposer } from "./HubAdvertComposer";
import { HubBoostSheet } from "./HubBoostSheet";
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
  railLabel: string;
  railHint: string;
  icon: typeof StoreIcon;
  tint: string;
  special?: boolean;
  /** Enterprise only. A Basic vendor sees the control and gets the lock. */
  enterpriseOnly?: boolean;
}[] = [
  {
    sheet: "card",
    label: "Contact Card",
    hint: "Showcase your brand",
    railLabel: "Edit Contact Card",
    railHint: "Update your business information",
    icon: StoreIcon,
    tint: "bg-violet-50 text-violet-600",
  },
  {
    sheet: "poster",
    label: "Create Poster",
    hint: "Use templates or your own",
    railLabel: "Create Poster",
    railHint: "Use templates or upload your own",
    icon: ImageIcon,
    tint: "bg-sky-50 text-sky-600",
  },
  {
    sheet: "advert",
    label: "Place Advert",
    hint: "Get premium placement",
    railLabel: "Place Advert",
    railHint: "Get premium placement",
    icon: ZapIcon,
    tint: "bg-orange-50 text-orange-600",
    enterpriseOnly: true,
  },
  {
    sheet: "broadcast",
    label: "Broadcast",
    hint: "Reach online users",
    railLabel: "Send Broadcast",
    railHint: "Reach your target audience",
    icon: SendIcon,
    tint: "bg-red-50 text-red-600",
  },
  {
    sheet: "boost",
    label: "Boost",
    hint: "Sponsor a listing",
    railLabel: "Boost",
    railHint: "Sponsor one of your listings",
    icon: RocketIcon,
    tint: "bg-amber-50 text-amber-600",
    special: true,
  },
];

const HERO_POINTS = [
  { title: "More Visibility", icon: Eye },
  { title: "Targeted Audience", icon: Target },
  { title: "Business Growth", icon: TrendingUp },
] as const;

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
    return <span className="text-xs font-semibold text-emerald-600">New</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        label.up ? "text-emerald-600" : "text-red-500",
      )}
    >
      <TrendingUp size={12} className={label.up ? "" : "rotate-180"} />
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
  const pathId = pathname.split("/").filter(Boolean)[0] ?? "";
  const userId = userIdProp || (pathId === "hub" ? "" : pathId);
  const walletHref = userId ? `/${userId}/wallet` : "/auth/login";
  const storeHref = userId ? `/${userId}/store` : "/auth/login";
  const credits = useCreditsModal();

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
  const now = Date.now();

  const timeline = useMemo(() => {
    const items = home?.timeline ?? [];
    if (filter === "all" || filter === "recent") return items;
    return items.filter((item) => item.kind === filter);
  }, [home, filter]);

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
    const action = ACTIONS.find((item) => item.sheet === next);
    if (action?.enterpriseOnly && !home.enterprise) {
      setUpgradeLock(ENTERPRISE_LOCKS.advert);
      return;
    }
    setSheet(next);
  };

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
        <div className="min-w-0 space-y-5">
          <section className="relative overflow-hidden rounded-3xl bg-[#16120f] text-white">
            <div className="absolute inset-y-0 right-0 hidden w-[46%] bg-[radial-gradient(circle_at_70%_40%,#c2410c_0%,#7c2d12_38%,transparent_72%)] md:block" />
            <div className="absolute -right-10 top-6 hidden h-56 w-56 rounded-full bg-orange-400/20 blur-3xl md:block" />
            <div className="relative grid items-center gap-8 px-6 py-8 sm:px-8 sm:py-10 md:grid-cols-[1.15fr_0.85fr]">
              <div className="max-w-xl">
                <p className="text-[11px] font-bold tracking-[0.22em] text-orange-400">
                  VELTE VENDOR HUB
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Showcase Your Business
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
                  Get discovered by more buyers, grow your brand, and boost your
                  sales with Velte.
                </p>
                {vendor && (
                  <Link
                    href={storeHref}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                  >
                    Create Your Contact Card
                    <span aria-hidden>→</span>
                  </Link>
                )}
              </div>
              <ul className="grid gap-2.5 md:justify-self-end md:w-full md:max-w-[240px]">
                {HERO_POINTS.map(({ title, icon: Icon }) => (
                  <li
                    key={title}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/35 px-3.5 py-3 backdrop-blur-sm"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-300">
                      <Icon size={16} />
                    </span>
                    <span className="text-sm font-semibold">{title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {vendor && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.sheet}
                    type="button"
                    onClick={() => openSheet(action.sheet)}
                    className="relative rounded-2xl border border-gray-200 bg-surface px-3.5 py-4 text-left shadow-sm transition-colors hover:border-orange-300"
                  >
                    {action.enterpriseOnly && !home.enterprise && (
                      <span className="absolute top-2.5 right-2.5 text-gray-400">
                        <LockIcon size={14} />
                      </span>
                    )}
                    {action.special && (
                      <span className="absolute top-2.5 right-2.5 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Special
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                        action.tint,
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="mt-3 block text-sm font-semibold text-ink">
                      {action.label}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {action.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <section className="bg-surface border border-gray-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-ink">
                  Featured Vendors
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Businesses on Velte. A sponsored card is labelled.
                </p>
              </div>
              {home.featured.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllFeatured((open) => !open)}
                  className="text-sm font-semibold text-orange-600 hover:text-orange-700 shrink-0"
                >
                  {showAllFeatured ? "Show less" : "View all"}
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

          <section className="bg-surface border border-gray-200 rounded-2xl p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">
                  Vendor Hub Timeline
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Latest updates, promotions and announcements from vendors.
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
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                    )}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFilter("recent")}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:ml-1",
                    filter === "recent"
                      ? "bg-orange-500 text-white"
                      : "border border-orange-200 text-orange-600 hover:bg-orange-50",
                  )}
                >
                  Most Recent
                </button>
              </div>
            </div>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Posts show up here when a vendor lists, promotes, or sends an
                update.
              </p>
            ) : (
              <CardCarousel
                items={timeline}
                getKey={(item) => item.id}
                slideClassName="w-[min(280px,82%)] sm:w-[280px]"
                renderItem={(item) => <TimelineCard item={item} now={now} />}
              />
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {vendor && home.performance && (
            <section className="bg-surface border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">
                  Your Store Performance
                </h3>
                <span className="text-[11px] font-medium text-gray-400">
                  Last 30 days
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Stat label="Store Visits" value="—" note="Not measured yet" />
                <Stat label="Contact Views" value="—" note="Not measured yet" />
                <Stat
                  label="Leads Received"
                  value={home.performance.leads.current.toLocaleString("en-NG")}
                  delta={<Delta window={home.performance.leads} />}
                />
                <Stat
                  label="Total Sales"
                  value={formatNaira(home.performance.salesKobo.current)}
                  delta={<Delta window={home.performance.salesKobo} />}
                />
              </div>
            </section>
          )}

          {vendor && (
            <section className="bg-surface border border-gray-200 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-ink">Quick Actions</h3>
              <ul className="mt-3 divide-y divide-gray-100">
                {ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <li key={action.sheet}>
                      <button
                        type="button"
                        onClick={() => openSheet(action.sheet)}
                        className="w-full flex items-center gap-3 py-2.5 text-left"
                      >
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink">
                            {action.railLabel}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {action.railHint}
                          </span>
                        </span>
                        {action.enterpriseOnly && !home.enterprise && (
                          <LockIcon
                            size={14}
                            className="text-gray-400 shrink-0"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
                <li>
                  {home.enterprise ? (
                    <Link
                      href={`/${userId}/reports`}
                      className="w-full flex items-center gap-3 py-2.5"
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                        <BarChartIcon size={16} />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">
                          View Analytics
                        </span>
                        <span className="block text-xs text-gray-500">
                          Track your performance
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUpgradeLock(ENTERPRISE_LOCKS.analytics)}
                      className="w-full flex items-center gap-3 py-2.5 text-left"
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                        <BarChartIcon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">
                          View Analytics
                        </span>
                        <span className="block text-xs text-gray-500">
                          Track your performance
                        </span>
                      </span>
                      <LockIcon size={14} className="text-gray-400 shrink-0" />
                    </button>
                  )}
                </li>
              </ul>
            </section>
          )}

          {vendor && !home.enterprise && (
            <section className="rounded-2xl border border-white/10 bg-[#141820] p-5 text-white">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                <TrendingUp size={18} />
              </span>
              <h3 className="mt-3 text-base font-bold">
                Grow Faster with Velte Enterprise
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-white/85">
                {[
                  "Advert pins included",
                  "Business insights",
                  "No ₦1,000 lead fee",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                      <CheckIcon size={10} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => credits.open()}
                className="mt-5 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                Upgrade Now
                <span aria-hidden>→</span>
              </button>
            </section>
          )}

          <section className="rounded-2xl border border-orange-100 bg-orange-50 p-4 dark:border-orange-500/20 dark:bg-orange-500/10">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/20">
                <Megaphone size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-ink">Need help?</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  Our support team is here to help with your questions or
                  issues.
                </p>
              </div>
            </div>
            <Link
              href={userId ? `/${userId}/settings` : "/auth/login"}
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-orange-300"
            >
              Contact Support
            </Link>
          </section>
        </aside>
      </div>

      {upgradeLock && (
        <HubLockedModal
          variant="upgrade"
          title={upgradeLock.title}
          body={upgradeLock.body}
          ctaLabel="Upgrade to Enterprise"
          onCta={() => {
            setUpgradeLock(null);
            credits.open();
          }}
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
            ) : sheet === "boost" ? (
              <HubBoostSheet
                context={context}
                onSponsored={() => {
                  setSheet(null);
                  reload();
                }}
              />
            ) : (
              <HubAdvertComposer
                key={sheet}
                context={context}
                walletHref={walletHref}
                storeName={home.store?.name ?? "Your store"}
                onPlaced={() => {
                  setSheet(null);
                  reload();
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  delta,
}: {
  label: string;
  value: string;
  note?: string;
  delta?: ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink">
        {value}
      </p>
      {delta}
      {note && <p className="text-[11px] text-gray-400 mt-0.5">{note}</p>}
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
  const tags = vendor.sectors.slice(0, 3).map(sectorLabel);
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
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide text-white bg-orange-500 px-1.5 py-0.5 rounded-md">
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
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold text-ink">{vendor.name}</h4>
          {category && (
            <p className="truncate text-xs text-gray-500">{category}</p>
          )}
          <span className="mt-1 inline-flex items-center gap-0.5 text-xs">
            {Array.from({ length: 5 }, (_, index) => {
              const rated = vendor.ratingCount > 0 && vendor.ratingAvg != null;
              const filled =
                rated && index < Math.round(vendor.ratingAvg as number);
              return (
                <Star
                  key={index}
                  size={12}
                  className={
                    filled
                      ? "fill-amber-400 text-amber-400"
                      : "fill-transparent text-gray-300"
                  }
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
        </div>
        {vendor.verified && (
          <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <CheckIcon size={12} />
            Verified Vendor
          </span>
        )}
        {vendor.description && (
          <p className="mt-2 text-xs text-gray-600 line-clamp-2">
            {vendor.description}
          </p>
        )}
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <Link
          href={`/store/${vendor.handle}`}
          className="mt-auto pt-3 inline-flex w-full items-center justify-center rounded-lg border border-orange-200 text-orange-600 text-xs font-semibold py-2 hover:bg-orange-50 transition-colors"
        >
          View Contact Card
        </Link>
      </div>
    </article>
  );
}

function TimelineCard({ item, now }: { item: HubTimelineItem; now: number }) {
  const name = item.storeName || "Vendor";
  const href = item.storeHandle ? `/store/${item.storeHandle}` : null;
  const badge =
    item.kind === "product"
      ? "New Product"
      : item.kind === "promotion"
        ? "Promotion"
        : null;
  return (
    <article className="border border-gray-200 rounded-2xl overflow-hidden bg-surface flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 pt-3">
        <Avatar
          name={name}
          src={item.avatar}
          className="h-8 w-8 rounded-full text-[10px]"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{name}</p>
          <p className="text-[11px] text-gray-400">{timeAgo(item.at, now)}</p>
        </div>
        {item.sponsored && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">
            Sponsored
          </span>
        )}
      </div>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          className="mt-3 h-36 w-full object-cover bg-gray-100"
        />
      )}
      <div className="p-3 flex flex-col flex-1">
        <h4 className="text-sm font-bold text-ink line-clamp-2">
          {item.title}
        </h4>
        {item.body && item.body !== item.title && (
          <p className="mt-1 text-xs text-gray-600 line-clamp-2">{item.body}</p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-md">
              {badge}
            </span>
          )}
          {href && (
            <Link
              href={href}
              className="ml-auto text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              View card
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
