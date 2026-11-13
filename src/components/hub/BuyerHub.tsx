"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BabyIcon,
  BadgeCheckIcon,
  BellIcon,
  BriefcaseIcon,
  BuildingIcon,
  CameraIcon,
  ChefHatIcon,
  FileTextIcon,
  FlameIcon,
  GiftIcon,
  HeartIcon,
  LeafIcon,
  LockIcon,
  MapPinIcon,
  MonitorIcon,
  PartyPopperIcon,
  PhoneIcon,
  ScaleIcon,
  SendIcon,
  ShieldIcon,
  ShirtIcon,
  ShoppingCartIcon,
  SparklesIcon,
  StarIcon,
  StoreIcon,
  SunIcon,
  TruckIcon,
  UtensilsIcon,
  WrenchIcon,
  ZapIcon,
} from "@/components/icons";
import type { IconComponent } from "@/types/common";
import AnchoredPopover from "@/components/AnchoredPopover";
import { Ellipsis } from "lucide-react";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import { HubLink } from "@/components/hub/HubLink";
import { CardCarousel } from "@/components/search/CardCarousel";
import { HubHero } from "@/components/hub/HubHero";
import {
  SECTOR_BY_VALUE,
  SECTOR_CATEGORY_BY_LABEL,
  SECTOR_TAXONOMY,
} from "@/lib/sectors";
import {
  EnterpriseAvatarBadge,
  EnterpriseBadge,
  isEnterpriseVendor,
} from "@/components/EnterpriseBadge";
import { modalScrimClass } from "@/lib/modalScrim";
import { cn, isNewListing, timeAgo } from "@/lib/utils";
import type {
  HubBroadcastPrefs,
  HubBuyerBroadcast,
  HubCommunityPost,
  HubFeaturedVendor,
  HubHome,
  HubSocial,
  HubTimelineItem,
} from "@/types/hub";
import TabBar from "@/components/TabBar";
import { HubLockedModal } from "./HubLockedModal";
import { PosterPreviewLightbox } from "@/components/hub/ProtectedPosterPreview";
import { useUserStore } from "@/store/userStore";
import { useBuyerStore } from "@/store/buyerStore";
import {
  assembleHubFeed,
  isBoostedProduct,
  isSponsoredAdvert,
} from "@/lib/hubFeed";
import {
  subscribeToHubNewListings,
  syncHubKnownListingIds,
} from "@/lib/hubSync";
import { trackHubAdvert } from "@/lib/advertTracker";
import { useHubWebSocket } from "@/hooks/useHubWebSocket";
import { NewPostsIndicator } from "./NewPostsIndicator";
import { toast } from "sonner";

type ContactTarget = {
  vendorId: string;
  name: string;
  handle: string | null;
  avatar: string | null;
  imageUrl: string | null;
  description: string | null;
  sectors: string[];
  place: string | null;
  verified: boolean;
  tier?: string;
  isEnterprise?: boolean;
  enterprise?: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  whatsapp: string | null;
  social: HubSocial | null;
  trusted: boolean;
  fastDelivery: boolean;
  sentiment: { rating: number; text: string } | null;
  reviewableOrderId: string | null;
};

function sectorLabel(value: string) {
  return SECTOR_BY_VALUE[value]?.label ?? value.replace(/_/g, " ");
}

const CATEGORY_ICON: Record<string, IconComponent> = {
  food_hospitality: UtensilsIcon,
  event_services: PartyPopperIcon,
  retail_trade: ShoppingCartIcon,
  fashion_apparel: ShirtIcon,
  electronics_technology: MonitorIcon,
  beauty_personal_care: SparklesIcon,
  home_living: BuildingIcon,
  building_construction: WrenchIcon,
  automotive: TruckIcon,
  repairs_technical: WrenchIcon,
  professional_business_services: BriefcaseIcon,
  education_training: FileTextIcon,
  transportation_logistics: TruckIcon,
  arts_media_entertainment: CameraIcon,
  home_services_domestic: SparklesIcon,
};

const LEAF_ICON: Record<string, IconComponent> = {
  bakery_pastries: ChefHatIcon,
  confectionery_snacks: ChefHatIcon,
  bars_lounges_nightlife: FlameIcon,
  shoes_footwear: ShoppingCartIcon,
  bags_accessories: GiftIcon,
  jewelry_watches: SparklesIcon,
  phones_accessories: PhoneIcon,
  phone_gadget_repairs: PhoneIcon,
  computers_laptops: MonitorIcon,
  solar_installation: SunIcon,
  generator_sales_repair: ZapIcon,
  electrical_installation_services: ZapIcon,
  real_estate_property_sales: BuildingIcon,
  hotels_shortlets: BuildingIcon,
  groceries_supermarket: ShoppingCartIcon,
  gift_items_souvenirs: GiftIcon,
  legal_services: ScaleIcon,
  photography_videography: CameraIcon,
  daycare_creche: BabyIcon,
  toys_kids_items: BabyIcon,
  gardening_landscaping: LeafIcon,
  security_services: ShieldIcon,
};

const CATEGORY_BY_SECTOR = Object.fromEntries(
  SECTOR_TAXONOMY.flatMap((category) =>
    category.sectors.map((sector) => [sector.value, category.id]),
  ),
);

// Store.sectors is the display name ("Bakery & Pastries"), not the slug.
const SLUG_BY_LABEL = Object.fromEntries(
  Object.entries(SECTOR_BY_VALUE).map(([slug, leaf]) => [
    leaf.label.trim().toLowerCase(),
    slug,
  ]),
);

function sectorSlug(value: string) {
  const raw = value.trim();
  if (SECTOR_BY_VALUE[raw]) return raw;
  return SLUG_BY_LABEL[raw.toLowerCase()] ?? null;
}

/** Parent taxonomy group for a store sector value (slug or display label). */
function sectorGroupId(value: string): string | null {
  const byLabel = SECTOR_CATEGORY_BY_LABEL[value];
  if (byLabel) return byLabel;
  const slug = sectorSlug(value);
  if (!slug) return null;
  return CATEGORY_BY_SECTOR[slug] ?? null;
}

function inSectorGroup(values: string[] | undefined, groupId: string) {
  return (values ?? []).some((value) => sectorGroupId(value) === groupId);
}

function sectorIcon(value: string) {
  if (CATEGORY_ICON[value]) return CATEGORY_ICON[value];
  const slug = sectorSlug(value);
  if (!slug) return StoreIcon;
  return (
    LEAF_ICON[slug] ?? CATEGORY_ICON[CATEGORY_BY_SECTOR[slug]] ?? StoreIcon
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "V";
}

function Stars({ avg, count }: { avg: number | null; count: number }) {
  const rated = count > 0 && avg != null;
  const filled = rated ? Math.round(avg) : 0;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
      <span className="inline-flex">
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon
            key={index}
            size={12}
            weight={index < filled ? "fill" : "regular"}
            className={index < filled ? "text-amber-500" : "text-gray-300"}
          />
        ))}
      </span>
      {rated && (
        <span className="font-semibold text-ink">{avg.toFixed(1)}</span>
      )}
      <span>({count})</span>
    </span>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
      <BadgeCheckIcon size={12} />
      Verified Vendor
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

