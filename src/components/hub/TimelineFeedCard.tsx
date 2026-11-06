"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  CrownIcon,
  EyeIcon,
  MessageSquareIcon,
  ShareIcon,
  ShoppingCartIcon,
  SparklesIcon,
  ZapIcon,
} from "@/components/icons";
import {
  EnterpriseAvatarBadge,
  EnterpriseBadge,
  isEnterpriseVendor,
} from "@/components/EnterpriseBadge";
import { ManualProductCarousel } from "./ManualProductCarousel";
import { useCartStore } from "@/store/cartStore";
import { buildChatLink } from "@/lib/chatLink";
import { cn, formatNaira, isNewListing, timeAgo } from "@/lib/utils";
import { isBoostedProduct, isSponsoredAdvert } from "@/lib/hubFeed";
import type { HubTimelineItem } from "@/types/hub";

interface TimelineFeedCardProps {
  item: HubTimelineItem;
  now: number;
  viewerId?: string;
  onOpenListing?: (item: HubTimelineItem) => void;
  isLeader?: boolean;
}

function updateGallery(item: HubTimelineItem): string[] {
  const images = [
    ...(item.listing?.images ?? []),
    item.imageUrl,
    ...(item.images ?? []),
  ].filter(Boolean) as string[];
  return [...new Set(images)];
}

export function TimelineFeedCard({
  item,
  now,
  viewerId,
  onOpenListing,
  isLeader = false,
}: TimelineFeedCardProps) {
  const gallery = updateGallery(item);
  const storeName = item.storeName || "Vendor";
  const isEnterprise = isEnterpriseVendor(item);
  const isBoosted = isLeader || isBoostedProduct(item);
  const isAdvert = !isBoosted && isSponsoredAdvert(item);
  const isOwn = Boolean(viewerId) && item.vendorId === viewerId;

  const [addingToCart, setAddingToCart] = useState(false);

  // Price formatting
  const listingPrice = item.listing?.price
    ? formatNaira(item.listing.price)
    : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.listing) return;
    setAddingToCart(true);

    const unitPrice = item.listing.price / 100;
    const added = useCartStore.getState().addItem({
      productId: item.listing.productId,
      name: item.listing.name,
      unitPrice,
      imageUrl: gallery[0] || null,
      vendorId: item.vendorId,
      vendorName: storeName,
    });

    if (added) {
      useCartStore.getState().openDrawer();
      toast.success(`Added "${item.listing.name}" to cart`);
    }
    setAddingToCart(false);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = typeof window !== "undefined" ? window.location.href : "/hub";

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `Check out ${item.title} by ${storeName} on Velte!`,
          url,
        });
        return;
      } catch {
        /* fallback to clipboard */
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const chatHref =
    !isOwn && item.vendorId
      ? buildChatLink({
          vendorId: item.vendorId,
          productId: item.listing?.productId,
          source: "browse",
          message:
            item.listing?.kind === "service"
              ? `Hi ${storeName}! I'm interested in your "${item.title}" service. I found you on Velte Hub.`
              : `Hi ${storeName}! Is "${item.title}" still available? I found you on Velte Hub.`,
        })
      : null;

  return (
    <article className="relative rounded-2xl border border-gray-200 dark:border-white/10 bg-surface transition-all duration-200 overflow-hidden shadow-xs hover:border-gray-300 dark:hover:border-white/20">
      {/* ── Top Header: Vendor Identity & Classification Badge ── */}
      <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex shrink-0 items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs overflow-hidden ring-2 ring-surface">
              {item.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.avatar}
                  alt={storeName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{storeName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            {isEnterprise && <EnterpriseAvatarBadge size="sm" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-ink truncate">
                {storeName}
              </span>
              {isEnterprise && <EnterpriseBadge size="sm" />}
              {item.verified && (
                <span
                  title="Verified Vendor"
                  className="inline-flex shrink-0 items-center"
                >
                  <CheckIcon size={13} className="text-orange-500 shrink-0" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-ink/60 mt-0.5">
              <span>{timeAgo(item.at, now)}</span>
              {item.place && (
                <>
                  <span>·</span>
                  <span className="truncate max-w-[120px] sm:max-w-[180px]">
                    {item.place}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Normal Sponsored Label (same styling, no different background) ── */}
        <div className="shrink-0">
          {isBoosted || isAdvert || item.sponsored ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
              Sponsored
            </span>
          ) : item.kind === "product" && isNewListing(item.at, now) ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-900/40 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
              New
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Post Content / Title & Description ── */}
      <div className="px-4 sm:px-5 pb-3">
        <h4 className="text-base font-bold text-ink leading-snug">
          {item.title}
        </h4>
        {item.body && item.body !== item.title && (
          <p className="mt-1.5 text-sm text-gray-600 dark:text-ink/80 line-clamp-3 leading-relaxed">
            {item.body}
          </p>
        )}

        {/* Price & Tag Strip */}
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          {listingPrice && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500/10 dark:bg-orange-500/15 px-3 py-1 text-sm font-extrabold text-orange-600 dark:text-orange-400 border border-orange-500/20">
              <span>{listingPrice}</span>
            </div>
          )}
          {item.sectors?.[0] && (
            <span className="text-xs font-medium text-gray-500 dark:text-ink/60 bg-gray-100 dark:bg-white/5 rounded-lg px-2 py-0.5">
              #{item.sectors[0].replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>

      {/* ── Media Gallery: Manual Swipeable Carousel (Not Automatic) ── */}
      {gallery.length > 0 && (
        <div className="px-4 sm:px-5 pb-3">
          <ManualProductCarousel
            images={gallery}
            altTitle={item.title}
            aspectRatio={isBoosted ? "video" : "video"}
            onImageClick={() => item.listing && onOpenListing?.(item)}
          />
        </div>
      )}

      {/* ── Bottom Interactive Action Bar (Facebook / X style) ── */}
      <div className="px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2 bg-gray-50/50 dark:bg-white/2">
        <div className="flex items-center gap-2">
          {item.listing && (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-60"
            >
              <ShoppingCartIcon size={14} />
              <span>Add to Cart</span>
            </button>
          )}

          {chatHref && (
            <Link
              href={chatHref}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 text-gray-700 dark:text-ink px-3 py-1.5 text-xs font-semibold transition-all"
            >
              <MessageSquareIcon size={14} />
              <span className="hidden sm:inline">Message</span>
            </Link>
          )}

          {item.listing && (
            <button
              type="button"
              onClick={() => onOpenListing?.(item)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 text-gray-700 dark:text-ink px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
            >
              <EyeIcon size={14} />
              <span className="hidden sm:inline">Details</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share listing"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ShareIcon size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}
