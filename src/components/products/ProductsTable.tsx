"use client";

import { cn } from "@/lib/utils";
import { computePrice, fmt } from "@/lib/product-price";
import type { ProductsTableProps } from "@/types/product";
import type { CategoryProduct } from "@/types/product";
import ProductActionsPopover from "./ProductActionsPopover";
import { Star, Package, Plus, SearchX } from "lucide-react";

// Small, local, and deliberately coarse — a card caption, not a precise
// audit timestamp, so a handful of thresholds is enough (same spirit as
// product-price.ts's fmt()). Returns null on anything unparseable so the
// caller can just omit the line rather than ever showing "Invalid date".
function timeAgo(dateStr: string): string | null {
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  if (diffMs < 0) return null;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return mins <= 1 ? "Added just now" : `Added ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Added ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Added ${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Added ${months}mo ago`;
  return `Added ${Math.floor(months / 12)}y ago`;
}

function ProductCard({
  product,
  isFood,
  onChangePrice,
  onSwitchToQuote,
  onDelete,
}: {
  product: CategoryProduct;
  isFood: boolean;
  onChangePrice: () => void;
  onSwitchToQuote: () => void;
  onDelete: () => void;
}) {
  const pricing = computePrice(product);
  const posted = timeAgo(product.createdDate);

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <div className="relative w-full aspect-square overflow-hidden bg-gray-50">
        {product.mainImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.mainImageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className={cn(
              "w-full h-full flex flex-col items-center justify-center gap-1 text-white",
              product.colorClass,
            )}
          >
            <span className="font-black text-4xl leading-none">
              {product.name.charAt(0)}
            </span>
            <Package size={14} className="text-white/70" />
          </div>
        )}

        {/* Bottom scrim so the status badges stay legible over any photo */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/35 to-transparent" />

        <div className="absolute bottom-2 left-2 z-20 flex flex-wrap items-center gap-1.5">
          {product.kind === "service" ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-dash-caption font-semibold bg-white/90 text-teal-700 backdrop-blur-sm">
              Service
            </span>
          ) : isFood ? (
            // A dish's real signal is isCurrentlyAvailable (never a stock
            // quantity, which this listing type never had anyway).
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-dash-caption font-semibold backdrop-blur-sm",
                product.isCurrentlyAvailable === false
                  ? "bg-white/90 text-red-700"
                  : "bg-white/90 text-green-700",
              )}
            >
              {product.isCurrentlyAvailable === false
                ? "Not Available"
                : "Available"}
            </span>
          ) : null}
          {product.featured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-dash-caption font-semibold bg-amber-400 text-white">
              <Star size={9} className="fill-white text-white" />
              Featured
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 z-20">
          <ProductActionsPopover
            product={product}
            isFood={isFood}
            onChangePrice={onChangePrice}
            onSwitchToQuote={onSwitchToQuote}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <p className="text-dash-body font-bold text-[#023337] mb-1.5 line-clamp-2 min-h-[2.5em]">
          {product.name}
        </p>

        {pricing.quoteOnRequest ? (
          <p className="text-dash-heading font-black text-orange-500">
            Contact for quote
          </p>
        ) : pricing.isRange ? (
          <p className="text-dash-heading font-black text-orange-500">
            {fmt(pricing.price, pricing.currencySymbol)}{" "}
            <span className="text-gray-400 font-medium">–</span>{" "}
            {fmt(pricing.priceMax!, pricing.currencySymbol)}
          </p>
        ) : (
          <p className="text-dash-heading font-black text-orange-500">
            {fmt(pricing.price, pricing.currencySymbol)}
          </p>
        )}

        {posted && (
          <p className="text-dash-caption text-gray-400 mt-1">{posted}</p>
        )}
      </div>
    </div>
  );
}

