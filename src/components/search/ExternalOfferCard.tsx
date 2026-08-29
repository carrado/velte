/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { koboFromPriceText } from "@/lib/priceText";
import { WatchPriceButton } from "@/components/search/WatchPriceButton";
import type { ExternalOffer } from "@/types/search";

// An off-Velte product offer (Phase 4) — shown only when Velte itself had
// nothing, so a dead end ends with somewhere to go.
//
// Visually deliberate: this must NEVER be mistakable for a Velte vendor
// card. No WhatsApp button (there's no vendor relationship and no lead to
// bill), no "Sold by" line, no trust or distance signals — none of which
// exist for these — and an explicit source badge naming where it came
// from. The only action is an outbound link, marked as such.
//
// Images are plain <img>: they come from arbitrary merchant CDNs, so
// next/image's configured-domains requirement can't be satisfied, and
// `referrerPolicy` keeps Velte's own URLs out of those hosts' logs.
//
// Gallery added 2026-08-27, alongside the pick call learning to look at
// photos (see ExternalOffer.galleryUrls). The two belong together: it would
// be worse, not better, for the model to reject a listing over damage in
// photo three while the buyer stares at a card that only ever shows photo
// one and can't see what it meant.
export function ExternalOfferCard({
  offer,
  // Chips from the turn's own comparison ("Top pick", "Best price"),
  // added 2026-08-26 — these cards had none, so the one turn with no Velte
  // vendor to fall back on was also the one with no guidance on it. Same
  // prop shape and same rendering as VendorResultCard's, so a buyer reads
  // the two the same way; what differs is what they can honestly say,
  // which pickExternalRecommendation decides, not this component.
  pickBadges,
}: {
  offer: ExternalOffer;
  pickBadges?: string[];
}) {
  // Primary first, then the rest of the listing's photos — the same order
  // the comparison call sees them in, so a buyer checking a "the third
  // photo shows a cracked screen" note finds it in the third photo here.
  const allImages = [
    ...(offer.imageUrl ? [offer.imageUrl] : []),
    ...offer.galleryUrls,
  ];

  // These are third-party CDNs, not Velte's own Cloudinary: a URL that was
  // valid when the page was read can still 403 or 404 by the time a browser
  // asks for it. A broken photo is dropped from the strip entirely rather
  // than left as a torn-image icon in the middle of a gallery — and if all
  // of them fail the card falls back to the same empty state it always had.
  const [broken, setBroken] = useState<string[]>([]);
  const images = allImages.filter((url) => !broken.includes(url));

  const [imgIndex, setImgIndex] = useState(0);
  // Clamped rather than reset: dropping a broken photo must not throw the
  // buyer back to the first one every time.
  const index = Math.min(imgIndex, Math.max(images.length - 1, 0));
  const hasGallery = images.length > 1;

  // The whole card is one big <a>, so a nav button has to cancel the
  // navigation as well as the bubble — without preventDefault, flipping to
  // photo two would open the shop instead.
  const step = (delta: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImgIndex((i) => {
      const from = Math.min(i, images.length - 1);
      return (from + delta + images.length) % images.length;
    });
  };

  return (
    <a
      href={offer.url}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-md"
    >
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-gray-50">
        {images.length > 0 ? (
          // Only the visible photo is ever in the DOM, so the extra images
          // cost nothing until a buyer actually flips to them.
          <img
            key={images[index]}
            src={images[index]}
            alt={
              hasGallery
                ? `${offer.title} — photo ${index + 1} of ${images.length}`
                : offer.title
            }
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() =>
              setBroken((prev) =>
                prev.includes(images[index]) ? prev : [...prev, images[index]],
              )
            }
            className="h-full w-full object-contain"
          />
        ) : (
          <ExternalLinkIcon size={24} className="text-gray-300" />
        )}
        {hasGallery && (
          <>
            <button
              type="button"
              onClick={step(-1)}
              aria-label="Previous photo"
              className="absolute left-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
            >
              <ChevronLeftIcon size={14} />
            </button>
            <button
              type="button"
              onClick={step(1)}
              aria-label="Next photo"
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
            >
              <ChevronRightIcon size={14} />
            </button>
            {/* Bottom-RIGHT, unlike VendorResultCard's centred dots: the
                pick badges already sit bottom-left on this card, and a
                centred strip collides with them once a listing carries
                both "Top pick" and "Best price". */}
            <div className="absolute bottom-2 right-2 flex gap-1">
              {images.map((url, i) => (
                <span
                  key={url}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    i === index ? "bg-white" : "bg-white/50",
                  )}
                />
              ))}
            </div>
          </>
        )}
        {/* Names the shop on the photo itself, so the card can never be
            skim-read as one of Velte's own listings. */}
        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-gray-600 shadow-sm">
          {offer.merchant ?? "Online store"}
        </span>
        {pickBadges && pickBadges.length > 0 && (
          // Bottom-left, not top-left: the merchant badge already owns that
          // corner and naming the shop must stay the most prominent thing
          // on an off-Velte card.
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
            {pickBadges.map((label) => (
              <span
                key={label}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm",
                  label === "Top pick"
                    ? "bg-orange-500 text-white"
                    : "bg-white/95 text-orange-600 border border-orange-100",
                )}
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 min-h-[2.5em] text-sm font-medium leading-snug text-gray-800">
          {offer.title}
        </p>
        {/* The source's own price string, verbatim — never re-parsed or
            reformatted (see ExternalOffer): a mis-parsed price sitting
            next to a real vendor's real price is exactly the kind of
            confident wrongness this codebase avoids everywhere else. */}
        {offer.priceText && (
          <p className="text-[15px] font-extrabold text-[#023337]">
            {offer.priceText}
          </p>
        )}
        <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-semibold text-orange-600">
          View on {offer.merchant ?? "site"}
          <ExternalLinkIcon size={12} className="shrink-0" />
        </span>
        {/* Offered right where a buyer is weighing an off-Velte listing they
            aren't ready to buy — the moment the feature is worth most, and
            so the moment the upgrade prompt lands best. Hides itself when
            the listing shows no usable price (see the component). */}
        <WatchPriceButton
          kind="external"
          url={offer.url}
          label={offer.title}
          imageUrl={offer.imageUrl}
          merchant={offer.merchant}
          priceKobo={koboFromPriceText(offer.priceText)}
          className="pt-2"
        />
      </div>
    </a>
  );
}
