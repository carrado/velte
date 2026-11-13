import { ProtectedImage } from "@/components/ProtectedImage";
import { fmt } from "@/lib/product-price";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { OwnListingBadge } from "@/components/search/OwnListingBadge";
import { useUserStore } from "@/store/userStore";
import { buildChatLink } from "@/lib/chatLink";
import type { StoreProductItem } from "@/types/search";
import { StoreIcon } from "@/components/icons/hero";

// One item from getVendorProductsTool — a SPECIFIC, already-identified
// store's own catalog, shown under a section header naming that store
// (see SearchHome.tsx), so unlike VendorResultCard there's no per-card
// vendor name/distance to repeat — every card in the section is the same
// store, just with a different item.
export function StoreProductCard({
  match,
  storeName,
  vendorId,
  isEnterprise = false,
}: {
  match: StoreProductItem;
  storeName: string;
  vendorId: string;
  isEnterprise?: boolean;
}) {
  const symbol = match.currency === "USD" ? "$" : "₦";
  const isRange = match.priceMax != null && match.priceMax > match.price;
  // A logged-in vendor browsing their own store's catalog — no WhatsApp CTA
  // to themselves (which would also bill them a lead), just say so.
  const currentUserId = useUserStore((s) => s.user?.id);
  const isOwn = currentUserId != null && currentUserId === vendorId;

  const chatHref = isEnterprise
    ? buildChatLink({
        vendorId,
        productId: match.mainImageUrl ? match.productId : undefined,
        source: "search",
        message: `Hi ${storeName}! I'm interested in your "${match.name}" — I found you on Velte.`,
      })
    : null;

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        {match.mainImageUrl ? (
          <ProtectedImage
            src={optimizedImageUrl(match.mainImageUrl)}
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
          <p className="text-[15px] font-extrabold text-ink">Ask for price</p>
        ) : (
          <p className="text-[15px] font-extrabold text-ink">
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
        {isOwn ? (
          <OwnListingBadge label="This is your listing" />
        ) : match.checkoutEligible ? (
          <AddToCartButton
            productId={match.productId}
            vendorId={vendorId}
            vendorName={storeName}
            name={match.name}
            imageUrl={match.mainImageUrl}
            unitPrice={match.price}
            className="mt-1"
          />
        ) : (
          chatHref && (
            <WhatsAppButton
              href={chatHref}
              label="Chat about this"
              className="w-full mt-1"
            />
          )
        )}
      </div>
    </div>
  );
}
