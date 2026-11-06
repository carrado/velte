import Link from "next/link";

import { ProtectedImage } from "@/components/ProtectedImage";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { BadgeCheckIcon, StoreIcon } from "@/components/icons/hero";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { buildChatLink } from "@/lib/chatLink";
import { formatNaira } from "@/lib/utils";
import type { HubProduct } from "@/types/hub";

// One vendor upload on the Hub timeline. Price renders from the listing's own
// kobo fields; quote-on-request stays words, never a fabricated number. Chat
// rides the existing billable handoff (source "browse" — the only surfaces
// chargeLead knows are browse/search/buyer_request, and the Hub directory is
// browse in everything but the URL), suppressed on the vendor's own posts.
export function HubProductPost({
  product,
  isOwn,
}: {
  product: HubProduct;
  isOwn: boolean;
}) {
  const storeHref = product.storeHandle
    ? `/store/${product.storeHandle}`
    : null;
  const chatHref =
    !isOwn && product.vendorId
      ? buildChatLink({
          vendorId: product.vendorId,
          source: "browse",
          message: `Hi! I saw your ${product.name} on the Hub.`,
        })
      : null;
  const price = product.quoteOnRequest
    ? "Contact for quote"
    : product.priceMax
      ? `${formatNaira(product.price)} – ${formatNaira(product.priceMax)}`
      : formatNaira(product.price);

  return (
    <article className="bg-surface rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-3">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
          {product.avatar ? (
            <ProtectedImage
              src={optimizedImageUrl(product.avatar)}
              alt={product.storeName ?? product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <StoreIcon size={15} className="text-gray-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-ink truncate flex items-center gap-1">
            <span className="truncate">
              {product.storeName ?? "Velte vendor"}
            </span>
            {product.verified && (
              <BadgeCheckIcon
                size={13}
                className="text-orange-500 shrink-0 fill-orange-500/15"
              />
            )}
          </p>
          {storeHref ? (
            <Link
              href={storeHref}
              className="text-[11px] text-gray-400 hover:text-orange-600 transition-colors"
            >
              View store
            </Link>
          ) : (
            <p className="text-[11px] text-gray-400">Velte vendor</p>
          )}
        </div>
      </div>

      {product.mainImageUrl && (
        <div className="bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={optimizedImageUrl(product.mainImageUrl)}
            alt={product.name}
            className="w-full aspect-[16/10] object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-ink text-[15px] leading-snug flex-1">
            {product.name}
          </p>
          <p className="text-sm font-bold text-orange-600 shrink-0">{price}</p>
        </div>
        {product.description && (
          <p className="text-[13px] text-gray-500 leading-relaxed mt-1 line-clamp-2">
            {product.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3">
          {storeHref && (
            <Link
              href={storeHref}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              View Store
            </Link>
          )}
          {chatHref && (
            <WhatsAppButton
              href={chatHref}
              label="Chat"
              className="flex-1 !py-2 !text-xs"
            />
          )}
        </div>
      </div>
    </article>
  );
}
