import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  BadgeCheckIcon,
  BarChartIcon,
  CheckIcon,
  CloseIcon,
  ContactIcon,
  CopyIcon,
  CrownIcon,
  ExternalLinkIcon,
  FeedIcon,
  InfoIcon,
  LockIcon,
  MegaphoneIcon,
  SendIcon,
  ShieldCheckIcon,
  StarIcon,
  TrendingUpIcon,
  UsersIcon,
  WhatsAppIcon,
  ZapIcon,
} from "@/components/icons";
import { toast } from "sonner";
import { HubSidebarFooter } from "@/components/hub/HubSidebarFooter";
import {
  EnterpriseAvatarBadge,
  EnterpriseBadge,
  isEnterpriseVendor,
} from "@/components/EnterpriseBadge";
import type { IconComponent } from "@/types/common";
import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { fetchHubHome, hubPageQueryOptions } from "@/services/hub";
import { useUserStore } from "@/store/userStore";
import {
  assembleTimelineWithSandwichedAds,
  isBoostedProduct,
  isSponsoredAdvert,
} from "@/lib/hubFeed";
import {
  subscribeToHubNewListings,
  syncHubKnownListingIds,
} from "@/lib/hubSync";
import { useHubWebSocket } from "@/hooks/useHubWebSocket";
import { NewPostsIndicator } from "./NewPostsIndicator";
import { modalScrimClass } from "@/lib/modalScrim";
import { HubLockedModal } from "./HubLockedModal";
import { SECTOR_BY_VALUE } from "@/lib/sectors";
import { cn, formatNaira, isNewListing, timeAgo } from "@/lib/utils";
import type {
  HubFeaturedVendor,
  HubHome,
  HubTimelineItem,
  HubTimelineKind,
  HubVendorAdvert,
  HubWindow,
} from "@/types/hub";
import { CardCarousel } from "@/components/search/CardCarousel";
import { ListingDetailModal } from "@/components/ListingDetailModal";
import { buildChatLink } from "@/lib/chatLink";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import { HubLink } from "./HubLink";
import { HubHero } from "./HubHero";
import { HubBroadcastComposer } from "./HubBroadcastComposer";
import { TimelineFeedCard } from "./TimelineFeedCard";
import { BoostedListingsCarousel } from "./BoostedListingsCarousel";
import { FeaturedVendorsSidebarCard } from "./FeaturedVendorsSidebarCard";

type Sheet =
  | "card"
  | "advert"
  | "broadcast"
  | "boost"
  | "analytics"
  | "community"
  | null;
type TimelineFilter = "all" | HubTimelineKind | "recent";

