"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Baby,
  BadgeCheck,
  Bell,
  Briefcase,
  Building2,
  Camera,
  ChefHat,
  FileText,
  Flame,
  Gift,
  Heart,
  Leaf,
  Lock,
  MapPin,
  Monitor,
  PartyPopper,
  Phone,
  Scale,
  Send,
  Shield,
  Shirt,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Sun,
  Truck,
  Utensils,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCreditsModal } from "@/components/credits/CreditsModal";
import { CardCarousel } from "@/components/search/CardCarousel";
import { SECTOR_BY_VALUE, SECTOR_TAXONOMY } from "@/lib/sectors";
import { modalScrimClass } from "@/lib/modalScrim";
import { cn, timeAgo } from "@/lib/utils";
import type {
  HubBroadcastPrefs,
  HubBuyerBroadcast,
  HubCommunityPost,
  HubFeaturedVendor,
  HubHome,
  HubSocial,
  HubTimelineItem,
} from "@/types/hub";
import { HubLockedModal } from "./HubLockedModal";

type FeedFilter = "all" | "promotion" | "product" | "rated";
type FeedSort = "recent" | "rated";

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

const CATEGORY_ICON: Record<string, LucideIcon> = {
  food_hospitality: Utensils,
  event_services: PartyPopper,
  retail_trade: ShoppingCart,
  fashion_apparel: Shirt,
  electronics_technology: Monitor,
  beauty_personal_care: Sparkles,
  home_living: Building2,
  building_construction: Wrench,
  automotive: Truck,
  repairs_technical: Wrench,
  professional_business_services: Briefcase,
  education_training: FileText,
  transportation_logistics: Truck,
  arts_media_entertainment: Camera,
  home_services_domestic: Sparkles,
};

