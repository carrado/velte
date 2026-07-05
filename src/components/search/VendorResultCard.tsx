/* eslint-disable @next/next/no-img-element */
import { MapPin, ShieldCheck, Store as StoreIcon } from "lucide-react";
import { fmt } from "@/lib/product-price";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import type { VendorMatch } from "@/types/search";

export function VendorResultCard({ match }: { match: VendorMatch }) {
  const symbol = match.currency === "USD" ? "$" : "₦";
  const isRange = match.priceMax != null && match.priceMax > match.price;

  const chatHref = match.whatsapp
    ? `https://wa.me/${match.whatsapp}?text=${encodeURIComponent(
        `Hi ${match.vendorName}! I'm interested in your "${match.name}" — I found you on Velte.`,
      )}`
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        {match.mainImageUrl ? (
          <img
            src={match.mainImageUrl}
            alt={match.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <StoreIcon size={28} className="text-gray-300" />
        )}
      </div>
      <div className="p-4 space-y-2.5">
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.5em]">
          {match.name}
        </p>
        <p className="text-[15px] font-extrabold text-[#023337]">
          {fmt(match.price, symbol)}
          {isRange && (
            <>
              <span className="mx-1 text-sm font-normal text-gray-400">–</span>
              {fmt(match.priceMax!, symbol)}
            </>
          )}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">
            {match.area ??
              match.state ??
              (match.distanceKm != null ? "Nearby" : "Nigeria")}
            {match.distanceKm != null && ` · ${match.distanceKm}km away`}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1 text-xs text-gray-500 min-w-0">
            <ShieldCheck size={13} className="shrink-0 text-orange-500" />
            <span className="truncate">{match.vendorName}</span>
          </div>
        </div>
        {chatHref && (
          <WhatsAppButton
            href={chatHref}
            label="Chat with vendor"
            className="w-full mt-1"
          />
        )}
      </div>
    </div>
  );
}
