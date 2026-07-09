import { MapPin, Store as StoreIcon, ExternalLink } from "lucide-react";
import type { NearbyBusiness } from "@/types/search";

// A real nearby business from Google Places (searchStores Tier 5) — no
// Velte relationship, so deliberately NOT styled like VendorResultCard/
// StoreResultCard: no WhatsApp button (nothing to chat with), a visible
// "Not yet on Velte" label so it's never mistaken for an actual listing,
// and a plain Google Maps search link as the only way to look it up.
export function ExternalBusinessCard({ match }: { match: NearbyBusiness }) {
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${match.name} ${match.address}`,
  )}`;

  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <StoreIcon size={16} className="text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-1 min-w-0">
            {match.name}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          Not yet on Velte
        </span>
      </div>

      <div className="flex items-start gap-1.5 text-xs text-gray-500">
        <MapPin size={13} className="shrink-0 mt-0.5" />
        <span>
          {match.address} · {match.distanceKm}km away
        </span>
      </div>

      <a
        href={mapsHref}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1.5 w-full h-11 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
      >
        View on Google Maps
        <ExternalLink size={14} />
      </a>
    </div>
  );
}
