"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
import { ProtectedImage } from "@/components/ProtectedImage";
import TabBar from "@/components/TabBar";
import {
  BadgeCheckIcon,
  HandbagIcon,
  HeartIcon,
  MapPinIcon,
  PackageIcon,
  StarIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { buildChatLink } from "@/lib/chatLink";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { getInitial } from "@/lib/initials";
import { resolveGalleryImages } from "@/lib/media";
import { fmt } from "@/lib/product-price";
import { cn } from "@/lib/utils";
import type { PublicProductDetail, ReviewSummary } from "@/types/store";

type DetailTab = "details" | "reviews" | "vendor";

const AUTO_MS = 4500;

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
          className={i < filled ? "text-amber-400" : "text-gray-400"}
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
            className="flex items-center gap-2 text-xs text-gray-500"
          >
            <span className="w-3 tabular-nums">{star}</span>
            <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
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
  const [paused, setPaused] = useState(false);
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

  const goTo = (next: number) => {
    if (images.length === 0) return;
    const target = (next + images.length) % images.length;
    if (target === index) return;
    // Prefer the short wrap direction for first↔last hops.
    const forward = (target - index + images.length) % images.length;
    const backward = (index - target + images.length) % images.length;
    setDirection(forward <= backward ? 1 : -1);
    setIndex(target);
  };

  const askContact = () => {
    if (!viewer.signedIn) {
      setLock("auth");
      return;
    }
    // Basic buyer / Basic vendor — Premium or Enterprise unlocks contact.
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

  // Services and quote-on-request never go in a cart — WhatsApp / contact only.
  const contactOnly =
    product.kind === "service" || Boolean(product.quoteOnRequest);

  const askRequest = () => {
    if (contactOnly) {
      askContact();
      return;
    }
    setCartOpen(true);
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
          "mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8",
          // Fixed Navbar: mobile includes a second Ask Velte row (~7.5rem).
          !viewer.signedIn && "pt-32 md:pt-24",
        )}
      >
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
          {/* Gallery */}
          <div
            className="min-w-0"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            {/* Vendor card — above gallery; state + country only */}
            <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-3.5 sm:p-4">
              <div className="flex items-start gap-3">
                <Avatar
                  label={getInitial(store.name)}
                  src={store.avatar}
                  className="h-11 w-11 rounded-full text-sm shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/store/${store.handle}`}
                      className="text-sm font-bold text-ink truncate hover:text-orange-600"
                    >
                      {store.name}
                    </Link>
                    {store.verified && (
                      <BadgeCheckIcon
                        size={15}
                        className="shrink-0 text-sky-500"
                      />
                    )}
                  </div>
                  {sector && (
                    <p className="text-xs text-gray-500 truncate">{sector}</p>
                  )}
                  {store.locationLabel && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <MapPinIcon size={11} className="shrink-0" />
                      {store.locationLabel}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                    <StarsRow avg={store.ratingAvg} size={12} />
                    <span className="tabular-nums">
                      {store.ratingAvg != null
                        ? store.ratingAvg.toFixed(1)
                        : "—"}{" "}
                      ({store.ratingCount})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-surface p-3 sm:p-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-50 sm:aspect-[5/4]">
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
                      className="absolute inset-0"
                    >
                      <ProtectedImage
                        src={optimizedImageUrl(images[index])}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    <PackageIcon size={40} />
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <span className="absolute right-3 top-3 z-10 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white tabular-nums">
                      {index + 1} / {images.length}
                    </span>
                    <button
                      type="button"
                      aria-label="Previous image"
                      onClick={() => goTo(index - 1)}
                      className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-surface text-ink shadow-sm hover:bg-gray-50"
                    >
                      <ChevronLeft
                        className="h-[18px] w-[18px]"
                        strokeWidth={2}
                      />
                    </button>
                    <button
                      type="button"
                      aria-label="Next image"
                      onClick={() => goTo(index + 1)}
                      className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-surface text-ink shadow-sm hover:bg-gray-50"
                    >
                      <ChevronRight
                        className="h-[18px] w-[18px]"
                        strokeWidth={2}
                      />
                    </button>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
                  {images.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      onClick={() => goTo(i)}
                      className={cn(
                        "h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:h-16 sm:w-16",
                        i === index
                          ? "border-orange-500"
                          : "border-transparent opacity-80 hover:opacity-100",
                      )}
                    >
                      <ProtectedImage
                        src={optimizedImageUrl(url)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Product info — stick while gallery scrolls when delivery is absent
              (contact-only listings), until the details section below. */}
          <div
            className={cn(
              "min-w-0",
              contactOnly && "lg:sticky lg:top-20 lg:self-start",
            )}
          >
            {product.quoteOnRequest && (
              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                Available on request
              </span>
            )}

            <div className="mt-2 flex items-start gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl leading-tight">
                {product.name}
              </h1>
              <button
                type="button"
                aria-label="Save"
                onClick={() => {
                  if (!viewer.signedIn) setLock("auth");
                }}
                className="mt-1 shrink-0 text-gray-400 hover:text-orange-500"
              >
                <HeartIcon size={22} />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <StarsRow avg={productRating.avg} />
              <span className="font-semibold text-ink tabular-nums">
                {productRating.avg != null ? productRating.avg.toFixed(1) : "—"}
              </span>
              <span className="text-gray-400">
                ({productRating.count}{" "}
                {productRating.count === 1 ? "review" : "reviews"})
              </span>
            </div>

            {priceLabel ? (
              <p className="mt-3 text-2xl font-bold text-orange-500 sm:text-3xl">
                {priceLabel}
              </p>
            ) : (
              <p className="mt-3 text-lg font-bold text-ink">
                Contact for quote
              </p>
            )}

            {product.description && (
              <div className="mt-3">
                <p
                  ref={descRef}
                  className="text-sm leading-relaxed text-gray-600 line-clamp-3"
                >
                  {product.description}
                </p>
                {showSeeMore && (
                  <button
                    type="button"
                    onClick={goToProductDetails}
                    className="mt-1 text-sm font-semibold text-ink underline underline-offset-2 hover:text-orange-600 transition-colors"
                  >
                    See more
                  </button>
                )}
              </div>
            )}

            {!contactOnly && (
              <ProductDeliveryPickup delivery={product.delivery} />
            )}

            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={askContact}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                <WhatsAppIcon size={18} className="text-white" />
                Contact vendor
              </button>
              {!contactOnly && (
                <button
                  type="button"
                  onClick={askRequest}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-orange-500 bg-surface px-4 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                >
                  <HandbagIcon size={18} />
                  Add to cart
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lower tabs — app-standard TabBar (same as store / marketplace / hub) */}
        <section
          ref={detailsRef}
          className="mt-10 scroll-mt-24 border-t border-gray-200 pt-6"
        >
          <TabBar
            size="lg"
            fullWidth
            tabs={[
              { key: "details", label: "Product details" },
              {
                key: "reviews",
                label: "Reviews",
                count: productRating.count,
              },
              { key: "vendor", label: "Vendor info" },
            ]}
            activeTab={tab}
            onChange={setTab}
          />

          <div className="grid grid-cols-1 gap-8 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="min-w-0">
              {tab === "details" && (
                <div className="space-y-5">
                  {product.attributes.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {product.attributes.map((attr) => (
                        <div
                          key={`${attr.name}-${attr.value}`}
                          className="rounded-xl border border-gray-200 bg-surface px-3.5 py-3"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                            {attr.name}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-ink">
                            {attr.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {product.description ? (
                    <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                      {product.description}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No extra product details yet. Contact the vendor for
                      options.
                    </p>
                  )}
                </div>
              )}

              {tab === "reviews" && (
                <div>
                  {productRating.count === 0 ? (
                    <p className="text-sm text-gray-500">
                      No reviews yet for this listing. Ratings only appear after
                      a real order.
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Based on {productRating.count} verified{" "}
                      {productRating.count === 1 ? "review" : "reviews"} for
                      this listing
                      {reviews.product.count === 0 ? "’s vendor" : ""}.
                    </p>
                  )}
                </div>
              )}

              {tab === "vendor" && (
                <p className="text-sm leading-relaxed text-gray-600">
                  {store.description ||
                    `${store.name} sells on Velte. Chat with them directly to confirm availability, pricing and delivery.`}
                </p>
              )}
            </div>

            <aside className="rounded-2xl border border-gray-200 bg-surface p-5 h-fit">
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold text-ink tabular-nums leading-none">
                  {productRating.avg != null
                    ? productRating.avg.toFixed(1)
                    : "—"}
                </p>
                <div className="pb-0.5">
                  <StarsRow avg={productRating.avg} size={16} />
                  <p className="mt-1 text-xs text-gray-500">
                    {productRating.count}{" "}
                    {productRating.count === 1 ? "review" : "reviews"}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <ReviewBars summary={productRating} />
              </div>
              <button
                type="button"
                onClick={() => setTab("reviews")}
                className="mt-5 w-full rounded-xl border border-gray-200 bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-orange-500 hover:bg-orange-50 transition-colors"
              >
                See all reviews
              </button>
            </aside>
          </div>
        </section>
      </main>

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
