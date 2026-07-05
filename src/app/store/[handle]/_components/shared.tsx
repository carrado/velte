/* eslint-disable @next/next/no-img-element */
import { MessageCircle, Store as StoreIcon, Wrench } from "lucide-react";
import { fmt } from "@/lib/product-price";
import type {
  PublicStoreProduct,
  PublicStoreProductProps,
  ServiceCardProps,
} from "@/types/store";

// Shared, non-interactive pieces used by both the server page (header CTAs,
// Intro sidebar) and the client StoreTabs component (catalog panels).

/** A listing prices as a range when it carries a `priceMax` above `price`. */
function isRange(product: PublicStoreProduct): boolean {
  return product.priceMax != null && product.priceMax > product.price;
}

export function Price({ product }: PublicStoreProductProps) {
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

export function ProductCard({ product }: PublicStoreProductProps) {
  return (
    <div className="group min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        {product.mainImageUrl ? (
          <img
            src={product.mainImageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
          />
        ) : (
          <StoreIcon size={28} className="text-gray-300" />
        )}
      </div>
      <div className="px-3.5 py-3">
        <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 min-h-[2.5em]">
          {product.name}
        </p>
        <div className="mt-1.5">
          <Price product={product} />
        </div>
      </div>
    </div>
  );
}

export function ServiceCard({
  product,
  storeName,
  whatsapp,
}: ServiceCardProps) {
  const enquireHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        `Hi ${storeName}! I'm interested in your "${product.name}" service. I found you on Velte.`,
      )}`
    : null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex gap-3.5">
        {product.mainImageUrl ? (
          <img
            src={product.mainImageUrl}
            alt={product.name}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Wrench size={22} className="text-orange-500" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800 leading-snug">
            {product.name}
          </p>
          {product.description && (
            <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2 mt-1">
              {product.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
        <Price product={product} />
        {enquireHref && (
          <a
            href={enquireHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-[13px] font-semibold rounded-lg transition-colors"
          >
            <MessageCircle size={14} />
            Enquire
          </a>
        )}
      </div>
    </div>
  );
}
