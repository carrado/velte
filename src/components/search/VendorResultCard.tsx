import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  ShieldCheck,
  Store as StoreIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { fmt } from "@/lib/product-price";
import { ProtectedImage } from "@/components/ProtectedImage";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { OwnListingBadge } from "@/components/search/OwnListingBadge";
import { ListingDetailModal } from "@/components/ListingDetailModal";
import { ImageLightbox } from "@/components/ImageLightbox";
import { reportLead } from "@/lib/reportLead";
import { useUserStore } from "@/store/userStore";
import { cn } from "@/lib/utils";
import { buildWhatsappLink } from "@/lib/whatsapp";
import type { VendorMatch } from "@/types/search";

export function VendorResultCard({
  match,
  // False whenever this card is guaranteed to render alongside its own
  // vendor's StoreResultCard (a "Sold by" companion, or a matching-service
  // companion under a store match) — that card is now the one place "View
  // Store" lives, so a second copy right here would just be a duplicate
  // pointing at the same store. Defaults true for a standalone card (e.g.
  // weakProducts, or a product whose store lookup failed) that has no other
  // path to the storefront at all.
  showViewStore = true,
  // False for a matching-service companion rendered under its own store's
  // StoreResultCard — that card already owns the "chat with vendor" CTA for
  // this turn, so a second WhatsApp button right here would just double up
  // the same contact point (and risk a second lead report for one buyer
  // intent). Defaults true for every other context, where this card is the
  // only place a chat CTA exists at all.
  showChatButton = true,
}: {
  match: VendorMatch;
  showViewStore?: boolean;
  showChatButton?: boolean;
}) {
  const symbol = match.currency === "USD" ? "$" : "₦";
  const isRange = match.priceMax != null && match.priceMax > match.price;
  // A logged-in vendor searching can match their own catalog — no WhatsApp
  // CTA to themselves (which would also bill them a lead), just say so.
  const currentUserId = useUserStore((s) => s.user?.id);
  const isOwn = currentUserId != null && currentUserId === match.vendorId;

  const chatHref = buildWhatsappLink(
    match.whatsapp,
    `Hi ${match.vendorName}! I'm interested in your "${match.name}" — I found you on Velte.`,
    match.mainImageUrl ? match.productId : undefined,
  );

  // Main image first, then whatever else the vendor uploaded — a buyer
  // shouldn't be stuck with just whichever single photo was set as "main"
  // when the listing actually has more angles/variants to show.
  const images = [match.mainImageUrl, ...match.thumbnailUrls].filter(
    (url): url is string => Boolean(url),
  );
  const [imgIndex, setImgIndex] = useState(0);
  const hasGallery = images.length > 1;
  const showPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((i) => (i - 1 + images.length) % images.length);
  };
  const showNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((i) => (i + 1) % images.length);
  };

  // "See more" opens the full ListingDetailModal (gallery + full
  // description + attributes + vendor details) instead of expanding text
  // in place — only offered when there's actually more than the compact
  // card already shows (a clipped description, vendor-entered attributes,
  // or extra photos beyond the one already visible above).
  const [detailOpen, setDetailOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    setDescOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [match.description]);
  const hasMore =
    descOverflows || match.attributes.length > 0 || images.length > 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <div
        className={`relative w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden ${images.length > 0 ? "cursor-zoom-in" : ""}`}
        onClick={() => images.length > 0 && setLightboxOpen(true)}
      >
        {images.length > 0 ? (
          <ProtectedImage
            src={optimizedImageUrl(images[imgIndex])}
            alt={match.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <StoreIcon size={28} className="text-gray-300" />
        )}
        {hasGallery && (
          <>
            <button
              type="button"
              onClick={showPrev}
              aria-label="Previous photo"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Next photo"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white"
            >
              <ChevronRight size={14} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((url, i) => (
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
      <div className="p-4 space-y-2.5">
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.5em]">
          {match.name}
        </p>
        {match.quoteOnRequest ? (
          <p className="text-[15px] font-extrabold text-[#023337]">
            Ask for price
          </p>
        ) : (
          <p className="text-[15px] font-extrabold text-[#023337]">
            {fmt(match.price, symbol)}
            {isRange && (
              <>
                <span className="mx-1 text-sm font-normal text-gray-400">
                  –
                </span>
                {fmt(match.priceMax!, symbol)}
              </>
            )}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">
            {match.area ??
              match.state ??
              (match.distanceKm != null ? "Nearby" : "Nigeria")}
            {match.distanceKm != null && ` · ${match.distanceKm}km away`}
          </span>
        </div>
        {match.description && (
          <p
            ref={descRef}
            className="text-xs text-gray-500 leading-relaxed line-clamp-2"
          >
            {match.description}
          </p>
        )}
        {hasMore && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDetailOpen(true);
            }}
            className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 underline"
          >
            See more
          </button>
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1 text-xs text-gray-500 min-w-0">
            <ShieldCheck size={13} className="shrink-0 text-orange-500" />
            <span className="truncate">{match.vendorName}</span>
          </div>
        </div>
        {isOwn ? (
          <OwnListingBadge label="This is your listing" />
        ) : (showChatButton && chatHref) ||
          (showViewStore && match.storeHandle) ? (
          <div className="flex flex-col gap-2 mt-1">
            {showChatButton && chatHref && (
              <WhatsAppButton
                href={chatHref}
                label="Chat with vendor"
                className="w-full"
                onClick={() =>
                  reportLead(match.vendorId, match.productId, "search")
                }
              />
            )}
            {showViewStore && match.storeHandle && (
              <Link
                href={`/store/${match.storeHandle}`}
                target="_blank"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
              >
                <StoreIcon size={15} />
                View Store
              </Link>
            )}
          </div>
        ) : null}
      </div>

      <ListingDetailModal
        item={{
          name: match.name,
          kind: match.kind,
          quoteOnRequest: match.quoteOnRequest,
          price: match.price,
          priceMax: match.priceMax,
          currency: match.currency,
          images,
          description: match.description,
          attributes: match.attributes,
        }}
        // The AI search pipeline already normalizes price/priceMax to naira
        // server-side (see MarketplaceCard's own comment on the raw-kobo
        // convention it doesn't share) — ListingDetailModal must not divide
        // this by 100 again.
        priceInKobo={false}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        isOwn={isOwn}
        vendor={{
          name: match.vendorName,
          handle: match.storeHandle,
          area: match.area,
          state: match.state,
        }}
        chatHref={chatHref}
        chatLabel="Chat with vendor"
        onChatClick={() =>
          reportLead(match.vendorId, match.productId, "search")
        }
      />

      <ImageLightbox
        images={images}
        initialIndex={imgIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        alt={match.name}
      />
    </div>
  );
}
