"use client";

import { cn } from "@/lib/utils";
import { getAvailableStock } from "@/services/products";
import { computePrice, fmt } from "@/lib/product-price";
import type { ProductsTableProps } from "@/types/product";
import type { CategoryProduct } from "@/types/product";
import ProductActionsPopover from "./ProductActionsPopover";
import { Star, Package } from "lucide-react";

function ProductCard({
  product,
  isFood,
  onRestock,
  onChangePrice,
  onSwitchToQuote,
  onDelete,
}: {
  product: CategoryProduct;
  isFood: boolean;
  onRestock: () => void;
  onChangePrice: () => void;
  onSwitchToQuote: () => void;
  onDelete: () => void;
}) {
  const available = getAvailableStock(product);
  const pricing = computePrice(product);

  return (
    <div className="bg-white rounded-md border border-gray-100 shadow-sm hover:shadow-md transition-all">
      {/* Product image */}
      <div className="relative w-full h-44 overflow-hidden rounded-t-md">
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
              "w-full h-full flex items-center justify-center text-white font-black text-4xl",
              product.colorClass,
            )}
          >
            {product.name.charAt(0)}
          </div>
        )}
        <div className="absolute top-2 right-2">
          <ProductActionsPopover
            product={product}
            isFood={isFood}
            onRestock={onRestock}
            onChangePrice={onChangePrice}
            onSwitchToQuote={onSwitchToQuote}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-dash-body font-bold text-[#023337] mb-1 line-clamp-2">
          {product.name}
        </p>

        {/* Price */}
        <div className="mb-3">
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

        <div className="flex flex-wrap items-center gap-1.5">
          {product.kind === "service" ? (
            // Services have no stock — a red "Out of Stock" here would be
            // misleading, so show a neutral identity badge instead.
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-dash-caption font-semibold bg-teal-50 text-teal-700">
              Service
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-dash-caption font-semibold",
                available > 0
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700",
              )}
            >
              {available > 0
                ? isFood
                  ? "Available"
                  : "In Stock"
                : isFood
                  ? "Not Available"
                  : "Out of Stock"}
            </span>
          )}
          {product.featured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-dash-caption font-semibold bg-amber-100 text-amber-700">
              <Star size={9} className="fill-amber-500 text-amber-500" />{" "}
              Featured
            </span>
          )}
        </div>
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
  rowOffset = 0,
  onRestock,
  onChangePrice,
  onSwitchToQuote,
  onDelete,
  isFood = false,
}: ProductsTableProps) {
  if (products.length === 0) return <EmptyState isFood={isFood} />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isFood={isFood}
          onRestock={() => onRestock(product)}
          onChangePrice={() => onChangePrice(product)}
          onSwitchToQuote={() => onSwitchToQuote(product)}
          onDelete={() => onDelete(product)}
        />
      ))}
    </div>
  );
}
