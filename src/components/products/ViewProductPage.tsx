"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { categoriesApi, getAvailableStock } from "@/services/products";
import { useNavigation } from "@/components/NavigationProgressContext";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Package,
  Tag,
  Calendar,
  BarChart2,
  Star,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  Hash,
  ChevronLeft,
  ChevronRight,
  Shield,
  Info,
  Clock,
  Leaf,
  Flame,
  ChefHat,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computePrice, fmt } from "@/lib/product-price";

// Raw ISO timestamp → "9 Jul 2026" (same en-NG format the wallet and
// referrals pages use).
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}
import { NIGERIAN_FOOD_CATEGORIES } from "@/lib/food-categories";
import type { Category } from "@/types/product";
import { useVendorSectorCapabilities } from "@/hooks/useBusinessType";

// ── Carousel placeholder images (swap for real product images when available) ─

const CAROUSEL_GRADIENTS = [
  "from-orange-400 via-amber-300 to-yellow-200",
  "from-emerald-400 via-teal-300 to-cyan-200",
  "from-violet-500 via-purple-400 to-pink-300",
  "from-rose-400 via-red-300 to-orange-200",
  "from-sky-400 via-blue-300 to-indigo-200",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 p-4 rounded-2xl border",
        accent
          ? "bg-orange-50 border-orange-100"
          : "bg-white border-gray-100 shadow-sm",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={14}
          className={accent ? "text-orange-500" : "text-gray-400"}
        />
        <span className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold">
          {label}
        </span>
      </div>
      <span
        className={cn(
          "text-dash-title font-bold",
          accent ? "text-orange-600" : "text-[#023337]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Icon size={14} className="text-orange-500" />
        </div>
        <h3 className="text-dash-heading font-bold text-[#023337]">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Image Carousel ────────────────────────────────────────────────────────────

function ProductCarousel({
  productName,
  colorClass,
  featured,
  images,
}: {
  productName: string;
  colorClass?: string;
  featured?: boolean;
  images?: string[];
}) {
  // Use real images if provided, otherwise generate gradient slides
  const slides = images && images.length > 0 ? images : CAROUSEL_GRADIENTS;
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying) return;
    const id = setInterval(next, 3500);
    return () => clearInterval(id);
  }, [isAutoPlaying, next]);

  return (
    <div
      className="relative w-full aspect-square overflow-hidden select-none"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Slides */}
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{
          transform: `translateX(-${current * 100}%)`,
          width: `${slides.length * 100}%`,
        }}
      >
        {slides.map((slide, i) =>
          images && images.length > 0 ? (
            // Real image
            <div
              key={i}
              className="h-full flex-shrink-0"
              style={{ width: `${100 / slides.length}%` }}
            >
              <img
                src={slide}
                alt={`${productName} - view ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            // Gradient placeholder
            <div
              key={i}
              className={cn(
                "h-full flex-shrink-0 bg-gradient-to-br flex items-center justify-center",
                slide,
              )}
              style={{ width: `${100 / slides.length}%` }}
            >
              <span className="text-[80px] font-black text-white/80 drop-shadow-lg">
                {productName.charAt(0)}
              </span>
            </div>
          ),
        )}
      </div>

      {/* Featured badge */}
      {featured && (
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-amber-400 text-white text-dash-caption font-bold px-2.5 py-1 rounded-full shadow-md z-10">
          <Star size={11} fill="white" />
          Featured
        </div>
      )}

      {/* Prev / Next controls */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center hover:bg-white transition-colors z-10"
            aria-label="Previous image"
          >
            <ChevronLeft size={16} className="text-[#023337]" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center hover:bg-white transition-colors z-10"
            aria-label="Next image"
          >
            <ChevronRight size={16} className="text-[#023337]" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "rounded-full transition-all duration-300",
                i === current
                  ? "w-5 h-2 bg-white shadow"
                  : "w-2 h-2 bg-white/50 hover:bg-white/80",
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ViewProductSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 bg-white sm:rounded-2xl shadow-sm h-72 border border-gray-100" />
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 h-40 p-5 space-y-3">
            <div className="h-6 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 bg-white sm:rounded-2xl shadow-sm border border-gray-100"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ViewProductPage({ productId }: { productId: string }) {
  const pathname = usePathname();
  const userId = pathname.split("/").filter(Boolean)[0];
  const { navigate } = useNavigation();
  const { hasFood: isFood } = useVendorSectorCapabilities();

  const { data: product, isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => categoriesApi.getProduct(productId),
  });

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.products.categories,
    queryFn: categoriesApi.getCategories,
    enabled: !isFood,
  });

  // Retail dropdown categories and dish categories live in different lists —
  // resolve whichever applies so dishes get a category label too (the retail
  // query is disabled on food accounts, so `category` is always undefined
  // there).
  const category: Category | undefined = categories.find(
    (c) => c.id === product?.categoryId,
  );
  const foodCategory = isFood
    ? NIGERIAN_FOOD_CATEGORIES.find((c) => c.id === product?.categoryId)
    : undefined;
  const categoryDisplay = category
    ? { emoji: category.emoji, name: category.name }
    : foodCategory
      ? { emoji: foodCategory.emoji, name: foodCategory.label }
      : undefined;

  if (productsLoading) return <ViewProductSkeleton />;

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <XCircle size={28} className="text-red-400" />
        </div>
        <p className="text-dash-heading font-semibold text-gray-500">
          Listing not found
        </p>
        <button
          onClick={() => navigate(`/${userId}/products`)}
          className="flex items-center gap-2 text-dash-body text-orange-500 hover:underline cursor-pointer"
        >
          <ArrowLeft size={14} />
          Back to Listings
        </button>
      </div>
    );
  }

  // Services carry no stock — skip every quantity-shaped section for them.
  const isService = product.kind === "service";
  const available = getAvailableStock(product);
  const pricing = computePrice(product);
  const stockPercent =
    product.totalQuantity > 0
      ? Math.round((available / product.totalQuantity) * 100)
      : 0;

  const reserved =
    product.totalQuantity - available - (product.orderedQuantity ?? 0) < 0
      ? 0
      : product.totalQuantity - available - (product.orderedQuantity ?? 0);

  // Real media for the carousel — the main image first, then thumbnails.
  // Empty for a video-only listing, which renders a player instead.
  const mediaImages = [
    product.mainImageUrl,
    ...(product.thumbnailUrls ?? []),
  ].filter((u): u is string => Boolean(u));

  return (
    <div className="space-y-5">
      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ── Left: Carousel + name ── */}
        <div className="lg:col-span-1">
          <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Media — real images when they exist; a video-only listing
                gets a player; otherwise the gradient placeholder slides. */}
            {mediaImages.length === 0 && product.videoUrl ? (
              <video
                src={product.videoUrl}
                controls
                playsInline
                className="w-full aspect-square object-cover bg-black"
              />
            ) : (
              <ProductCarousel
                productName={product.name}
                colorClass={product.colorClass}
                featured={product.featured}
                images={mediaImages}
              />
            )}

            {/* Name + category + description */}
            <div className="px-5 py-4 border-t border-gray-100">
              <h2 className="text-dash-title font-bold text-[#023337] leading-tight mb-1">
                {product.name}
              </h2>
              {categoryDisplay && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-dash-body">
                    {categoryDisplay.emoji}
                  </span>
                  <span className="text-dash-caption text-gray-400 font-medium">
                    {categoryDisplay.name}
                  </span>
                </div>
              )}
              {product.description && (
                <p className="text-dash-body text-gray-500 mt-3 whitespace-pre-line">
                  {product.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Details ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* ── Pricing card (with stock badge top-right) ── */}
          <SectionCard title="Pricing" icon={Tag}>
            <div className="flex items-start justify-between gap-3">
              {/* Price area */}
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-dash-caption text-gray-400 mb-0.5 uppercase tracking-wide font-semibold">
                    {pricing.quoteOnRequest
                      ? "Pricing"
                      : pricing.isRange
                        ? "Price range"
                        : "Price"}
                  </p>
                  <p className="text-[2rem] font-black text-[#023337] leading-none">
                    {pricing.quoteOnRequest
                      ? "Contact for quote"
                      : pricing.isRange
                        ? `${fmt(pricing.price, pricing.currencySymbol)} – ${fmt(
                            pricing.priceMax!,
                            pricing.currencySymbol,
                          )}`
                        : fmt(pricing.price, pricing.currencySymbol)}
                  </p>
                  {pricing.quoteOnRequest && (
                    <p className="text-dash-caption text-gray-400 mt-1.5">
                      The price is agreed with each buyer in chat.
                    </p>
                  )}
                </div>
              </div>

              {/* ── Badge (top-right of pricing card) ── */}
              {isService ? (
                <div className="flex items-center gap-1.5 text-dash-caption font-bold px-3 py-1.5 rounded-full flex-shrink-0 bg-teal-50 text-teal-700">
                  <Wrench size={12} />
                  Service
                </div>
              ) : (
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-dash-caption font-bold px-3 py-1.5 rounded-full shadow-sm flex-shrink-0",
                    available > 0
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white",
                  )}
                >
                  {available > 0 ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <XCircle size={12} />
                  )}
                  {available > 0 ? "In Stock" : "Out of Stock"}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Stats grid — quantity-based, products only */}
          {!isService && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatPill
                icon={Layers}
                label="Total Qty"
                value={product.totalQuantity}
                accent
              />
              <StatPill
                icon={ShoppingCart}
                label="Ordered"
                value={product.orderedQuantity}
              />
              <StatPill icon={Package} label="Available" value={available} />
              <StatPill icon={BarChart2} label="Reserved" value={reserved} />
            </div>
          )}

          {/* Stock bar — products only */}
          {!isService && (
            <SectionCard title="Stock Level" icon={BarChart2}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-dash-body text-gray-500">
                    {available} of {product.totalQuantity} units available
                  </span>
                  <span
                    className={cn(
                      "text-dash-body font-bold",
                      stockPercent > 50
                        ? "text-green-600"
                        : stockPercent > 20
                          ? "text-amber-500"
                          : "text-red-500",
                    )}
                  >
                    {stockPercent}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      stockPercent > 50
                        ? "bg-green-500"
                        : stockPercent > 20
                          ? "bg-amber-400"
                          : "bg-red-500",
                    )}
                    style={{ width: `${stockPercent}%` }}
                  />
                </div>
                {product.lowStockThreshold != null &&
                  available <= product.lowStockThreshold &&
                  available > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertTriangle
                        size={14}
                        className="text-amber-500 flex-shrink-0"
                      />
                      <p className="text-dash-caption text-amber-700 font-medium">
                        Low stock — only {available} unit
                        {available !== 1 ? "s" : ""} remaining.
                      </p>
                    </div>
                  )}
              </div>
            </SectionCard>
          )}

          {/* ── Consolidated Listing Info ── */}
          <SectionCard title="Listing Info" icon={Info}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {/* Created date */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Calendar size={14} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                    Created Date
                  </p>
                  <p className="text-dash-body font-semibold text-[#023337]">
                    {fmtDate(product.createdDate)}
                  </p>
                </div>
              </div>

              {/* Category */}
              {categoryDisplay && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Package size={14} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      Category
                    </p>
                    <p className="text-dash-body font-semibold text-[#023337]">
                      {categoryDisplay.emoji} {categoryDisplay.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Featured */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Star size={14} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                    Featured
                  </p>
                  <p
                    className={cn(
                      "text-dash-body font-bold",
                      product.featured ? "text-amber-500" : "text-gray-400",
                    )}
                  >
                    {product.featured ? "Yes ⭐" : "No"}
                  </p>
                </div>
              </div>

              {/* Manufacturing date */}
              {product.manufacturingDate && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock size={14} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      Manufacturing Date
                    </p>
                    <p className="text-dash-body font-semibold text-[#023337]">
                      {fmtDate(product.manufacturingDate)}
                    </p>
                  </div>
                </div>
              )}

              {/* Expiration / Guarantee / Duration */}
              {product.expirationDate && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield size={14} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      Duration / Guarantee
                    </p>
                    <p className="text-dash-body font-semibold text-[#023337]">
                      {fmtDate(product.expirationDate)}
                    </p>
                    <p className="text-dash-caption text-gray-400 mt-0.5">
                      Valid until expiration
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Divider before attributes ── */}
            {product.attributes && product.attributes.length > 0 && (
              <>
                <div className="my-5 border-t border-gray-100" />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    {isService ? (
                      <Wrench size={13} className="text-orange-500" />
                    ) : (
                      <Hash size={13} className="text-orange-500" />
                    )}
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold">
                      {isService ? "Service Details" : "Attributes"}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {product.attributes.map((attr) => (
                      <div
                        key={attr.id}
                        className="flex items-center justify-between bg-gray-50 rounded-xl px-3.5 py-2.5 border border-gray-100"
                      >
                        <span className="text-dash-body text-gray-500 font-medium">
                          {attr.name}
                        </span>
                        <span className="text-dash-body font-bold text-[#023337]">
                          {attr.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Divider before tags ── */}
            {product.tags && product.tags.length > 0 && (
              <>
                <div className="my-5 border-t border-gray-100" />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag size={13} className="text-orange-500" />
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold">
                      Tags
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-600 border border-orange-100 rounded-full text-dash-caption font-semibold"
                      >
                        <Tag size={10} />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Food-specific fields ── */}
            {isFood &&
              (product.isCurrentlyAvailable != null ||
                product.dailyLimit != null ||
                product.allowPreOrder ||
                product.isVeg ||
                product.isSpicy) && (
                <>
                  <div className="my-5 border-t border-gray-100" />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ChefHat size={13} className="text-orange-500" />
                      <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold">
                        Food Details
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {product.isCurrentlyAvailable != null && (
                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-3.5 py-2.5 border",
                            product.isCurrentlyAvailable
                              ? "bg-green-50 border-green-100"
                              : "bg-red-50 border-red-100",
                          )}
                        >
                          {product.isCurrentlyAvailable ? (
                            <CheckCircle2
                              size={14}
                              className="text-green-500"
                            />
                          ) : (
                            <XCircle size={14} className="text-red-500" />
                          )}
                          <span
                            className={cn(
                              "text-dash-body font-semibold",
                              product.isCurrentlyAvailable
                                ? "text-green-700"
                                : "text-red-700",
                            )}
                          >
                            {product.isCurrentlyAvailable
                              ? "Available today"
                              : "Not available today"}
                          </span>
                        </div>
                      )}
                      {product.dailyLimit != null && (
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2.5">
                          <Layers size={14} className="text-gray-500" />
                          <span className="text-dash-body font-semibold text-[#023337]">
                            Daily limit: {product.dailyLimit}
                          </span>
                        </div>
                      )}
                      {product.allowPreOrder && (
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5">
                          <Clock size={14} className="text-blue-500" />
                          <span className="text-dash-body font-semibold text-blue-700">
                            Pre-orders accepted
                          </span>
                        </div>
                      )}
                      {product.isVeg && (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3.5 py-2.5">
                          <Leaf size={14} className="text-green-500" />
                          <span className="text-dash-body font-semibold text-green-700">
                            Vegetarian
                          </span>
                        </div>
                      )}
                      {product.isSpicy && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                          <Flame size={14} className="text-red-500" />
                          <span className="text-dash-body font-semibold text-red-700">
                            Spicy
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

            {/* ── Availability ── */}
            {isFood && product.availability && (
              <>
                <div className="my-5 border-t border-gray-100" />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={13} className="text-orange-500" />
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold">
                      Availability
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {product.availability.days.map((day) => (
                      <span
                        key={day}
                        className="px-2.5 py-1 bg-orange-500 text-white text-dash-caption font-semibold rounded-lg"
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </span>
                    ))}
                  </div>
                  <p className="text-dash-caption text-gray-500 font-medium">
                    {product.availability.startTime} –{" "}
                    {product.availability.endTime}
                  </p>
                </div>
              </>
            )}

            {/* ── Modifiers ── */}
            {isFood && product.modifiers && product.modifiers.length > 0 && (
              <>
                <div className="my-5 border-t border-gray-100" />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Hash size={13} className="text-orange-500" />
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold">
                      Modifiers
                    </p>
                  </div>
                  <div className="space-y-3">
                    {product.modifiers.map((group) => (
                      <div
                        key={group.id}
                        className="border border-gray-100 rounded-xl overflow-hidden"
                      >
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                          <span className="text-dash-body font-semibold text-[#023337]">
                            {group.name}
                          </span>
                          {group.required && (
                            <span className="text-dash-micro bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">
                              Required
                            </span>
                          )}
                          {group.multiSelect && (
                            <span className="text-dash-micro bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                              Multi-select
                            </span>
                          )}
                        </div>
                        <div className="divide-y divide-gray-50">
                          {group.options.map((opt) => (
                            <div
                              key={opt.id}
                              className="flex items-center justify-between px-3 py-2"
                            >
                              <span className="text-dash-body text-gray-700">
                                {opt.name}
                              </span>
                              {opt.additionalPrice > 0 && (
                                <span className="text-dash-caption text-green-600 font-semibold">
                                  +₦{opt.additionalPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
