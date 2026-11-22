"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CaretDown,
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
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { HubLockedModal } from "@/components/hub/HubLockedModal";
import { fmt } from "@/lib/product-price";
import { cn } from "@/lib/utils";
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

export default function StoreTabs({
  goods,
  storeName,
  storeHandle,
  vendorId,
  sectors = [],
  description,
  adverts = [],
  initialIsLoggedIn,
}: StoreTabsProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [currentAdvertIdx, setCurrentAdvertIdx] = useState(0);

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

  // Purely database-sourced products uploaded by the vendor (no mock data)
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
      // Ratings only from DB — never invented
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

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── 1. Sector Category Filter Badge Strip ─────────────────────── */}
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

      {/* ── 2. Header: Title + Count + Category Filter + Sort Dropdown ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <h2 className="text-base sm:text-lg font-semibold text-ink">
          Store Products{" "}
          <span className="text-gray-400 font-normal text-sm sm:text-base">
            ({filteredProducts.length})
          </span>
        </h2>

        {/* Controls: Filter Category + Sort By */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Filter by Category Dropdown */}
          <div className="relative shrink-0">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Funnel size={13} weight="duotone" />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ backgroundImage: "none" }}
              className="appearance-none pl-7 pr-7 py-1.5 rounded-md border border-gray-200 dark:border-white/10 bg-surface text-xs font-medium text-ink cursor-pointer focus:outline-none focus:border-orange-500 shadow-2xs hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {sectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
            <CaretDown
              size={12}
              weight="bold"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ backgroundImage: "none" }}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-md border border-gray-200 dark:border-white/10 bg-surface text-xs font-medium text-ink cursor-pointer focus:outline-none focus:border-orange-500 shadow-2xs hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <option value="popular">Sort by: Most Popular</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
            <CaretDown
              size={12}
              weight="bold"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* ── 3. Four-Column Product Grid or Clean Empty State ───────── */}
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
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 280px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
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

                  {/* Truncated Description with Gated "See More" */}
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

                  {/* Real Rating (No Manufactured Stats) */}
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

                {/* Add to Cart Button (Auth Gated for Non-Logged-In Users) */}
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

      {/* ── 4. Bottom Showcase (About This Store + Promotional Banner) ─ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-4 pb-10">
        {/* Left: About This Store Card */}
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
              <Truck size={14} weight="duotone" className="text-[#ff5500]" />{" "}
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

        {/* Right: Promotional CTA Banner / Vendor Active Adverts Carousel */}
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
                        <Link
                          href={productDetailHref}
                          className="px-4 sm:px-5 py-2 rounded-xl bg-white text-[#ff5500] font-semibold text-xs sm:text-sm shadow-md hover:bg-orange-50 transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <span>View Offer</span>
                          <ArrowRight size={14} weight="bold" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            window.scrollTo({ top: 380, behavior: "smooth" });
                          }}
                          className="px-4 sm:px-5 py-2 rounded-xl bg-white text-[#ff5500] font-semibold text-xs sm:text-sm shadow-md hover:bg-orange-50 transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <span>Shop Catalog</span>
                          <ArrowRight size={14} weight="bold" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-xl overflow-hidden shadow-sm bg-white/10 backdrop-blur-xs flex items-center justify-center">
                    {ad.imageUrl ? (
                      <Image
                        src={ad.imageUrl}
                        alt={ad.headline}
                        fill
                        className="object-cover"
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

            {/* Carousel navigation indicators when more than 1 active advert */}
            {adverts.length > 1 && (
              <div className="absolute bottom-3 left-6 sm:left-8 z-20 flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                {adverts.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentAdvertIdx(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                      i === currentAdvertIdx
                        ? "w-4 bg-white"
                        : "w-1.5 bg-white/50 hover:bg-white/80",
                    )}
                    aria-label={`Advert ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Default Showcase Banner */
          <div className="md:col-span-7 rounded-2xl bg-gradient-to-r from-[#ff5500] via-orange-500 to-amber-500 p-6 sm:p-8 text-white relative overflow-hidden flex items-center justify-between shadow-md">
            <div className="relative z-10 max-w-[280px] sm:max-w-xs space-y-3">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold leading-snug tracking-tight">
                Order From {storeName} &amp; Enjoy Quality Like Never Before!
              </h3>
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 380, behavior: "smooth" });
                }}
                className="px-4 sm:px-5 py-2 rounded-xl bg-white text-[#ff5500] font-semibold text-xs sm:text-sm shadow-md hover:bg-orange-50 transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Shop Catalog</span>
                <ArrowRight size={14} weight="bold" />
              </button>
            </div>

            <div className="relative w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-xl overflow-hidden shadow-sm bg-white/10 backdrop-blur-xs flex items-center justify-center">
              {goods.length > 0 && goods[0].mainImageUrl ? (
                <Image
                  src={goods[0].mainImageUrl}
                  alt={`${storeName} Feature`}
                  fill
                  className="object-cover"
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

      {/* ── 5. Auth Gate Modal (For Non-Logged-In Users) ──────────────── */}
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