function contactFromFeatured(vendor: HubFeaturedVendor): ContactTarget {
  return {
    vendorId: vendor.vendorId,
    name: vendor.name,
    handle: vendor.handle,
    avatar: vendor.avatar,
    imageUrl: vendor.imageUrl,
    description: vendor.description,
    sectors: vendor.sectors,
    place: vendor.place,
    verified: vendor.verified,
    tier: vendor.tier,
    isEnterprise: isEnterpriseVendor(vendor),
    enterprise: isEnterpriseVendor(vendor),
    ratingAvg: vendor.ratingAvg,
    ratingCount: vendor.ratingCount,
    whatsapp: vendor.whatsapp,
    social: vendor.social,
    trusted: vendor.trusted,
    fastDelivery: vendor.fastDelivery,
    sentiment: vendor.sentiment,
    reviewableOrderId: vendor.reviewableOrderId,
  };
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

function contactFromItem(item: HubTimelineItem): ContactTarget {
  return {
    vendorId: item.vendorId,
    name: item.storeName || "Vendor",
    handle: item.storeHandle,
    avatar: item.avatar,
    imageUrl: item.imageUrl,
    description: item.body,
    sectors: item.sectors,
    place: item.place,
    verified: item.verified,
    tier: item.tier,
    isEnterprise: isEnterpriseVendor(item),
    enterprise: isEnterpriseVendor(item),
    ratingAvg: item.ratingAvg,
    ratingCount: item.ratingCount,
    whatsapp: item.whatsapp,
    social: item.social,
    trusted: item.trusted,
    fastDelivery: item.fastDelivery,
    sentiment: item.sentiment,
    reviewableOrderId: item.reviewableOrderId,
  };
}

type MobilePane = "listings" | "vendors";

function FeaturedVendorsPanel({
  vendors,
  vendorCap,
  vendorsCapped,
  favourites,
  premium,
  onContact,
  onFavourite,
  onViewAll,
  onUpgrade,
}: {
  vendors: HubFeaturedVendor[];
  vendorCap: number;
  vendorsCapped: boolean;
  favourites: Set<string>;
  premium: boolean;
  onContact: (vendor: HubFeaturedVendor) => void;
  onFavourite: (vendorId: string) => void;
  onViewAll: () => void;
  onUpgrade: () => void;
}) {
  return (
    <section className="bg-surface border border-gray-200 rounded-none lg:rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-ink">Featured Vendors</h3>
        {vendors.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            View all →
          </button>
        )}
      </div>
      {vendors.length === 0 ? (
        <p className="text-xs text-gray-500 py-4 text-center">
          Vendors show up here as they publish a store.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {vendors.slice(0, vendorCap).map((vendor) => (
            <li key={vendor.vendorId}>
              <div className="w-full flex items-center gap-3 py-2.5 text-left">
                <div className="relative shrink-0">
                  <Avatar
                    name={vendor.name}
                    src={vendor.avatar}
                    className="h-10 w-10 rounded-full text-xs shrink-0"
                  />
                  {isEnterpriseVendor(vendor) && (
                    <EnterpriseAvatarBadge size="sm" />
                  )}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-ink truncate">
                      {vendor.name}
                    </span>
                    {isEnterpriseVendor(vendor) && (
                      <EnterpriseBadge size="sm" />
                    )}
                    {vendor.verified && (
                      <BadgeCheckIcon
                        size={14}
                        className="text-sky-500 shrink-0"
                      />
                    )}
                  </span>
                  <Stars avg={vendor.ratingAvg} count={vendor.ratingCount} />
                  {vendor.sentiment && (
                    <span className="block text-[11px] text-gray-600 line-clamp-2 mt-0.5">
                      {vendor.sentiment.rating}/5 · {vendor.sentiment.text}
                    </span>
                  )}
                  {vendor.trusted && (
                    <span className="text-[11px] font-semibold text-emerald-700">
                      Trusted check
                    </span>
                  )}
                  {vendor.fastDelivery && (
                    <span className="text-[11px] font-semibold text-sky-700">
                      Fast delivery
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onContact(vendor)}
                    className="mt-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700"
                  >
                    Contact card
                  </button>
                  {vendor.place && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                      <MapPinIcon size={11} />
                      <span className="truncate">{vendor.place}</span>
                    </span>
                  )}
                </span>
                <span className="flex flex-col items-end gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label={
                      favourites.has(vendor.vendorId)
                        ? "Remove favourite"
                        : "Favourite"
                    }
                    onClick={() => onFavourite(vendor.vendorId)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-600"
                  >
                    {!premium ? (
                      <LockIcon size={12} />
                    ) : (
                      <HeartIcon
                        size={13}
                        className={cn(
                          favourites.has(vendor.vendorId) &&
                            "text-orange-600 fill-orange-500",
                        )}
                      />
                    )}
                  </button>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md",
                      vendor.sponsored
                        ? "text-orange-600 bg-orange-50"
                        : "text-gray-500 bg-gray-100",
                    )}
                  >
                    {vendor.sponsored ? "Sponsored" : "Featured"}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {vendorsCapped && (
        <div className="mt-3">
          <PremiumUpgradeBanner
            compact
            title="See more vendors"
            body={`Basic shows ${vendorCap}. Premium unlocks the full list.`}
            onUpgrade={onUpgrade}
          />
        </div>
      )}
    </section>
  );
}

export function BuyerHub({ home: initialHome }: { home: HubHome }) {
  const { navigate } = useNavigation();
  const vendor = useUserStore((s) => s.user);
  const buyer = useBuyerStore((s) => s.buyer);
  const isVendorAccount = Boolean(vendor || buyer?.linkedVendorId);
  const home = useMemo(
    () => (isVendorAccount ? { ...initialHome, premium: true } : initialHome),
    [initialHome, isVendorAccount],
  );
  const [sector, setSector] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<MobilePane>("listings");
  const [advertLightboxSrc, setAdvertLightboxSrc] = useState<string | null>(
    null,
  );
  const [contact, setContact] = useState<ContactTarget | null>(null);
  const [lock, setLock] = useState<
    | "contact"
    | "visit"
    | "community"
    | "place"
    | "boost"
    | "broadcast"
    | "sectors"
    | "favourite"
    | null
  >(null);
  const [displayedTimeline, setDisplayedTimeline] = useState<HubTimelineItem[]>(
    () => (home.timeline ?? []).filter((item) => !isTestItem(item)),
  );
  const [pendingUpdates, setPendingUpdates] = useState<HubTimelineItem[]>([]);
  const [posts, setPosts] = useState(home.community ?? []);
  const [favourites, setFavourites] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    for (const vendor of home.featured)
      if (vendor.favourite) ids.add(vendor.vendorId);
    for (const item of home.timeline)
      if (item.favourite) ids.add(item.vendorId);
    return ids;
  });
  const [prefs, setPrefs] = useState<HubBroadcastPrefs>(
    home.broadcastPrefs ?? { promoEnabled: false, promoSectors: [] },
  );
  const [buyerBroadcasts, setBuyerBroadcasts] = useState<HubBuyerBroadcast[]>(
    home.buyerBroadcasts ?? [],
  );
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [placeVendorId, setPlaceVendorId] = useState("");
  const [placeHeadline, setPlaceHeadline] = useState("");
  const [placeBlurb, setPlaceBlurb] = useState("");
  const [placeImage, setPlaceImage] = useState("");
  const [placing, setPlacing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [postBody, setPostBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitSaved, setVisitSaved] = useState(false);
  const [visit, setVisit] = useState({
    visited: false,
    stockSeen: false,
    addressMatched: false,
    note: "",
  });
  const [savingVisit, setSavingVisit] = useState(false);
  const [reviewWait, setReviewWait] = useState(false);
  const visitIntent = useRef(false);

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

  // Real-time WebSocket connection: receives new listings, in-place UI edits, and clock ticks
  const { now } = useHubWebSocket({
    knownListingIds,
    onNewListings: handleIncomingNewListings,
    onListingUpdated: handleListingUpdated,
    onListingRemoved: handleListingRemoved,
  });

  // Auto pagination state
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const buyerSentinelRef = useRef<HTMLDivElement>(null);

  // Initialize displayed timeline from home
  useEffect(() => {
    if (!home.timeline || home.timeline.length === 0) return;
    const cleanTimeline = home.timeline.filter((item) => !isTestItem(item));
    setDisplayedTimeline((prev) =>
      prev.length === 0
        ? cleanTimeline
        : prev.filter((item) => !isTestItem(item)),
    );
    syncHubKnownListingIds(cleanTimeline.map((item) => item.id));
  }, [home.timeline]);

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

  useEffect(() => {
    setVisitSaved(false);
    setReviewRating(5);
    setReviewText("");
    setVisitOpen(visitIntent.current && home.premium);
    visitIntent.current = false;
  }, [contact?.vendorId, home.premium]);

  const sectorGroups = useMemo(() => {
    const counts = new Map<string, number>();
    const bump = (values: string[] | undefined) => {
      const groups = new Set(
        (values ?? [])
          .map((value) => sectorGroupId(value))
          .filter((id): id is string => Boolean(id)),
      );
      for (const groupId of groups) {
        counts.set(groupId, (counts.get(groupId) || 0) + 1);
      }
    };
    for (const vendor of home.featured) bump(vendor.sectors);
    for (const item of displayedTimeline) bump(item.sectors);
    return SECTOR_TAXONOMY.map((category) => ({
      id: category.id,
      label: category.label,
      count: counts.get(category.id) || 0,
    }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [home.featured, displayedTimeline]);

  const feed = useMemo(() => {
    let items = displayedTimeline.filter((item) => item.kind !== "update");
    if (sector)
      items = items.filter((item) => inSectorGroup(item.sectors, sector));
    // Assembles feed so sponsored listings/ads come first and appear more frequently,
    // with newest updates first!
    return assembleHubFeed(items);
  }, [displayedTimeline, sector]);

  const visibleFeed = useMemo(
    () => feed.slice(0, visibleCount),
    [feed, visibleCount],
  );
  const hasMore = visibleCount < feed.length;

  useEffect(() => {
    const sentinel = buyerSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, feed.length));
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
  }, [hasMore, isLoadingMore, feed.length]);

  const featured = useMemo(() => {
    let list = home.featured;
    if (sector)
      list = home.featured.filter((vendor) =>
        inSectorGroup(vendor.sectors, sector),
      );
    // Sponsored listings appear first
    return [...list].sort((a, b) => {
      if (a.sponsored && !b.sponsored) return -1;
      if (!a.sponsored && b.sponsored) return 1;
      return 0;
    });
  }, [home.featured, sector]);

  const updates = useMemo(
    () =>
      displayedTimeline.filter((item) => item.kind === "update").slice(0, 3),
    [displayedTimeline],
  );

  const advertVendors = useMemo(() => {
    const byId = new Map<
      string,
      { vendorId: string; name: string; images: string[] }
    >();
    const add = (
      vendorId: string,
      name: string,
      urls: Array<string | null | undefined>,
    ) => {
      if (!vendorId) return;
      const current = byId.get(vendorId) ?? { vendorId, name, images: [] };
      if (!current.name && name) current.name = name;
      for (const url of urls) {
        if (url && !current.images.includes(url)) current.images.push(url);
      }
      byId.set(vendorId, current);
    };
    for (const vendor of home.featured)
      add(vendor.vendorId, vendor.name, [vendor.imageUrl]);
    for (const item of displayedTimeline) {
      add(item.vendorId, item.storeName || "Vendor", [
        item.imageUrl,
        ...(item.images ?? []),
      ]);
    }
    return [...byId.values()].filter((vendor) => vendor.images.length > 0);
  }, [home.featured, displayedTimeline]);

  const chosenVendor =
    advertVendors.find((vendor) => vendor.vendorId === placeVendorId) ?? null;

  const openContact = (target: ContactTarget) => {
    if (!isEnterpriseVendor(target)) {
      toast.error("Messaging is only available for Enterprise vendors.");
      return;
    }
    if (!home.premium) {
      setLock("contact");
      return;
    }
    setContact(target);
  };

  const openVisit = (target: ContactTarget) => {
    if (!home.premium) {
      setLock("visit");
      return;
    }
    visitIntent.current = true;
    setContact(target);
  };

  const openReview = (target: ContactTarget) => {
    if (!target.reviewableOrderId) {
      setReviewWait(true);
      return;
    }
    setContact(target);
  };

  const askContact = () => {
    if (!contact) return;
    if (!isEnterpriseVendor(contact)) {
      toast.error("Messaging is only available for Enterprise vendors.");
      return;
    }
    if (!home.premium) {
      setLock("contact");
      return;
    }
    if (!contact.whatsapp) return;
    const digits = contact.whatsapp.replace(/\D/g, "");
    if (!digits) return;
    window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
  };

  const toggleFavourite = async (vendorId: string) => {
    if (!home.premium) {
      setLock("favourite");
      return;
    }
    const saved = favourites.has(vendorId);
    const res = await fetch(
      saved ? `/api/hub/favourites/${vendorId}` : "/api/hub/favourites",
      {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: saved ? undefined : JSON.stringify({ vendorId }),
      },
    );
    if (res.status === 403) {
      setLock("favourite");
      return;
    }
    if (!res.ok) return;
    setFavourites((current) => {
      const next = new Set(current);
      if (saved) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  };

  const boostAdvert = async (advertId: string) => {
    if (!home.premium) {
      setLock("boost");
      return;
    }
    const res = await fetch(`/api/hub/adverts/${advertId}/boost`, {
      method: "POST",
    });
    if (res.status === 403) {
      setLock("boost");
      return;
    }
    if (!res.ok) return;
    setNotice("Boost queued");
  };

  const openPlace = () => {
    if (!home.premium) {
      setLock("place");
      return;
    }
    const first = advertVendors[0];
    setPlaceVendorId(first?.vendorId ?? "");
    setPlaceImage(first?.images[0] ?? "");
    setPlaceHeadline("");
    setPlaceBlurb("");
    setPlaceOpen(true);
  };

  const submitPlace = async () => {
    if (
      !placeVendorId ||
      !placeImage ||
      placeHeadline.trim().length < 2 ||
      placing
    )
      return;
    setPlacing(true);
    try {
      const res = await fetch("/api/hub/buyer-adverts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: placeVendorId,
          imageUrl: placeImage,
          headline: placeHeadline.trim(),
          blurb: placeBlurb.trim(),
        }),
      });
      if (res.status === 403) {
        setPlaceOpen(false);
        setLock("place");
        return;
      }
      if (!res.ok) return;
      const advertData = (await res.json().catch(() => null)) as {
        advert?: { id: string };
      } | null;
      setPlaceOpen(false);
      setNotice("Advert placed");
      const chosen = chosenVendor;
      const newAdvertItem: HubTimelineItem = {
        id: advertData?.advert?.id || `advert-${Date.now()}`,
        vendorId: placeVendorId,
        kind: "promotion",
        at: new Date().toISOString(),
        title: placeHeadline.trim(),
        body: placeBlurb.trim() || null,
        imageUrl: placeImage,
        storeName: chosen?.name || "Vendor",
        storeHandle: chosen?.name
          ? chosen.name.toLowerCase().replace(/\s+/g, "")
          : null,
        avatar: chosen?.images?.[0] || null,
        verified: true,
        sponsored: true,
        sectors: [],
        place: null,
        images: [placeImage],
        ratingAvg: null,
        ratingCount: 0,
        whatsapp: null,
        social: null,
        advertId: advertData?.advert?.id || `ad-${Date.now()}`,
        placedByBuyer: true,
        fastDelivery: false,
        favourite: false,
        trusted: true,
        sentiment: null,
        reviewableOrderId: null,
        tier: undefined,
      };
      setDisplayedTimeline((prev) => [newAdvertItem, ...prev]);
    } finally {
      setPlacing(false);
    }
  };

  const submitBroadcast = async () => {
    const message = broadcastBody.trim();
    if (message.length < 2 || broadcasting) return;
    if (!home.premium) {
      setLock("broadcast");
      return;
    }
    setBroadcasting(true);
    try {
      const res = await fetch("/api/hub/buyer-broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.status === 403) {
        setLock("broadcast");
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        id?: string;
        audienceCount?: number;
        status?: "queued";
      };
      setBuyerBroadcasts((current) => [
        {
          id: data.id ?? message,
          body: message,
          at: new Date().toISOString(),
          audienceCount: data.audienceCount ?? 0,
          status: "queued",
        },
        ...current,
      ]);
      setBroadcastBody("");
      setNotice(
        `Queued · ${data.audienceCount ?? 0} ${
          (data.audienceCount ?? 0) === 1 ? "contact" : "contacts"
        }`,
      );
    } finally {
      setBroadcasting(false);
    }
  };

  const savePrefs = async (next: HubBroadcastPrefs, includeSectors = false) => {
    const previous = prefs;
    setPrefs(next);
    const res = await fetch("/api/hub/broadcast-prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        includeSectors ? next : { promoEnabled: next.promoEnabled },
      ),
    });
    if (res.status === 403) {
      setPrefs(previous);
      setLock("broadcast");
      return;
    }
    if (!res.ok) {
      setPrefs(previous);
      return;
    }
    const data = (await res.json()) as HubBroadcastPrefs;
    if (typeof data.promoEnabled === "boolean") setPrefs(data);
  };

  const reportPost = async (id: string) => {
    const res = await fetch(`/api/trust/community/${id}/report`, {
      method: "POST",
    });
    if (res.ok) setPosts((current) => current.filter((post) => post.id !== id));
  };

  const showMobileVendors = mobilePane === "vendors";
  const vendorCap = home.hubPreview?.vendorCap ?? 6;
  const vendorsCapped = Boolean(home.hubPreview?.vendorsCapped);

  const featuredPanelProps = {
    vendors: featured,
    vendorCap,
    vendorsCapped,
    favourites,
    premium: home.premium,
    onContact: (vendor: HubFeaturedVendor) =>
      openContact(contactFromFeatured(vendor)),
    onFavourite: toggleFavourite,
    onViewAll: () => navigate("/hub/vendors"),
    onUpgrade: () => navigate("/pricing?for=buyers"),
  };

  return (
    <div className="w-full">
      <HubHero
        eyebrow="Vendor Hub"
        title={
          <>
            Discover amazing
            <br />
            local businesses
          </>
        }
        subtitle="Find trusted vendors, great products and services, all in one place. Shop local. Support real businesses."
        photo="/hub/buyer-hub-purchase.jpg"
      />

      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
          <div className="min-w-0 space-y-4">
            <BuyerTools
              home={home}
              prefs={prefs}
              broadcasts={buyerBroadcasts}
              body={broadcastBody}
              sending={broadcasting}
              notice={notice}
              onBody={setBroadcastBody}
              onSend={submitBroadcast}
              onPlace={openPlace}
              onPrefs={savePrefs}
              onLock={(kind) => setLock(kind)}
            />

            {/* Mobile Listings / Featured Vendors — ThemeToggle / TabBar shell */}
            <div className="lg:hidden px-4">
              <TabBar
                fullWidth
                tabs={[
                  { key: "listings", label: "Listings" },
                  { key: "vendors", label: "Featured Vendors" },
                ]}
                activeTab={mobilePane}
                onChange={setMobilePane}
              />
            </div>

            <div id="hub-vendors" className="scroll-mt-4">
              <CardCarousel
                items={[
                  {
                    key: "all",
                    label: "All sectors",
                    icon: StoreIcon,
                    active: sector === null,
                    onClick: () => setSector(null),
                  },
                  ...sectorGroups.map((row) => ({
                    key: row.id,
                    label: row.label,
                    icon: sectorIcon(row.id),
                    active: sector === row.id,
                    onClick: () => setSector(row.id),
                  })),
                ]}
                getKey={(item) => item.key}
                slideClassName="w-auto"
                renderItem={(item) => (
                  <SectorChip
                    active={item.active}
                    icon={item.icon}
                    label={item.label}
                    onClick={item.onClick}
                  />
                )}
              />
            </div>

            <div className={cn("lg:hidden", !showMobileVendors && "hidden")}>
              <FeaturedVendorsPanel {...featuredPanelProps} />
            </div>

            <div
              className={cn(
                "space-y-4",
                showMobileVendors && "hidden lg:block",
              )}
            >
              <CommunityPanel
                home={home}
                posts={posts}
                updates={updates}
                now={now}
                postBody={postBody}
                posting={posting}
                onPostBody={setPostBody}
                onPosted={(post) => setPosts((current) => [post, ...current])}
                onReport={reportPost}
                onLock={() => setLock("community")}
                onPosting={setPosting}
              />

              <NewPostsIndicator
                count={pendingUpdates.length}
                onClick={handleApplyUpdates}
                label={
                  pendingUpdates.length === 1
                    ? "1 new product"
                    : `${pendingUpdates.length} new products`
                }
              />

              {feed.length === 0 ? (
                <div className="bg-surface border border-gray-200 rounded-none lg:rounded-2xl p-10 text-center">
                  <p className="font-semibold text-ink">
                    Nothing in this view yet
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Listings and labelled promotions show up as vendors publish
                    them.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                    {visibleFeed.map((item, index) => {
                      const cardKey = `${item.id}-${index}`;
                      const fadeLast =
                        Boolean(home.hubPreview?.listingsCapped) &&
                        index === visibleFeed.length - 1;
                      const fullWidth = item.sponsored || fadeLast;
                      const card = (
                        <FeedCard
                          item={item}
                          now={now}
                          premium={home.premium}
                          favourite={favourites.has(item.vendorId)}
                          compact={!item.sponsored}
                          onContact={() => openContact(contactFromItem(item))}
                          onVisit={() => openVisit(contactFromItem(item))}
                          onReview={() => openReview(contactFromItem(item))}
                          onFavourite={() => toggleFavourite(item.vendorId)}
                          onBoost={
                            item.advertId
                              ? () => boostAdvert(item.advertId as string)
                              : undefined
                          }
                          onOpenAdvertImage={setAdvertLightboxSrc}
                        />
                      );
                      if (!fadeLast) {
                        return (
                          <div
                            key={cardKey}
                            className={
                              fullWidth ? "col-span-2 lg:col-span-1" : undefined
                            }
                          >
                            {card}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={cardKey}
                          className="relative col-span-2 lg:col-span-1 overflow-hidden rounded-none lg:rounded-2xl"
                        >
                          <div
                            aria-hidden
                            className="pointer-events-none select-none blur-[2px] opacity-50 saturate-50 [mask-image:linear-gradient(to_bottom,black_0%,black_35%,transparent_100%)]"
                          >
                            {card}
                          </div>
                          <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 pt-16 bg-gradient-to-t from-canvas via-canvas/90 to-transparent">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/hub/premium-listings.jpg"
                              alt=""
                              className="h-14 w-14 rounded-2xl object-cover shadow-sm ring-1 ring-black/5"
                            />
                            <p className="mt-3 text-sm font-bold text-ink text-center px-4">
                              More products waiting
                            </p>
                            <p className="mt-1 text-xs text-gray-600 text-center px-6 max-w-sm leading-relaxed">
                              Upgrade to Premium to browse every listing vendors
                              put on Hub.
                            </p>
                            <button
                              type="button"
                              onClick={() => navigate("/pricing?for=buyers")}
                              className="mt-3 inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-orange-600 transition-colors shadow-sm"
                            >
                              Upgrade to Premium
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Auto pagination sentinel */}
                  {hasMore && (
                    <div
                      ref={buyerSentinelRef}
                      className="py-6 flex items-center justify-center text-xs text-gray-500 gap-2"
                    >
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                      <span>Loading more listings…</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className="hidden lg:block space-y-4 lg:self-stretch">
            <FeaturedVendorsPanel {...featuredPanelProps} />

            <div className="space-y-4 lg:sticky lg:top-16">
              <section className="bg-surface border border-gray-200 rounded-none lg:rounded-2xl p-4">
                <h3 className="text-sm font-bold text-ink mb-3">
                  Popular Sectors
                </h3>
                {sectorGroups.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Sectors appear once stores choose them.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {sectorGroups.slice(0, 6).map((row) => {
                      const Icon = sectorIcon(row.id);
                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => setSector(row.id)}
                          className={cn(
                            "rounded-xl border px-3 py-3 text-left transition-colors",
                            sector === row.id
                              ? "border-orange-300 bg-orange-50"
                              : "border-gray-200 bg-surface hover:border-orange-200",
                          )}
                        >
                          <Icon size={16} className="text-orange-500" />
                          <span className="mt-2 block text-xs font-semibold text-ink leading-snug">
                            {row.label}
                          </span>
                          <span className="block text-[11px] text-gray-500 mt-0.5">
                            {row.count} {row.count === 1 ? "vendor" : "vendors"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-none lg:rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <h3 className="text-sm font-bold text-ink">
                  Support Local Business
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Shop from vendors who list on Velte. A sponsored card is
                  labelled. Ratings appear only after a real review.
                </p>
              </section>
            </div>
          </aside>
        </div>
      </div>

      {contact && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={contact.name}
          className={cn(
            "fixed inset-0 z-50 h-dvh w-dvw flex items-end sm:items-center justify-center p-4",
            modalScrimClass(),
          )}
          onClick={() => setContact(null)}
        >
          <div
            className="bg-surface w-full sm:max-w-md rounded-2xl border border-gray-200 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <Avatar
                name={contact.name}
                src={contact.avatar}
                className="h-12 w-12 rounded-full text-sm shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-ink truncate">
                    {contact.name}
                  </h3>
                  {contact.verified && (
                    <BadgeCheckIcon
                      size={16}
                      className="text-sky-500 shrink-0"
                    />
                  )}
                </div>
                {contact.sectors[0] && (
                  <p className="text-xs text-gray-500">
                    {sectorLabel(contact.sectors[0])}
                  </p>
                )}
                <Stars avg={contact.ratingAvg} count={contact.ratingCount} />
              </div>
            </div>
            {contact.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={contact.imageUrl}
                alt=""
                className="mt-4 h-40 w-full object-cover rounded-xl bg-gray-100"
              />
            )}
            {contact.description && (
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                {contact.description}
              </p>
            )}
            {(contact.verified || contact.trusted) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {contact.verified && <VerifiedBadge />}
                {contact.trusted && (
                  <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                    Trusted check
                  </p>
                )}
              </div>
            )}
            {contact.sentiment && (
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                <span className="font-semibold text-ink">
                  {contact.sentiment.rating}/5
                </span>
                {" · "}
                {contact.sentiment.text}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {isEnterpriseVendor(contact) && (
                <button
                  type="button"
                  onClick={askContact}
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  {home.premium
                    ? "Message on WhatsApp"
                    : "Contact this business"}
                </button>
              )}
              {contact.handle && (
                <Link
                  href={`/store/${contact.handle}`}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-ink hover:border-orange-300"
                >
                  View store
                </Link>
              )}
            </div>
            {home.premium && !contact.whatsapp && (
              <p className="mt-2 text-xs text-gray-500">
                This business has not added a WhatsApp number.
              </p>
            )}
            {contact.social && <SocialLinks social={contact.social} />}
            {contact.fastDelivery && (
              <p className="mt-2 text-xs font-semibold text-sky-700">
                Fast delivery
              </p>
            )}
            {contact.reviewableOrderId && (
              <form
                className="mt-4 space-y-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (reviewing) return;
                  setReviewing(true);
                  try {
                    const res = await fetch("/api/trust/reviews", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        orderId: contact.reviewableOrderId,
                        kind: "vendor",
                        rating: reviewRating,
                        text: reviewText,
                      }),
                    });
                    if (!res.ok) return;
                    const text = reviewText.trim();
                    setContact({
                      ...contact,
                      reviewableOrderId: null,
                      sentiment: text
                        ? { rating: reviewRating, text }
                        : contact.sentiment,
                    });
                    setReviewText("");
                  } finally {
                    setReviewing(false);
                  }
                }}
              >
                <p className="text-xs font-semibold text-ink">
                  Rate this vendor
                </p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReviewRating(value)}
                      className={cn(
                        "h-8 w-8 rounded-md text-sm font-semibold",
                        value <= reviewRating
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="How was dealing with this seller?"
                  className="w-full rounded-xl border border-gray-200 bg-surface px-3 py-2 text-sm text-ink placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  disabled={reviewing}
                  className="w-full rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
                >
                  {reviewing ? "Saving…" : "Save vendor review"}
                </button>
              </form>
            )}
            {home.premium && visitOpen ? (
              <form
                className="mt-4 space-y-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (savingVisit) return;
                  setSavingVisit(true);
                  try {
                    const res = await fetch("/api/trust/validations", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        vendorId: contact.vendorId,
                        visited: visit.visited,
                        stockSeen: visit.stockSeen,
                        addressMatched: visit.addressMatched,
                        note: visit.note,
                      }),
                    });
                    if (res.status === 403) {
                      setLock("visit");
                      return;
                    }
                    if (!res.ok) return;
                    setVisitSaved(true);
                    setVisitOpen(false);
                  } finally {
                    setSavingVisit(false);
                  }
                }}
              >
                {(
                  [
                    ["visited", "I visited"],
                    ["stockSeen", "I saw the stock"],
                    ["addressMatched", "The address matched"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-sm text-ink"
                  >
                    <input
                      type="checkbox"
                      checked={visit[key]}
                      onChange={(event) =>
                        setVisit((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
                <textarea
                  value={visit.note}
                  onChange={(event) =>
                    setVisit((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  rows={2}
                  maxLength={400}
                  placeholder="Note"
                  className="w-full rounded-xl border border-gray-200 bg-surface px-3 py-2 text-sm text-ink placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  disabled={savingVisit}
                  className="w-full rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
                >
                  {savingVisit ? "Saving…" : "Save visit check"}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() =>
                  home.premium ? setVisitOpen(true) : setLock("visit")
                }
                className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-ink hover:border-orange-300"
              >
                {visitSaved ? "Visit check saved" : "Visit check"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setContact(null)}
              className="mt-3 w-full text-xs font-semibold text-gray-500 hover:text-ink"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {placeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Place an advert"
          className={cn(
            "fixed inset-0 z-[70] h-dvh w-dvw flex items-end sm:items-center justify-center p-4",
            modalScrimClass(contact !== null),
          )}
          onClick={() => setPlaceOpen(false)}
        >
          <div
            className="bg-surface w-full sm:max-w-md rounded-2xl border border-gray-200 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-bold text-ink">Place an advert</h3>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              It stays at the top, labelled sponsored, and marked placed by a
              buyer. The commission amount is not set, so no naira figure is
              shown.
            </p>
            {advertVendors.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                No vendor on this page has a photo yet. An advert uses a photo
                already on that store.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-ink">
                  Vendor
                  <select
                    value={placeVendorId}
                    onChange={(event) => {
                      const next = advertVendors.find(
                        (vendor) => vendor.vendorId === event.target.value,
                      );
                      setPlaceVendorId(event.target.value);
                      setPlaceImage(next?.images[0] ?? "");
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm text-ink"
                  >
                    {advertVendors.map((vendor) => (
                      <option key={vendor.vendorId} value={vendor.vendorId}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </label>
                {chosenVendor && (
                  <div className="flex gap-2 overflow-x-auto">
                    {chosenVendor.images.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setPlaceImage(url)}
                        className={cn(
                          "shrink-0 rounded-lg border p-0.5",
                          placeImage === url
                            ? "border-orange-500"
                            : "border-gray-200",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="h-16 w-16 rounded-md object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
                <input
                  value={placeHeadline}
                  onChange={(event) => setPlaceHeadline(event.target.value)}
                  maxLength={80}
                  placeholder="Headline"
                  className="w-full rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm text-ink"
                />
                <textarea
                  value={placeBlurb}
                  onChange={(event) => setPlaceBlurb(event.target.value)}
                  maxLength={280}
                  rows={3}
                  placeholder="Short blurb"
                  className="w-full rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm text-ink"
                />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPlaceOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  placing ||
                  !placeVendorId ||
                  !placeImage ||
                  placeHeadline.trim().length < 2
                }
                onClick={submitPlace}
                className="flex-1 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
              >
                {placing ? "Placing…" : "Place advert"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewWait && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Review"
          className={cn(
            "fixed inset-0 z-[70] h-dvh w-dvw flex items-center justify-center p-4",
            modalScrimClass(contact !== null),
          )}
          onClick={() => setReviewWait(false)}
        >
          <div
            className="bg-surface rounded-2xl shadow-xl max-w-sm w-full p-6 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-lg font-bold text-ink tracking-tight">Review</p>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              A review opens after you confirm an order with this business.
            </p>
            <button
              type="button"
              onClick={() => setReviewWait(false)}
              className="mt-5 w-full rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {lock && (
        <HubLockedModal
          stacked={contact !== null}
          variant="upgrade"
          badge="Premium Exclusive"
          title={
            lock === "visit"
              ? "Storefront Visits are on Premium"
              : lock === "community"
                ? "Buyer Community is on Premium"
                : lock === "place"
                  ? "Place Advert is on Premium"
                  : lock === "boost"
                    ? "Listing Boost is on Premium"
                    : lock === "broadcast"
                      ? "Broadcast is on Premium"
                      : lock === "sectors"
                        ? "Sector Filtering is on Premium"
                        : lock === "favourite"
                          ? "Saving Favourites is on Premium"
                          : "Direct Vendor Contact is on Premium"
          }
          body={
            lock === "visit"
              ? "Browse verified vendor storefronts directly from the Hub feed. Upgrade to unlock direct storefront visits."
              : lock === "community"
                ? "Join commerce discussions with fellow buyers and verified vendors. Upgrade to unlock community tools."
                : lock === "place"
                  ? "Place adverts to reach buyers across the platform. Upgrade to unlock advertising."
                  : lock === "boost"
                    ? "Boost your listings to appear at the top of the feed. Upgrade to unlock boosting."
                    : lock === "broadcast"
                      ? "Broadcast your updates to active buyers online. Upgrade to unlock broadcasts."
                      : lock === "sectors"
                        ? "Filter listings and adverts by industry sector. Upgrade to unlock all sectors."
                        : lock === "favourite"
                          ? "Bookmark vendors and listings to revisit later. Upgrade to save favourites."
                          : "Reach vendors directly with verified phone and direct WhatsApp handoff."
          }
          benefits={
            lock === "visit"
              ? [
                  "Browse verified merchant storefronts directly from feed",
                  "Direct WhatsApp handoff with verified merchant contacts",
                  "Exclusive discounts and wholesale pricing access",
                  "Zero platform intermediary fees on orders",
                ]
              : lock === "community"
                ? [
                    "Connect directly with verified vendors & fellow buyers across Nigeria",
                    "Access exclusive group deals and bulk procurement discounts",
                    "Participate in buyer-vendor Q&A and trusted reviews",
                    "Priority customer support and deal arbitration",
                  ]
                : lock === "favourite"
                  ? [
                      "Save unlimited go-to vendors and listings to your shortlist",
                      "Instant notifications when saved vendors post deals or broadcasts",
                      "Quick re-orders and price drop tracking",
                      "Sync saved items across web and mobile",
                    ]
                  : [
                      "Access verified merchant phone numbers and direct WhatsApp links",
                      "Fast-track response from top-rated sellers",
                      "Verified buyer badge on all inquiries",
                      "Zero lead booking fees",
                    ]
          }
          ctaLabel="Upgrade to Premium"
          ctaHref="/pricing?for=buyers"
          onClose={() => setLock(null)}
        />
      )}

      {advertLightboxSrc && (
        <PosterPreviewLightbox
          src={advertLightboxSrc}
          onClose={() => setAdvertLightboxSrc(null)}
        />
      )}
    </div>
  );
}

function PremiumUpgradeBanner({
  title,
  body,
  onUpgrade,
  compact = false,
}: {
  title: string;
  body: string;
  onUpgrade: () => void;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-none lg:rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50",
        compact ? "p-3" : "p-4",
      )}
    >
      <div
        className={cn("flex gap-3", compact ? "items-start" : "items-center")}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-xl bg-orange-500 text-white shrink-0",
            compact ? "h-8 w-8" : "h-10 w-10",
          )}
        >
          <SparklesIcon size={compact ? 14 : 18} />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-bold text-ink",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "text-gray-600 leading-relaxed",
              compact ? "text-[11px] mt-0.5" : "text-xs mt-1",
            )}
          >
            {body}
          </p>
          <button
            type="button"
            onClick={onUpgrade}
            className={cn(
              "mt-2 inline-flex items-center justify-center rounded-lg bg-orange-500 font-semibold text-white hover:bg-orange-600 transition-colors",
              compact ? "px-3 py-1.5 text-[11px]" : "px-3.5 py-2 text-xs",
            )}
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    </section>
  );
}

function SocialLinks({ social }: { social: HubSocial }) {
  const entries: [string, string | null | undefined][] = [
    ["Instagram", social.instagram],
    ["Facebook", social.facebook],
    ["TikTok", social.tiktok],
    ["X", social.x],
  ];
  const links = entries.filter((entry): entry is [string, string] =>
    Boolean(entry[1]),
  );
  if (links.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map(([label, href]) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-ink hover:border-orange-300"
        >
          {label}
        </a>
      ))}
    </div>
  );
}

function BuyerTools({
  home,
  prefs,
  broadcasts,
  body,
  sending,
  notice,
  onBody,
  onSend,
  onPlace,
  onPrefs,
  onLock,
}: {
  home: HubHome;
  prefs: HubBroadcastPrefs;
  broadcasts: HubBuyerBroadcast[];
  body: string;
  sending: boolean;
  notice: string | null;
  onBody: (value: string) => void;
  onSend: () => void;
  onPlace: () => void;
  onPrefs: (next: HubBroadcastPrefs, includeSectors?: boolean) => void;
  onLock: (kind: "broadcast" | "sectors") => void;
}) {
  const allSectors = prefs.promoSectors.length === 0;

  const toggleSector = (value: string) => {
    const has = prefs.promoSectors.includes(value);
    onPrefs(
      {
        ...prefs,
        promoSectors: has
          ? prefs.promoSectors.filter((sector) => sector !== value)
          : [...prefs.promoSectors, value],
      },
      true,
    );
  };

  return (
    <section className="bg-surface border border-gray-200 rounded-none lg:rounded-2xl px-4">
      {notice && (
        <p className="pt-3 text-xs font-semibold text-orange-600">{notice}</p>
      )}
      <ToolRow icon={StoreIcon} title="Promote a shop">
        <TextAction onClick={onPlace} locked={!home.premium}>
          Place an Advert
        </TextAction>
      </ToolRow>
      <div className="border-t border-gray-100">
        <ToolRow icon={BellIcon} title="Vendor alerts">
          <Switch
            on={prefs.promoEnabled}
            label="Vendor alerts"
            onClick={() =>
              onPrefs({ ...prefs, promoEnabled: !prefs.promoEnabled })
            }
          />
        </ToolRow>
        {prefs.promoEnabled && (
          <div className="pb-3 pl-12 flex flex-wrap gap-1.5">
            {home.premium ? (
              <>
                <TextAction
                  active={allSectors}
                  onClick={() => onPrefs({ ...prefs, promoSectors: [] }, true)}
                >
                  All Sectors
                </TextAction>
                {(home.sectors ?? []).slice(0, 8).map((row) => (
                  <Chip
                    key={row.value}
                    active={
                      !allSectors && prefs.promoSectors.includes(row.value)
                    }
                    onClick={() => toggleSector(row.value)}
                  >
                    {sectorLabel(row.value)}
                  </Chip>
                ))}
              </>
            ) : (
              <>
                <TextAction active>All Sectors</TextAction>
                <TextAction onClick={() => onLock("sectors")} locked>
                  Choose sectors
                </TextAction>
              </>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-gray-100">
        <ToolRow icon={SendIcon} title="Message contacts">
          {home.premium ? (
            <button
              type="button"
              disabled={sending || body.trim().length < 2}
              onClick={onSend}
              className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          ) : (
            <TextAction onClick={() => onLock("broadcast")} locked>
              Send
            </TextAction>
          )}
        </ToolRow>
        {home.premium && (
          <div className="pb-3 pl-12">
            <input
              value={body}
              onChange={(event) => onBody(event.target.value)}
              maxLength={280}
              placeholder="A short note"
              className="w-full rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm text-ink placeholder:text-gray-400"
            />
          </div>
        )}
        {broadcasts.length > 0 && (
          <ul className="pb-3 pl-12 space-y-1">
            {broadcasts.map((row) => (
              <li key={row.id} className="text-xs text-gray-500 truncate">
                <span className="font-semibold text-ink">
                  Queued · {row.audienceCount}
                </span>
                {"  "}
                {row.body}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ToolRow({
  icon: Icon,
  title,
  children,
}: {
  icon: IconComponent;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 shrink-0">
        <Icon size={16} />
      </span>
      <p className="min-w-0 flex-1 text-sm font-semibold text-ink">{title}</p>
      {children}
    </div>
  );
}

function Switch({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-orange-500" : "bg-gray-200",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          on && "translate-x-5",
        )}
      />
    </button>
  );
}

function TextAction({
  locked,
  active,
  onClick,
  children,
}: {
  locked?: boolean;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const className = cn(
    "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold",
    active
      ? "border-orange-300 bg-orange-50 text-orange-600"
      : "border-gray-200 text-ink hover:border-orange-300",
  );
  if (!onClick) return <span className={className}>{children}</span>;
  return (
    <button type="button" onClick={onClick} className={className}>
      {locked && <LockIcon size={12} className="text-gray-400" />}
      {children}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const className = cn(
    "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
    active
      ? "border-orange-300 bg-orange-50 text-orange-600"
      : "border-gray-200 text-gray-600",
  );
  if (!onClick) return <span className={className}>{children}</span>;
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function CommunityPanel({
  home,
  posts,
  updates,
  now,
  postBody,
  posting,
  onPostBody,
  onPosted,
  onReport,
  onLock,
  onPosting,
}: {
  home: HubHome;
  posts: HubCommunityPost[];
  updates: HubTimelineItem[];
  now: number;
  postBody: string;
  posting: boolean;
  onPostBody: (value: string) => void;
  onPosted: (post: HubCommunityPost) => void;
  onReport: (id: string) => void;
  onLock: () => void;
  onPosting: (value: boolean) => void;
}) {
  return (
    <section className="bg-surface border border-gray-200 rounded-none lg:rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-bold text-ink">Community & Updates</h3>
        <div className="flex items-center gap-2">
          {!home.premium && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500">
              <LockIcon size={12} />
              Posting is Premium
            </span>
          )}
          <Link
            href="/hub/community"
            className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 ml-1 transition-colors"
          >
            <span>Open Forum</span>
            <ArrowRightIcon size={12} />
          </Link>
        </div>
      </div>
      {posts.length === 0 && updates.length === 0 ? (
        <p className="text-xs text-gray-500">
          Vendor broadcasts and buyer posts show up here. Nothing has been
          posted yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id}>
              <p className="text-xs font-semibold text-ink">
                {post.authorType === "vendor" ? "A vendor" : "A buyer"}
                <span className="font-normal text-gray-400">
                  {" "}
                  · {timeAgo(post.at, now)}
                </span>
              </p>
              <p className="text-xs text-gray-600 mt-0.5 line-clamp-3">
                {post.body}
              </p>
              <button
                type="button"
                onClick={() => onReport(post.id)}
                className="mt-1 text-[11px] font-semibold text-gray-500 hover:text-ink"
              >
                Report
              </button>
            </li>
          ))}
          {updates.map((item) => (
            <li key={item.id} className="flex gap-2.5">
              <Avatar
                name={item.storeName || "Velte"}
                src={item.avatar}
                className="h-8 w-8 rounded-full text-[10px] shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink truncate">
                  {item.storeName || "A vendor"}
                  <span className="font-normal text-gray-400">
                    {" "}
                    · {timeAgo(item.at, now)}
                  </span>
                </p>
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-3">
                  {item.title}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {home.premium ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const body = postBody.trim();
            if (body.length < 2 || posting) return;
            onPosting(true);
            try {
              const res = await fetch("/api/trust/community?audience=buyer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body }),
              });
              if (res.status === 403) {
                onLock();
                return;
              }
              if (!res.ok) return;
              const data = (await res.json()) as { id?: string };
              onPosted({
                id: data.id ?? body,
                body,
                authorType: "buyer",
                at: new Date().toISOString(),
              });
              onPostBody("");
            } finally {
              onPosting(false);
            }
          }}
        >
          <textarea
            value={postBody}
            onChange={(event) => onPostBody(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Post an update"
            className="w-full rounded-xl border border-gray-200 bg-surface px-3 py-2 text-sm text-ink placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={posting || postBody.trim().length < 2}
            className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
          >
            {posting ? "Posting…" : "Post an update"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={onLock}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-ink hover:border-orange-300"
        >
          <LockIcon size={12} />
          Post an update
        </button>
      )}
    </section>
  );
}

function SectorChip({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: IconComponent;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 inline-flex flex-col items-center gap-1.5 rounded-2xl border px-4 py-3 min-w-[92px] text-[11px] font-semibold transition-colors",
        active
          ? "border-orange-200 bg-orange-50 text-orange-600"
          : "border-gray-200 bg-surface text-gray-600 hover:border-orange-200",
      )}
    >
      <Icon size={18} />
      <span className="max-w-[88px] truncate">{label}</span>
    </button>
  );
}

function FeedCard({
  item,
  now,
  premium,
  favourite,
  compact = false,
  onContact,
  onVisit,
  onReview,
  onFavourite,
  onBoost,
  onOpenAdvertImage,
}: {
  item: HubTimelineItem;
  now: number;
  premium: boolean;
  favourite: boolean;
  /** Half-width mobile grid cell — denser until lg. */
  compact?: boolean;
  onContact: () => void;
  onVisit: () => void;
  onReview: () => void;
  onFavourite: () => void;
  onBoost?: () => void;
  onOpenAdvertImage?: (src: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const isLongDescription = Boolean(
    item.body && (item.body.length > 110 || item.body.includes("\n")),
  );
  const menuRef = useRef<HTMLButtonElement>(null);
  const gallery = [...new Set((item.images ?? []).filter(Boolean))];
  const cover = item.imageUrl || gallery[0] || null;
  const extras = gallery.filter((url) => url !== cover);
  const thumbs = gallery.length > 1 ? extras.slice(0, 3) : [];
  const extra = gallery.length > 1 ? extras.length - thumbs.length : 0;
  const isBoosted = isBoostedProduct(item);
  const isAdvert = !isBoosted && isSponsoredAdvert(item);
  const advertId = isAdvert ? item.advertId || item.id : null;
  const cardRef = useRef<HTMLElement>(null);
  const trackedViewRef = useRef(false);

  useEffect(() => {
    if (!isAdvert || !advertId || trackedViewRef.current) return;
    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      trackHubAdvert(advertId, "view");
      trackedViewRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !trackedViewRef.current) {
          trackedViewRef.current = true;
          trackHubAdvert(advertId, "view");
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isAdvert, advertId]);

  const badge = isAdvert
    ? "Sponsored Ad"
    : isBoosted || item.sponsored
      ? "Boosted"
      : item.kind === "product" && isNewListing(item.at, now)
        ? "New Listing"
        : item.kind === "product"
          ? "Listing"
          : "Promotion";
  // Public product URL is always /{slug} — never /p/….
  const productHref = item.listing?.slug ? `/${item.listing.slug}` : null;
  const storeHref = item.storeHandle ? `/store/${item.storeHandle}` : null;

  const runMenuAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  const coverClass = cn(
    "w-full object-cover bg-gray-100",
    compact
      ? "h-[120px] rounded-lg lg:h-[180px] lg:rounded-xl"
      : "h-[180px] rounded-xl",
  );

  return (
    <article
      ref={cardRef}
      className={cn(
        "relative bg-surface border border-gray-200 rounded-none lg:rounded-2xl h-full",
        compact ? "p-2 lg:p-4" : "p-3 sm:p-4",
        // Laptop: title turns orange+underlined on card hover, but not while over CTAs.
        (productHref || (isAdvert && storeHref)) &&
          "lg:[&:hover:not(:has([data-card-cta]:hover))_[data-card-title]]:text-orange-600 lg:[&:hover:not(:has([data-card-cta]:hover))_[data-card-title]]:underline lg:[&:hover:not(:has([data-card-cta]:hover))_[data-card-title]]:underline-offset-2",
      )}
    >
      {/* Whole card → product page (prefetch + progress bar); CTAs sit above via z-10. */}
      {productHref ? (
        <HubLink
          href={productHref}
          className="absolute inset-0 z-0 rounded-none lg:rounded-2xl"
          aria-label={`View ${item.title}`}
        />
      ) : isAdvert && storeHref ? (
        <HubLink
          href={storeHref}
          onClick={() => {
            if (advertId) trackHubAdvert(advertId, "click");
          }}
          className="absolute inset-0 z-0 rounded-none lg:rounded-2xl"
          aria-label={`Visit ${item.storeName || "store"}`}
        />
      ) : null}
      <div
        className={cn(
          "relative flex h-full pointer-events-none",
          compact
            ? "flex-col gap-2 lg:flex-row lg:gap-4 lg:items-start"
            : "flex-col sm:flex-row gap-3 sm:gap-4 sm:items-start",
        )}
      >
        <div
          className={cn(
            "relative shrink-0",
            compact ? "w-full lg:w-[220px]" : "w-full sm:w-[220px]",
          )}
        >
          {cover ? (
            isAdvert ? (
              <button
                type="button"
                data-card-cta
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onOpenAdvertImage?.(cover);
                }}
                className="relative block w-full pointer-events-auto cursor-pointer focus:outline-hidden group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" className={coverClass} />
                <span className="sr-only">View advert image in full</span>
              </button>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className={coverClass} />
            )
          ) : (
            <div
              className={cn(
                "w-full bg-gray-100",
                compact
                  ? "h-[120px] rounded-lg lg:h-[180px] lg:rounded-xl"
                  : "h-[180px] rounded-xl",
              )}
            />
          )}
          <span
            className={cn(
              "absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md",
              badge === "Sponsored Ad"
                ? "bg-orange-500 text-white"
                : badge === "Boosted"
                  ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300"
                  : "bg-surface/95 text-ink",
            )}
          >
            {badge}
          </span>
        </div>
        <div className="min-w-0 flex-1 flex flex-col">
          <div
            className={cn(
              "flex items-start",
              compact ? "gap-1.5 lg:gap-2.5" : "gap-2.5",
            )}
          >
            <div className="relative shrink-0">
              <Avatar
                name={item.storeName || "Vendor"}
                src={item.avatar}
                className={cn(
                  "rounded-full text-xs shrink-0",
                  compact ? "h-7 w-7 lg:h-10 lg:w-10" : "h-10 w-10",
                )}
              />
              {isEnterpriseVendor(item) && (
                <EnterpriseAvatarBadge size={compact ? "sm" : "md"} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p
                  className={cn(
                    "font-bold text-ink truncate",
                    compact ? "text-xs lg:text-sm" : "text-sm",
                  )}
                >
                  {item.storeName || "Vendor"}
                </p>
                {isEnterpriseVendor(item) && <EnterpriseBadge size="sm" />}
                {item.verified && (
                  <BadgeCheckIcon
                    size={compact ? 12 : 14}
                    className="text-sky-500 shrink-0"
                  />
                )}
              </div>
              {item.sectors?.[0] && (
                <p className="text-[11px] text-gray-500 truncate">
                  {sectorLabel(item.sectors[0])}
                </p>
              )}
              <div
                className={cn(
                  "mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5",
                  compact && "hidden lg:flex",
                )}
              >
                <Stars avg={item.ratingAvg} count={item.ratingCount} />
              </div>
            </div>
            <span
              className={cn(
                "text-[11px] text-gray-400 shrink-0",
                compact && "hidden lg:inline",
              )}
            >
              {timeAgo(item.at, now)}
            </span>
          </div>

          <h3
            data-card-title
            className={cn(
              "font-bold leading-snug line-clamp-2",
              compact ? "mt-2 text-sm lg:mt-3 lg:text-base" : "mt-3 text-base",
              productHref || (isAdvert && storeHref)
                ? "text-orange-600 underline underline-offset-2 lg:text-ink lg:no-underline"
                : "text-ink",
            )}
          >
            {item.title}
          </h3>
          {item.placedByBuyer && (
            <p
              className={cn(
                "mt-1 text-[11px] font-semibold text-gray-500",
                compact && "hidden lg:block",
              )}
            >
              Placed by a buyer
            </p>
          )}
          {item.body && item.body !== item.title && (
            <div className={cn("mt-1", compact && "hidden lg:block")}>
              <p
                className={cn(
                  "text-sm text-gray-600 leading-relaxed transition-all whitespace-pre-line",
                  !isDescriptionExpanded && "line-clamp-2",
                )}
              >
                {item.body}
              </p>
              {isLongDescription && (
                <button
                  type="button"
                  data-card-cta
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDescriptionExpanded((prev) => !prev);
                  }}
                  className="relative z-10 mt-1 inline-flex items-center gap-0.5 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                >
                  <span>{isDescriptionExpanded ? "See less" : "See more"}</span>
                </button>
              )}
            </div>
          )}
          {item.sentiment && (
            <p
              className={cn(
                "mt-2 text-sm text-gray-600 leading-relaxed line-clamp-2",
                compact && "hidden lg:block",
              )}
            >
              <span className="font-semibold text-ink">
                {item.sentiment.rating}/5
              </span>
              {" · "}
              {item.sentiment.text}
            </p>
          )}
          {(item.verified || item.trusted) && (
            <div
              className={cn(
                "mt-2 flex flex-wrap gap-1.5",
                compact && "hidden lg:flex",
              )}
            >
              {item.verified && <VerifiedBadge />}
              {item.trusted && (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Trusted check
                </span>
              )}
              {item.fastDelivery && (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                  Fast delivery
                </span>
              )}
            </div>
          )}
          {!item.verified && !item.trusted && item.fastDelivery && (
            <div className={cn("mt-2", compact && "hidden lg:block")}>
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                Fast delivery
              </span>
            </div>
          )}

          {thumbs.length > 0 && (
            <div
              className={cn(
                "mt-3 flex items-center gap-2",
                compact && "hidden lg:flex",
              )}
            >
              {thumbs.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover bg-gray-100 border border-gray-200"
                />
              ))}
              {extra > 0 && (
                <span className="text-xs font-semibold text-gray-500">
                  +{extra}
                </span>
              )}
            </div>
          )}

          <div
            data-card-cta
            className={cn(
              "relative z-10 mt-auto flex flex-wrap gap-2 pointer-events-auto",
              compact ? "pt-2 lg:pt-3" : "pt-3",
            )}
          >
            {isEnterpriseVendor(item) && (
              <button
                type="button"
                onClick={() => {
                  if (isAdvert && advertId) {
                    trackHubAdvert(advertId, "click");
                  }
                  onContact();
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 font-semibold text-orange-600 hover:bg-orange-100 transition-colors",
                  compact
                    ? "flex-1 justify-center px-2 py-1.5 text-[11px] lg:flex-none lg:px-3.5 lg:py-2 lg:text-xs"
                    : "px-3.5 py-2 text-xs",
                )}
              >
                {!premium && <LockIcon size={12} />}
                Contact
              </button>
            )}
            <button
              type="button"
              onClick={onVisit}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-ink hover:border-orange-300",
                compact && "hidden lg:inline-flex",
              )}
            >
              {!premium && <LockIcon size={12} />}
              Visit check
            </button>
            <button
              type="button"
              onClick={onReview}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-ink hover:border-orange-300",
                compact && "hidden lg:inline-flex",
              )}
            >
              Review vendor
            </button>
            <button
              type="button"
              onClick={onFavourite}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-ink hover:border-orange-300",
                compact && "hidden lg:inline-flex",
              )}
            >
              {!premium ? (
                <LockIcon size={12} />
              ) : (
                <HeartIcon
                  size={12}
                  className={cn(favourite && "text-orange-600")}
                />
              )}
              {favourite ? "Saved" : "Favourite"}
            </button>
            {onBoost && (
              <button
                type="button"
                onClick={onBoost}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-ink hover:border-orange-300",
                  compact && "hidden lg:inline-flex",
                )}
              >
                {!premium && <LockIcon size={12} />}
                Boost
              </button>
            )}
            {compact && (
              <>
                <button
                  ref={menuRef}
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label="More actions"
                  aria-expanded={menuOpen}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-transparent text-gray-500 hover:border-orange-300 hover:text-ink lg:hidden"
                >
                  <Ellipsis size={16} strokeWidth={2} />
                </button>
                <AnchoredPopover
                  open={menuOpen}
                  onClose={() => setMenuOpen(false)}
                  anchorRef={menuRef}
                  align="auto"
                  className="w-44 bg-surface rounded-lg shadow-lg border border-gray-100 py-1"
                >
                  <button
                    type="button"
                    onClick={() => runMenuAction(onVisit)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors"
                  >
                    {!premium && (
                      <LockIcon size={14} className="text-gray-400" />
                    )}
                    Visit check
                  </button>
                  <button
                    type="button"
                    onClick={() => runMenuAction(onReview)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors"
                  >
                    Review vendor
                  </button>
                  <button
                    type="button"
                    onClick={() => runMenuAction(onFavourite)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors"
                  >
                    {!premium ? (
                      <LockIcon size={14} className="text-gray-400" />
                    ) : (
                      <HeartIcon
                        size={14}
                        className={cn(favourite && "text-orange-600")}
                      />
                    )}
                    {favourite ? "Saved" : "Favourite"}
                  </button>
                  {onBoost && (
                    <button
                      type="button"
                      onClick={() => runMenuAction(onBoost)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors"
                    >
                      {!premium && (
                        <LockIcon size={14} className="text-gray-400" />
                      )}
                      Boost
                    </button>
                  )}
                </AnchoredPopover>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
