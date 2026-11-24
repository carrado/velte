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
  CheckIcon,
  ChefHatIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  CrownIcon,
  EyeIcon,
  FileTextIcon,
  FlameIcon,
  GiftIcon,
  HeartIcon,
  LeafIcon,
  LockIcon,
  MapPinIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  MonitorIcon,
  PartyPopperIcon,
  PhoneIcon,
  RepeatIcon,
  ScaleIcon,
  SearchIcon,
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
import { ChevronRight } from "lucide-react";
import type { IconComponent } from "@/types/common";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import { HubLink } from "@/components/hub/HubLink";
import { HubSidebarFooter } from "@/components/hub/HubSidebarFooter";
import { CardCarousel } from "@/components/search/CardCarousel";
import { HubHero } from "@/components/hub/HubHero";
import {
  SECTOR_BY_VALUE,
  SECTOR_CATEGORY_BY_LABEL,
  SECTOR_TAXONOMY,
} from "@/lib/sectors";
import { NIGERIA_STATES, normalizeNigeriaState } from "@/lib/states";
import {
  EnterpriseAvatarBadge,
  isEnterpriseVendor,
} from "@/components/EnterpriseBadge";
import { isPremiumBuyer } from "@/lib/enterprise";
import { modalScrimClass } from "@/lib/modalScrim";
import { cn, formatNaira, isNewListing, timeAgo } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type {
  HubBroadcastPrefs,
  HubBuyerPromotion,
  HubCommunityPost,
  HubFeaturedVendor,
  HubHome,
  HubSocial,
  HubTimelineItem,
} from "@/types/hub";
import TabBar from "@/components/TabBar";
import { HubLockedModal } from "./HubLockedModal";
import { BuyerGigsModal } from "./BuyerGigsModal";
import { StoreVisitCheckModal } from "@/components/hub/StoreVisitCheckModal";
import {
  PosterPreviewLightbox,
  ProtectedPosterPreview,
} from "@/components/hub/ProtectedPosterPreview";
import { BoostedListingsCarousel } from "@/components/hub/BoostedListingsCarousel";
import { ManualProductCarousel } from "@/components/hub/ManualProductCarousel";
import { useUserStore } from "@/store/userStore";
import { useBuyerStore } from "@/store/buyerStore";
import { useCartStore } from "@/store/cartStore";
import { buildChatLink } from "@/lib/chatLink";
import {
  assembleHubFeed,
  assembleTimelineWithSandwichedAds,
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
  beauty_wellness: SparklesIcon,
  home_living: BuildingIcon,
  building_construction: WrenchIcon,
  automotive: TruckIcon,
  auto_transport: TruckIcon,
  repairs_technical: WrenchIcon,
  professional_business_services: BriefcaseIcon,
  professional_services: BriefcaseIcon,
  education_training: FileTextIcon,
  transportation_logistics: TruckIcon,
  arts_media_entertainment: CameraIcon,
  media_creative: CameraIcon,
  health_pharmacy: HeartIcon,
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

const TAXONOMY_GROUP_IDS = new Set(SECTOR_TAXONOMY.map((c) => c.id));

/** Parent taxonomy group for a store sector value (slug or display label). */
function sectorGroupId(value: string): string | null {
  if (!value) return null;
  const clean = value.trim();
  if (TAXONOMY_GROUP_IDS.has(clean)) return clean;
  if (clean === "fashion") return "fashion_apparel";
  if (clean === "energy" || clean === "solar") return "electronics_technology";
  const byLabel = SECTOR_CATEGORY_BY_LABEL[clean];
  if (byLabel) return byLabel;
  const slug = sectorSlug(clean);
  if (!slug) return null;
  if (TAXONOMY_GROUP_IDS.has(slug)) return slug;
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
  isEnterprise,
}: {
  name: string;
  src: string | null;
  className?: string;
  isEnterprise?: boolean;
}) {
  const content = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={cn("object-cover bg-gray-100", className)}
    />
  ) : (
    <span
      className={cn(
        "inline-flex items-center justify-center bg-orange-100 text-orange-700 font-bold",
        className,
      )}
    >
      {initials(name)}
    </span>
  );

  if (isEnterprise) {
    return (
      <div className="relative inline-flex shrink-0">
        {content}
        <EnterpriseAvatarBadge size="sm" />
      </div>
    );
  }
  return content;
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

const CITY_TO_STATE: Record<string, string> = {
  ikeja: "Lagos",
  lekki: "Lagos",
  yaba: "Lagos",
  "victoria island": "Lagos",
  surulere: "Lagos",
  ikoyi: "Lagos",
  epe: "Lagos",
  badagry: "Lagos",
  owerri: "Imo",
  orlu: "Imo",
  okigwe: "Imo",
  awka: "Anambra",
  onitsha: "Anambra",
  nnewi: "Anambra",
  ifite: "Anambra",
  nsukka: "Enugu",
  "independence layout": "Enugu",
  "port harcourt": "Rivers",
  "obio akpor": "Rivers",
  ibadan: "Oyo",
  "benin city": "Edo",
  benin: "Edo",
  calabar: "Cross River",
  warri: "Delta",
  asaba: "Delta",
  abeokuta: "Ogun",
  ilorin: "Kwara",
  jos: "Plateau",
  kaduna: "Kaduna",
  kano: "Kano",
  maiduguri: "Borno",
  uyo: "Akwa Ibom",
  aba: "Abia",
  umuahia: "Abia",
};

