"use client";

import Link from "next/link";
import { ProtectedImage } from "@/components/ProtectedImage";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { OwnListingBadge } from "@/components/search/OwnListingBadge";
import { SlidingCover } from "@/components/landing/VendorsPreview";
import { DetailSheet } from "@/components/DetailSheet";
import {
  BadgeCheckIcon,
  CloseIcon,
  MapPinIcon,
  StoreIcon,
} from "@/components/icons";

// A vendor/store match — distinct from ListingDetailModal (a specific
// product/service listing): no price/attributes, but a fuller profile
// (sectors, full description, location) than a search result's compact
// StoreResultCard has room for.
export interface VendorDetailItem {
  name: string;
  handle: string;
  description: string;
  sectors: string[];
  area: string | null;
  state: string | null;
  distanceKm: number | null;
  // Same two fields VendorPreviewItem (marketplace) carries — see
  // StoreMatch's own comment in types/search.ts. Null/empty when the vendor
  // hasn't set one; SlidingCover and the avatar circle below both already
  // fall back to a placeholder in that case.
  avatar: string | null;
  gallery: string[];
}

/** The full-detail view a StoreResultCard's "See more" opens into — same
 * DetailSheet shell as ListingDetailModal, but styled after the
 * marketplace's own VendorCard (VendorsPreview.tsx: sliding cover + an
 * overlapping avatar + name/handle/sectors) rather than a product layout,
 * since a vendor match has no price to show — reuses VendorCard's own
 * SlidingCover directly rather than a second copy. */
export function VendorDetailModal({
  item,
  open,
  onClose,
  isOwn,
  chatHref,
  onChatClick,
}: {
  item: VendorDetailItem;
  open: boolean;
  onClose: () => void;
  isOwn: boolean;
  chatHref: string | null;
  onChatClick: () => void;
}) {
  return (
    <DetailSheet
      open={open}
      onClose={onClose}
      footer={
        isOwn ? (
          <OwnListingBadge label="This is your store" />
        ) : (
          <div className="flex flex-col gap-2">
            {chatHref && (
              <WhatsAppButton
                href={chatHref}
                label="Chat on WhatsApp"
                className="w-full"
                onClick={onChatClick}
              />
            )}
            <Link
              href={`/store/${item.handle}`}
              target="_blank"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
            >
              <StoreIcon size={15} />
              View Store
            </Link>
          </div>
        )
      }
    >
      <div className="relative">
        <div className="relative h-28">
          <SlidingCover images={item.gallery} name={item.name} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95"
        >
          <CloseIcon size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
        {/* Twitter-style overlap, same as VendorCard's own avatar — the
            -mt-8 pulls it up over the cover strip above. */}
        <div className="relative -mt-8 mb-2">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-50 border-4 border-white shadow-sm flex items-center justify-center">
            {item.avatar ? (
              <ProtectedImage
                src={optimizedImageUrl(item.avatar)}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <StoreIcon size={22} className="text-gray-300" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 min-w-0">
          <p className="font-bold text-[#023337] text-base truncate">
            {item.name}
          </p>
          <BadgeCheckIcon
            size={16}
            className="text-orange-500 shrink-0 fill-orange-500/15"
          />
        </div>
        <p className="text-xs text-gray-400 mb-2">@{item.handle}</p>

        {(item.area || item.state || item.distanceKm != null) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2.5">
            <MapPinIcon size={13} className="shrink-0" />
            <span className="truncate">
              {item.area ?? item.state ?? "Nigeria"}
              {item.distanceKm != null && ` · ${item.distanceKm}km away`}
            </span>
          </div>
        )}

        {item.description && (
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mb-3">
            {item.description}
          </p>
        )}

        {item.sectors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.sectors.map((sector) => (
              <span
                key={sector}
                className="text-[11px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"
              >
                {sector}
              </span>
            ))}
          </div>
        )}
      </div>
    </DetailSheet>
  );
}
