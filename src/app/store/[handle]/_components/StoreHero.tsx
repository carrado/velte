"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  MapPin,
  Star,
  Heart,
  ChatCircleDots,
  Check,
  SealCheck,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { getInitial } from "@/lib/initials";
import { cn } from "@/lib/utils";

export interface StoreHeroProps {
  handle: string;
  name: string;
  avatar: string | null;
  gallery: string[];
  productImages?: string[];
  area: string | null;
  sectors: string[];
  goodsCount: number;
  servicesCount: number;
  enterprise?: boolean;
  description?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number;
  whatsappHref?: string | null;
}

const VELTE_TEMPLATE_BACKGROUND = "/hub/vendor-hub-store.jpg";

export default function StoreHero({
  name,
  avatar,
  gallery = [],
  productImages = [],
  area,
  description,
  ratingAvg,
  ratingCount,
  whatsappHref,
}: StoreHeroProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Background carousel images:
  // 1. Photos uploaded by the user on mystore settings (showcase gallery, up to 4)
  // 2. If gallery is empty, fallback to the 4 product images uploaded by the vendor
  const heroImages = useMemo(() => {
    const fromGallery = (gallery || []).filter(Boolean);
    if (fromGallery.length > 0) {
      return fromGallery.slice(0, 4);
    }
    const fromProducts = (productImages || []).filter(Boolean);
    if (fromProducts.length > 0) {
      return fromProducts.slice(0, 4);
    }
    // Official Velte template background image when vendor has no photos yet
    return [VELTE_TEMPLATE_BACKGROUND];
  }, [gallery, productImages]);

  // Auto-play the background carousel if multiple images exist
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  const handleToggleFollow = () => {
    setIsFollowing((prev) => {
      const next = !prev;
      toast.success(next ? `Following ${name}!` : `Unfollowed ${name}`);
      return next;
    });
  };

  const hasRealRating =
    ratingAvg != null && ratingCount != null && ratingCount > 0;

  return (
    <div className="relative w-full overflow-hidden bg-neutral-900 select-none min-h-[170px] sm:min-h-[190px]">
      {/* ── Background Carousel with Dark Overlay ───────────────────── */}
      <div className="absolute inset-0 z-0 bg-neutral-950 overflow-hidden">
        {heroImages.length > 0 ? (
          heroImages.map((src, idx) => (
            <div
              key={src + idx}
              className={cn(
                "absolute inset-0 transition-opacity duration-1000 ease-in-out",
                idx === currentSlide
                  ? "opacity-60 scale-100"
                  : "opacity-0 pointer-events-none scale-105",
              )}
              style={{
                transitionProperty: "opacity, transform",
                transitionDuration: "1000ms",
              }}
            >
              <Image
                src={src}
                alt={`${name} showcase photo ${idx + 1}`}
                fill
                priority={idx === 0}
                className="w-full h-full object-cover object-center"
              />
            </div>
          ))
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/40" />
      </div>

      {/* ── Carousel Slide Indicators ───────────────────────────────── */}
      {heroImages.length > 1 && (
        <div className="absolute bottom-3 right-4 sm:right-6 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
          {heroImages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentSlide(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                i === currentSlide
                  ? "w-4 bg-orange-500"
                  : "w-1.5 bg-white/40 hover:bg-white/70",
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* ── Hero Content Container ──────────────────────────────────── */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
          {/* Left: Avatar + Identity */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            {/* Circular Store Avatar with Green Checkmark */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-26 lg:h-26 rounded-full ring-4 ring-white bg-white shadow-2xl overflow-hidden flex items-center justify-center">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={name}
                    width={110}
                    height={110}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold">
                    {getInitial(name || "S")}
                  </div>
                )}
              </div>
              {/* Green Verified Badge at bottom right of Avatar */}
              <div
                className="absolute bottom-0.5 right-0.5 h-6 w-6 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center text-white shadow-md"
                title="Verified Store"
              >
                <Check size={13} weight="bold" />
              </div>
            </div>

            {/* Store Information */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight drop-shadow-sm truncate">
                  {name}
                </h1>
                {/* Blue Verified Badge */}
                <SealCheck
                  size={22}
                  weight="fill"
                  className="text-sky-400 shrink-0"
                />
              </div>

              {/* Tagline / Description */}
              <p className="text-xs sm:text-sm text-white/85 mt-1 font-normal line-clamp-1">
                {description || `Welcome to ${name} on Velte.`}
              </p>

              {/* Meta Stats Row (Real data only, no hardcoded stats) */}
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-2.5 text-xs text-white/90">
                {/* Real DB Star Rating (Never manufactured) */}
                {hasRealRating ? (
                  <span className="flex items-center gap-1 font-semibold text-amber-300">
                    <Star size={13} weight="fill" className="text-amber-300" />
                    <span>
                      {ratingAvg.toFixed(1)} ({ratingCount}{" "}
                      {ratingCount === 1 ? "review" : "reviews"})
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-white/70 font-normal">
                    <Star
                      size={13}
                      weight="regular"
                      className="text-white/50"
                    />
                    <span>No reviews yet</span>
                  </span>
                )}

                {/* Location */}
                {area && (
                  <span className="flex items-center gap-1">
                    <MapPin
                      size={13}
                      weight="fill"
                      className="text-white/80 shrink-0"
                    />
                    <span>{area}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons (Chat Store + Follow) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 self-start sm:self-center">
            {/* Chat Store Button */}
            <a
              href={whatsappHref || "#chat"}
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-white hover:bg-orange-50 text-[#ff5500] font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <ChatCircleDots
                size={18}
                weight="fill"
                className="text-[#ff5500]"
              />
              <span>Chat Store</span>
            </a>

            {/* Follow Button */}
            <button
              type="button"
              onClick={handleToggleFollow}
              className={`inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer border ${
                isFollowing
                  ? "bg-white/20 text-white border-white/40 backdrop-blur-md"
                  : "bg-[#ff5500] hover:bg-orange-600 text-white border-transparent"
              }`}
            >
              <Heart
                size={16}
                weight={isFollowing ? "fill" : "bold"}
                className={isFollowing ? "text-red-400" : "text-white"}
              />
              <span>{isFollowing ? "Following" : "Follow"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