function getVendorState(vendor: HubFeaturedVendor): string | null {
  const raw = vendor.state || vendor.place;
  if (!raw) return null;

  const direct = normalizeNigeriaState(raw);
  if (direct) return direct;

  const segments = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    const fromSegment = normalizeNigeriaState(segments[i]);
    if (fromSegment) return fromSegment;
  }

  if (/\b(abuja|fct)\b/i.test(raw)) return "Abuja";

  for (const s of NIGERIA_STATES) {
    const reg = new RegExp(`\\b${s}\\b`, "i");
    if (reg.test(raw)) return s;
  }

  const rawLower = raw.toLowerCase();
  for (const [city, state] of Object.entries(CITY_TO_STATE)) {
    if (rawLower.includes(city)) return state;
  }

  return raw;
}

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
    <section className="bg-surface border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
        <div>
          <h3 className="text-sm font-bold text-ink">Featured Vendors</h3>
          <p className="text-[11px] text-gray-500 dark:text-ink/60">
            Top businesses on Velte
          </p>
        </div>
        {vendors.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
          >
            <span>View all</span>
            <ChevronRightIcon size={13} />
          </button>
        )}
      </div>
      {vendors.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-ink/60 py-4 text-center">
          Vendors show up here as they publish a store.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-white/5">
          {vendors.slice(0, vendorCap).map((vendor) => {
            const vendorState = getVendorState(vendor);
            return (
              <li key={vendor.vendorId}>
                <div className="w-full flex items-start gap-3 py-3 text-left">
                  <div className="relative shrink-0 mt-0.5">
                    <Avatar
                      name={vendor.name}
                      src={vendor.avatar}
                      className="h-10 w-10 rounded-full text-xs shrink-0"
                      isEnterprise={isEnterpriseVendor(vendor)}
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-ink truncate">
                        {vendor.name}
                      </span>
                      {vendor.verified && (
                        <BadgeCheckIcon
                          size={14}
                          className="text-sky-500 shrink-0"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-ink/60">
                      <Stars
                        avg={vendor.ratingAvg}
                        count={vendor.ratingCount}
                      />
                    </div>

                    {vendor.sentiment && (
                      <span className="block text-[11px] text-gray-600 dark:text-ink/60 line-clamp-2">
                        {vendor.sentiment.rating}/5 · {vendor.sentiment.text}
                      </span>
                    )}
                    {vendor.trusted && (
                      <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        Trusted check
                      </span>
                    )}
                    {vendor.fastDelivery && (
                      <span className="block text-[11px] font-semibold text-sky-700 dark:text-sky-400">
                        Fast delivery
                      </span>
                    )}

                    {vendorState && (
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-ink/60">
                        <MapPinIcon
                          size={11}
                          className="shrink-0 text-gray-400"
                        />
                        <span className="truncate">{vendorState}</span>
                      </div>
                    )}

                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => onContact(vendor)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline transition-colors cursor-pointer"
                      >
                        <span>Contact card</span>
                        <ChevronRightIcon size={11} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      aria-label={
                        favourites.has(vendor.vendorId)
                          ? "Remove favourite"
                          : "Favourite"
                      }
                      onClick={() => onFavourite(vendor.vendorId)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 dark:border-white/10 text-gray-500 dark:text-ink/60 hover:border-orange-300 hover:text-orange-600 transition-colors cursor-pointer"
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
                          ? "text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400"
                          : "text-gray-500 bg-gray-100 dark:bg-white/10 dark:text-ink/60",
                      )}
                    >
                      {vendor.sponsored ? "Sponsored" : "Featured"}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
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
  const isBuyerPremium = Boolean(
    isVendorAccount ||
    isPremiumBuyer(buyer) ||
    buyer?.tier === "buyer_premium" ||
    (buyer as { isPremium?: boolean })?.isPremium ||
    (buyer as { plan?: string })?.plan === "buyer_premium",
  );
  const isPremium = Boolean(initialHome.premium || isBuyerPremium);
  const home = useMemo(
    () =>
      isPremium
        ? {
            ...initialHome,
            premium: true,
            hubPreview: null,
          }
        : initialHome,
    [initialHome, isPremium],
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
  const [chooseSectorsOpen, setChooseSectorsOpen] = useState(false);
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
  const [myAdvertsOpen, setMyAdvertsOpen] = useState(false);
  const [gigsModalOpen, setGigsModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [postBody, setPostBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitSaved, setVisitSaved] = useState(false);
  const [visitAuditTarget, setVisitAuditTarget] =
    useState<ContactTarget | null>(null);
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
    const vendorCounts = new Map<string, number>();
    const listingCounts = new Map<string, number>();

    for (const vendor of home.featured) {
      const groups = new Set(
        (vendor.sectors ?? [])
          .map((value) => sectorGroupId(value))
          .filter((id): id is string => Boolean(id)),
      );
      for (const groupId of groups) {
        vendorCounts.set(groupId, (vendorCounts.get(groupId) || 0) + 1);
      }
    }

    for (const item of displayedTimeline) {
      if (item.kind === "update") continue;
      const groups = new Set(
        (item.sectors ?? [])
          .map((value) => sectorGroupId(value))
          .filter((id): id is string => Boolean(id)),
      );
      for (const groupId of groups) {
        listingCounts.set(groupId, (listingCounts.get(groupId) || 0) + 1);
      }
    }

    return SECTOR_TAXONOMY.map((category) => {
      const vCount = vendorCounts.get(category.id) || 0;
      const lCount = listingCounts.get(category.id) || 0;
      return {
        id: category.id,
        label: category.label,
        vendorCount: vCount,
        listingCount: lCount,
        count: vCount + lCount,
      };
    })
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [home.featured, displayedTimeline]);

  const { boostedListings, feed } = useMemo(() => {
    let items = displayedTimeline.filter((item) => item.kind !== "update");
    if (sector)
      items = items.filter((item) => inSectorGroup(item.sectors, sector));
    const res = assembleTimelineWithSandwichedAds(items);
    if (res.feed.length === 0 && res.boostedListings.length > 0) {
      return {
        boostedListings: res.boostedListings,
        feed: res.boostedListings,
      };
    }
    return { boostedListings: res.boostedListings, feed: res.feed };
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
    // Sponsored listings appear first, capped at 6 top performing vendors
    return [...list]
      .sort((a, b) => {
        if (a.sponsored && !b.sponsored) return -1;
        if (!a.sponsored && b.sponsored) return 1;
        return 0;
      })
      .slice(0, 6);
  }, [home.featured, sector]);

  const updates = useMemo(
    () =>
      displayedTimeline.filter((item) => item.kind === "update").slice(0, 3),
    [displayedTimeline],
  );

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
    setVisitAuditTarget(target);
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
    navigate("/hub/advert");
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
  const vendorCap = home.premium ? 6 : (home.hubPreview?.vendorCap ?? 6);
  const vendorsCapped =
    !home.premium && Boolean(home.hubPreview?.vendorsCapped);

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

      <div className="w-full max-w-[1280px] mx-auto px-0 sm:px-6 py-0 sm:py-5">
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_330px]">
          {/* ── LEFT COLUMN: Your Tools (Fixed / Sticky sidebar) ── */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <BuyerTools
              home={home}
              prefs={prefs}
              notice={notice}
              onPlace={openPlace}
              onPrefs={savePrefs}
              onLock={(kind) => setLock(kind)}
              onOpenChooseSectors={() => setChooseSectorsOpen(true)}
              onOpenMyAdverts={() => navigate("/hub/sponsored-adverts")}
              onOpenGigs={() => navigate("/hub/gigs")}
            />
            <HubSidebarFooter />
          </aside>

          {/* ── MIDDLE COLUMN: Social Timeline Feed ── */}
          <main className="min-w-0 space-y-4">
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
                    onClick: () => {
                      setSector(null);
                      setMobilePane("listings");
                    },
                  },
                  ...sectorGroups.map((row) => ({
                    key: row.id,
                    label: row.label,
                    icon: sectorIcon(row.id),
                    active: sector === row.id,
                    onClick: () => {
                      setSector(row.id);
                      setMobilePane("listings");
                    },
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
              id="hub-feed"
              className={cn(
                "space-y-4 scroll-mt-20",
                showMobileVendors && "hidden lg:block",
              )}
            >
              <NewPostsIndicator
                count={pendingUpdates.length}
                onClick={handleApplyUpdates}
                label={
                  pendingUpdates.length === 1
                    ? "1 new product"
                    : `${pendingUpdates.length} new products`
                }
              />

              {boostedListings.length === 0 && feed.length === 0 ? (
                <div className="bg-surface border-y sm:border border-x-0 sm:border-x border-gray-200 dark:border-white/10 rounded-none sm:rounded-2xl p-6 sm:p-10 text-center shadow-xs">
                  <p className="font-semibold text-ink">
                    {sector
                      ? `No listings in ${sectorLabel(sector)} yet`
                      : "Nothing in this view yet"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-ink/60 mt-1">
                    {sector ? (
                      <>
                        No products or adverts have been published in this
                        sector yet.
                        <button
                          type="button"
                          onClick={() => setSector(null)}
                          className="block mx-auto mt-3 text-xs font-semibold text-orange-600 hover:underline"
                        >
                          View all sectors
                        </button>
                      </>
                    ) : (
                      "Listings and labelled promotions show up as vendors publish them."
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Boosted Product Listings Carousel */}
                  {boostedListings.length > 0 && (
                    <BoostedListingsCarousel
                      items={boostedListings}
                      now={now}
                      onOpenListing={(item) => {
                        if (item.listing?.slug) {
                          navigate(`/${item.listing.slug}`);
                        } else {
                          openContact(contactFromItem(item));
                        }
                      }}
                    />
                  )}

                  {/* Listings Feed Stream */}
                  {visibleFeed.map((item, index) => {
                    const cardKey = `${item.id}-${index}`;
                    const fadeLast =
                      !home.premium &&
                      Boolean(home.hubPreview?.listingsCapped) &&
                      index === visibleFeed.length - 1;
                    const card = (
                      <FeedCard
                        item={item}
                        now={now}
                        premium={home.premium}
                        favourite={favourites.has(item.vendorId)}
                        featuredVendors={home.featured}
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
                      return <div key={cardKey}>{card}</div>;
                    }
                    return (
                      <div
                        key={cardKey}
                        className="relative overflow-hidden rounded-2xl"
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
          </main>

          {/* ── RIGHT COLUMN: Featured Vendors / Sidebar ── */}
          <aside
            className={cn(
              "space-y-4 lg:col-span-2 xl:col-span-1",
              home.premium
                ? "xl:sticky xl:top-20 xl:self-start"
                : "xl:self-stretch",
            )}
          >
            <FeaturedVendorsPanel {...featuredPanelProps} />

            {/* Upgrade to Premium for buyers if !home.premium */}
            {!home.premium && (
              <div className="space-y-4 xl:sticky xl:top-20">
                <section className="rounded-2xl border border-orange-200 dark:border-orange-500/20 bg-gradient-to-b from-orange-50 to-orange-50/30 dark:from-orange-950/20 dark:to-transparent p-4 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white shadow-xs">
                      <CrownIcon size={16} weight="fill" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-ink">
                        Upgrade to Premium
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-ink/60">
                        Browse uncapped listings & perks
                      </p>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1.5 text-xs text-ink/80">
                    {[
                      "Uncapped access to every listing",
                      "Priority seller response channels",
                      "Verified Buyer community badge",
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
                    onClick={() => navigate("/pricing?for=buyers")}
                    className="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink text-canvas py-2 text-xs font-bold transition-opacity hover:opacity-90 cursor-pointer"
                  >
                    <span>Upgrade to Premium</span>
                    <ArrowRightIcon size={13} aria-hidden />
                  </button>
                </section>
              </div>
            )}
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
                isEnterprise={isEnterpriseVendor(contact)}
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
              <ProtectedPosterPreview
                src={contact.imageUrl}
                fit="cover"
                className="mt-4 h-40 w-full rounded-xl bg-gray-100"
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
            <button
              type="button"
              onClick={() => {
                if (!home.premium) {
                  setLock("visit");
                  return;
                }
                setVisitAuditTarget(contact);
                setContact(null);
              }}
              className="mt-3 w-full rounded-xl border border-orange-200 dark:border-white/10 bg-orange-50/50 dark:bg-white/5 py-2.5 px-3 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ShieldIcon size={14} />
              <span>
                {visitSaved
                  ? "Audit Storefront Again"
                  : "Verify Storefront & Earn ₦500"}
              </span>
            </button>
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

      <ChooseSectorsModal
        open={chooseSectorsOpen}
        initialSectors={prefs.promoSectors}
        onClose={() => setChooseSectorsOpen(false)}
        onSave={(selected) => {
          savePrefs({ ...prefs, promoSectors: selected }, true);
        }}
      />

      <BuyerPromotionsModal
        open={myAdvertsOpen}
        onClose={() => setMyAdvertsOpen(false)}
        onPlace={() => navigate("/hub/advert")}
      />

      <BuyerGigsModal
        open={gigsModalOpen}
        onClose={() => setGigsModalOpen(false)}
        isPremium={home.premium}
        onUpgrade={() => navigate("/pricing?for=buyers")}
      />

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

      {visitAuditTarget && (
        <StoreVisitCheckModal
          vendorId={visitAuditTarget.vendorId}
          vendorName={visitAuditTarget.vendorName}
          vendorAvatar={visitAuditTarget.vendorAvatar}
          vendorArea={visitAuditTarget.area}
          onClose={() => setVisitAuditTarget(null)}
          onSuccess={() => {
            setVisitAuditTarget(null);
            setVisitSaved(true);
          }}
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

function ChooseSectorsModal({
  open,
  initialSectors,
  onClose,
  onSave,
}: {
  open: boolean;
  initialSectors: string[];
  onClose: () => void;
  onSave: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initialSectors);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setSelected(initialSectors);
      setQuery("");
    }
  }, [open, initialSectors]);

  if (!open) return null;

  const isChecked = (catId: string) =>
    selected.some((s) => s === catId || sectorGroupId(s) === catId);

  const toggle = (catId: string) => {
    setSelected((prev) => {
      const has = prev.some((s) => s === catId || sectorGroupId(s) === catId);
      if (has) {
        return prev.filter((s) => s !== catId && sectorGroupId(s) !== catId);
      }
      return [...prev, catId];
    });
  };

  const handleSelectAll = () => {
    setSelected(SECTOR_TAXONOMY.map((c) => c.id));
  };

  const handleClear = () => {
    setSelected([]);
  };

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  const filteredCategories = SECTOR_TAXONOMY.filter((category) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      category.label.toLowerCase().includes(q) ||
      (category.sectors ?? []).some((s) => s.label.toLowerCase().includes(q))
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose sectors"
      className={cn(
        "fixed inset-0 z-50 h-dvh w-dvw flex items-end sm:items-center justify-center p-4",
        modalScrimClass(),
      )}
      onClick={onClose}
    >
      <div
        className="bg-surface w-full sm:max-w-lg rounded-2xl border border-gray-200 dark:border-white/10 p-5 shadow-2xl flex flex-col max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
          <div>
            <h3 className="text-base font-bold text-ink">Choose Sectors</h3>
            <p className="text-xs text-gray-500 dark:text-ink/60 mt-0.5">
              Select sectors for vendor alerts &amp; deals
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-ink hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Search input */}
        <div className="pt-3 pb-1">
          <div className="relative">
            <SearchIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search platform sectors or specialties…"
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 pl-9 pr-3 py-2 text-xs text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
        </div>

        {/* Quick Actions (Select all / Clear) */}
        <div className="flex items-center justify-between pt-2 pb-2 text-xs">
          <span className="text-gray-500 dark:text-ink/60 font-medium text-[11px]">
            {selected.length === 0
              ? "All sectors active (default)"
              : `${selected.length} of ${SECTOR_TAXONOMY.length} selected`}
          </span>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-orange-600 dark:text-orange-400 font-semibold hover:underline cursor-pointer"
            >
              Select all
            </button>
            <span className="text-gray-300 dark:text-white/20">·</span>
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-500 dark:text-ink/60 hover:text-ink font-semibold hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Sectors List with checkboxes aligned to the right */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 divide-y divide-gray-100 dark:divide-white/5">
          {filteredCategories.length === 0 ? (
            <p className="text-center py-8 text-xs text-gray-400">
              No sectors matching &quot;{query}&quot;
            </p>
          ) : (
            filteredCategories.map((category) => {
              const checked = isChecked(category.id);
              const Icon = sectorIcon(category.id);
              return (
                <label
                  key={category.id}
                  htmlFor={`sector-cb-${category.id}`}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-orange-50/50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-ink block truncate">
                        {category.label}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-ink/40 block truncate max-w-xs">
                        {(category.sectors ?? [])
                          .slice(0, 3)
                          .map((s) => s.label)
                          .join(", ")}
                        {(category.sectors ?? []).length > 3 ? "…" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center justify-center pl-2">
                    <input
                      type="checkbox"
                      id={`sector-cb-${category.id}`}
                      checked={checked}
                      onChange={() => toggle(category.id)}
                      className="h-4 w-4 rounded border-gray-300 dark:border-white/20 text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-600"
                    />
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Modal Actions */}
        <div className="pt-4 mt-3 border-t border-gray-100 dark:border-white/5 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 px-4 py-2.5 text-xs font-semibold text-ink hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-600 transition-colors shadow-sm cursor-pointer"
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}

function BuyerPromotionsModal({
  open,
  onClose,
  onPlace,
}: {
  open: boolean;
  onClose: () => void;
  onPlace: () => void;
}) {
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: HubBuyerPromotion[];
  }>({
    queryKey: ["hub", "buyer-adverts", "mine"],
    queryFn: async () => {
      const res = await fetch("/api/hub/buyer-adverts");
      if (!res.ok) throw new Error("Could not load your sponsored adverts");
      return res.json();
    },
    enabled: open,
  });

  if (!open) return null;

  const adverts: HubBuyerPromotion[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: HubBuyerPromotion[] })?.data)
      ? (data as { data: HubBuyerPromotion[] }).data
      : [];
  const totalViews = adverts.reduce((sum, a) => sum + (a.views || 0), 0);
  const totalClicks = adverts.reduce((sum, a) => sum + (a.clicks || 0), 0);
  const activeCount = adverts.filter((a) => a.status === "active").length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="My Sponsored Adverts"
      className={cn(
        "fixed inset-0 z-50 h-dvh w-dvw flex items-end sm:items-center justify-center p-4",
        modalScrimClass(),
      )}
      onClick={onClose}
    >
      <div
        className="bg-surface w-full sm:max-w-xl rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <MegaphoneIcon size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-ink">
                My Sponsored Adverts
              </h3>
              <p className="text-xs text-gray-500 dark:text-ink/60">
                Track your promotions, reach &amp; engagement
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-ink hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50/70 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 text-center">
          <div className="p-2 rounded-xl bg-surface border border-gray-100 dark:border-white/5">
            <p className="text-xs text-gray-400 font-medium">
              Active Campaigns
            </p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-0.5">
              {activeCount}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-surface border border-gray-100 dark:border-white/5">
            <p className="text-xs text-gray-400 font-medium">Total Views</p>
            <p className="text-lg font-bold text-ink mt-0.5">
              {totalViews.toLocaleString()}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-surface border border-gray-100 dark:border-white/5">
            <p className="text-xs text-gray-400 font-medium">Total Clicks</p>
            <p className="text-lg font-bold text-ink mt-0.5">
              {totalClicks.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Loading your sponsored adverts...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-rose-500">
              Could not load your sponsored adverts.
            </div>
          ) : adverts.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 mx-auto flex items-center justify-center">
                <MegaphoneIcon size={22} />
              </div>
              <h4 className="text-sm font-bold text-ink">
                No Sponsored Adverts Yet
              </h4>
              <p className="text-xs text-gray-500 dark:text-ink/60 max-w-sm mx-auto leading-relaxed">
                As a Buyer Premium member, you can sponsor vendors and their
                listings on the Hub to earn commissions and bonus credit tokens
                when buyers place orders.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPlace();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <span>Place Your First Advert</span>
                  <ArrowRightIcon size={12} />
                </button>
              </div>
            </div>
          ) : (
            adverts.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-surface flex items-start gap-3.5 hover:border-orange-500/30 transition-all"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0 border border-gray-100 dark:border-white/5">
                  <ProtectedPosterPreview
                    src={item.imageUrl}
                    fit="cover"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-ink truncate">
                      {item.headline}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0",
                        item.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : item.status === "cancelled"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 border border-gray-200 dark:border-white/10",
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                  {item.blurb && (
                    <p className="text-[11px] text-gray-500 dark:text-ink/60 line-clamp-1 mt-0.5">
                      {item.blurb}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5">
                      <StoreIcon size={12} className="text-orange-500" />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {item.vendorName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <EyeIcon size={12} />
                        <span className="font-bold text-ink">
                          {item.views}
                        </span>{" "}
                        views
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-orange-500">
                          🎯
                        </span>
                        <span className="font-bold text-ink">
                          {item.clicks}
                        </span>{" "}
                        clicks
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
          <span className="text-xs text-gray-500 dark:text-ink/60">
            {adverts.length} {adverts.length === 1 ? "advert" : "adverts"}{" "}
            sponsored
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onPlace();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <span>Place New Advert</span>
            <ArrowRightIcon size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function BuyerTools({
  home,
  prefs,
  notice,
  onPlace,
  onPrefs,
  onLock,
  onOpenChooseSectors,
  onOpenMyAdverts,
  onOpenGigs,
}: {
  home: HubHome;
  prefs: HubBroadcastPrefs;
  notice: string | null;
  onPlace: () => void;
  onPrefs: (next: HubBroadcastPrefs, includeSectors?: boolean) => void;
  onLock: (kind: "broadcast" | "sectors" | "place") => void;
  onOpenChooseSectors: () => void;
  onOpenMyAdverts: () => void;
  onOpenGigs: () => void;
}) {
  const allSectors = prefs.promoSectors.length === 0;

  return (
    <section className="rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-x border-gray-200 dark:border-white/10 bg-surface p-4 shadow-xs">
      <div className="pb-3 border-b border-gray-100 dark:border-white/5">
        <h3 className="text-sm font-bold text-ink">Your Tools</h3>
        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-ink/60">
          Preferences &amp; promotions
        </p>
      </div>

      {notice && (
        <p className="pt-3 text-xs font-semibold text-orange-600">{notice}</p>
      )}

      <div className="mt-3 space-y-2">
        {/* Tool 1: Promote a Shop / Place Advert */}
        <button
          type="button"
          onClick={onPlace}
          className="w-full group flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 hover:border-orange-300 dark:hover:border-orange-500/30 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 transition-all text-left cursor-pointer"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
            <StoreIcon size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-ink group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              Place an Advert
            </span>
            <p className="text-[11px] text-gray-500 dark:text-ink/60 truncate mt-0.5">
              Promote your shop or listing
            </p>
          </div>
          {!home.premium ? (
            <LockIcon size={14} className="shrink-0 text-gray-400" />
          ) : (
            <ChevronRight
              size={15}
              className="shrink-0 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all"
            />
          )}
        </button>

        {/* Tool 2: Vendor Alerts */}
        <div className="rounded-xl border border-gray-100 dark:border-white/5 p-2.5 transition-all">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
              <BellIcon size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-ink">Vendor Alerts</span>
              <p className="text-[11px] text-gray-500 dark:text-ink/60 truncate mt-0.5">
                Deals &amp; promotional updates
              </p>
            </div>
            <Switch
              on={prefs.promoEnabled}
              label="Vendor alerts"
              onClick={() =>
                onPrefs({ ...prefs, promoEnabled: !prefs.promoEnabled })
              }
            />
          </div>
          {prefs.promoEnabled && (
            <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-white/5 flex flex-wrap gap-1.5">
              <TextAction
                active={allSectors}
                onClick={() => onPrefs({ ...prefs, promoSectors: [] }, true)}
              >
                All sectors
              </TextAction>
              <TextAction
                active={!allSectors}
                locked={!home.premium}
                onClick={() => {
                  if (!home.premium) {
                    onLock("sectors");
                  } else {
                    onOpenChooseSectors();
                  }
                }}
              >
                <span>Choose sectors</span>
                {!allSectors && prefs.promoSectors.length > 0 && (
                  <span className="ml-1 rounded-full bg-orange-200 dark:bg-orange-900/60 text-orange-800 dark:text-orange-300 px-1.5 py-0.2 text-[10px] font-bold">
                    {prefs.promoSectors.length}
                  </span>
                )}
              </TextAction>
            </div>
          )}
        </div>

        {/* Tool 3: My Adverts */}
        <button
          type="button"
          onClick={() => {
            if (!home.premium) {
              onLock("place");
            } else {
              onOpenMyAdverts();
            }
          }}
          className="w-full group flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 hover:border-orange-300 dark:hover:border-orange-500/30 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 transition-all text-left cursor-pointer"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
            <MegaphoneIcon size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-ink group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              My Adverts
            </span>
            <p className="text-[11px] text-gray-500 dark:text-ink/60 truncate mt-0.5">
              Track campaigns, reach &amp; engagement
            </p>
          </div>
          {!home.premium ? (
            <LockIcon size={14} className="shrink-0 text-gray-400" />
          ) : (
            <ChevronRight
              size={15}
              className="shrink-0 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all"
            />
          )}
        </button>

        {/* Tool 5: Gigs & Tasks (Jobs Won by Buyer) */}
        <button
          type="button"
          onClick={() => {
            if (!home.premium) {
              onLock("place");
            } else {
              onOpenGigs();
            }
          }}
          className="w-full group flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all text-left cursor-pointer"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <BriefcaseIcon size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-ink group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Gigs &amp; Bounties
            </span>
            <p className="text-[11px] text-gray-500 dark:text-ink/60 truncate mt-0.5">
              Win vendor tasks &amp; cash rewards
            </p>
          </div>
          {!home.premium ? (
            <LockIcon size={14} className="shrink-0 text-gray-400" />
          ) : (
            <ChevronRight
              size={15}
              className="shrink-0 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all"
            />
          )}
        </button>
      </div>

      {/* Account / Billing */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
        <HubLink
          href="/pricing?for=buyers"
          className="w-full group flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 hover:border-orange-300 dark:hover:border-orange-500/30 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 transition-all text-left cursor-pointer"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <CrownIcon size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-ink group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Billing &amp; Plans
            </span>
            <p className="text-[11px] text-gray-500 dark:text-ink/60 truncate mt-0.5">
              Buyer membership &amp; limits
            </p>
          </div>
          <ChevronRight
            size={15}
            className="shrink-0 text-gray-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all"
          />
        </HubLink>
      </div>
    </section>
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
        {!home.premium && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500">
            <LockIcon size={12} />
            Posting is Premium
          </span>
        )}
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
                isEnterprise={isEnterpriseVendor(item)}
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

function updateGallery(item: HubTimelineItem): string[] {
  const seen = new Set<string>();
  const gallery: string[] = [];

  const add = (img?: string | null) => {
    if (img && typeof img === "string") {
      const trimmed = img.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        gallery.push(trimmed);
      }
    }
  };

  // Add primary listing images if present
  if (item.listing?.images && Array.isArray(item.listing.images)) {
    for (const img of item.listing.images) add(img);
  }
  // Add item.images if present
  if (item.images && Array.isArray(item.images)) {
    for (const img of item.images) add(img);
  }
  // Add item.imageUrl if present and not already added
  if (item.imageUrl) {
    add(item.imageUrl);
  }

  return gallery;
}

function FeedCard({
  item,
  now,
  premium,
  favourite,
  onContact,
  onVisit,
  onReview,
  onFavourite,
  onBoost,
  onOpenAdvertImage,
  featuredVendors,
}: {
  item: HubTimelineItem;
  now: number;
  premium: boolean;
  favourite: boolean;
  featuredVendors?: HubFeaturedVendor[];
  onContact: () => void;
  onVisit: () => void;
  onReview: () => void;
  onFavourite: () => void;
  onBoost?: () => void;
  onOpenAdvertImage?: (src: string) => void;
}) {
  const { navigate } = useNavigation();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const isLongDescription = Boolean(
    item.body && (item.body.length > 120 || item.body.includes("\n")),
  );

  const gallery = updateGallery(item);
  const storeName = item.storeName || "Vendor";
  const isEnterprise = Boolean(
    isEnterpriseVendor(item) ||
    (item.vendorId &&
      featuredVendors?.some(
        (v) => v.vendorId === item.vendorId && isEnterpriseVendor(v),
      )),
  );
  const isVendorBasic = !isEnterprise;
  const isBoosted = isBoostedProduct(item);
  const isAdvert = !isBoosted && isSponsoredAdvert(item);
  const advertId = isAdvert ? item.advertId || item.id : null;
  const storeHref = item.storeHandle
    ? `/store/${item.storeHandle}`
    : item.vendorId
      ? `/store/${item.vendorId}`
      : null;
  const productHref = item.listing?.slug ? `/${item.listing.slug}` : null;

  const [addingToCart, setAddingToCart] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.listing) return;
    setAddingToCart(true);

    const unitPrice = item.listing.price / 100;
    const added = useCartStore.getState().addItem(
      {
        productId: item.listing.productId,
        name: item.listing.name,
        unitPrice,
        imageUrl: gallery[0] || null,
        vendorId: item.vendorId,
        vendorName: storeName,
      },
      1,
      {
        promoterBuyerId: item.placedByBuyer
          ? (item as { buyerId?: string; placedByBuyerId?: string }).buyerId ||
            (item as { placedByBuyerId?: string }).placedByBuyerId ||
            null
          : null,
        advertId: isAdvert ? advertId : null,
      },
    );

    if (added) {
      useCartStore.getState().openDrawer();
      toast.success(`Added "${item.listing.name}" to cart`);
    }
    setAddingToCart(false);
  };

  const chatHref = Boolean(item.vendorId)
    ? buildChatLink({
        vendorId: item.vendorId,
        productId: item.listing?.productId,
        source: "browse",
        message: isAdvert
          ? `Hi ${storeName}! I saw your sponsored ad "${item.title}" on Velte Hub and would like to find out more.`
          : item.listing?.kind === "service"
            ? `Hi ${storeName}! I'm interested in your "${item.title}" service. I found you on Velte Hub.`
            : `Hi ${storeName}! Is "${item.title}" still available? I found you on Velte Hub.`,
      })
    : null;

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

  // Price formatting
  const listingPrice = item.listing?.price
    ? formatNaira(item.listing.price)
    : null;

  return (
    <article
      ref={cardRef}
      className="relative rounded-2xl border border-gray-200 dark:border-white/10 bg-surface transition-all duration-200 overflow-hidden shadow-xs hover:border-gray-300 dark:hover:border-white/20"
    >
      {/* ── Top Header: Vendor Identity & Classification Badge ── */}
      <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3">
        {storeHref ? (
          <HubLink
            href={storeHref}
            onClick={() => {
              if (isAdvert && advertId) trackHubAdvert(advertId, "click");
            }}
            className="flex items-center gap-3 min-w-0 group hover:opacity-90 transition-opacity"
          >
            {item.placedByBuyer ? (
              <div className="relative flex shrink-0 items-center justify-center">
                {/* Buyer main avatar */}
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-neutral-900 text-white dark:bg-neutral-800 dark:text-ink flex items-center justify-center font-bold text-xs overflow-hidden ring-2 ring-surface shadow-xs">
                  {item.buyerAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.buyerAvatar}
                      alt={item.buyerName || "Buyer"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>
                      {(item.buyerName || "B").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Vendor subset avatar badge */}
                <div
                  title={`Vendor: ${storeName}`}
                  className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[9px] overflow-hidden ring-2 ring-surface shadow-xs"
                >
                  {item.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.avatar}
                      alt={storeName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{storeName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative flex shrink-0 items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs overflow-hidden ring-2 ring-surface">
                  {item.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.avatar}
                      alt={storeName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{storeName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {isEnterpriseVendor(item) && (
                  <EnterpriseAvatarBadge size="sm" />
                )}
              </div>
            )}

            <div className="min-w-0 flex-1">
              {item.placedByBuyer ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-sm text-ink truncate max-w-[130px] sm:max-w-none">
                    {item.buyerName || "Verified Buyer"}
                  </span>
                  <RepeatIcon size={12} className="text-orange-500 shrink-0" />
                  <span className="font-semibold text-sm text-gray-700 dark:text-ink/90 truncate max-w-[130px] sm:max-w-none group-hover:text-orange-600 transition-colors">
                    {storeName}
                  </span>
                  {item.verified && (
                    <span
                      title="Verified Vendor"
                      className="inline-flex shrink-0 items-center"
                    >
                      <CheckIcon
                        size={13}
                        className="text-orange-500 shrink-0"
                      />
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-sm text-ink truncate group-hover:text-orange-600 transition-colors">
                    {storeName}
                  </span>
                  {item.verified && (
                    <span
                      title="Verified Vendor"
                      className="inline-flex shrink-0 items-center"
                    >
                      <CheckIcon
                        size={13}
                        className="text-orange-500 shrink-0"
                      />
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-ink/60 mt-0.5">
                {item.placedByBuyer ||
                isAdvert ||
                item.sponsored ||
                item.kind === "promotion" ? (
                  <>
                    <span className="text-orange-600 dark:text-orange-400 font-medium">
                      Sponsored
                    </span>
                    <span>·</span>
                    {item.place && (
                      <>
                        <span>{item.place}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>{timeAgo(item.at, now)}</span>
                  </>
                ) : (
                  <>
                    {item.sectors?.[0] && (
                      <>
                        <span>{sectorLabel(item.sectors[0])}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>{timeAgo(item.at, now)}</span>
                    {(item.ratingCount ?? 0) > 0 && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold">
                          ★ {item.ratingAvg?.toFixed(1)}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </HubLink>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            {item.placedByBuyer ? (
              <div className="relative flex shrink-0 items-center justify-center">
                {/* Buyer main avatar */}
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-neutral-900 text-white dark:bg-neutral-800 dark:text-ink flex items-center justify-center font-bold text-xs overflow-hidden ring-2 ring-surface shadow-xs">
                  {item.buyerAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.buyerAvatar}
                      alt={item.buyerName || "Buyer"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>
                      {(item.buyerName || "B").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Vendor subset avatar badge */}
                <div
                  title={`Vendor: ${storeName}`}
                  className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[9px] overflow-hidden ring-2 ring-surface shadow-xs"
                >
                  {item.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.avatar}
                      alt={storeName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{storeName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative flex shrink-0 items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs overflow-hidden ring-2 ring-surface">
                  {item.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.avatar}
                      alt={storeName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{storeName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {isEnterpriseVendor(item) && (
                  <EnterpriseAvatarBadge size="sm" />
                )}
              </div>
            )}

            <div className="min-w-0 flex-1">
              {item.placedByBuyer ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-sm text-ink truncate max-w-[130px] sm:max-w-none">
                    {item.buyerName || "Verified Buyer"}
                  </span>
                  <RepeatIcon size={12} className="text-orange-500 shrink-0" />
                  <span className="font-semibold text-sm text-gray-700 dark:text-ink/90 truncate max-w-[130px] sm:max-w-none">
                    {storeName}
                  </span>
                  {item.verified && (
                    <span
                      title="Verified Vendor"
                      className="inline-flex shrink-0 items-center"
                    >
                      <CheckIcon
                        size={13}
                        className="text-orange-500 shrink-0"
                      />
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-sm text-ink truncate">
                    {storeName}
                  </span>
                  {item.verified && (
                    <span
                      title="Verified Vendor"
                      className="inline-flex shrink-0 items-center"
                    >
                      <CheckIcon
                        size={13}
                        className="text-orange-500 shrink-0"
                      />
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-ink/60 mt-0.5">
                {item.placedByBuyer ||
                isAdvert ||
                item.sponsored ||
                item.kind === "promotion" ? (
                  <>
                    <span className="text-orange-600 dark:text-orange-400 font-medium">
                      Sponsored
                    </span>
                    <span>·</span>
                    {item.place && (
                      <>
                        <span>{item.place}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>{timeAgo(item.at, now)}</span>
                  </>
                ) : (
                  <>
                    {item.sectors?.[0] && (
                      <>
                        <span>{sectorLabel(item.sectors[0])}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>{timeAgo(item.at, now)}</span>
                    {(item.ratingCount ?? 0) > 0 && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold">
                          ★ {item.ratingAvg?.toFixed(1)}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Badge: Sponsored Ad, Boosted, or New ── */}
        <div className="shrink-0">
          {isAdvert || item.sponsored || item.kind === "promotion" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
              <MegaphoneIcon size={12} className="shrink-0" />
              <span>Sponsored Ad</span>
            </span>
          ) : isBoosted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-900/40 px-2.5 py-0.5 text-xs font-bold text-sky-700 dark:text-sky-300">
              <ZapIcon size={12} className="shrink-0 fill-current" />
              <span>Boosted</span>
            </span>
          ) : item.kind === "product" && isNewListing(item.at, now) ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-900/40 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
              New
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Post Content / Title & Description ── */}
      <div className="px-4 sm:px-5 pb-3">
        {productHref ? (
          <HubLink
            href={productHref}
            className="block text-base font-bold text-ink leading-snug hover:text-orange-600 transition-colors cursor-pointer"
          >
            {item.title}
          </HubLink>
        ) : isAdvert && storeHref ? (
          <HubLink
            href={storeHref}
            onClick={() => {
              if (advertId) trackHubAdvert(advertId, "click");
            }}
            className="block text-base font-bold text-ink leading-snug hover:text-orange-600 hover:underline transition-colors cursor-pointer"
          >
            {item.title}
          </HubLink>
        ) : (
          <h4 className="text-base font-bold text-ink leading-snug">
            {item.title}
          </h4>
        )}

        {item.body && item.body !== item.title && (
          <div className="mt-1.5">
            <p
              className={cn(
                "text-sm text-gray-600 dark:text-ink/80 leading-relaxed transition-all whitespace-pre-line",
                !isDescriptionExpanded && "line-clamp-3",
              )}
            >
              {item.body}
            </p>
            {isLongDescription && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDescriptionExpanded((prev) => !prev);
                }}
                className="mt-1 inline-flex items-center gap-0.5 text-xs font-bold text-[#FF6B00] hover:text-orange-700 hover:underline cursor-pointer transition-colors"
              >
                <span>{isDescriptionExpanded ? "See less" : "See more"}</span>
              </button>
            )}
          </div>
        )}

        {/* Sentiment */}
        {item.sentiment && (
          <p className="mt-2 text-sm text-gray-600 dark:text-ink/70 leading-relaxed">
            <span className="font-semibold text-ink">
              {item.sentiment.rating}/5
            </span>
            {" · "}
            {item.sentiment.text}
          </p>
        )}

        {/* Badges */}
        {(item.trusted || item.fastDelivery) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.trusted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                Trusted check
              </span>
            )}
            {item.fastDelivery && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                Fast delivery
              </span>
            )}
          </div>
        )}

        {/* Price Strip */}
        {listingPrice && (
          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500/10 dark:bg-orange-500/15 px-3 py-1 text-sm font-extrabold text-orange-600 dark:text-orange-400 border border-orange-500/20">
              <span>{listingPrice}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Media Gallery: Single Image (Protected Canvas) or Multi-Image Swipeable Carousel ── */}
      {gallery.length === 1 ? (
        <div className="px-4 sm:px-5 pb-3 relative">
          <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] overflow-hidden rounded-2xl bg-gray-900">
            <ProtectedPosterPreview
              src={gallery[0]}
              fit="cover"
              className="h-full w-full cursor-pointer"
              onClick={() => {
                if (isAdvert) {
                  const img = gallery[0];
                  if (img) onOpenAdvertImage?.(img);
                } else if (productHref) {
                  navigate(productHref);
                }
              }}
            />
          </div>
          {(isAdvert || item.sponsored || item.kind === "promotion") && (
            <div className="absolute top-2 left-7 z-10 pointer-events-none">
              <span className="inline-flex items-center gap-1 rounded-md bg-black/75 backdrop-blur-xs px-2 py-0.5 text-[11px] font-bold text-white shadow-md">
                <MegaphoneIcon size={11} className="shrink-0 text-orange-400" />
                <span>Sponsored Ad</span>
              </span>
            </div>
          )}
          {isBoosted &&
            !(isAdvert || item.sponsored || item.kind === "promotion") && (
              <div className="absolute top-2 left-7 z-10 pointer-events-none">
                <span className="inline-flex items-center gap-1 rounded-md bg-black/75 backdrop-blur-xs px-2 py-0.5 text-[11px] font-bold text-white shadow-md">
                  <ZapIcon
                    size={11}
                    className="shrink-0 fill-orange-400 text-orange-400"
                  />
                  <span>Boosted</span>
                </span>
              </div>
            )}
        </div>
      ) : gallery.length > 1 ? (
        <div className="px-4 sm:px-5 pb-3 relative">
          <ManualProductCarousel
            images={gallery}
            altTitle={item.title}
            aspectRatio="video"
            autoSlide={false}
            isProtected={true}
            onImageClick={(index) => {
              if (isAdvert) {
                const img = gallery[index] || gallery[0];
                if (img) onOpenAdvertImage?.(img);
              } else if (productHref) {
                navigate(productHref);
              }
            }}
          />
          {(isAdvert || item.sponsored || item.kind === "promotion") && (
            <div className="absolute top-2 left-7 z-10 pointer-events-none">
              <span className="inline-flex items-center gap-1 rounded-md bg-black/75 backdrop-blur-xs px-2 py-0.5 text-[11px] font-bold text-white shadow-md">
                <MegaphoneIcon size={11} className="shrink-0 text-orange-400" />
                <span>Sponsored Ad</span>
              </span>
            </div>
          )}
          {isBoosted &&
            !(isAdvert || item.sponsored || item.kind === "promotion") && (
              <div className="absolute top-2 left-7 z-10 pointer-events-none">
                <span className="inline-flex items-center gap-1 rounded-md bg-black/75 backdrop-blur-xs px-2 py-0.5 text-[11px] font-bold text-white shadow-md">
                  <ZapIcon
                    size={11}
                    className="shrink-0 fill-orange-400 text-orange-400"
                  />
                  <span>Boosted</span>
                </span>
              </div>
            )}
        </div>
      ) : null}

      {/* ── Bottom Interactive Action Bar ── */}
      <div className="px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2 bg-gray-50/50 dark:bg-white/2">
        {isAdvert ? (
          <div className="flex items-center gap-2.5 flex-wrap">
            {storeHref && (
              <HubLink
                href={storeHref}
                onClick={() => {
                  if (advertId) trackHubAdvert(advertId, "click");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <StoreIcon size={14} />
                <span>Visit store</span>
              </HubLink>
            )}

            {chatHref ? (
              <HubLink
                href={chatHref}
                onClick={() => {
                  if (advertId) trackHubAdvert(advertId, "click");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 text-gray-700 dark:text-ink px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                <MessageSquareIcon size={14} className="text-orange-500" />
                <span>Chat up vendor now</span>
              </HubLink>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (advertId) trackHubAdvert(advertId, "click");
                  onContact();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 text-gray-700 dark:text-ink px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                <MessageSquareIcon size={14} className="text-orange-500" />
                <span>Chat up vendor now</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {item.listing && (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-60"
              >
                <ShoppingCartIcon size={14} />
                <span>Add to Cart</span>
              </button>
            )}

            {isEnterpriseVendor(item) && (
              <button
                type="button"
                onClick={onContact}
                className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-950/30 px-3.5 py-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors cursor-pointer shadow-xs"
              >
                {!premium && <LockIcon size={12} />}
                <span>Contact</span>
              </button>
            )}

            <button
              type="button"
              onClick={onVisit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 text-gray-700 dark:text-ink px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              {!premium && <LockIcon size={12} />}
              <span>Visit check</span>
            </button>

            <button
              type="button"
              onClick={onReview}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 text-gray-700 dark:text-ink px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <span>Review vendor</span>
            </button>

            <button
              type="button"
              onClick={onFavourite}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 text-gray-700 dark:text-ink px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              {!premium ? (
                <LockIcon size={12} />
              ) : (
                <HeartIcon
                  size={12}
                  className={cn(favourite && "text-orange-600 fill-orange-600")}
                />
              )}
              <span>{favourite ? "Saved" : "Favourite"}</span>
            </button>

            {onBoost && (
              <button
                type="button"
                onClick={onBoost}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 text-gray-700 dark:text-ink px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                {!premium && <LockIcon size={12} />}
                <span>Boost</span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
