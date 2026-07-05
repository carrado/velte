import Link from "next/link";
import { MapPin, Store as StoreIcon, ExternalLink } from "lucide-react";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import type { StoreMatch } from "@/types/search";

// A business/vendor match — distinct from VendorResultCard (a specific
// product listing): no price/image-per-product fields, since this is a
// storefront, not a listing. Links through to the existing public
// /store/[handle] page, a CTA a product match doesn't have.
export function StoreResultCard({ match }: { match: StoreMatch }) {
  const chatHref = match.whatsapp
    ? `https://wa.me/${match.whatsapp}?text=${encodeURIComponent(
        `Hi ${match.name}! I found you on Velte and I'm interested in what you offer.`,
      )}`
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
          <StoreIcon size={16} className="text-orange-500" />
        </div>
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-1 min-w-0">
          {match.name}
        </p>
      </div>

      {match.description && (
        <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2">
          {match.description}
        </p>
      )}

      {match.sectors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {match.sectors.slice(0, 3).map((sector) => (
            <span
              key={sector}
              className="text-[11px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"
            >
              {sector}
            </span>
          ))}
        </div>
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

      <div className="flex items-center gap-2 pt-1">
        {chatHref && (
          <WhatsAppButton href={chatHref} label="Chat" className="flex-1" />
        )}
        <Link
          href={`/store/${match.handle}`}
          target="_blank"
          className="flex items-center justify-center gap-1.5 px-3 h-11 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors shrink-0"
        >
          Visit
          <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
}
