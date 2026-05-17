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
  Fingerprint,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryProduct, Category } from "@/types/product";

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

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.products.list,
    queryFn: categoriesApi.getProducts,
  });

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.products.categories,
    queryFn: categoriesApi.getCategories,
  });

  const product: CategoryProduct | undefined = products.find(
    (p) => p.id === productId,
  );

  const category: Category | undefined = categories.find(
    (c) => c.id === product?.categoryId,
  );

  if (productsLoading) return <ViewProductSkeleton />;

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <XCircle size={28} className="text-red-400" />
        </div>
        <p className="text-dash-heading font-semibold text-gray-500">
          Product not found
        </p>
        <button
          onClick={() => navigate(`/${userId}/products`)}
          className="flex items-center gap-2 text-dash-body text-orange-500 hover:underline cursor-pointer"
        >
          <ArrowLeft size={14} />
          Back to Products
        </button>
      </div>
    );
  }

  const available = getAvailableStock(product);
  const stockPercent =
    product.totalQuantity > 0
      ? Math.round((available / product.totalQuantity) * 100)
      : 0;

  const reserved =
    product.totalQuantity - available - (product.orderedQuantity ?? 0) < 0
      ? 0
      : product.totalQuantity - available - (product.orderedQuantity ?? 0);

  // Determine if product has a guarantee/duration separate from expiration
  const hasDateInfo = product.manufacturingDate || product.expirationDate;

  return (
    <div className="space-y-5">
      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ── Left: Carousel + name ── */}
        <div className="lg:col-span-1">
          <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Carousel */}
            <ProductCarousel
              productName={product.name}
              colorClass={product.colorClass}
              featured={product.featured}
              images={(product as any).images}
            />

            {/* Product name + category + sale tag */}
            <div className="px-5 py-4 border-t border-gray-100">
              <h2 className="text-dash-title font-bold text-[#023337] leading-tight mb-1">
                {product.name}
              </h2>
              {category && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-dash-body">{category.emoji}</span>
                  <span className="text-dash-caption text-gray-400 font-medium">
                    {category.name}
                  </span>
                </div>
              )}
              {product.onSale && (
                <span className="inline-flex items-center mt-2 gap-1 bg-red-50 text-red-600 text-dash-caption font-bold px-2 py-0.5 rounded-full border border-red-100">
                  <Tag size={10} />
                  On Sale
                </span>
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
                    Price
                  </p>
                  <p className="text-[2rem] font-black text-[#023337] leading-none">
                    ${product.price.toFixed(2)}
                  </p>
                </div>
                {product.onSale && (
                  <div className="mb-0.5">
                    <p className="text-dash-caption text-gray-400 mb-0.5 uppercase tracking-wide font-semibold">
                      Sale Price
                    </p>
                    <p className="text-dash-title font-bold text-red-500">
                      On sale
                    </p>
                  </div>
                )}
              </div>

              {/* ── Stock badge (top-right of pricing card) ── */}
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
            </div>
          </SectionCard>

          {/* Stats grid */}
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

          {/* Stock bar */}
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
              {product.lowStockThreshold !== undefined &&
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

          {/* ── Consolidated Product Info ── */}
          <SectionCard title="Product Info" icon={Info}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {/* ID */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Fingerprint size={14} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                    Product ID
                  </p>
                  <p className="text-dash-body font-mono text-[#023337] font-semibold break-all">
                    {product.id}
                  </p>
                </div>
              </div>

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
                    {product.createdDate}
                  </p>
                </div>
              </div>

              {/* Category */}
              {category && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Package size={14} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      Category
                    </p>
                    <p className="text-dash-body font-semibold text-[#023337]">
                      {category.emoji} {category.name}
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
                      {product.manufacturingDate}
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
                      {product.expirationDate}
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
                    <Hash size={13} className="text-orange-500" />
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold">
                      Attributes
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
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
