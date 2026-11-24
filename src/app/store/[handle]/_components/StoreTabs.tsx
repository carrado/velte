"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProtectedImage } from "@/components/ProtectedImage";
import {
  SquaresFour,
  ShoppingCart,
  Star,
  Storefront,
  ShieldCheck,
  Tag,
  Truck,
  ArrowRight,
  Cake,
  Sneaker,
  Handbag,
  ForkKnife,
  Sparkle,
  Buildings,
  Laptop,
  TShirt,
  DeviceMobile,
  FirstAid,
  Wine,
  Funnel,
  ChatCircleDots,
  Images,
  MapPin,
  Globe,
  CheckCircle,
  X,
  MagnifyingGlassPlus,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { HubLockedModal } from "@/components/hub/HubLockedModal";
import TabBar from "@/components/TabBar";
import type { TabItem } from "@/types/common";
import { fmt } from "@/lib/product-price";
import { cn, timeAgo } from "@/lib/utils";
import { getInitial } from "@/lib/initials";
import type { PublicStoreProduct, StoreTabsProps } from "@/types/store";

interface DisplayProduct {
  id: string;
  name: string;
  priceKobo: number;
  imageUrl: string;
  description?: string | null;
  ratingAvg?: number | null;
  ratingCount: number;
  category: string;
  slug?: string | null;
  quoteOnRequest?: boolean;
  attributes?: { name: string; value: string }[];
}

function getSectorIcon(sector: string) {
  const s = sector.toLowerCase();
  if (s.includes("bake") || s.includes("cake") || s.includes("pastr")) {
    return <Cake size={14} weight="duotone" />;
  }
  if (s.includes("shoe") || s.includes("footwear") || s.includes("sneaker")) {
    return <Sneaker size={14} weight="duotone" />;
  }
  if (s.includes("bag") || s.includes("accessori") || s.includes("wallet")) {
    return <Handbag size={14} weight="duotone" />;
  }
  if (s.includes("cater") || s.includes("food") || s.includes("restaurant")) {
    return <ForkKnife size={14} weight="duotone" />;
  }
  if (s.includes("usher") || s.includes("event") || s.includes("party")) {
    return <Sparkle size={14} weight="duotone" />;
  }
  if (s.includes("estate") || s.includes("propert")) {
    return <Buildings size={14} weight="duotone" />;
  }
  if (s.includes("computer") || s.includes("it") || s.includes("repair")) {
    return <Laptop size={14} weight="duotone" />;
  }
  if (
    s.includes("cloth") ||
    s.includes("fashion") ||
    s.includes("apparel") ||
    s.includes("wear")
  ) {
    return <TShirt size={14} weight="duotone" />;
  }
  if (s.includes("phone") || s.includes("gadget") || s.includes("electronic")) {
    return <DeviceMobile size={14} weight="duotone" />;
  }
  if (
    s.includes("drink") ||
    s.includes("beverage") ||
    s.includes("bar") ||
    s.includes("lounge")
  ) {
    return <Wine size={14} weight="duotone" />;
  }
  if (s.includes("health") || s.includes("pharmac")) {
    return <FirstAid size={14} weight="duotone" />;
  }
  return <Tag size={14} weight="duotone" />;
}

export type StoreNavTab = "products" | "photos" | "locations" | "reviews";

export default function StoreTabs({
  goods = [],
  storeName,
  storeHandle,
  vendorId,
  sectors = [],
  description,
  adverts = [],
  initialIsLoggedIn,
  gallery = [],
  locations = [],
  area,
  state,
  country = "Nigeria",
  companyLocation,
  storeType = "online",
  reviews = [],
  ratingAvg,
  ratingCount = 0,
  ratingDistribution,
}: StoreTabsProps) {
  const [activeTab, setActiveTab] = useState<StoreNavTab>("products");

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [currentAdvertIdx, setCurrentAdvertIdx] = useState(0);

  // Lightbox modal state for storefront photos
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Auto-play active adverts carousel if more than one advert
  useEffect(() => {
    if (adverts.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentAdvertIdx((prev) => (prev + 1) % adverts.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [adverts.length]);

  // Auth gate state for unauthenticated viewers
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authGateReason, setAuthGateReason] = useState<"cart" | "description">(
    "cart",
  );

  const vendor = useUserStore((s) => s.user);
  const buyer = useBuyerStore((s) => s.buyer);
  const isLoggedIn = Boolean(vendor || buyer || initialIsLoggedIn);

  const addItem = useCartStore((s) => s.addItem);

  // Dynamic category pills generated from the store's actual registered sectors
  const categoryPills = useMemo(() => {
    const pills = [
      {
        id: "all",
        label: "All Products",
        icon: <SquaresFour size={14} weight="bold" />,
      },
    ];

    if (sectors.length > 0) {
      sectors.forEach((sec) => {
        pills.push({
          id: sec,
          label: sec,
          icon: getSectorIcon(sec),
        });
      });
    }

    return pills;
  }, [sectors]);

  // Database-sourced products uploaded by the vendor (goods)
  const productList: DisplayProduct[] = useMemo(() => {
    return goods.map((g, idx) => ({
      id: g.id,
      name: g.name,
      priceKobo: g.price,
      imageUrl:
        g.mainImageUrl ||
        (g.thumbnailUrls && g.thumbnailUrls[0]) ||
        "/placeholder-product.png",
      description: g.description,
      ratingAvg:
        (g as unknown as { ratingAvg?: number | null }).ratingAvg ?? null,
      ratingCount: (g as unknown as { ratingCount?: number }).ratingCount ?? 0,
      category:
        g.category ||
        (sectors.length > 0 ? sectors[idx % sectors.length] : "All Products"),
      slug: g.slug || g.id,
    }));
  }, [goods, sectors]);

  // Filtered by selected category and sort order
  const filteredProducts = useMemo(() => {
    let list =
      selectedCategory === "all"
        ? productList
        : productList.filter((p) => {
            if (!p.category) return false;
            const pCat = p.category.toLowerCase();
            const sCat = selectedCategory.toLowerCase();
            return pCat.includes(sCat) || sCat.includes(pCat);
          });

    if (sortBy === "price-low") {
      list = [...list].sort((a, b) => a.priceKobo - b.priceKobo);
    } else if (sortBy === "price-high") {
      list = [...list].sort((a, b) => b.priceKobo - a.priceKobo);
    } else if (sortBy === "rating") {
      list = [...list].sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0));
    }

    return list;
  }, [productList, selectedCategory, sortBy]);

  // Gated Add to Cart handler
  const handleAddToCart = (p: DisplayProduct) => {
    if (!isLoggedIn) {
      setAuthGateReason("cart");
      setAuthGateOpen(true);
      return;
    }

    addItem({
      productId: p.id,
      vendorId: vendorId || "vendor-store",
      vendorName: storeName,
      name: p.name,
      imageUrl: p.imageUrl,
      unitPrice: p.priceKobo / 100,
    });
    toast.success(`Added ${p.name} to cart!`);
  };

  // Gated Description "See more" handler
  const handleToggleDescription = (productId: string) => {
    if (!isLoggedIn) {
      setAuthGateReason("description");
      setAuthGateOpen(true);
      return;
    }

    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const isPhysical =
    storeType === "physical" || locations.length > 0 || Boolean(area);
  const primaryAddress =
    [companyLocation, area, state, country].filter(Boolean).join(", ") ||
    (area ? `${area}, Nigeria` : "Operating in Nigeria");

  const storeTabs: TabItem<StoreNavTab>[] = useMemo(
    () => [
      {
        key: "products",
        label: "Products",
        count: goods.length,
      },
      {
        key: "photos",
        label: "Storefront Photos",
        count: gallery.length > 0 ? gallery.length : undefined,
      },
      {
        key: "locations",
        label: "Locations & Coverage",
      },
      {
        key: "reviews",
        label: "Reviews & Ratings",
        count: ratingCount > 0 ? ratingCount : undefined,
      },
    ],
    [goods.length, gallery.length, ratingCount],
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Main Tab Navigation Bar ───────────────────────────────────── */}
      <div className="flex items-center overflow-x-auto scrollbar-none pb-1">
        <TabBar<StoreNavTab>
          size="lg"
          tabs={storeTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* ── TAB 1: PRODUCTS ───────────────────────────────────────────── */}
      {activeTab === "products" && (
        <div className="space-y-6 sm:space-y-8">
          {/* Sector Category Filter Badge Strip */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categoryPills.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer border shadow-2xs",
                    isActive
                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-400/30"
                      : "bg-surface hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-ink/75 border-gray-200/80 dark:border-white/10 hover:text-ink",
                  )}
                >
                  <span
                    className={
                      isActive
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-gray-400"
                    }
                  >
                    {cat.icon}
                  </span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Header: Title + Count + Category Filter + Sort Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <h2 className="text-base sm:text-lg font-semibold text-ink">
              Store Products{" "}
              <span className="text-gray-400 font-normal text-sm sm:text-base">
                ({filteredProducts.length})
              </span>
            </h2>

            {/* Controls */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <div className="relative shrink-0">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Funnel size={13} weight="duotone" />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-7 pr-8 py-1.5 rounded-md border border-gray-200 dark:border-white/10 bg-surface text-xs font-medium text-ink cursor-pointer focus:outline-none focus:border-orange-500 shadow-2xs hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  aria-label="Filter by category"
                >
                  <option value="all">All Categories</option>
                  {sectors.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-3 pr-8 py-1.5 rounded-md border border-gray-200 dark:border-white/10 bg-surface text-xs font-medium text-ink cursor-pointer focus:outline-none focus:border-orange-500 shadow-2xs hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <option value="popular">Sort by: Most Popular</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-surface rounded-3xl border border-gray-100 dark:border-white/10 my-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-[#ff5500] flex items-center justify-center mb-4">
                <Storefront size={32} weight="duotone" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-ink">
                No Products in this Category
              </h3>
              <p className="text-xs sm:text-sm text-ink/60 mt-1 max-w-sm">
                {selectedCategory === "all"
                  ? `${storeName} has not listed any catalog products yet.`
                  : `There are currently no products under "${selectedCategory}".`}
              </p>
              {selectedCategory !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className="mt-4 px-4 py-2 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors cursor-pointer"
                >
                  View All Products
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
              {filteredProducts.map((product) => {
                const detailHref = product.slug
                  ? `/${product.slug}`
                  : `/p/${product.id}`;
                const isExpanded = expandedProductIds.has(product.id);
                const hasRealRating =
                  product.ratingAvg != null && product.ratingCount > 0;

                return (
                  <div
                    key={product.id}
                    className="group rounded-xl border border-gray-100 dark:border-white/10 bg-surface p-3 sm:p-3.5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Product Photo */}
                      <Link
                        href={detailHref}
                        className="relative aspect-[4/3] rounded-lg overflow-hidden bg-neutral-100 dark:bg-white/5 block mb-2.5"
                      >
                        <ProtectedImage
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </Link>

                      {/* Title */}
                      <Link
                        href={detailHref}
                        className="font-semibold text-xs sm:text-sm text-ink hover:text-orange-600 transition-colors line-clamp-1 mb-1 block"
                        title={product.name}
                      >
                        {product.name}
                      </Link>

                      {/* Truncated Description */}
                      {product.description && (
                        <div className="mb-2">
                          <p
                            className={cn(
                              "text-[11px] sm:text-xs leading-relaxed text-gray-500 dark:text-ink/65",
                              !isExpanded && "line-clamp-2",
                            )}
                          >
                            {product.description}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleToggleDescription(product.id)}
                            className="text-[11px] font-medium text-[#ff5500] hover:underline mt-0.5 cursor-pointer inline-block"
                          >
                            {isExpanded ? "Show less" : "See more"}
                          </button>
                        </div>
                      )}

                      {/* Price */}
                      <p className="font-bold text-sm sm:text-base text-orange-600 dark:text-orange-400 tracking-tight">
                        {fmt(product.priceKobo / 100, "₦")}
                      </p>

                      {/* Rating */}
                      {hasRealRating ? (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 mt-0.5 mb-2.5">
                          <Star
                            size={11}
                            weight="fill"
                            className="text-amber-400 shrink-0"
                          />
                          <span className="text-ink font-semibold">
                            {product.ratingAvg!.toFixed(1)}
                          </span>
                          <span className="text-gray-400 font-normal">
                            ({product.ratingCount})
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-400 dark:text-ink/40 mt-0.5 mb-2.5">
                          No reviews yet
                        </div>
                      )}
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className="w-full mt-2 py-2 sm:py-2.5 rounded-lg bg-[#ff5500] hover:bg-orange-600 active:scale-98 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <ShoppingCart size={15} weight="bold" />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Showcase (About This Store + Promotional Banner) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-4 pb-6">
            <div className="md:col-span-5 rounded-2xl border border-gray-100 dark:border-white/10 bg-surface p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Storefront
                    size={20}
                    weight="duotone"
                    className="text-[#ff5500]"
                  />
                  <h3 className="font-semibold text-sm sm:text-base text-ink">
                    About This Store
                  </h3>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-gray-600 dark:text-ink/80 mt-3">
                  {description ||
                    `${storeName} is your verified merchant on Velte, specializing in authentic quality products and dedicated customer service.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 mt-5 border-t border-gray-100 dark:border-white/5 text-[11px] sm:text-xs font-medium text-gray-600 dark:text-ink/75">
                <span className="flex items-center gap-1">
                  <Truck
                    size={14}
                    weight="duotone"
                    className="text-[#ff5500]"
                  />{" "}
                  Fast Delivery
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck
                    size={14}
                    weight="duotone"
                    className="text-[#ff5500]"
                  />{" "}
                  Quality Products
                </span>
                <span className="flex items-center gap-1">
                  <Tag size={14} weight="duotone" className="text-[#ff5500]" />{" "}
                  Transparent Prices
                </span>
              </div>
            </div>

            {/* Right: Promotional Banner */}
            {adverts.length > 0 ? (
              <div className="md:col-span-7 rounded-2xl bg-gradient-to-r from-[#ff5500] via-orange-500 to-amber-500 text-white relative overflow-hidden shadow-md min-h-[220px] flex flex-col justify-between">
                {adverts.map((ad, idx) => {
                  const isCurrent = idx === currentAdvertIdx;
                  const productDetailHref = ad.productId
                    ? `/p/${ad.productId}`
                    : null;

                  return (
                    <div
                      key={ad.id}
                      className={cn(
                        "absolute inset-0 p-6 sm:p-8 flex items-center justify-between gap-4 transition-opacity duration-700 ease-in-out",
                        isCurrent
                          ? "opacity-100 z-10"
                          : "opacity-0 pointer-events-none z-0",
                      )}
                    >
                      <div className="relative z-10 max-w-[280px] sm:max-w-xs space-y-2.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wider text-white">
                          Featured Offer
                        </span>
                        <h3 className="text-base sm:text-lg lg:text-xl font-bold leading-snug tracking-tight line-clamp-2">
                          {ad.headline}
                        </h3>
                        {ad.blurb && (
                          <p className="text-xs text-white/90 line-clamp-2 leading-relaxed">
                            {ad.blurb}
                          </p>
                        )}
                        <div>
                          {productDetailHref ? (
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/chat?store=${encodeURIComponent(storeHandle)}`}
                                className="px-4 sm:px-5 py-2 rounded-xl bg-white text-[#ff5500] font-semibold text-xs sm:text-sm shadow-md hover:bg-orange-50 transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <ChatCircleDots
                                  size={16}
                                  weight="fill"
                                  className="text-[#ff5500]"
                                />
                                <span>Chat Store</span>
                              </Link>
                              <Link
                                href={productDetailHref}
                                className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium text-xs sm:text-sm transition-all inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>View Offer</span>
                                <ArrowRight size={13} weight="bold" />
                              </Link>
                            </div>
                          ) : (
                            <Link
                              href={`/chat?store=${encodeURIComponent(storeHandle)}`}
                              className="px-4 sm:px-5 py-2 rounded-xl bg-white text-[#ff5500] font-semibold text-xs sm:text-sm shadow-md hover:bg-orange-50 transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <ChatCircleDots
                                size={16}
                                weight="fill"
                                className="text-[#ff5500]"
                              />
                              <span>Chat Store</span>
                            </Link>
                          )}
                        </div>
                      </div>

                      <div className="relative w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-xl overflow-hidden shadow-sm bg-white/10 backdrop-blur-xs flex items-center justify-center">
                        {ad.imageUrl ? (
                          <ProtectedImage
                            src={ad.imageUrl}
                            alt={ad.headline}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Storefront
                            size={64}
                            weight="duotone"
                            className="text-white/80"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="md:col-span-7 rounded-2xl bg-gradient-to-r from-[#ff5500] via-orange-500 to-amber-500 p-6 sm:p-8 text-white relative overflow-hidden flex items-center justify-between shadow-md">
                <div className="relative z-10 max-w-[280px] sm:max-w-xs space-y-3">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold leading-snug tracking-tight">
                    Order From {storeName} &amp; Enjoy Quality Like Never
                    Before!
                  </h3>
                  <Link
                    href={`/chat?store=${encodeURIComponent(storeHandle)}`}
                    className="px-4 sm:px-5 py-2 rounded-xl bg-white text-[#ff5500] font-semibold text-xs sm:text-sm shadow-md hover:bg-orange-50 transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <ChatCircleDots
                      size={16}
                      weight="fill"
                      className="text-[#ff5500]"
                    />
                    <span>Chat Store</span>
                  </Link>
                </div>

                <div className="relative w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-xl overflow-hidden shadow-sm bg-white/10 backdrop-blur-xs flex items-center justify-center">
                  {goods.length > 0 && goods[0].mainImageUrl ? (
                    <ProtectedImage
                      src={goods[0].mainImageUrl}
                      alt={`${storeName} Feature`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Storefront
                      size={64}
                      weight="duotone"
                      className="text-white/80"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: STOREFRONT PHOTOS ─────────────────────────────────── */}
      {activeTab === "photos" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-ink">
                Storefront &amp; Showcase Photos
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Authentic photos of {storeName}&apos;s location, showroom, and
                workshop.
              </p>
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-surface px-3 py-1 rounded-full border border-gray-200 dark:border-white/10">
              {gallery.length} {gallery.length === 1 ? "Photo" : "Photos"}
            </span>
          </div>

          {gallery.length === 0 ? (
            <div className="text-center py-16 px-4 bg-surface rounded-3xl border border-gray-100 dark:border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-[#ff5500] flex items-center justify-center mx-auto mb-3">
                <Images size={28} weight="duotone" />
              </div>
              <h3 className="text-base font-semibold text-ink">
                No Storefront Photos Uploaded
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {storeName} has not uploaded showcase photos to their gallery
                yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {gallery.map((photoUrl, idx) => (
                <div
                  key={photoUrl + idx}
                  onClick={() => setLightboxImage(photoUrl)}
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 bg-neutral-900 shadow-xs cursor-pointer"
                >
                  <ProtectedImage
                    src={photoUrl}
                    alt={`${storeName} storefront showcase photo ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="p-2.5 rounded-full bg-white/20 backdrop-blur-md text-white">
                      <MagnifyingGlassPlus size={20} weight="bold" />
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-semibold text-white">
                    Photo {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: LOCATIONS & COVERAGE ───────────────────────────────── */}
      {activeTab === "locations" && (
        <div className="space-y-6">
          {/* Store Type & Identity Card */}
          <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-surface p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    isPhysical
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                  )}
                >
                  {isPhysical ? (
                    <Buildings size={24} weight="duotone" />
                  ) : (
                    <Globe size={24} weight="duotone" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-ink">
                      {isPhysical
                        ? "Physical Storefront & Walk-in Store"
                        : "Online Direct Store"}
                    </h3>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                        isPhysical
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300",
                      )}
                    >
                      {isPhysical ? "Walk-in Welcome" : "Virtual Store"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isPhysical
                      ? "Customers can visit this merchant in-person for inspections, direct pickups, and walk-in purchases."
                      : "Orders are processed online with door-step delivery and regional courier shipping."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Address & Multiple Locations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Primary Address */}
            <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-surface p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-ink">
                  <MapPin
                    size={20}
                    weight="duotone"
                    className="text-[#ff5500]"
                  />
                  <h4 className="font-semibold text-sm sm:text-base">
                    Primary Headquarters / Address
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle size={12} weight="fill" />
                  <span>Main Hub</span>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-2">
                <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                  {primaryAddress}
                </div>
                {state && (
                  <div className="text-[11px] text-gray-400">
                    State:{" "}
                    <span className="font-semibold text-ink">{state}</span>
                  </div>
                )}
                {country && (
                  <div className="text-[11px] text-gray-400">
                    Country:{" "}
                    <span className="font-semibold text-ink">{country}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Coverage Area & Delivery Logistics */}
            <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-surface p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-ink">
                <Truck size={20} weight="duotone" className="text-[#ff5500]" />
                <h4 className="font-semibold text-sm sm:text-base">
                  Sectors &amp; Coverage Radius
                </h4>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">
                    Operating Sectors
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sectors.length > 0 ? (
                      sectors.map((sec) => (
                        <span
                          key={sec}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-900/30"
                        >
                          {sec}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">
                        General Marketplace
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block mb-1">
                    Fulfillment &amp; Delivery
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    Local area dispatch within {area || state || "city limits"}{" "}
                    and interstate courier parcel dispatch nationwide across
                    Nigeria.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Branch Locations */}
          {locations.length > 0 && (
            <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-surface p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-ink">
                  <Buildings
                    size={20}
                    weight="duotone"
                    className="text-[#ff5500]"
                  />
                  <h4 className="font-semibold text-sm sm:text-base">
                    Branch Locations &amp; Outlets ({locations.length})
                  </h4>
                </div>
                <span className="text-xs text-gray-400">Walk-in branches</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {locations.map((loc, idx) => (
                  <div
                    key={(loc.label || "") + idx}
                    className="p-3.5 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 space-y-1.5"
                  >
                    <div className="font-bold text-xs sm:text-sm text-ink flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#ff5500]" />
                      <span>{loc.label || `Branch ${idx + 1}`}</span>
                    </div>
                    {loc.area && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <MapPin size={12} className="text-gray-400" />
                        <span>{loc.area}</span>
                      </p>
                    )}
                    {loc.state && (
                      <p className="text-[11px] text-gray-400">
                        State:{" "}
                        <span className="font-semibold text-ink">
                          {loc.state}
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: REVIEWS & RATINGS ──────────────────────────────────── */}
      {activeTab === "reviews" && (
        <div className="space-y-6">
          {/* Rating Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 rounded-2xl border border-gray-100 dark:border-white/10 bg-surface p-5 sm:p-6 shadow-xs">
            {/* Score & Stars */}
            <div className="md:col-span-4 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/10 pb-5 md:pb-0 md:pr-5">
              <span className="text-4xl sm:text-5xl font-black text-ink tracking-tight">
                {ratingAvg != null && ratingCount > 0
                  ? ratingAvg.toFixed(1)
                  : "0.0"}
              </span>
              <div className="flex items-center gap-1 my-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={18}
                    weight={
                      star <= Math.round(ratingAvg || 0) ? "fill" : "regular"
                    }
                    className={
                      star <= Math.round(ratingAvg || 0)
                        ? "text-amber-400"
                        : "text-gray-300 dark:text-white/20"
                    }
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Based on {ratingCount} verified{" "}
                {ratingCount === 1 ? "review" : "reviews"}
              </p>
            </div>

            {/* Star Distribution Breakdown */}
            <div className="md:col-span-8 flex flex-col justify-center space-y-2">
              {[5, 4, 3, 2, 1].map((ratingVal) => {
                const count = ratingDistribution
                  ? ratingDistribution[ratingVal as 1 | 2 | 3 | 4 | 5] || 0
                  : 0;
                const percentage =
                  ratingCount > 0 ? Math.round((count / ratingCount) * 100) : 0;

                return (
                  <div
                    key={ratingVal}
                    className="flex items-center gap-3 text-xs"
                  >
                    <span className="w-12 font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                      <span>{ratingVal}</span>
                      <Star
                        size={11}
                        weight="fill"
                        className="text-amber-400"
                      />
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-gray-400 text-[11px]">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Reviews List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm sm:text-base text-ink">
              Customer Feedback ({reviews.length})
            </h3>

            {reviews.length === 0 ? (
              <div className="text-center py-12 px-4 bg-surface rounded-2xl border border-gray-100 dark:border-white/10">
                <Star
                  size={32}
                  weight="duotone"
                  className="text-amber-400 mx-auto mb-2.5"
                />
                <h4 className="font-semibold text-sm text-ink">
                  No Customer Reviews Yet
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Be the first customer to place an order from {storeName} and
                  share your experience!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-white/10 bg-surface shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/40 text-[#ff5500] font-bold text-xs flex items-center justify-center shrink-0">
                          {rev.buyerAvatar ? (
                            <img
                              src={rev.buyerAvatar}
                              alt={rev.buyerName || "Customer"}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            getInitial(rev.buyerName || "Customer")
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-ink block">
                            {rev.buyerName || "Verified Customer"}
                          </span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={12}
                                weight={s <= rev.rating ? "fill" : "regular"}
                                className={
                                  s <= rev.rating
                                    ? "text-amber-400"
                                    : "text-gray-300"
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {rev.createdAt && (
                        <span className="text-[11px] text-gray-400">
                          {timeAgo(rev.createdAt)}
                        </span>
                      )}
                    </div>

                    {rev.text && (
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {rev.text}
                      </p>
                    )}

                    {rev.reply && (
                      <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border-l-2 border-[#ff5500] space-y-1 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#ff5500]">
                            {storeName} (Merchant Reply)
                          </span>
                          {rev.repliedAt && (
                            <span className="text-[10px] text-gray-400">
                              {timeAgo(rev.repliedAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {rev.reply}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Photo Lightbox Modal ──────────────────────────────────────── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Close photo"
          >
            <X size={24} weight="bold" />
          </button>
          <div
            className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ProtectedImage
              src={lightboxImage}
              alt={`${storeName} showcase photo`}
              className="w-full h-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* ── Auth Gate Modal (For Non-Logged-In Users) ─────────────────── */}
      {authGateOpen && (
        <HubLockedModal
          variant="auth"
          title={
            authGateReason === "cart"
              ? "Sign in to Add to Cart"
              : "Sign in to View Full Details"
          }
          body={
            authGateReason === "cart"
              ? "Please sign in or create a Velte account to add items to your cart, coordinate delivery, and checkout."
              : "Full product descriptions, seller details, and specifications require a Velte account."
          }
          badge="Sign In Required"
          ctaLabel="Sign In / Register"
          ctaHref="/auth/login"
          onClose={() => setAuthGateOpen(false)}
        />
      )}
    </div>
  );
}
