/* eslint-disable @next/next/no-img-element */
import {
  MessageCircle,
  Package,
  Store as StoreIcon,
  Wrench,
} from "lucide-react";
import { fmt } from "@/lib/product-price";
import { optimizedImageUrl } from "@/lib/cloudinary";
import type {
  PublicStoreProduct,
  PublicStoreProductProps,
} from "@/types/store";

// Shared, non-interactive pieces used by both the server page (header CTAs,
// Intro sidebar) and the client StoreTabs component (catalog panels).

/** A listing prices as a range when it carries a `priceMax` above `price`. */
function isRange(product: PublicStoreProduct): boolean {
  return product.priceMax != null && product.priceMax > product.price;
}

export function Price({ product }: { product: PublicStoreProduct }) {
  const symbol = product.currency === "USD" ? "$" : "₦";
  if (product.quoteOnRequest)
    return (
      <p className="text-[15px] font-extrabold text-[#023337]">
        Contact for quote
      </p>
    );
  return (
    <p className="text-[15px] font-extrabold text-[#023337]">
      {fmt(product.price / 100, symbol)}
      {isRange(product) && (
        <>
          <span className="mx-1 text-sm font-normal text-gray-400">–</span>
          {fmt(product.priceMax! / 100, symbol)}
        </>
      )}
    </p>
  );
}

// Social-post-style card: a big image "post" up top, caption (name, price,
// description) below, then an action row — the same shape for a product or
// a service, differing only in the kind label/icon and the WhatsApp copy.
export function OfferingCard({
  product,
  storeName,
  whatsapp,
}: PublicStoreProductProps) {
  const isService = product.kind === "service";
  const KindIcon = isService ? Wrench : Package;
  const enquireHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        isService
          ? `Hi ${storeName}! I'm interested in your "${product.name}" service. I found you on Velte.`
          : `Hi ${storeName}! Is "${product.name}" still available? I found you on Velte.`,
      )}`
    : null;

  return (
    <div className="bg-white border rounded-2xl border-gray-100 shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <div className="relative w-full aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
        {product.mainImageUrl ? (
          <img
            src={optimizedImageUrl(product.mainImageUrl)}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <StoreIcon size={30} className="text-gray-300" />
        )}
        <span className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full">
          <KindIcon size={11} />
          {isService ? "Service" : "Product"}
        </span>
      </div>

      <div className="p-3 sm:p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-w-0">
            {product.name}
          </p>
        </div>
        {product.description && (
          <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2">
            {product.description}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-gray-100">
          <Price product={product} />
          {enquireHref && (
            <a
              href={enquireHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-[12px] sm:text-[13px] font-semibold rounded-lg transition-colors shrink-0"
            >
              <MessageCircle size={13} />
              Enquire
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
