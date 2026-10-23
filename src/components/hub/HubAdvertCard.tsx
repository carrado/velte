import Link from "next/link";

import { ProtectedImage } from "@/components/ProtectedImage";
import { BadgeCheckIcon, StoreIcon } from "@/components/icons/hero";
import { optimizedImageUrl } from "@/lib/cloudinary";
import type { HubAdvert } from "@/types/hub";

// One paid slot on the Hub — always labelled. The "Sponsored" tag is part of
// the card, not the page around it, so the label can never be separated from
// the creative it describes (platform plan Phase 2.4: payment buys position,
// never relevance). Links to the vendor's storefront — click counting with
// per-actor dedup arrives in the analytics slice, so this links honestly
// without claiming to measure.
export function HubAdvertCard({ advert }: { advert: HubAdvert }) {
  const storeHref = advert.storeHandle ? `/store/${advert.storeHandle}` : null;
  const body = (
    <>
      <div className="relative aspect-[16/9] bg-gray-100 shrink-0">
        <ProtectedImage
          src={optimizedImageUrl(advert.imageUrl)}
          alt={advert.headline}
          className="w-full h-full object-cover"
        />
        <span className="absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-white/95 px-2 py-1 rounded-md shadow-sm">
          Sponsored
        </span>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="font-bold text-ink text-[15px] leading-snug">
          {advert.headline}
        </p>
        {advert.blurb && (
          <p className="text-[13px] text-gray-500 leading-relaxed mt-1 line-clamp-2">
            {advert.blurb}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
            {advert.avatar ? (
              <ProtectedImage
                src={optimizedImageUrl(advert.avatar)}
                alt={advert.storeName ?? advert.headline}
                className="w-full h-full object-cover"
              />
            ) : (
              <StoreIcon size={13} className="text-gray-300" />
            )}
          </div>
          <p className="text-xs font-semibold text-gray-700 truncate flex items-center gap-1 min-w-0">
            <span className="truncate">
              {advert.storeName ?? "Velte vendor"}
            </span>
            {advert.verified && (
              <BadgeCheckIcon
                size={13}
                className="text-orange-500 shrink-0 fill-orange-500/15"
              />
            )}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <div className="bg-surface rounded-2xl border border-orange-200/70 shadow-sm overflow-hidden flex flex-col h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      {storeHref ? (
        <Link href={storeHref} className="flex flex-col flex-1">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}