const LEAF_ICON: Record<string, LucideIcon> = {
  bakery_pastries: ChefHat,
  confectionery_snacks: ChefHat,
  bars_lounges_nightlife: Flame,
  shoes_footwear: ShoppingCart,
  bags_accessories: Gift,
  jewelry_watches: Sparkles,
  phones_accessories: Phone,
  phone_gadget_repairs: Phone,
  computers_laptops: Monitor,
  solar_installation: Sun,
  generator_sales_repair: Zap,
  electrical_installation_services: Zap,
  real_estate_property_sales: Building2,
  hotels_shortlets: Building2,
  groceries_supermarket: ShoppingCart,
  gift_items_souvenirs: Gift,
  legal_services: Scale,
  photography_videography: Camera,
  daycare_creche: Baby,
  toys_kids_items: Baby,
  gardening_landscaping: Leaf,
  security_services: Shield,
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

function sectorIcon(value: string) {
  const slug = sectorSlug(value);
  if (!slug) return Store;
  return LEAF_ICON[slug] ?? CATEGORY_ICON[CATEGORY_BY_SECTOR[slug]] ?? Store;
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
          <Star
            key={index}
            size={12}
            className={
              index < filled
                ? "fill-amber-500 text-amber-500"
                : "fill-transparent text-gray-300"
            }
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
      <BadgeCheck size={12} />
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

export function BuyerHub({ home }: { home: HubHome }) {
  const { open: openCredits } = useCreditsModal();
  const [sector, setSector] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [sort, setSort] = useState<FeedSort>("recent");
  const [contact, setContact] = useState<ContactTarget | null>(null);
  const [lock, setLock] = useState<
    | "contact"
    | "review"
    | "visit"
    | "community"
    | "place"
    | "boost"
    | "broadcast"
    | "sectors"
    | "favourite"
    | null
  >(null);
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
  const now = Date.now();

  useEffect(() => {
    setVisitSaved(false);
    setReviewRating(5);
    setReviewText("");
    setVisitOpen(visitIntent.current && home.premium);
    visitIntent.current = false;
  }, [contact?.vendorId, home.premium]);

  const sectors = home.sectors ?? [];

  const feed = useMemo(() => {
    let items = home.timeline.filter((item) => item.kind !== "update");
    if (sector) items = items.filter((item) => item.sectors?.includes(sector));
    if (filter === "promotion")
      items = items.filter((item) => item.kind === "promotion");
    if (filter === "product")
      items = items.filter((item) => item.kind === "product");
    if (filter === "rated")
      items = items.filter((item) => item.ratingCount > 0);
    if (sort === "rated") {
      items = [...items].sort(
        (a, b) =>
          (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0) ||
          b.ratingCount - a.ratingCount,
      );
    }
    return items;
  }, [home.timeline, sector, filter, sort]);

  const featured = useMemo(() => {
    if (!sector) return home.featured;
    return home.featured.filter((vendor) => vendor.sectors.includes(sector));
  }, [home.featured, sector]);

  const updates = useMemo(
    () => home.timeline.filter((item) => item.kind === "update").slice(0, 3),
    [home.timeline],
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
    for (const item of home.timeline) {
      add(item.vendorId, item.storeName || "Vendor", [
        item.imageUrl,
        ...(item.images ?? []),
      ]);
    }
    return [...byId.values()].filter((vendor) => vendor.images.length > 0);
  }, [home.featured, home.timeline]);

  const chosenVendor =
    advertVendors.find((vendor) => vendor.vendorId === placeVendorId) ?? null;

  const openContact = (target: ContactTarget) => {
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
    if (!home.premium) {
      setLock("review");
      return;
    }
    setContact(target);
  };

  const askContact = () => {
    if (!contact) return;
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
      setPlaceOpen(false);
      setNotice("Advert placed");
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

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl bg-slab text-white min-h-[280px] sm:min-h-[320px]">
        <div className="grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] min-h-[280px] sm:min-h-[320px]">
          <div className="relative z-10 flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12">
            <p className="text-[11px] sm:text-xs font-bold tracking-[0.22em] text-orange-400">
              VELTE VENDOR HUB
            </p>
            <h2 className="mt-3 text-[2rem] sm:text-5xl font-bold tracking-tight leading-[1.05] text-white">
              Discover Amazing
              <br />
              Local Businesses
            </h2>
            <p className="mt-4 max-w-md text-sm sm:text-[15px] leading-relaxed text-white/80">
              Find trusted vendors, great products and services, all in one
              place. Shop local. Support real businesses.
            </p>
          </div>
          <div className="relative min-h-[220px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hub/buyer-hero-subject.png"
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
            />
            <div className="absolute inset-y-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-slab to-transparent" />
            <p
              className="absolute right-4 sm:right-7 top-1/2 -translate-y-1/2 text-right text-orange-400 text-[1.65rem] sm:text-[2rem] leading-[1.15]"
              style={{
                fontFamily: '"Segoe Script", "Brush Script MT", cursive',
              }}
            >
              Local
              <br />
              Businesses
              <br />
              Real People
              <br />
              Great Deals
            </p>
          </div>
        </div>
      </section>

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

          <CardCarousel
            items={[
              {
                key: "all",
                label: "All Vendors",
                icon: Store,
                active: sector === null,
                onClick: () => setSector(null),
              },
              ...sectors.map((row) => ({
                key: row.value,
                label: sectorLabel(row.value),
                icon: sectorIcon(row.value),
                active: sector === row.value,
                onClick: () => setSector(row.value),
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

          <div
            id="hub-vendors"
            className="scroll-mt-4 flex flex-wrap items-center gap-2"
          >
            {(
              [
                ["all", "All"],
                ["promotion", "Promotions"],
                ["product", "New Listings"],
                ["rated", "Top Rated"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                  filter === key
                    ? "border-orange-400 text-orange-600 bg-orange-50"
                    : "border-gray-200 text-gray-600 bg-surface hover:border-orange-200",
                )}
              >
                {label}
              </button>
            ))}
            <label className="ml-auto inline-flex items-center gap-2 text-xs text-gray-500">
              <span className="sr-only">Sort</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as FeedSort)}
                className="bg-surface border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink"
              >
                <option value="recent">Most recent</option>
                <option value="rated">Top rated</option>
              </select>
            </label>
          </div>

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

          {feed.length === 0 ? (
            <div className="bg-surface border border-gray-200 rounded-2xl p-10 text-center">
              <p className="font-semibold text-ink">Nothing in this view yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Listings and labelled promotions show up as vendors publish
                them.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feed.map((item) => (
                <FeedCard
                  key={item.id}
                  item={item}
                  now={now}
                  premium={home.premium}
                  favourite={favourites.has(item.vendorId)}
                  onContact={() => openContact(contactFromItem(item))}
                  onVisit={() => openVisit(contactFromItem(item))}
                  onReview={() => openReview(contactFromItem(item))}
                  onFavourite={() => toggleFavourite(item.vendorId)}
                  onBoost={
                    item.advertId
                      ? () => boostAdvert(item.advertId as string)
                      : undefined
                  }
                />
              ))}
            </div>
          )}

          <section className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shrink-0">
              <Store size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">
                Want to grow your business on Velte?
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                Create a contact card, list what you sell, and broadcast an
                update.
              </p>
            </div>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors shrink-0"
            >
              Learn Now
              <span aria-hidden className="ml-1">
                →
              </span>
            </Link>
          </section>
        </div>

        <aside className="space-y-4 lg:self-stretch">
          <section className="bg-surface border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-ink">Featured Vendors</h3>
              {featured.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSector(null);
                    document
                      .getElementById("hub-vendors")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  View all →
                </button>
              )}
            </div>
            {featured.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                Vendors show up here as they publish a store.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {featured.slice(0, 6).map((vendor) => (
                  <li key={vendor.vendorId}>
                    <div className="w-full flex items-center gap-3 py-2.5 text-left">
                      <Avatar
                        name={vendor.name}
                        src={vendor.avatar}
                        className="h-10 w-10 rounded-full text-xs shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-ink truncate">
                            {vendor.name}
                          </span>
                          {vendor.verified && (
                            <BadgeCheck
                              size={14}
                              className="text-sky-500 shrink-0"
                            />
                          )}
                        </span>
                        <Stars
                          avg={vendor.ratingAvg}
                          count={vendor.ratingCount}
                        />
                        {vendor.sentiment && (
                          <span className="block text-[11px] text-gray-600 line-clamp-2 mt-0.5">
                            {vendor.sentiment.rating}/5 ·{" "}
                            {vendor.sentiment.text}
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
                          onClick={() =>
                            openContact(contactFromFeatured(vendor))
                          }
                          className="mt-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700"
                        >
                          Contact card
                        </button>
                        {vendor.place && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                            <MapPin size={11} />
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
                          onClick={() => toggleFavourite(vendor.vendorId)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-600"
                        >
                          {!home.premium ? (
                            <Lock size={12} />
                          ) : (
                            <Heart
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
          </section>

          <div className="space-y-4 lg:sticky lg:top-16">
            <section className="bg-surface border border-gray-200 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-ink mb-3">
                Popular Sectors
              </h3>
              {sectors.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Sectors appear once stores choose them.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {sectors.slice(0, 6).map((row) => {
                    const Icon = sectorIcon(row.value);
                    return (
                      <button
                        key={row.value}
                        type="button"
                        onClick={() => setSector(row.value)}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left transition-colors",
                          sector === row.value
                            ? "border-orange-300 bg-orange-50"
                            : "border-gray-200 bg-surface hover:border-orange-200",
                        )}
                      >
                        <Icon size={16} className="text-orange-500" />
                        <span className="mt-2 block text-xs font-semibold text-ink leading-snug">
                          {sectorLabel(row.value)}
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

            <section className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
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
                    <BadgeCheck size={16} className="text-sky-500 shrink-0" />
                  )}
                </div>
                {contact.sectors[0] && (
                  <p className="text-xs text-gray-500">
                    {sectorLabel(contact.sectors[0])}
                  </p>
                )}
                <Stars avg={contact.ratingAvg} count={contact.ratingCount} />
                {contact.place && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <MapPin size={12} />
                    {contact.place}
                  </p>
                )}
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
              <button
                type="button"
                onClick={askContact}
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                {home.premium ? "Message on WhatsApp" : "Contact this business"}
              </button>
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
            {contact.reviewableOrderId &&
              (home.premium ? (
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
                          rating: reviewRating,
                          text: reviewText,
                        }),
                      });
                      if (res.status === 403) {
                        setLock("review");
                        return;
                      }
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
                    Review this order
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
                    placeholder="How did the order go?"
                    className="w-full rounded-xl border border-gray-200 bg-surface px-3 py-2 text-sm text-ink placeholder:text-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={reviewing}
                    className="w-full rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
                  >
                    {reviewing ? "Saving…" : "Save review"}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setLock("review")}
                  className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-ink hover:border-orange-300"
                >
                  Review this business
                </button>
              ))}
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
          title={
            lock === "review"
              ? "Reviews are on Premium"
              : lock === "visit"
                ? "A visit check is on Premium"
                : lock === "community"
                  ? "Community posts are on Premium"
                  : lock === "place"
                    ? "Placing an advert is on Premium"
                    : lock === "boost"
                      ? "Boosting is on Premium"
                      : lock === "broadcast"
                        ? "Messaging contacts is on Premium"
                        : lock === "sectors"
                          ? "Choosing sectors is on Premium"
                          : lock === "favourite"
                            ? "Favourites are on Premium"
                            : "Contact is on Premium"
          }
          body={
            lock === "review"
              ? "A review opens after a confirmed order. Premium is what publishes it."
              : lock === "visit"
                ? "Premium records whether you visited, saw the stock, and the address matched."
                : lock === "community"
                  ? "Reading updates stays open. Posting is part of Premium."
                  : lock === "place"
                    ? "Premium places a labelled advert for a vendor, using a photo already on that store."
                    : lock === "boost"
                      ? "Premium queues a boost. It is not marked sent, and it does not charge the vendor."
                      : lock === "broadcast"
                        ? "Premium sends a note to the Premium buyers you referred."
                        : lock === "sectors"
                          ? "Alerts cover every sector. Premium is what lets you pick."
                          : lock === "favourite"
                            ? "Premium saves a vendor to your Hub."
                            : "Premium opens the vendor's own channel from a Hub card. The store page stays open either way."
          }
          ctaLabel="See Premium"
          onCta={() => {
            setLock(null);
            openCredits();
          }}
          onClose={() => setLock(null)}
        />
      )}
    </div>
  );
}

function SocialLinks({ social }: { social: HubSocial }) {
  const links = (
    [
      ["Instagram", social.instagram],
      ["Facebook", social.facebook],
      ["TikTok", social.tiktok],
      ["X", social.x],
    ] as const
  ).filter((entry): entry is [string, string] => Boolean(entry[1]));
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
    <section className="bg-surface border border-gray-200 rounded-2xl px-4">
      {notice && (
        <p className="pt-3 text-xs font-semibold text-orange-600">{notice}</p>
      )}
      <ToolRow icon={Store} title="Promote a shop">
        <TextAction onClick={onPlace} locked={!home.premium}>
          Place an Advert
        </TextAction>
      </ToolRow>
      <div className="border-t border-gray-100">
        <ToolRow icon={Bell} title="Vendor alerts">
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
        <ToolRow icon={Send} title="Message contacts">
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
  icon: LucideIcon;
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
      {locked && <Lock size={12} className="text-gray-400" />}
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
    <section className="bg-surface border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-bold text-ink">Community & Updates</h3>
        {!home.premium && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500">
            <Lock size={12} />
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
          <Lock size={12} />
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
  icon: LucideIcon;
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
  onContact,
  onVisit,
  onReview,
  onFavourite,
  onBoost,
}: {
  item: HubTimelineItem;
  now: number;
  premium: boolean;
  favourite: boolean;
  onContact: () => void;
  onVisit: () => void;
  onReview: () => void;
  onFavourite: () => void;
  onBoost?: () => void;
}) {
  const gallery = [...new Set((item.images ?? []).filter(Boolean))];
  const cover = item.imageUrl || gallery[0] || null;
  const extras = gallery.filter((url) => url !== cover);
  const thumbs = gallery.length > 1 ? extras.slice(0, 3) : [];
  const extra = gallery.length > 1 ? extras.length - thumbs.length : 0;
  const badge =
    item.kind === "product"
      ? "New Listing"
      : item.sponsored
        ? "Sponsored"
        : "Promotion";

  return (
    <article className="bg-surface border border-gray-200 rounded-2xl p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-start">
        <div className="relative w-full sm:w-[220px] shrink-0">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              className="h-[180px] w-full object-cover rounded-xl bg-gray-100"
            />
          ) : (
            <div className="h-[180px] w-full rounded-xl bg-gray-100" />
          )}
          <span
            className={cn(
              "absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md",
              badge === "Sponsored"
                ? "bg-orange-500 text-white"
                : "bg-surface/95 text-ink",
            )}
          >
            {badge}
          </span>
        </div>
        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-start gap-2.5">
            <Avatar
              name={item.storeName || "Vendor"}
              src={item.avatar}
              className="h-10 w-10 rounded-full text-xs shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-ink truncate">
                  {item.storeName || "Vendor"}
                </p>
                {item.verified && (
                  <BadgeCheck size={14} className="text-sky-500 shrink-0" />
                )}
              </div>
              {item.sectors?.[0] && (
                <p className="text-[11px] text-gray-500 truncate">
                  {sectorLabel(item.sectors[0])}
                </p>
              )}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <Stars avg={item.ratingAvg} count={item.ratingCount} />
                {item.place && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                    <MapPin size={11} />
                    {item.place}
                  </span>
                )}
              </div>
            </div>
            <span className="text-[11px] text-gray-400 shrink-0">
              {timeAgo(item.at, now)}
            </span>
          </div>

          <h3 className="mt-3 text-base font-bold text-ink leading-snug line-clamp-2">
            {item.title}
          </h3>
          {item.placedByBuyer && (
            <p className="mt-1 text-[11px] font-semibold text-gray-500">
              Placed by a buyer
            </p>
          )}
          {item.body && item.body !== item.title && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {item.body}
            </p>
          )}
          {item.sentiment && (
            <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-2">
              <span className="font-semibold text-ink">
                {item.sentiment.rating}/5
              </span>
              {" · "}
              {item.sentiment.text}
            </p>
          )}
          {(item.verified || item.trusted) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
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
            <div className="mt-2">
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                Fast delivery
              </span>
            </div>
          )}

          {thumbs.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
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

          <div className="mt-auto pt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onContact}
              className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 hover:bg-orange-100 transition-colors"
            >
              {!premium && <Lock size={12} />}
              Contact
            </button>
            <button
              type="button"
              onClick={onVisit}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-ink hover:border-orange-300"
            >
              {!premium && <Lock size={12} />}
              Visit check
            </button>
            <button
              type="button"
              onClick={onReview}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-ink hover:border-orange-300"
            >
              {!premium && item.reviewableOrderId && <Lock size={12} />}
              Review
            </button>
            <button
              type="button"
              onClick={onFavourite}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-ink hover:border-orange-300"
            >
              {!premium ? (
                <Lock size={12} />
              ) : (
                <Heart
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
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-ink hover:border-orange-300"
              >
                {!premium && <Lock size={12} />}
                Boost
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
