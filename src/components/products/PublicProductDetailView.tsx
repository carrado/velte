"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Share2,
  Bike,
  Plus,
  Minus,
  Maximize2,
  HelpCircle,
  ExternalLink,
  ShoppingCart,
} from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { IdentitySessionSync } from "@/components/chat/IdentitySessionSync";
import { CreditsModalProvider } from "@/components/credits/CreditsModal";
import { HubHeader } from "@/components/hub/HubHeader";
import { HubLockedModal } from "@/components/hub/HubLockedModal";
import { HubNotificationsSync } from "@/components/hub/HubNotificationsSync";
import { NavigationProgressProvider } from "@/components/hub/HubNavigationProgressContext";
import Navbar from "@/components/landing/Navbar";
import { AddToCartSheet } from "@/components/cart/AddToCartSheet";
import { ProductDeliveryPickup } from "@/components/products/ProductDeliveryPickup";
import { ByolModal } from "@/components/products/ByolModal";
import {
  ProtectedPosterPreview,
  PosterPreviewLightbox,
} from "@/components/hub/ProtectedPosterPreview";
import TabBar from "@/components/TabBar";
import {
  BadgeCheckIcon,
  HeartIcon,
  MapPinIcon,
  PackageIcon,
  StarIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { buildChatLink } from "@/lib/chatLink";
import { getInitial } from "@/lib/initials";
import { resolveGalleryImages } from "@/lib/media";
import { fmt } from "@/lib/product-price";
import { cn } from "@/lib/utils";
import { isEnterpriseVendor } from "@/lib/enterprise";
import { toast } from "sonner";
import type { PublicProductDetail, ReviewSummary } from "@/types/store";

type DetailTab = "details" | "reviews" | "vendor";

const AUTO_MS = 5000;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0.85,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0.85,
  }),
};

function StarsRow({ avg, size = 14 }: { avg: number | null; size?: number }) {
  const filled = avg != null ? Math.round(avg) : 0;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          size={size}
          weight={i < filled ? "fill" : "regular"}
          className={
            i < filled ? "text-amber-400" : "text-gray-300 dark:text-white/20"
          }
        />
      ))}
    </span>
  );
}

