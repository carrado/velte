/* eslint-disable @next/next/no-img-element */
import { ExternalLinkIcon } from "@/components/icons";
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
export function ExternalOfferCard({ offer }: { offer: ExternalOffer }) {
  return (
    <a
      href={offer.url}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-md"
    >
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-gray-50">
        {offer.imageUrl ? (
          <img
            src={offer.imageUrl}
            alt={offer.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain"
          />
        ) : (
          <ExternalLinkIcon size={24} className="text-gray-300" />
        )}
        {/* Names the shop on the photo itself, so the card can never be
            skim-read as one of Velte's own listings. */}
        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-gray-600 shadow-sm">
          {offer.merchant ?? "Online store"}
        </span>
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
      </div>
    </a>
  );
}
