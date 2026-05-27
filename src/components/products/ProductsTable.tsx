"use client";

import { cn } from "@/lib/utils";
import { getAvailableStock } from "@/services/products";
import { computePrice, fmt } from "@/lib/product-price";
import type { ProductsTableProps } from "@/types/product";
import type { CategoryProduct } from "@/types/product";
import ProductActionsPopover from "./ProductActionsPopover";
import { Star, Clock, Package } from "lucide-react";

function ProductCard({
  product,
  isFood,
  onRestock,
  onChangePrice,
  onDelete,
}: {
  product: CategoryProduct;
  isFood: boolean;
  onRestock: () => void;
  onChangePrice: () => void;
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
          {pricing.isNegotiable ? (
            <p className="text-dash-heading font-black text-orange-500">
              {fmt(pricing.minFinalPrice!, pricing.currencySymbol)}{" "}
              <span className="text-gray-400 font-medium">–</span>{" "}
              {fmt(pricing.finalPrice, pricing.currencySymbol)}
            </p>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <p className="text-dash-heading font-black text-orange-500">
                {fmt(pricing.finalPrice, pricing.currencySymbol)}
              </p>
              {pricing.hasDiscount && (
                <span className="text-dash-caption text-gray-400 line-through">
                  {fmt(pricing.basePrice, pricing.currencySymbol)}
                </span>
              )}
            </div>
          )}

          {/* Breakdown */}
          {(pricing.hasDiscount || pricing.hasTax || pricing.isNegotiable) && (
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {pricing.hasDiscount && (
                <span className="text-dash-caption text-green-600 font-medium">
                  −{fmt(pricing.discountAmount!, pricing.currencySymbol)} off
                </span>
              )}
              {pricing.hasTax && (
                <span className="text-dash-caption text-gray-400">
                  {product.taxType === "percentage"
                    ? `+${product.taxValue}% tax`
                    : `+${fmt(pricing.taxAmount, pricing.currencySymbol)} tax`}
                </span>
              )}
              {pricing.isNegotiable && (
                <span className="text-dash-caption text-blue-500 font-medium">
                  Negotiable
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
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
          {product.featured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-dash-caption font-semibold bg-amber-100 text-amber-700">
              <Star size={9} className="fill-amber-500 text-amber-500" />{" "}
              Featured
            </span>
          )}
          {product.onSale && available > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-dash-caption font-semibold bg-blue-100 text-blue-700">
              On Sale
            </span>
          )}
          {product.estimatedPrepMins != null && (
            <span className="flex items-center gap-0.5 text-dash-caption text-gray-400 ml-auto">
              <Clock size={10} /> {product.estimatedPrepMins}m
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
        {isFood ? "No dishes found." : "No products found."}
      </p>
    </div>
  );
}

export default function ProductsTable({
  products,
  rowOffset = 0,
  onRestock,
  onChangePrice,
  onDelete,
  isFood = false,
}: ProductsTableProps) {
  if (products.length === 0) return <EmptyState isFood={isFood} />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isFood={isFood}
          onRestock={() => onRestock(product)}
          onChangePrice={() => onChangePrice(product)}
          onDelete={() => onDelete(product)}
        />
      ))}
    </div>
  );
}