function ReviewBars({ summary }: { summary: ReviewSummary }) {
  const total = Math.max(summary.count, 1);
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = summary.distribution[star as 1 | 2 | 3 | 4 | 5] ?? 0;
        const pct = Math.round((count / total) * 100);
        return (
          <div
            key={star}
            className="flex items-center gap-2 text-xs text-gray-500 dark:text-ink/60"
          >
            <span className="w-3 tabular-nums font-semibold">{star}</span>
            <div className="h-2 flex-1 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-right tabular-nums">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function PublicProductDetailView({
  data,
}: {
  data: PublicProductDetail;
}) {
  const router = useRouter();
  const { product, store, reviews, viewer } = data;
  const images = useMemo(
    () => resolveGalleryImages(product.mainImageUrl, product.thumbnailUrls),
    [product.mainImageUrl, product.thumbnailUrls],
  );
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [tab, setTab] = useState<DetailTab>("details");
  const [lock, setLock] = useState<"auth" | "upgrade" | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [byolOpen, setByolOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [showSeeMore, setShowSeeMore] = useState(false);
  const detailsRef = useRef<HTMLElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  const symbol = product.currency === "USD" ? "$" : "₦";
  const sector = store.sectors[0] ?? null;
  const productRating =
    reviews.product.count > 0 ? reviews.product : reviews.vendor;

  useEffect(() => {
    if (images.length < 2 || paused) return;
    const id = window.setInterval(() => {
      setDirection(1);
      setIndex((current) => (current + 1) % images.length);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [images.length, paused]);

  useEffect(() => {
    const el = descRef.current;
    if (!el) {
      setShowSeeMore(false);
      return;
    }
    setShowSeeMore(el.scrollHeight > el.clientHeight + 1);
  }, [product.description]);

  const goToProductDetails = () => {
    setTab("details");
    detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goToReviews = () => {
    setTab("reviews");
    detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goTo = (next: number) => {
    if (images.length === 0) return;
    const target = (next + images.length) % images.length;
    if (target === index) return;
    const forward = (target - index + images.length) % images.length;
    const backward = (index - target + images.length) % images.length;
    setDirection(forward <= backward ? 1 : -1);
    setIndex(target);
  };

  const isEnterprise = isEnterpriseVendor(store);

  const askContact = () => {
    if (!isEnterprise) {
      toast.error("Messaging is only available for Enterprise vendors.");
      return;
    }
    if (!viewer.signedIn) {
      setLock("auth");
      return;
    }
    if (!viewer.premium) {
      setLock("upgrade");
      return;
    }
    if (!store.whatsapp) return;
    const digits = store.whatsapp.replace(/\D/g, "");
    if (!digits) return;
    const href = buildChatLink({
      vendorId: store.vendorId,
      productId: product.id,
      source: "browse",
      message:
        product.kind === "service"
          ? `Hi ${store.name}! I'm interested in your "${product.name}" service. I found you on Velte.`
          : `Hi ${store.name}! Is "${product.name}" still available? I found you on Velte.`,
    });
    if (href) {
      window.location.href = href;
      return;
    }
    window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
  };

  const contactOnly =
    product.kind === "service" || Boolean(product.quoteOnRequest);

  const askRequest = () => {
    if (contactOnly) {
      askContact();
      return;
    }
    setCartOpen(true);
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} · ${store.name}`,
          url: window.location.href,
        });
        return;
      } catch {
        /* empty */
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied to clipboard!");
    }
  };

  const priceLabel = product.quoteOnRequest
    ? null
    : product.priceMax != null && product.priceMax > product.price
      ? `${fmt(product.price / 100, symbol)} – ${fmt(product.priceMax / 100, symbol)}`
      : fmt(product.price / 100, symbol);

  const body = (
    <>
      <main
        className={cn(
          "mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8",
          !viewer.signedIn && "pt-28 md:pt-24",
        )}
      >
        {/* ── Main Product Presentation Grid ── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 items-start">
          {/* ========================================================= */}
          {/* LEFT COLUMN: Gallery & Seller Authority                   */}
          {/* ========================================================= */}
          <div
            className="lg:col-span-7 min-w-0 space-y-5"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            {/* Gallery Frame */}
            <div className="relative rounded-3xl border border-gray-200 dark:border-white/10 bg-surface overflow-hidden p-2 sm:p-3 shadow-xs">
              <div className="relative aspect-[4/3] sm:aspect-[16/11] overflow-hidden rounded-2xl bg-gray-950 flex items-center justify-center">
                {images.length > 0 ? (
                  <AnimatePresence
                    initial={false}
                    custom={direction}
                    mode="popLayout"
                  >
                    <motion.div
                      key={images[index] ?? index}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 320, damping: 34 },
                        opacity: { duration: 0.2 },
                      }}
                      className="absolute inset-0 cursor-zoom-in"
                      onClick={() => setLightboxSrc(images[index])}
                    >
                      <ProtectedPosterPreview
                        src={images[index]}
                        fit="cover"
                        className="h-full w-full"
                      />
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-500">
                    <PackageIcon size={48} />
                  </div>
                )}

                {/* Top Overlay Badges */}
                {store.verified && (
                  <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2 flex-wrap pointer-events-none">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 dark:bg-canvas/95 text-sky-600 dark:text-sky-400 font-bold text-[11px] shadow-md backdrop-blur-xs border border-sky-100 dark:border-sky-900/30">
                      <BadgeCheckIcon size={12} className="text-sky-500" />
                      <span>Verified Seller</span>
                    </span>
                  </div>
                )}

                {/* Top Right: Lightbox Trigger */}
                {images.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(images[index])}
                    aria-label="View high-resolution photo"
                    className="absolute top-3.5 right-3.5 z-10 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all shadow-md cursor-pointer"
                  >
                    <Maximize2 size={14} />
                  </button>
                )}

                {/* Navigation Chevrons */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous image"
                      onClick={() => goTo(index - 1)}
                      className="absolute left-3.5 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 dark:bg-canvas/90 text-ink shadow-md hover:bg-white transition-all cursor-pointer border border-gray-100 dark:border-white/10"
                    >
                      <ChevronLeft size={18} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      aria-label="Next image"
                      onClick={() => goTo(index + 1)}
                      className="absolute right-3.5 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 dark:bg-canvas/90 text-ink shadow-md hover:bg-white transition-all cursor-pointer border border-gray-100 dark:border-white/10"
                    >
                      <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                    <span className="absolute right-3.5 bottom-3.5 z-10 rounded-full bg-black/65 px-2.5 py-0.5 text-[11px] font-bold text-white tabular-nums backdrop-blur-xs">
                      {index + 1} / {images.length}
                    </span>
                  </>
                )}
              </div>

              {/* Thumbnails Row */}
              {images.length > 1 && (
                <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 px-1">
                  {images.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      onClick={() => goTo(i)}
                      className={cn(
                        "relative h-16 w-16 sm:h-18 sm:w-18 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer bg-gray-900",
                        i === index
                          ? "border-[#ff5500] ring-2 ring-orange-500/20 scale-102"
                          : "border-transparent opacity-70 hover:opacity-100",
                      )}
                    >
                      <ProtectedPosterPreview
                        src={url}
                        fit="cover"
                        className="h-full w-full"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Seller Info Card */}
            <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-surface p-4 sm:p-5 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <Avatar
                    label={getInitial(store.name)}
                    src={store.avatar}
                    className="h-12 w-12 rounded-2xl text-base shrink-0 ring-2 ring-surface shadow-xs"
                    isEnterprise={isEnterprise}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        href={`/store/${store.handle}`}
                        className="text-base font-bold text-ink hover:text-orange-600 transition-colors truncate"
                      >
                        {store.name}
                      </Link>
                      {store.verified && (
                        <BadgeCheckIcon
                          size={16}
                          className="text-sky-500 shrink-0"
                        />
                      )}
                    </div>
                    {sector && (
                      <p className="text-xs text-gray-500 dark:text-ink/60 truncate capitalize mt-0.5">
                        {sector}
                      </p>
                    )}
                    {store.locationLabel && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-ink/60">
                        <MapPinIcon
                          size={12}
                          className="shrink-0 text-[#ff5500]"
                        />
                        <span>{store.locationLabel}</span>
                      </p>
                    )}
                  </div>
                </div>

                <Link
                  href={`/store/${store.handle}`}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-orange-500 hover:text-orange-600 text-xs font-bold text-ink transition-all shrink-0 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Visit Store</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              {/* Vendor Rating & Location / Details */}
              <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-3 text-xs flex-wrap">
                <div className="flex items-center gap-1.5">
                  {store.ratingAvg != null && store.ratingCount > 0 ? (
                    <>
                      <div className="flex items-center gap-1 text-ink font-bold tabular-nums">
                        <StarIcon
                          size={13}
                          weight="fill"
                          className="text-amber-400"
                        />
                        <span>{store.ratingAvg.toFixed(1)}</span>
                      </div>
                      <span className="text-gray-400">
                        ({store.ratingCount}{" "}
                        {store.ratingCount === 1 ? "review" : "reviews"})
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400">No seller reviews yet</span>
                  )}
                </div>
                {store.locationLabel && (
                  <span className="text-gray-400 text-[11px] truncate max-w-[200px]">
                    {store.locationLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Platform Trust Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/2 p-3.5 flex items-start gap-2.5">
                <ShieldCheck
                  size={18}
                  className="text-emerald-600 shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-xs font-bold text-ink">Buyer Protection</p>
                  <p className="text-[11px] text-gray-500 dark:text-ink/60 mt-0.5 leading-snug">
                    Secure order processing on every purchase.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/2 p-3.5 flex items-start gap-2.5">
                <Bike size={18} className="text-[#ff5500] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-ink">BYOL Support</p>
                  <p className="text-[11px] text-gray-500 dark:text-ink/60 mt-0.5 leading-snug">
                    Send your own courier with secure PIN.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/2 p-3.5 flex items-start gap-2.5">
                <RotateCcw size={18} className="text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-ink">Fast Resolution</p>
                  <p className="text-[11px] text-gray-500 dark:text-ink/60 mt-0.5 leading-snug">
                    Free support mediation if anything is amiss.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Buy Box & Product Decision Architecture     */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 min-w-0 space-y-5 lg:sticky lg:top-24">
            {/* Header: Title, Wishlist & Ratings */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink leading-tight">
                  {product.name}
                </h1>
                <div className="flex items-center gap-1.5 shrink-0 mt-1">
                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Share listing"
                    className="h-9 w-9 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 hover:text-ink hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Save to wishlist"
                    onClick={() => {
                      if (!viewer.signedIn) {
                        setLock("auth");
                        return;
                      }
                      setIsSaved((prev) => !prev);
                      toast.success(
                        isSaved
                          ? "Removed from saved items"
                          : "Saved to your favourites!",
                      );
                    }}
                    className={cn(
                      "h-9 w-9 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center transition-all cursor-pointer",
                      isSaved
                        ? "bg-red-50 text-red-500 border-red-200"
                        : "text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-white/5",
                    )}
                  >
                    <HeartIcon
                      size={18}
                      weight={isSaved ? "fill" : "regular"}
                    />
                  </button>
                </div>
              </div>

              {/* Star ratings summary */}
              {productRating.count > 0 && productRating.avg != null ? (
                <button
                  type="button"
                  onClick={goToReviews}
                  className="mt-2.5 flex items-center gap-2 text-xs text-gray-500 dark:text-ink/70 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  <StarsRow avg={productRating.avg} size={13} />
                  <span className="font-extrabold text-ink tabular-nums">
                    {productRating.avg.toFixed(1)}
                  </span>
                  <span>·</span>
                  <span className="underline underline-offset-2">
                    {productRating.count}{" "}
                    {productRating.count === 1
                      ? "verified review"
                      : "verified reviews"}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goToReviews}
                  className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  <StarsRow avg={null} size={13} />
                  <span>No reviews yet</span>
                </button>
              )}
            </div>

            {/* Price Showcase Card */}
            <div className="p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-surface shadow-xs">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                    Price
                  </span>
                  {priceLabel ? (
                    <div className="text-3xl sm:text-4xl font-extrabold text-[#ff5500] tracking-tight">
                      {priceLabel}
                    </div>
                  ) : (
                    <div className="text-xl font-bold text-ink">
                      Contact for quote
                    </div>
                  )}
                </div>
              </div>

              {/* Description preview */}
              {product.description && (
                <div className="mt-3.5 pt-3.5 border-t border-gray-100 dark:border-white/5">
                  <p
                    ref={descRef}
                    className="text-xs leading-relaxed text-gray-600 dark:text-ink/80 line-clamp-3"
                  >
                    {product.description}
                  </p>
                  {showSeeMore && (
                    <button
                      type="button"
                      onClick={goToProductDetails}
                      className="mt-1 text-xs font-bold text-[#ff5500] hover:underline cursor-pointer"
                    >
                      Read full description &amp; specs →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Delivery & Logistics Module (Admin-Configured DB state + BYOL CTA) */}
            {!contactOnly && (
              <ProductDeliveryPickup
                delivery={product.delivery}
                onOpenByol={() => setByolOpen(true)}
              />
            )}

            {/* Quantity Selector & Purchase Actions */}
            <div className="space-y-3 pt-1">
              {!contactOnly && (
                <div className="flex items-center justify-between p-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-surface">
                  <span className="text-xs font-bold text-ink">Quantity</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="h-8 w-8 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-ink disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold text-ink tabular-nums w-6 text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="h-8 w-8 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-ink hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5">
                {/* Primary Buy / Add to Cart */}
                {!contactOnly && (
                  <button
                    type="button"
                    onClick={askRequest}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff5500] hover:bg-orange-600 active:scale-98 text-white px-5 py-3.5 text-sm font-extrabold transition-all shadow-md cursor-pointer"
                  >
                    <ShoppingCart size={19} />
                    <span>Add to Cart</span>
                  </button>
                )}

                {/* WhatsApp Chat if Enterprise */}
                {isEnterprise && (
                  <button
                    type="button"
                    onClick={askContact}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-surface hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-ink px-5 py-3 text-sm font-bold transition-all cursor-pointer"
                  >
                    <WhatsAppIcon size={18} className="text-emerald-500" />
                    <span>Contact Vendor on WhatsApp</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* LOWER SECTION: In-Depth Product Tabs                      */}
        {/* ========================================================= */}
        <section
          ref={detailsRef}
          className="mt-12 sm:mt-16 scroll-mt-24 border-t border-gray-200 dark:border-white/10 pt-8"
        >
          <div className="max-w-4xl mx-auto">
            <TabBar
              size="lg"
              fullWidth
              tabs={[
                { key: "details", label: "Product Specifications & Details" },
                {
                  key: "reviews",
                  label: "Verified Customer Reviews",
                  count: productRating.count,
                },
                { key: "vendor", label: "About This Merchant" },
              ]}
              activeTab={tab}
              onChange={setTab}
            />

            <div className="py-8">
              {/* Tab 1: Product details & Specs */}
              {tab === "details" && (
                <div className="space-y-6">
                  {product.attributes && product.attributes.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                        Specifications &amp; Attributes
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {product.attributes.map((attr) => (
                          <div
                            key={`${attr.name}-${attr.value}`}
                            className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-3.5"
                          >
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                              {attr.name}
                            </p>
                            <p className="mt-1 text-sm font-extrabold text-ink">
                              {attr.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Full Product Description
                    </h3>
                    {product.description ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-ink/80 leading-relaxed whitespace-pre-line text-sm bg-surface p-5 rounded-2xl border border-gray-100 dark:border-white/5">
                        {product.description}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        No additional specifications provided for this product.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Reviews */}
              {tab === "reviews" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  <div className="md:col-span-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-5">
                    <div className="flex items-end gap-3 pb-4 border-b border-gray-100 dark:border-white/5">
                      <p className="text-4xl font-extrabold text-ink tabular-nums leading-none">
                        {productRating.avg != null && productRating.count > 0
                          ? productRating.avg.toFixed(1)
                          : "—"}
                      </p>
                      <div className="pb-0.5">
                        <StarsRow
                          avg={
                            productRating.count > 0 ? productRating.avg : null
                          }
                          size={16}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          {productRating.count > 0
                            ? `${productRating.count} ${productRating.count === 1 ? "review" : "reviews"}`
                            : "No reviews yet"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <ReviewBars summary={productRating} />
                    </div>
                  </div>

                  <div className="md:col-span-7 space-y-4">
                    {productRating.count === 0 ? (
                      <div className="p-8 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-surface text-center">
                        <p className="text-sm font-semibold text-ink">
                          No reviews yet
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Ratings only appear after real orders are verified by
                          shoppers.
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-ink/80 leading-relaxed">
                        Based on {productRating.count} verified customer
                        purchase{" "}
                        {productRating.count === 1 ? "review" : "reviews"}.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: About Merchant */}
              {tab === "vendor" && (
                <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      label={getInitial(store.name)}
                      src={store.avatar}
                      className="h-12 w-12 rounded-2xl text-base"
                      isEnterprise={isEnterprise}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-base font-bold text-ink">
                          {store.name}
                        </h4>
                        {store.verified && (
                          <BadgeCheckIcon size={16} className="text-sky-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {store.locationLabel || "Verified Velte Merchant"}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-ink/80 leading-relaxed">
                    {store.description ||
                      `${store.name} is an active seller on Velte.`}
                  </p>

                  <div className="pt-2">
                    <Link
                      href={`/store/${store.handle}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff5500] text-white text-xs font-bold hover:bg-orange-600 transition-colors"
                    >
                      <span>View Full Store Catalog</span>
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ── Cart Drawer ── */}
      {!contactOnly && (
        <AddToCartSheet
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          vendorId={store.vendorId}
          vendorName={store.name}
          product={{
            id: product.id,
            name: product.name,
            imageUrl: product.mainImageUrl,
            unitPriceNaira: product.price / 100,
            currencySymbol: symbol,
            checkoutEligible: product.checkoutEligible,
            quoteOnRequest: false,
          }}
        />
      )}

      {/* ── BYOL Interface Modal ── */}
      <ByolModal
        open={byolOpen}
        onClose={() => setByolOpen(false)}
        productTitle={product.name}
        vendorName={store.name}
        onConfirmByol={(details) => {
          // Open cart drawer so buyer can proceed with BYOL fulfilment
          setCartOpen(true);
        }}
      />

      {/* ── Lightbox Preview ── */}
      {lightboxSrc && (
        <PosterPreviewLightbox
          src={lightboxSrc}
          onClose={() => setLightboxSrc(null)}
        />
      )}

      {/* ── Auth / Upgrade Gate ── */}
      {lock && (
        <HubLockedModal
          variant={lock}
          title={
            lock === "auth" ? "Sign in to continue" : "Contact is on Premium"
          }
          body={
            lock === "auth"
              ? "Sign up or log in to contact this vendor, request the product, or place an order."
              : "Upgrade to Buyer Premium (or Vendor Enterprise) to message vendors from product pages."
          }
          ctaLabel={lock === "upgrade" ? "Upgrade to Premium" : undefined}
          ctaHref={lock === "upgrade" ? "/pricing?for=buyers" : undefined}
          onClose={() => setLock(null)}
          onSignedIn={() => {
            setLock(null);
            router.refresh();
          }}
        />
      )}
    </>
  );

  if (viewer.signedIn) {
    return (
      <CreditsModalProvider>
        <NavigationProgressProvider>
          <IdentitySessionSync />
          <HubNotificationsSync />
          <div className="min-h-dvh bg-canvas overflow-x-clip">
            <HubHeader />
            {body}
          </div>
        </NavigationProgressProvider>
      </CreditsModalProvider>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <Navbar forceOpaque />
      {body}
    </div>
  );
}