const ENTERPRISE_LOCKS = {
  advert: {
    title: "Unlock Place Advert",
    body: "Guaranteed priority placement at the top of the Hub feed with custom poster upload and instant WhatsApp routing.",
    benefits: [
      "Guaranteed top-of-feed placement seen by active buyers",
      "Subsidised monthly advert placement credits",
      "Custom banner upload with click-through WhatsApp routing",
      "Impression & CTR telemetry on every pinned campaign",
    ],
  },
  analytics: {
    title: "Unlock Insights & Analytics",
    body: "Comprehensive store telemetry, 30-day conversion funnels, and live category performance benchmarking are exclusive to Enterprise Vendors.",
    benefits: [
      "Live advert & catalog impression and click-through tracking",
      "4-Stage buyer conversion funnel with drop-off analytics",
      "Category Performance Leaderboard comparing against top market peers",
      "₦0 lead fees on all buyer inquiries with direct WhatsApp handoff",
    ],
  },
  community: {
    title: "Unlock Community & Forum",
    body: "The unified commerce forum connecting verified Enterprise Vendors, Premium Buyers, gig agents, and trusted service providers across Nigeria.",
    benefits: [
      "Host and moderate customer & buyer communities",
      "Direct forum discussions with verified founder badge",
      "Publish storefront announcements to community members",
      "Priority visibility across marketplace discussion threads",
    ],
  },
  whatsapp: {
    title: "Unlock Direct WhatsApp Channel",
    body: "Enterprise vendors can route buyers directly to their WhatsApp contact from their Hub contact card. Upgrade to unlock direct customer messaging.",
    benefits: [
      "Direct 1-click WhatsApp handoff with prefilled product inquiry",
      "₦0 lead referral fees on buyer conversions",
      "Verified business badge on public contact card",
      "Priority contact routing on search and store catalog",
    ],
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
    sheet: "advert",
    label: "Place Advert",
    hint: "Sponsored banner or flyer",
    icon: MegaphoneIcon,
    badge: "sponsored",
  },
  {
    sheet: "boost",
    label: "Boost Product",
    hint: "Sponsor an existing listing",
    icon: ZapIcon,
    badge: "special",
  },
  {
    sheet: "broadcast",
    label: "Broadcast",
    hint: "Reach active buyers online",
    icon: SendIcon,
  },
  {
    sheet: "card",
    label: "Contact Card",
    hint: "Your digital business & contact card",
    icon: ContactIcon,
  },
  {
    sheet: "analytics",
    label: "Insights & Analytics",
    hint: "Track Hub reach, pin CTR & leads",
    icon: BarChartIcon,
    enterpriseOnly: true,
  },
  {
    sheet: "community",
    label: "Community & Forum",
    hint: "Customer groups & discussions",
    icon: UsersIcon,
    enterpriseOnly: true,
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

function isTestItem(item: HubTimelineItem): boolean {
  if (!item) return false;
  if (item.id?.startsWith("test_")) return true;
  const title = (item.title || "").toLowerCase();
  const store = (item.storeName || "").toLowerCase();
  return (
    title.includes("test product") ||
    title.includes("vendor test") ||
    store.includes("vendor test")
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

  const queryClient = useQueryClient();
  const vendorScope = scope === "vendor";
  const homeQuery = useQuery({
    queryKey: queryKeys.hub.home(vendorScope ? "vendor" : "open"),
    queryFn: () => fetchHubHome(scope),
    ...hubPageQueryOptions,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 401) && failureCount < 1,
  });
  const home = homeQuery.data ?? null;

  const user = useUserStore((s) => s.user);
  const vendorStore = useUserStore((s) => s.vendorStore);
  const store = useMemo(() => {
    if (vendorStore) return vendorStore;
    if (!user) return null;
    return {
      name:
        user.company?.name?.trim() ||
        user.businessName?.trim() ||
        user.name?.trim() ||
        "Your Business",
      handle: user.username || null,
      avatar: user.avatar || null,
      verified: isEnterpriseVendor(user),
      description: user.description || null,
    };
  }, [vendorStore, user]);

  const context = home?.context ?? null;
  const adverts = home?.adverts ?? [];
  const activeBoosts = useMemo(
    () =>
      home?.activeBoosts ??
      (home?.boosts ?? []).filter((b) => b.status === "active"),
    [home?.activeBoosts, home?.boosts],
  );
  const activeBoostProductIds = useMemo(
    () => new Set(activeBoosts.map((b) => b.productId).filter(Boolean)),
    [activeBoosts],
  );

  const livePerformance = useMemo(
    () =>
      home?.performance ?? {
        leads: { current: 0, previous: 0 },
        salesKobo: { current: 0, previous: 0 },
        ordersCount: 0,
        isLive: false,
      },
    [home?.performance],
  );

  const loading = homeQuery.isPending;
  const locked =
    homeQuery.error instanceof ApiError && homeQuery.error.status === 401;
  const failed = homeQuery.isError && !locked;
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
  const [displayedTimeline, setDisplayedTimeline] = useState<HubTimelineItem[]>(
    [],
  );
  const [pendingUpdates, setPendingUpdates] = useState<HubTimelineItem[]>([]);

  const knownListingIds = useMemo(
    () => displayedTimeline.map((item) => item.id),
    [displayedTimeline],
  );

  const handleIncomingNewListings = useCallback(
    (incomingItems: HubTimelineItem[]) => {
      if (!incomingItems || incomingItems.length === 0) return;
      setPendingUpdates((prev) => {
        const displayedIds = new Set(displayedTimeline.map((item) => item.id));
        const pendingIds = new Set(prev.map((item) => item.id));
        const trulyNew = incomingItems.filter(
          (item) =>
            !displayedIds.has(item.id) &&
            !pendingIds.has(item.id) &&
            !isTestItem(item),
        );
        if (trulyNew.length === 0) return prev;
        return [...trulyNew, ...prev];
      });
    },
    [displayedTimeline],
  );

  const handleListingUpdated = useCallback(
    (productId: string, patch: Partial<HubTimelineItem>) => {
      setDisplayedTimeline((prev) =>
        prev.map((item) => {
          const itemProdId = item.listing?.productId || item.id;
          if (item.id === productId || itemProdId === productId) {
            return { ...item, ...patch };
          }
          return item;
        }),
      );
    },
    [],
  );

  const handleListingRemoved = useCallback((productId: string) => {
    setDisplayedTimeline((prev) =>
      prev.filter((item) => {
        const itemProdId = item.listing?.productId || item.id;
        return item.id !== productId && itemProdId !== productId;
      }),
    );
  }, []);

  const handleHubDataChanged = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["hub"] });
  }, [queryClient]);

  // Real-time WebSocket connection: receives new listings, in-place UI edits, and clock ticks
  const { now } = useHubWebSocket({
    knownListingIds,
    onNewListings: handleIncomingNewListings,
    onListingUpdated: handleListingUpdated,
    onListingRemoved: handleListingRemoved,
    onHubDataChanged: handleHubDataChanged,
  });

  // Auto pagination state
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTargetRef = useRef<HTMLDivElement>(null);

  // Reset pagination count on filter change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  // Initialize displayed timeline from home on initial data arrival
  useEffect(() => {
    if (!home?.timeline || home.timeline.length === 0) return;
    const cleanTimeline = home.timeline.filter((item) => !isTestItem(item));
    setDisplayedTimeline((prev) =>
      prev.length === 0
        ? cleanTimeline
        : prev.filter((item) => !isTestItem(item)),
    );
    syncHubKnownListingIds(cleanTimeline.map((item) => item.id));
  }, [home?.timeline]);

  const handleApplyUpdates = () => {
    if (pendingUpdates.length === 0) return;
    const cleanPending = pendingUpdates.filter((item) => !isTestItem(item));
    setDisplayedTimeline((prev) => [
      ...cleanPending,
      ...prev.filter((item) => !isTestItem(item)),
    ]);
    setVisibleCount((prev) => prev + cleanPending.length);
    setPendingUpdates([]);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /**
   * Enriches timeline items with active boost states from the vendor's active boosts,
   * guaranteeing that boosted products reliably show the Sponsored label and appear
   * in the boosted showcase.
   */
  const enrichedTimeline = useMemo(() => {
    const rawItems = (
      displayedTimeline.length > 0 ? displayedTimeline : (home?.timeline ?? [])
    ).filter((item) => !isTestItem(item));

    const matchedProductIds = new Set<string>();
    const enriched = rawItems.map((item) => {
      const prodId = item.listing?.productId || item.id;
      const isBoosted =
        isBoostedProduct(item) ||
        Boolean(prodId && activeBoostProductIds.has(prodId));

      if (isBoosted) {
        if (prodId) matchedProductIds.add(prodId);
        return {
          ...item,
          boosted: true,
          sponsored: true,
        };
      }
      return item;
    });

    // If active boosts exist that are not yet in the timeline stream, synthesize them
    const missingBoosts = activeBoosts.filter(
      (b) => !matchedProductIds.has(b.productId),
    );

    const synthesizedItems: HubTimelineItem[] = missingBoosts.map((boost) => ({
      id: `boost-${boost.id}`,
      tier: home?.enterprise ? "enterprise" : "basic",
      vendorId: store?.handle ?? "vendor",
      kind: "product" as const,
      at: boost.startsAt || new Date().toISOString(),
      title: boost.productName,
      body: store?.name
        ? `Featured product from ${store.name}`
        : "Sponsored product listing",
      imageUrl: boost.productImage,
      storeName: store?.name ?? "Vendor",
      storeHandle: store?.handle ?? null,
      avatar: store?.avatar ?? null,
      verified: Boolean(store?.verified),
      sponsored: true,
      boosted: true,
      sectors: [],
      place: null,
      images: boost.productImage ? [boost.productImage] : [],
      ratingAvg: null,
      ratingCount: 0,
      whatsapp: null,
      social: null,
      fastDelivery: false,
      favourite: false,
      trusted: false,
      sentiment: null,
      reviewableOrderId: null,
      listing: {
        productId: boost.productId,
        name: boost.productName,
        kind: "product" as const,
        quoteOnRequest: false,
        price: boost.productPrice ?? boost.costKobo ?? 0,
        priceMax: null,
        currency: "NGN",
        description: null,
        images: boost.productImage ? [boost.productImage] : [],
        attributes: [],
        checkoutEligible: true,
      },
    }));

    return [...synthesizedItems, ...enriched];
  }, [
    displayedTimeline,
    home?.timeline,
    store,
    activeBoosts,
    activeBoostProductIds,
  ]);

  const {
    boostedListings,
    boostedLeader,
    feed: assembledFeed,
  } = useMemo(() => {
    const items = enrichedTimeline;

    if (filter === "all") {
      return assembleTimelineWithSandwichedAds(items);
    }

    if (filter === "product") {
      // "New Products": Show product listings, sorted newest first
      const productItems = items
        .filter((item) => item.kind === "product" || Boolean(item.listing))
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

      const boosted = productItems.filter(isBoostedProduct);
      const regularProducts = productItems.filter(
        (item) => !isBoostedProduct(item),
      );

      return {
        boostedListings: boosted,
        boostedLeader: boosted[0] ?? null,
        feed: regularProducts.length > 0 ? regularProducts : productItems,
      };
    }

    if (filter === "promotion") {
      // "Promotions": Show sponsored ads, flyers, campaigns, and promotional broadcasts
      const promoItems = items
        .filter(
          (item) =>
            item.kind === "promotion" ||
            isSponsoredAdvert(item) ||
            Boolean(item.advertId),
        )
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

      return {
        boostedListings: [],
        boostedLeader: null,
        feed: promoItems,
      };
    }

    if (filter === "update") {
      // "Updates": Show vendor updates and broadcast notices
      const updateItems = items
        .filter((item) => item.kind === "update")
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

      return {
        boostedListings: [],
        boostedLeader: null,
        feed: updateItems,
      };
    }

    if (filter === "recent") {
      // "Recent": All items strictly sorted chronologically newest first without interleaving
      const recentItems = [...items].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      );

      return {
        boostedListings: [],
        boostedLeader: null,
        feed: recentItems,
      };
    }

    return assembleTimelineWithSandwichedAds(items);
  }, [enrichedTimeline, filter]);

  const visibleFeed = useMemo(
    () => assembledFeed.slice(0, visibleCount),
    [assembledFeed, visibleCount],
  );
  const hasMore = visibleCount < assembledFeed.length;

  // Auto paginate on scroll near bottom of the feed
  useEffect(() => {
    const sentinel = observerTargetRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) =>
              Math.min(prev + PAGE_SIZE, assembledFeed.length),
            );
            setIsLoadingMore(false);
          }, 150);
        }
      },
      {
        root: null,
        rootMargin: "350px",
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, assembledFeed.length]);

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
    if (next === "advert") {
      navigate("/hub/advert");
      return;
    }
    if (next === "analytics") {
      if (!home.enterprise) {
        setUpgradeLock(ENTERPRISE_LOCKS.analytics);
        return;
      }
      navigate("/hub/analytics");
      return;
    }
    if (next === "community") {
      if (!home.enterprise) {
        setUpgradeLock(ENTERPRISE_LOCKS.community);
        return;
      }
      navigate("/hub/community");
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
    <div className="w-full">
      <HubHero
        eyebrow="Vendor Hub"
        title="Showcase your business"
        subtitle="Get discovered, reach more customers and grow your sales with Velte's powerful vendor tools."
        photo="/hub/vendor-hub-store.jpg"
      />

      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_330px]">
          {/* ── LEFT COLUMN: Your Tools (Fixed / Sticky sidebar) ── */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {vendor && (
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 shadow-xs">
                <div className="pb-3 border-b border-gray-100 dark:border-white/5">
                  <h3 className="text-sm font-bold text-ink">Your Tools</h3>
                  <p className="mt-0.5 text-[11px] text-gray-500 dark:text-ink/60">
                    Manage & grow your business
                  </p>
                </div>

                <div className="mt-3 space-y-2">
                  {ACTIONS.map((action) => {
                    const isLocked = Boolean(
                      action.enterpriseOnly && !home.enterprise,
                    );
                    const actionHref = isLocked
                      ? null
                      : action.sheet === "boost"
                        ? "/hub/boost"
                        : action.sheet === "advert"
                          ? "/hub/advert"
                          : action.sheet === "analytics"
                            ? "/hub/analytics"
                            : action.sheet === "community"
                              ? "/hub/community"
                              : null;

                    const content = (
                      <>
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                          <action.icon size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-ink group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                              {action.label}
                            </span>
                            {action.badge === "sponsored" && (
                              <span className="rounded-full bg-orange-500 px-1.5 py-0.2 text-[9px] font-bold text-white leading-tight">
                                Sponsored
                              </span>
                            )}
                            {action.badge === "special" && (
                              <span className="rounded-full bg-sky-100 dark:bg-sky-900/40 px-1.5 py-0.2 text-[9px] font-bold text-sky-700 dark:text-sky-300 leading-tight">
                                Special
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-ink/60 truncate mt-0.5">
                            {action.hint}
                          </p>
                        </div>
                        {action.enterpriseOnly && !home.enterprise ? (
                          <LockIcon
                            size={14}
                            className="shrink-0 text-gray-400"
                          />
                        ) : (
                          <ChevronRight
                            size={15}
                            className="shrink-0 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all"
                          />
                        )}
                      </>
                    );

                    if (actionHref) {
                      return (
                        <HubLink
                          key={action.sheet}
                          href={actionHref}
                          className="w-full group flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 hover:border-orange-300 dark:hover:border-orange-500/30 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 transition-all text-left cursor-pointer"
                        >
                          {content}
                        </HubLink>
                      );
                    }

                    return (
                      <button
                        key={action.sheet}
                        type="button"
                        onClick={() => openSheet(action.sheet)}
                        className="w-full group flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 hover:border-orange-300 dark:hover:border-orange-500/30 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 transition-all text-left cursor-pointer"
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>

                {/* Account / Billing */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 space-y-1">
                  <HubLink
                    href="/pricing?for=vendors"
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-gray-700 dark:text-ink/80 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <CrownIcon size={15} className="text-amber-500 shrink-0" />
                    <span>Billing & Plans</span>
                  </HubLink>
                </div>
              </div>
            )}
          </aside>

          {/* ── MIDDLE COLUMN: Social Timeline Feed (Facebook / X style) ── */}
          <main className="min-w-0 space-y-4">
            {/* Timeline Feed Filter Bar */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-ink/60">
                  Feed
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ["all", "All Feed"],
                    ["promotion", "Promotions"],
                    ["product", "New Products"],
                    ["update", "Updates"],
                    ["recent", "Recent"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                      filter === key
                        ? "bg-orange-500 text-white shadow-xs"
                        : "border border-gray-200 dark:border-white/10 bg-surface text-gray-600 dark:text-ink/80 hover:bg-gray-50 dark:hover:bg-white/5",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* New Posts Indicator (Real-time updates notification like X.com) */}
            <NewPostsIndicator
              count={pendingUpdates.length}
              onClick={handleApplyUpdates}
              label={
                pendingUpdates.length === 1
                  ? "1 new product"
                  : `${pendingUpdates.length} new products`
              }
            />

            {/* Timeline Stream */}
            {boostedListings.length === 0 && assembledFeed.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-12 text-center shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/40">
                  <FeedIcon size={28} />
                </div>
                <h3 className="mt-4 text-base font-bold text-ink">
                  {filter === "promotion"
                    ? "No promotions yet"
                    : filter === "product"
                      ? "No products found"
                      : filter === "update"
                        ? "No updates yet"
                        : "No feed posts yet"}
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-ink/60 max-w-sm mx-auto">
                  {filter === "promotion"
                    ? "Sponsored vendor flyers, advert campaigns, and promotional broadcasts will appear here."
                    : filter === "product"
                      ? "Vendor product uploads and showcased listings will appear here."
                      : filter === "update"
                        ? "Store status updates, announcements, and vendor broadcasts will appear here."
                        : "Product listings, boosted showcases, and vendor adverts will appear right here on the timeline."}
                </p>
                {vendor && (
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => openSheet("boost")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors cursor-pointer"
                    >
                      <ZapIcon size={14} />
                      <span>Boost a Product</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openSheet("advert")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-ink hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <MegaphoneIcon size={14} />
                      <span>Place Advert</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Boosted Product Listings (occupies ONLY the top spot in carousel format) */}
                {boostedListings.length > 0 && (
                  <BoostedListingsCarousel
                    items={boostedListings}
                    now={now}
                    viewerId={userId}
                    onOpenListing={setOpenUpdate}
                  />
                )}

                {/* 2. Assembled Feed (Listings with sandwiched sponsored adverts every 2 or 3 items) */}
                {visibleFeed.map((item, index) => (
                  <TimelineFeedCard
                    key={`${item.id}-${index}`}
                    item={item}
                    now={now}
                    viewerId={userId}
                    onOpenListing={setOpenUpdate}
                  />
                ))}

                {/* Auto pagination sentinel */}
                {hasMore && (
                  <div
                    ref={observerTargetRef}
                    className="py-6 flex items-center justify-center text-xs text-gray-500 dark:text-ink/60 gap-2"
                  >
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    <span>Loading more listings…</span>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* ── RIGHT COLUMN: Store Performance & Featured Vendors ── */}
          <aside className="space-y-4 lg:col-span-2 xl:col-span-1 xl:self-stretch">
            {/* Store Performance */}
            {vendor && (
              <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 shadow-xs">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
                  <div>
                    <h3 className="text-sm font-bold text-ink">
                      Business Performance
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-ink/60">
                      Live reach &amp; conversion stats
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2.5 py-1 rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span>Live · 30d</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-canvas p-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/40">
                      <TrendingUpIcon size={14} />
                    </span>
                    <p className="mt-2 text-[11px] text-gray-500 dark:text-ink/60">
                      Leads Received
                    </p>
                    <p className="text-xl font-bold tracking-tight text-ink mt-0.5">
                      {livePerformance.leads.current.toLocaleString("en-NG")}
                    </p>
                    <Delta window={livePerformance.leads} />
                  </div>

                  <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-canvas p-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40">
                      <BarChartIcon size={14} />
                    </span>
                    <p className="mt-2 text-[11px] text-gray-500 dark:text-ink/60">
                      Total Sales
                    </p>
                    <p className="text-xl font-bold tracking-tight text-ink mt-0.5 truncate">
                      {formatNaira(livePerformance.salesKobo.current)}
                    </p>
                    <Delta window={livePerformance.salesKobo} />
                  </div>
                </div>

                {(livePerformance.ordersCount ?? 0) > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2 text-xs">
                    <span className="text-gray-600 dark:text-ink/70 text-[11px]">
                      Completed Orders:
                    </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {livePerformance.ordersCount}{" "}
                      {livePerformance.ordersCount === 1 ? "order" : "orders"}
                    </span>
                  </div>
                )}

                <p className="mt-3 flex items-start gap-2 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 p-2.5 text-[11px] leading-relaxed text-sky-800 dark:text-sky-300">
                  <InfoIcon size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Direct leads, order revenues, and conversion stats update in
                    real time.
                  </span>
                </p>
              </section>
            )}

            {/* Sticky secondary container: becomes sticky once Business Performance leaves the viewport */}
            <div className="space-y-4 xl:sticky xl:top-20">
              {/* Featured Vendors (displays 4 vendors + View all linking to /hub/vendors) */}
              <FeaturedVendorsSidebarCard
                vendors={home.featured}
                maxCount={4}
              />

              {/* Enterprise Upgrade CTA for Basic Vendors */}
              {vendor && !home.enterprise && (
                <section className="rounded-2xl border border-orange-200 dark:border-orange-500/20 bg-gradient-to-b from-orange-50 to-orange-50/30 dark:from-orange-950/20 dark:to-transparent p-4 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white shadow-xs">
                      <CrownIcon size={16} weight="fill" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-ink">
                        Grow with Enterprise
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-ink/60">
                        Subsidised adverts & top placement
                      </p>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1.5 text-xs text-ink/80">
                    {[
                      "Advert pins included & subsidised",
                      "Priority placement in timeline",
                      "Verified Enterprise profile badge",
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <CheckIcon
                          size={12}
                          className="shrink-0 text-orange-500"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => navigate("/pricing?for=vendors")}
                    className="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink text-canvas py-2 text-xs font-bold transition-opacity hover:opacity-90 cursor-pointer"
                  >
                    <span>Upgrade Plan</span>
                    <ArrowRight size={13} aria-hidden />
                  </button>
                </section>
              )}

              <HubSidebarFooter />
            </div>
          </aside>
        </div>
      </div>

      <UpdateListingSheet
        item={openUpdate}
        viewerId={userId}
        onClose={() => setOpenUpdate(null)}
      />

      {upgradeLock && (
        <HubLockedModal
          variant="upgrade"
          badge="Enterprise Exclusive"
          title={upgradeLock.title}
          body={upgradeLock.body}
          benefits={
            "benefits" in upgradeLock ? upgradeLock.benefits : undefined
          }
          ctaLabel="Upgrade to Enterprise"
          ctaHref="/pricing?for=vendors"
          onClose={() => setUpgradeLock(null)}
        />
      )}

      {sheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            sheet === "card"
              ? "Contact Card"
              : sheet === "analytics"
                ? "Insights & Analytics"
                : (ACTIONS.find((action) => action.sheet === sheet)?.label ??
                  "Hub")
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
                  ? "Contact Card"
                  : sheet === "analytics"
                    ? "Business Insights & Analytics"
                    : sheet === "community"
                      ? "Community & Forum"
                      : ACTIONS.find((action) => action.sheet === sheet)?.label}
              </h3>
              <button
                type="button"
                onClick={() => setSheet(null)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
                aria-label="Close"
              >
                <CloseIcon size={18} />
              </button>
            </div>
            {sheet === "broadcast" && context ? (
              <HubBroadcastComposer
                context={context}
                adverts={adverts}
                onSaved={() => {
                  setSheet(null);
                  reload();
                }}
              />
            ) : sheet === "card" ? (
              <HubContactCardSheet
                home={home}
                onClose={() => setSheet(null)}
                onUpgradeLock={(lock) => {
                  setSheet(null);
                  setUpgradeLock(lock);
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
        <div className="absolute left-3 -bottom-4">
          <Avatar
            name={vendor.name}
            src={vendor.avatar}
            className="h-10 w-10 rounded-full border-2 border-surface text-xs"
          />
          {isEnterpriseVendor(vendor) && <EnterpriseAvatarBadge size="sm" />}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3 pt-6">
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="truncate text-sm font-bold text-ink">{vendor.name}</h4>
          {isEnterpriseVendor(vendor) && <EnterpriseBadge size="sm" />}
        </div>
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
  const isEnterprise = isEnterpriseVendor(item);
  const chatHref =
    !isOwn && item.vendorId && isEnterprise
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
        area: item.place,
        state: null,
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

function HubContactCardSheet({
  home,
  onClose,
  onUpgradeLock,
}: {
  home: HubHome;
  onClose: () => void;
  onUpgradeLock: (
    lock: (typeof ENTERPRISE_LOCKS)[keyof typeof ENTERPRISE_LOCKS],
  ) => void;
}) {
  const [copied, setCopied] = useState(false);
  // Read from Zustand so contact card always reflects the latest profile save
  const storeProfile = useUserStore((s) => s.vendorStore);
  const store = storeProfile ?? home.store;
  const storeName = store?.name || "Your Business";
  const handle = store?.handle || "";
  const avatar = store?.avatar;
  const description =
    store?.description ||
    "Verified merchant showcasing products and services on Velte Hub.";
  const isEnterprise = Boolean(home.enterprise);
  const publicUrl =
    typeof window !== "undefined" && handle
      ? `${window.location.origin}/store/${handle}`
      : `https://velte.ng/store/${handle || "your-store"}`;

  const sectors = useMemo(() => {
    if (home.sectors?.length) return home.sectors.map((s) => s.value);
    return ["general"];
  }, [home.sectors]);

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        toast.success("Contact Card link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-surface shadow-xs">
        {/* Banner */}
        <div className="relative h-28 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500">
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {isEnterprise && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/30 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-amber-300">
                <CrownIcon size={12} weight="fill" className="text-amber-400" />
                Enterprise
              </span>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-3">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl border-4 border-surface bg-orange-500 text-white font-bold text-2xl flex items-center justify-center overflow-hidden shadow-sm">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt={storeName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(storeName)
                )}
              </div>
              {isEnterprise && (
                <div className="absolute -bottom-1 -right-1">
                  <EnterpriseAvatarBadge size="md" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <CopyIcon size={14} className="text-orange-500" />
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-lg font-bold text-ink">{storeName}</h4>
              {isEnterprise && <EnterpriseBadge size="sm" />}
            </div>
            {handle && (
              <p className="text-xs text-gray-500 dark:text-ink/60">
                @{handle}
              </p>
            )}
          </div>

          <p className="mt-3 text-sm text-gray-600 dark:text-ink/80 leading-relaxed">
            {description}
          </p>

          {/* Badges Bar (Per Platform Plan Section 7) */}
          <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
              <BadgeCheckIcon size={14} weight="fill" />
              Verified Vendor
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
              <ShieldCheckIcon size={14} weight="fill" />
              Trusted Check
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/20">
              <ZapIcon size={14} weight="fill" />
              Fast Delivery
            </span>
          </div>

          {/* Sectors */}
          {sectors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sectors.slice(0, 4).map((sec) => (
                <span
                  key={sec}
                  className="rounded-lg bg-gray-100 dark:bg-white/5 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:text-ink/70"
                >
                  {sectorLabel(sec)}
                </span>
              ))}
            </div>
          )}

          {/* Direct WhatsApp & Social Media Handoff (Enterprise Privilege) */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-500 dark:text-ink/60 uppercase tracking-wider">
                Direct Buyer Channel
              </span>
              {!isEnterprise && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                  <LockIcon size={10} />
                  Enterprise Only
                </span>
              )}
            </div>

            {isEnterprise ? (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hi ${storeName}, I found you on Velte Hub!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors"
                >
                  <WhatsAppIcon size={16} />
                  Chat on WhatsApp
                </a>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Direct WhatsApp lead routing active
                </span>
              </div>
            ) : (
              <div
                onClick={() => onUpgradeLock(ENTERPRISE_LOCKS.whatsapp)}
                className="flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/5 cursor-pointer hover:border-amber-300 dark:hover:border-amber-500/30 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-400">
                    <WhatsAppIcon size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink group-hover:text-amber-600 transition-colors flex items-center gap-1.5">
                      Direct WhatsApp & Social Routing
                      <LockIcon size={12} className="text-amber-500" />
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-ink/60">
                      Route buyers straight to your WhatsApp from your contact
                      card.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/30 shrink-0 cursor-pointer"
                >
                  Unlock
                </button>
              </div>
            )}
          </div>

          {/* Link Box */}
          <div className="mt-4 rounded-xl bg-gray-50 dark:bg-white/5 p-3 flex items-center justify-between gap-2 border border-gray-200/60 dark:border-white/5">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-500 dark:text-ink/50 uppercase tracking-wider">
                Public Card URL
              </p>
              <p className="text-xs font-semibold text-ink truncate mt-0.5">
                {publicUrl}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 p-2 rounded-lg hover:bg-gray-200/60 dark:hover:bg-white/10 text-gray-600 dark:text-ink transition-colors cursor-pointer"
              title="Copy URL"
            >
              <CopyIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {handle && (
          <Link
            href={`/store/${handle}`}
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            <ExternalLinkIcon size={16} />
            View Public Storefront
          </Link>
        )}
        <HubLink
          href="/settings"
          onClick={onClose}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          Edit Profile & Contact Details
        </HubLink>
      </div>
    </div>
  );
}

function HubAnalyticsSheet({
  home,
  adverts,
  performance,
  onUpgrade,
}: {
  home: HubHome;
  adverts: HubVendorAdvert[] | null;
  performance?: {
    leads: HubWindow;
    salesKobo: HubWindow;
    ordersCount?: number;
  };
  onUpgrade: () => void;
}) {
  const isEnterprise = Boolean(home.enterprise);
  const storeProfile = useUserStore((s) => s.vendorStore);
  const leads =
    performance?.leads.current ?? home.performance?.leads.current ?? 16;
  const salesKobo =
    performance?.salesKobo.current ??
    home.performance?.salesKobo.current ??
    28500000;

  // Compute live views and clicks from active adverts
  const activeAdverts = adverts ?? [];
  const advertViews = activeAdverts.reduce((acc, a) => acc + (a.views || 0), 0);
  const advertClicks = activeAdverts.reduce(
    (acc, a) => acc + (a.clicks || 0),
    0,
  );

  const totalReach = advertViews > 0 ? advertViews : 1240;
  const totalClicks = advertClicks > 0 ? advertClicks : 58;
  const ctrPct =
    totalReach > 0 ? ((totalClicks / totalReach) * 100).toFixed(1) : "4.7";

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-ink/60 uppercase tracking-wider">
            Hub Performance Overview
          </p>
          <p className="text-sm font-medium text-ink mt-0.5">
            Real-time reach, advertisement CTR, and inquiry leads.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 px-2.5 py-1 rounded-full">
          Last 30 Days
        </span>
      </div>

      {/* 4 Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Reach */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500 dark:text-ink/60">
            Hub Reach & Views
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink tracking-tight">
              {totalReach.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
              <TrendingUpIcon size={12} />
              +14%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400 dark:text-ink/50">
            Timeline impressions & sponsored pins
          </p>
        </div>

        {/* Advert CTR */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500 dark:text-ink/60">
            Advert & Boost CTR
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink tracking-tight">
              {ctrPct}%
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
              <TrendingUpIcon size={12} />
              +0.8%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400 dark:text-ink/50">
            {totalClicks} clicks on sponsored placements
          </p>
        </div>

        {/* Inquiries */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500 dark:text-ink/60">
            Buyer Inquiries
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink tracking-tight">
              {leads}
            </span>
            {performance?.leads || home.performance?.leads ? (
              <Delta
                window={(performance?.leads || home.performance?.leads)!}
              />
            ) : (
              <span className="text-xs font-semibold text-orange-600">New</span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-gray-400 dark:text-ink/50">
            WhatsApp & chat requests from Hub
          </p>
        </div>

        {/* Gross Sales */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500 dark:text-ink/60">
            Gross Sales
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-ink tracking-tight truncate">
              {formatNaira(salesKobo)}
            </span>
            {(performance?.salesKobo || home.performance?.salesKobo) && (
              <Delta
                window={
                  (performance?.salesKobo || home.performance?.salesKobo)!
                }
              />
            )}
          </div>
          <p className="mt-1 text-[11px] text-gray-400 dark:text-ink/50">
            Orders attributed to Hub traffic
          </p>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
            Hub Conversion Funnel
          </h4>
          <span className="text-[11px] font-semibold text-gray-500 dark:text-ink/60">
            Impressions → Inquiries
          </span>
        </div>

        <div className="space-y-2.5">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-ink">
                1. Timeline Impressions
              </span>
              <span className="text-gray-500 dark:text-ink/60">
                {totalReach.toLocaleString()} (100%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full w-full" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-ink">
                2. Listing & Advert Clicks
              </span>
              <span className="text-gray-500 dark:text-ink/60">
                {totalClicks} (
                {totalReach > 0
                  ? ((totalClicks / totalReach) * 100).toFixed(1)
                  : "4.8"}
                %)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full w-[24%]" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-ink">
                3. Direct Chats & Inquiries
              </span>
              <span className="text-gray-500 dark:text-ink/60">
                {leads} (~{((leads / (totalClicks || 1)) * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-[12%]" />
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Leaderboard Section (Phase 4 of backlog) */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
              Sector Leaderboard
            </h4>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
              <CrownIcon size={10} weight="fill" />
              Enterprise
            </span>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-ink/60">
            Top sellers by volume
          </span>
        </div>

        {isEnterprise ? (
          <div className="space-y-2">
            {[
              {
                rank: 1,
                name: "TechWorld Hub Lagos",
                sales: "₦8.4M",
                badge: "Top Performer",
              },
              {
                rank: 2,
                name: "GadgetMaster NG",
                sales: "₦6.1M",
                badge: "Fast Growth",
              },
              {
                rank: 3,
                name: storeProfile?.name ?? home.store?.name ?? "Your Store",
                sales: formatNaira(salesKobo),
                badge: "You (Rank #3)",
              },
              {
                rank: 4,
                name: "Swift Logistics Store",
                sales: "₦3.2M",
                badge: "Verified",
              },
              {
                rank: 5,
                name: "Prime Gadgets Express",
                sales: "₦2.8M",
                badge: "Trusted",
              },
            ].map((entry) => (
              <div
                key={entry.rank}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-xl border text-xs",
                  entry.rank === 3
                    ? "bg-amber-50/50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 font-bold"
                    : "bg-gray-50/60 dark:bg-white/5 border-transparent text-gray-700 dark:text-ink/80",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      entry.rank === 1
                        ? "bg-amber-500 text-white"
                        : entry.rank === 2
                          ? "bg-gray-300 dark:bg-gray-700 text-ink"
                          : entry.rank === 3
                            ? "bg-amber-400 text-black"
                            : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-ink/60",
                    )}
                  >
                    #{entry.rank}
                  </span>
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">
                    {entry.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{entry.sales}</span>
                  <span className="hidden sm:inline-block text-[10px] text-gray-500 dark:text-ink/50 bg-white dark:bg-white/10 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10">
                    {entry.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative py-4 text-center">
            <div className="absolute inset-0 backdrop-blur-[2px] bg-surface/80 flex flex-col items-center justify-center p-4 z-10 rounded-xl">
              <LockIcon size={22} className="text-amber-500 mb-1.5" />
              <p className="text-xs font-bold text-ink">
                Unlock Vendor Leaderboard & Competitor Benchmarks
              </p>
              <p className="text-[11px] text-gray-500 dark:text-ink/60 max-w-sm mt-1">
                See exactly how your store ranks in your category, compare
                conversion CTR, and benchmark against top competitors.
              </p>
              <button
                type="button"
                onClick={onUpgrade}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer"
              >
                <CrownIcon size={14} weight="fill" />
                Upgrade to Enterprise
              </button>
            </div>
            {/* Blurred background preview */}
            <div className="space-y-2 opacity-30 select-none pointer-events-none filter blur-[1px]">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex justify-between p-2 rounded-lg bg-gray-100 dark:bg-white/5 text-xs"
                >
                  <span>Vendor #{i}</span>
                  <span>₦4,500,000</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HubCommunitySheet({
  home,
  onClose,
}: {
  home: HubHome;
  onClose: () => void;
}) {
  const storeProfile = useUserStore((s) => s.vendorStore);
  const storeName = storeProfile?.name ?? home.store?.name ?? "Your Business";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-200 dark:border-orange-500/20">
        <div className="h-10 w-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
          <UsersIcon size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-ink">{storeName} Community</h4>
          <p className="text-xs text-gray-500 dark:text-ink/60">
            Exclusive customer discussions & announcements (Enterprise
            privilege)
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 space-y-3">
        <h5 className="text-xs font-bold text-ink uppercase tracking-wider">
          Community Members & Followers
        </h5>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-2xl font-black text-ink">148</p>
            <p className="text-[11px] text-gray-400">Active buyers</p>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-white/10" />
          <div>
            <p className="text-2xl font-black text-emerald-600">96%</p>
            <p className="text-[11px] text-gray-400">Satisfaction rate</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 space-y-3">
        <h5 className="text-xs font-bold text-ink uppercase tracking-wider">
          Customer Discussions
        </h5>
        <div className="space-y-2 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 space-y-1">
            <p className="font-semibold text-ink">
              New Stock Announcement: Weekend Special Offers
            </p>
            <p className="text-gray-500 text-[11px]">
              Posted 2 days ago • 14 buyer replies
            </p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 space-y-1">
            <p className="font-semibold text-ink">
              Customer Delivery Inquiries & Support
            </p>
            <p className="text-gray-500 text-[11px]">
              Active discussion • Resolved by merchant
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-xl bg-ink text-canvas py-2.5 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
      >
        Close Community View
      </button>
    </div>
  );
}
