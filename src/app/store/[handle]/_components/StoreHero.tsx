"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoreHeroTheme } from "@/lib/sectorHeroThemes";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { ShareButton } from "@/components/ShareButton";

const AUTOPLAY_MS = 4500;

export interface StoreHeroProps {
  handle: string;
  name: string;
  avatar: string | null;
  gallery: string[];
  area: string | null;
  sectors: string[];
  goodsCount: number;
  servicesCount: number;
  goodsUnit: string;
}

// Full-bleed hero: real gallery photos auto-sliding when the vendor has any,
// otherwise a generated sector-themed gradient (see sectorHeroThemes) so an
// empty gallery never reads as a broken/placeholder page. Store identity
// (logo, name, area, sectors) overlays either background the same way, so
// the vendor never has to have photos to look complete.
export default function StoreHero({
  handle,
  name,
  avatar,
  gallery,
  area,
  sectors,
  goodsCount,
  servicesCount,
  goodsUnit,
}: StoreHeroProps) {
  const hasPhotos = gallery.length > 0;
  const theme = getStoreHeroTheme(sectors);
  const ThemeIcon = theme.icon;

  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const next = () => setCurrent((c) => (c + 1) % gallery.length);
  const prev = () =>
    setCurrent((c) => (c - 1 + gallery.length) % gallery.length);

  useEffect(() => {
    if (!hasPhotos || !isAutoPlaying || gallery.length <= 1) return;
    const id = setInterval(
      () => setCurrent((c) => (c + 1) % gallery.length),
      AUTOPLAY_MS,
    );
    return () => clearInterval(id);
  }, [hasPhotos, isAutoPlaying, gallery.length]);

  return (
    <div
      className="relative w-full h-[220px] sm:h-[260px] lg:h-[300px] overflow-hidden select-none bg-gray-900"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Background */}
      {hasPhotos ? (
        <div
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{
            // The track's own width is gallery.length * 100% of the hero, so a
            // translateX percentage (which resolves against the track's OWN
            // width, not the hero's) must be scaled down by the same factor —
            // otherwise it overshoots by a factor of gallery.length per step.
            transform: `translateX(-${current * (100 / gallery.length)}%)`,
            width: `${gallery.length * 100}%`,
          }}
        >
          {gallery.map((url, i) => (
            <div
              key={url}
              className="h-full flex-shrink-0"
              style={{ width: `${100 / gallery.length}%` }}
            >
              <img
                src={optimizedImageUrl(url)}
                alt={`${name} — photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br flex items-center justify-center",
            theme.gradient,
          )}
        >
          <ThemeIcon
            size={130}
            strokeWidth={1}
            className="text-white/25 -rotate-6"
          />
        </div>
      )}

      {/* Legibility overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

      {/* Carousel controls (only when there's something to slide between) */}
      {hasPhotos && gallery.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous photo"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 flex items-center justify-center transition-colors z-10"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
          <button
            onClick={next}
            aria-label="Next photo"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 flex items-center justify-center transition-colors z-10"
          >
            <ChevronRight size={18} className="text-white" />
          </button>
          <div className="absolute top-4 sm:top-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {gallery.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === current
                    ? "w-5 h-1.5 bg-white"
                    : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* Share — top-right, always available regardless of background */}
      <div className="absolute top-4 sm:top-5 right-4 sm:right-6 z-10">
        <ShareButton
          url={`/store/${handle}`}
          title={`${name} on Velte`}
          text={`Check out ${name} on Velte!`}
          className="bg-white/15 border-white/20 text-white hover:bg-white/25 backdrop-blur-sm"
        />
      </div>

      {/* Identity overlay */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-3 sm:pb-5">
          <div className="flex items-end gap-3">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-orange-500 ring-2 ring-white/20 shadow-lg flex items-center justify-center text-white text-lg sm:text-xl font-bold overflow-hidden shrink-0">
              {avatar ? (
                <img
                  src={optimizedImageUrl(avatar)}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1 pb-0.5">
              <h1 className="text-lg sm:text-2xl font-black text-white leading-tight drop-shadow-sm truncate">
                {name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs sm:text-sm text-white/85">
                {area && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} />
                    {area}
                  </span>
                )}
                {goodsCount > 0 && (
                  <span>
                    {goodsCount}{" "}
                    {goodsCount === 1 ? goodsUnit : `${goodsUnit}s`}
                  </span>
                )}
                {servicesCount > 0 && (
                  <span>
                    {servicesCount}{" "}
                    {servicesCount === 1 ? "service" : "services"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-2 mt-2.5">
            {sectors.slice(0, 5).map((sector) => (
              <span
                key={sector}
                className="px-2.5 py-1 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold rounded-full"
              >
                {sector}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
