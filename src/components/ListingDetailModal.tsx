"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/product-price";
import { ProtectedImage } from "@/components/ProtectedImage";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { OwnListingBadge } from "@/components/search/OwnListingBadge";
import { DetailSheet } from "@/components/DetailSheet";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  PackageIcon,
  StoreIcon,
  WrenchIcon,
} from "@/components/icons";

// Generic enough to back a product OR a service from any buyer-facing
// listing surface (public store page, homepage marketplace preview, search
// results) — each call site maps its own item shape into this one instead
// of this component knowing about PublicStoreProduct/MarketplacePreviewItem/
// VendorMatch individually.
export interface ListingDetailItem {
  name: string;
  kind: "product" | "service";
  quoteOnRequest: boolean;
  /** Kobo by default (divided by 100 internally) — the raw-kobo convention
   *  most listing sources use (see e.g. MarketplaceCard's own comment). Pass
   *  `priceInKobo={false}` for a source that's already normalized to naira
   *  (the AI search pipeline — see VendorResultCard). */
  price: number;
  priceMax: number | null;
  currency: string;
  /** Main image first, then the rest — see resolveGalleryImages. */
  images: string[];
  description: string | null;
  attributes: { name: string; value: string }[];
}

/** Sold-by context for the listing — optional because not every call site
 * has one worth repeating (the public store page IS that vendor's own
 * page already; MarketplaceCard's flat browse grid names the vendor right
 * on the card). Search results (VendorResultCard) are the one surface
 * where the modal is the buyer's only place to see this alongside the
 * full listing, so `handle` doubles as the "View Store" link's target. */
export interface ListingDetailVendor {
  name: string;
  handle: string | null;
  area: string | null;
  state: string | null;
  avatar?: string | null;
}

/** The full-detail view a listing card's "See more" opens into — shared by
 * every surface whose compact card has no room for the full description,
 * photo set, and vendor-entered attributes (the public store page, the
 * homepage marketplace preview, AI search results). Shell (portal/backdrop/
 * drag-to-dismiss/ESC/scroll-lock) lives in DetailSheet; this component only
 * owns the gallery + text content and the chat/View Store footer. */
export function ListingDetailModal({
  item,
  open,
  onClose,
  isOwn,
  chatHref,
  chatLabel,
  onChatClick,
  vendor = null,
  priceInKobo = true,
}: {
  item: ListingDetailItem;
  open: boolean;
  onClose: () => void;
  isOwn: boolean;
  chatHref: string | null;
  chatLabel: string;
  onChatClick: () => void;
  vendor?: ListingDetailVendor | null;
  priceInKobo?: boolean;
}) {
  const isService = item.kind === "service";
  const KindIcon = isService ? WrenchIcon : PackageIcon;
  const symbol = item.currency === "USD" ? "$" : "₦";
  const price = priceInKobo ? item.price / 100 : item.price;
  const priceMax =
    item.priceMax != null
      ? priceInKobo
        ? item.priceMax / 100
        : item.priceMax
      : null;
  const isRange = priceMax != null && priceMax > price;

  const [imgIndex, setImgIndex] = useState(0);
  const hasGallery = item.images.length > 1;

  const showPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((i) => (i - 1 + item.images.length) % item.images.length);
  };
  const showNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((i) => (i + 1) % item.images.length);
  };

  // Auto-advance the gallery while it's open — only when there's more than
  // one photo, obviously. Depending on `imgIndex` itself (not just `open`)
  // means every advance — auto OR a manual prev/next click — restarts the
  // dwell timer, so a manual click always gets a full AUTO_SLIDE_MS before
  // the next auto-advance instead of whatever was left of the prior cycle.
  const AUTO_SLIDE_MS = 4000;
  useEffect(() => {
    if (!open || !hasGallery) return;
    const id = setInterval(() => {
      setImgIndex((i) => (i + 1) % item.images.length);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(id);
  }, [open, hasGallery, item.images.length, imgIndex]);

  // Reset to the first photo on each fresh open — React's own documented
  // "adjusting state when a prop changes" pattern (a render-phase setState
  // guarded by comparing against last render's value in state, not a ref —
  // refs can't be read/written during render), not an effect, so reopening
  // doesn't cost an extra commit+paint before the reset takes effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setImgIndex(0);
  }

  const viewStoreHref = vendor?.handle ? `/store/${vendor.handle}` : null;

  return (
    <DetailSheet
      open={open}
      onClose={onClose}
      footer={
        isOwn ? (
          <OwnListingBadge label="This is your listing" />
        ) : (
          <div className="flex flex-col gap-2">
            {chatHref && (
              <WhatsAppButton
                href={chatHref}
                label={chatLabel}
                className="w-full"
                onClick={onChatClick}
              />
            )}
            {viewStoreHref && (
              <Link
                href={viewStoreHref}
                target="_blank"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
              >
                <StoreIcon size={15} />
                View Store
              </Link>
            )}
          </div>
        )
      }
    >
      <div className="relative">
        <div className="relative w-full aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
          {item.images.length > 0 ? (
            <ProtectedImage
              src={optimizedImageUrl(item.images[imgIndex])}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <StoreIcon size={30} className="text-gray-300" />
          )}
          {hasGallery && (
            <>
              <button
                type="button"
                onClick={showPrev}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white"
              >
                <ChevronLeftIcon size={15} />
              </button>
              <button
                type="button"
                onClick={showNext}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white"
              >
                <ChevronRightIcon size={15} />
              </button>
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1">
                {item.images.map((url, i) => (
                  <span
                    key={url}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors",
                      i === imgIndex ? "bg-white" : "bg-white/50",
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        {/* Solid white + shadow + ring, not the translucent-black
            treatment the carousel/kind-badge overlays use — this is
            the one control on the whole sheet/modal that MUST read
            as "the way out" at a glance, even over a bright photo
            where a dark translucent circle would blend in. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95"
        >
          <CloseIcon size={20} strokeWidth={2.5} />
        </button>
        <span className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full">
          <KindIcon size={11} />
          {isService ? "Service" : "Product"}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        <p className="text-base font-bold text-gray-800 leading-snug">
          {item.name}
        </p>

        {vendor && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-orange-50 overflow-hidden flex items-center justify-center shrink-0">
              {vendor.avatar ? (
                <ProtectedImage
                  src={optimizedImageUrl(vendor.avatar)}
                  alt={vendor.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <StoreIcon size={13} className="text-orange-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-700 truncate">
                {vendor.name}
              </p>
              {(vendor.area || vendor.state) && (
                <p className="text-[11px] text-gray-400 truncate">
                  {vendor.area ?? vendor.state}
                </p>
              )}
            </div>
          </div>
        )}

        {item.description && (
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {item.description}
          </p>
        )}
        {item.attributes.length > 0 && (
          <dl className="space-y-1.5 pt-2 border-t border-gray-100">
            {item.attributes.map((attr) => (
              <div
                key={attr.name}
                className="flex items-baseline gap-1.5 text-sm"
              >
                <dt className="text-gray-400 shrink-0">{attr.name}:</dt>
                <dd className="text-gray-700">{attr.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="pt-2 border-t border-gray-100">
          {item.quoteOnRequest ? (
            <p className="text-[15px] font-extrabold text-[#023337]">
              Contact for quote
            </p>
          ) : (
            <p className="text-[15px] font-extrabold text-[#023337]">
              {fmt(price, symbol)}
              {isRange && (
                <>
                  <span className="mx-1 text-sm font-normal text-gray-400">
                    –
                  </span>
                  {fmt(priceMax!, symbol)}
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </DetailSheet>
  );
}
