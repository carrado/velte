/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  ShieldCheck,
  Store as StoreIcon,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { fmt } from "@/lib/product-price";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { OwnListingBadge } from "@/components/search/OwnListingBadge";
import { ExpandableText } from "@/components/search/ExpandableText";
import { reportLead } from "@/lib/reportLead";
import { useUserStore } from "@/store/userStore";
import { cn } from "@/lib/utils";
import type { VendorMatch } from "@/types/search";
import VideoPosterImage from "@/components/products/VideoPosterImage";
import FullscreenVideoModal from "@/components/FullscreenVideoModal";

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
}: {
  match: VendorMatch;
  showViewStore?: boolean;
}) {
  const symbol = match.currency === "USD" ? "$" : "₦";
  const isRange = match.priceMax != null && match.priceMax > match.price;
  // A logged-in vendor searching can match their own catalog — no WhatsApp
  // CTA to themselves (which would also bill them a lead), just say so.
  const currentUserId = useUserStore((s) => s.user?.id);
  const isOwn = currentUserId != null && currentUserId === match.vendorId;

  const chatHref = match.whatsapp
    ? `https://wa.me/${match.whatsapp}?text=${encodeURIComponent(
        `Hi ${match.vendorName}! I'm interested in your "${match.name}" — I found you on Velte.`,
      )}`
    : null;

  // Main image first, then whatever else the vendor uploaded — a buyer
  // shouldn't be stuck with just whichever single photo was set as "main"
  // when the listing actually has more angles/variants to show.
  const images = [match.mainImageUrl, ...match.thumbnailUrls].filter(
    (url): url is string => Boolean(url),
  );
  const [imgIndex, setImgIndex] = useState(0);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const hasGallery = images.length > 1;
  const showPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((i) => (i - 1 + images.length) % images.length);
  };
  const showNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((i) => (i + 1) % images.length);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        {match.videoUrl ? (
          // Video wins over photos when both exist — same priority
          // ProductsTable.tsx already uses on the dashboard (a listing's
          // cover-media tabs don't clear the other slot when switched, so
          // both can legitimately be set; the video is the more deliberate,
          // more engaging choice when a vendor bothered to upload one).
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setVideoModalOpen(true);
            }}
            aria-label="Play video"
            className="group relative block h-full w-full"
          >
            <VideoPosterImage
              videoUrl={match.videoUrl}
              alt={match.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
                <Play size={18} fill="white" className="ml-0.5" />
              </span>
            </div>
          </button>
        ) : images.length > 0 ? (
          <img
            src={optimizedImageUrl(images[imgIndex])}
            alt={match.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <StoreIcon size={28} className="text-gray-300" />
        )}
        {!match.videoUrl && hasGallery && (
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
        {match.kind === "service" && (
          <>
            {match.description && (
              <ExpandableText
                text={match.description}
                className="text-xs text-gray-500 leading-relaxed"
              />
            )}
            {match.attributes.length > 0 && (
              <dl className="space-y-1 pt-1 border-t border-gray-100">
                {match.attributes.map((attr) => (
                  <div
                    key={attr.name}
                    className="flex items-baseline gap-1.5 text-xs"
                  >
                    <dt className="text-gray-400 shrink-0">{attr.name}:</dt>
                    <dd className="text-gray-600 truncate">{attr.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1 text-xs text-gray-500 min-w-0">
            <ShieldCheck size={13} className="shrink-0 text-orange-500" />
            <span className="truncate">{match.vendorName}</span>
          </div>
        </div>
        {isOwn ? (
          <OwnListingBadge label="This is your listing" />
        ) : (
          <div className="flex flex-col gap-2 mt-1">
            {chatHref && (
              <WhatsAppButton
                href={chatHref}
                label="Chat with vendor"
                className="w-full"
                onClick={() => reportLead(match.vendorId, match.productId)}
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
        )}
      </div>
      {match.videoUrl && (
        <FullscreenVideoModal
          videoUrl={match.videoUrl}
          open={videoModalOpen}
          onClose={() => setVideoModalOpen(false)}
          whatsapp={
            !isOwn && chatHref
              ? { href: chatHref, label: "Chat with vendor" }
              : null
          }
        />
      )}
    </div>
  );
}