// Mobile-only list row — a 2-column grid of square-image cards left every
// listing too narrow to fit name + price + badges + a tap target for the
// menu without feeling clustered (found live: user feedback on a phone
// screen). This trades photo prominence for a layout that actually scans
// on a narrow screen — one listing per row, thumbnail left, everything
// else right — the same shape WhatsApp Business/Shopify's own mobile
// catalog lists use. Desktop/tablet keep the richer photo-forward grid
// below (see the `hidden sm:grid` / `sm:hidden` split in ProductsTable).
function ProductRow({
  product,
  isFood,
  onChangePrice,
  onSwitchToQuote,
  onDelete,
}: {
  product: CategoryProduct;
  isFood: boolean;
  onChangePrice: () => void;
  onSwitchToQuote: () => void;
  onDelete: () => void;
}) {
  const pricing = computePrice(product);

  return (
    <div className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors">
      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
        {product.mainImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.mainImageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "w-full h-full flex items-center justify-center text-white font-black text-lg",
              product.colorClass,
            )}
          >
            {product.name.charAt(0)}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-dash-body font-semibold text-[#023337] truncate">
          {product.name}
        </p>

        {pricing.quoteOnRequest ? (
          <p className="text-dash-body font-bold text-orange-500 mt-0.5">
            Contact for quote
          </p>
        ) : pricing.isRange ? (
          <p className="text-dash-body font-bold text-orange-500 mt-0.5">
            {fmt(pricing.price, pricing.currencySymbol)}{" "}
            <span className="text-gray-400 font-medium">–</span>{" "}
            {fmt(pricing.priceMax!, pricing.currencySymbol)}
          </p>
        ) : (
          <p className="text-dash-body font-bold text-orange-500 mt-0.5">
            {fmt(pricing.price, pricing.currencySymbol)}
          </p>
        )}

        {(product.kind === "service" || isFood || product.featured) && (
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {product.kind === "service" ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-dash-caption font-semibold bg-teal-50 text-teal-700">
                Service
              </span>
            ) : isFood ? (
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-dash-caption font-semibold",
                  product.isCurrentlyAvailable === false
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700",
                )}
              >
                {product.isCurrentlyAvailable === false
                  ? "Not Available"
                  : "Available"}
              </span>
            ) : null}
            {product.featured && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-dash-caption font-semibold bg-amber-50 text-amber-700">
                <Star size={9} className="fill-amber-500 text-amber-500" />
                Featured
              </span>
            )}
          </div>
        )}
      </div>

      <ProductActionsPopover
        product={product}
        isFood={isFood}
        onChangePrice={onChangePrice}
        onSwitchToQuote={onSwitchToQuote}
        onDelete={onDelete}
      />
    </div>
  );
}

function EmptyState({
  hasActiveSearch,
  onAddListing,
}: {
  hasActiveSearch: boolean;
  onAddListing?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
        {hasActiveSearch ? (
          <SearchX size={24} className="text-gray-300" />
        ) : (
          <Package size={24} className="text-gray-300" />
        )}
      </div>
      <div>
        <p className="text-dash-body font-semibold text-gray-500">
          {hasActiveSearch
            ? "No listings match your search"
            : "No listings yet"}
        </p>
        <p className="text-dash-caption text-gray-400 mt-0.5">
          {hasActiveSearch
            ? "Try a different name or clear the search."
            : "Once you add a product or service, it'll show up here."}
        </p>
      </div>
      {!hasActiveSearch && onAddListing && (
        <button
          onClick={onAddListing}
          className="mt-1 flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-dash-caption font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <Plus size={14} />
          Add your first listing
        </button>
      )}
    </div>
  );
}

export default function ProductsTable({
  products,
  onChangePrice,
  onSwitchToQuote,
  onDelete,
  isFood = false,
  hasActiveSearch = false,
  onAddListing,
}: ProductsTableProps) {
  if (products.length === 0)
    return (
      <EmptyState
        hasActiveSearch={hasActiveSearch}
        onAddListing={onAddListing}
      />
    );

  return (
    <>
      {/* Mobile: one listing per row — see ProductRow's own comment for why
          a narrow grid card doesn't work here. */}
      <div className="sm:hidden divide-y divide-gray-100">
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            isFood={isFood}
            onChangePrice={() => onChangePrice(product)}
            onSwitchToQuote={() => onSwitchToQuote(product)}
            onDelete={() => onDelete(product)}
          />
        ))}
      </div>

      {/* Tablet/desktop: the photo-forward card grid. */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-5">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isFood={isFood}
            onChangePrice={() => onChangePrice(product)}
            onSwitchToQuote={() => onSwitchToQuote(product)}
            onDelete={() => onDelete(product)}
          />
        ))}
      </div>
    </>
  );
}
