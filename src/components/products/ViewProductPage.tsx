"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { categoriesApi } from "@/services/products";
import { useNavigation } from "@/components/NavigationProgressContext";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Package,
  Tag,
  Calendar,
  Star,
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
          // The track's own width is `slides.length * 100%` (of the frame),
          // and CSS `%` in a transform resolves against the TRANSFORMED
          // element's own box — not the frame — so moving by exactly one
          // frame-width requires dividing by slides.length here. Without
          // it (found live), each step overshoots by a factor of
          // slides.length and lands on blank space past the last slide for
          // any listing with 2+ images.
          transform: `translateX(-${(current * 100) / slides.length}%)`,
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
  const pricing = computePrice(product);

  // Real media for the carousel — the main image first, then thumbnails.
  // Empty for a video-only listing, which renders a player instead.
  const mediaImages = [
    product.mainImageUrl,
    ...(product.thumbnailUrls ?? []),
  ].filter((u): u is string => Boolean(u));

  const hasAttributes = (product.attributes?.length ?? 0) > 0;
  const hasTags = (product.tags?.length ?? 0) > 0;
  const hasFoodDetails =
    isFood &&
    (product.isCurrentlyAvailable != null ||
      product.dailyLimit != null ||
      product.allowPreOrder ||
      product.isVeg ||
      product.isSpicy);
  const hasModifiers = isFood && (product.modifiers?.length ?? 0) > 0;

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

              {/* ── Badge (top-right of pricing card) — a service has no
                  stock concept at all, and a dish's real signal is the
                  "available today" toggle. A plain retail product gets no
                  badge here: stock quantity is no longer tracked/shown on
                  this page (business happens outside the app, so it was
                  never a trustworthy signal anyway). ── */}
              {isService ? (
                <div className="flex items-center gap-1.5 text-dash-caption font-bold px-3 py-1.5 rounded-full flex-shrink-0 bg-teal-50 text-teal-700">
                  <Wrench size={12} />
                  Service
                </div>
              ) : (
                isFood && (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-dash-caption font-bold px-3 py-1.5 rounded-full shadow-sm flex-shrink-0",
                      product.isCurrentlyAvailable === false
                        ? "bg-red-500 text-white"
                        : "bg-green-500 text-white",
                    )}
                  >
                    {product.isCurrentlyAvailable === false ? (
                      <XCircle size={12} />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    {product.isCurrentlyAvailable === false
                      ? "Not Available Today"
                      : "Available Today"}
                  </div>
                )
              )}
            </div>
          </SectionCard>

          {/* ── Service: its details lead, right after pricing — no stock
              concept exists for a service at all. ── */}
          {isService && hasAttributes && (
            <SectionCard title="Service Details" icon={Wrench}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.attributes!.map((attr) => (
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
            </SectionCard>
          )}

          {/* ── Dish: what actually matters for a dish leads — real-time
              availability, daily limit, dietary flags, the days/hours it's
              served, and its modifiers. ── */}
          {hasFoodDetails && (
            <SectionCard title="Food Details" icon={ChefHat}>
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
                      <CheckCircle2 size={14} className="text-green-500" />
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
            </SectionCard>
          )}

          {isFood && product.availability && (
            <SectionCard title="Availability" icon={Clock}>
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
            </SectionCard>
          )}

          {hasModifiers && (
            <SectionCard title="Modifiers" icon={Hash}>
              <div className="space-y-3">
                {product.modifiers!.map((group) => (
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
            </SectionCard>
          )}

          {/* ── Dish attributes (if the vendor added any beyond the
              food-specific fields above) — a dish CAN carry these too, same
              generic name/value shape as a retail product's. ── */}
          {isFood && hasAttributes && (
            <SectionCard title="Attributes" icon={Hash}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.attributes!.map((attr) => (
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
            </SectionCard>
          )}

          {/* ── Plain retail product's attributes — service/dish already
              rendered theirs above; stock is no longer tracked/shown here
              at all (see the badge above too — same reasoning). ── */}
          {!isService && !isFood && hasAttributes && (
            <SectionCard title="Attributes" icon={Hash}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.attributes!.map((attr) => (
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
            </SectionCard>
          )}

          {/* ── Details — common to every kind. ── */}
          <SectionCard title="Details" icon={Info}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
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
          </SectionCard>

          {hasTags && (
            <SectionCard title="Tags" icon={Tag}>
              <div className="flex flex-wrap gap-2">
                {product.tags!.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-600 border border-orange-100 rounded-full text-dash-caption font-semibold"
                  >
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
