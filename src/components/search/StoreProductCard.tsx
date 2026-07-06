/* eslint-disable @next/next/no-img-element */
import { Store as StoreIcon } from "lucide-react";
import { fmt } from "@/lib/product-price";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { reportLead } from "@/lib/reportLead";
import type { StoreProductItem } from "@/types/search";

// One item from getVendorProductsTool — a SPECIFIC, already-identified
// store's own catalog, shown under a section header naming that store
// (see SearchHome.tsx), so unlike VendorResultCard there's no per-card
// vendor name/distance to repeat — every card in the section is the same
// store, just with a different item.
export function StoreProductCard({
  match,
  storeName,
  storeWhatsapp,
  vendorId,
}: {
  match: StoreProductItem;
  storeName: string;
  storeWhatsapp: string | null;
  vendorId: string;
}) {
  const symbol = match.currency === "USD" ? "$" : "₦";
  const isRange = match.priceMax != null && match.priceMax > match.price;

  const chatHref = storeWhatsapp
    ? `https://wa.me/${storeWhatsapp}?text=${encodeURIComponent(
        `Hi ${storeName}! I'm interested in your "${match.name}" — I found you on Velte.`,
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
        {match.quoteOnRequest ? (
          <p className="text-[15px] font-extrabold text-[#023337]">
            Ask for price
          </p>
        ) : (
          <p className="text-[15px] font-extrabold text-[#023337]">
            {fmt(match.price, symbol)}
            {isRange && (
              <>
                <span className="mx-1 text-sm font-normal text-gray-400">
                  –
                </span>
                {fmt(match.priceMax!, symbol)}
              </>
            )}
          </p>
        )}
        {chatHref && (
          <WhatsAppButton
            href={chatHref}
            label="Chat about this"
            className="w-full mt-1"
            onClick={() => reportLead(vendorId, match.productId)}
          />
        )}
      </div>
    </div>
  );
}
