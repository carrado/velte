"use client";

import { cn } from "@/lib/utils";
import { computePrice, fmt } from "@/lib/product-price";
import type { ProductsTableProps } from "@/types/product";
import type { CategoryProduct } from "@/types/product";
import ProductActionsPopover from "./ProductActionsPopover";
import { Star, Package } from "lucide-react";

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

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      {/* Product image */}
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
              "w-full h-full flex items-center justify-center text-white font-black text-4xl",
              product.colorClass,
            )}
          >
            {product.name.charAt(0)}
          </div>
        )}

        {/* Bottom scrim so the status badges stay legible over any photo */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/35 to-transparent" />

        <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-1.5">
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

        <div className="absolute top-2 right-2">
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
      </div>
    </div>
  );
}

function EmptyState({ isFood }: { isFood: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
        <Package size={24} className="text-gray-300" />
      </div>
      <p className="text-dash-body font-semibold text-gray-400">
        {isFood ? "No dishes found." : "No listings found."}
      </p>
    </div>
  );
}

export default function ProductsTable({
  products,
  onChangePrice,
  onSwitchToQuote,
  onDelete,
  isFood = false,
}: ProductsTableProps) {
  if (products.length === 0) return <EmptyState isFood={isFood} />;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5">
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
  );
}
