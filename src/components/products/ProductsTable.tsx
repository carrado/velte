"use client";

import { cn } from "@/lib/utils";
import { getAvailableStock } from "@/services/products";
import type { ProductsTableProps } from "@/types/product";
import type { CategoryProduct } from "@/types/product";
import ProductActionsPopover from "./ProductActionsPopover";
import { Star, Clock, Package } from "lucide-react";

function StockBadge({ available }: { available: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-dash-caption font-semibold",
        available > 0
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700",
      )}
    >
      {available > 0 ? `${available} in stock` : "Out of stock"}
    </span>
  );
}

function FoodCard({
  product,
  onRestock,
  onChangePrice,
  onDelete,
}: {
  product: CategoryProduct;
  onRestock: () => void;
  onChangePrice: () => void;
  onDelete: () => void;
}) {
  const available = getAvailableStock(product);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-dash-heading flex-shrink-0",
              product.colorClass,
            )}
          >
            {product.name.charAt(0)}
          </div>
          <ProductActionsPopover
            product={product}
            onRestock={onRestock}
            onChangePrice={onChangePrice}
            onDelete={onDelete}
          />
        </div>

        <p className="text-dash-body font-bold text-[#023337] mb-0.5 line-clamp-2">
          {product.name}
        </p>
        <p className="text-dash-heading font-black text-orange-500 mb-3">
          ₦{product.price.toLocaleString("en-NG")}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-dash-caption font-semibold",
              available > 0
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700",
            )}
          >
            {available > 0 ? "Available" : "Not Available"}
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

  if (isFood) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
        {products.map((product) => (
          <FoodCard
            key={product.id}
            product={product}
            onRestock={() => onRestock(product)}
            onChangePrice={() => onChangePrice(product)}
            onDelete={() => onDelete(product)}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="text-left px-5 py-3 text-dash-caption font-semibold text-gray-400 uppercase tracking-wider w-10">
                #
              </th>
              <th className="text-left px-4 py-3 text-dash-caption font-semibold text-gray-400 uppercase tracking-wider">
                Product
              </th>
              <th className="text-center px-4 py-3 text-dash-caption font-semibold text-gray-400 uppercase tracking-wider">
                Date Added
              </th>
              <th className="text-center px-4 py-3 text-dash-caption font-semibold text-gray-400 uppercase tracking-wider">
                Total Qty
              </th>
              <th className="text-center px-4 py-3 text-dash-caption font-semibold text-gray-400 uppercase tracking-wider">
                Stock
              </th>
              <th className="text-center px-4 py-3 text-dash-caption font-semibold text-gray-400 uppercase tracking-wider">
                Sold
              </th>
              <th className="text-right px-5 py-3 text-dash-caption font-semibold text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((p, i) => {
              const available = getAvailableStock(p);
              return (
                <tr
                  key={p.id}
                  className="hover:bg-orange-50/20 transition-colors"
                >
                  <td className="px-5 py-4 text-dash-caption text-gray-400 font-medium">
                    {rowOffset + i + 1}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-dash-body text-white flex-shrink-0",
                          p.colorClass,
                        )}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-dash-body font-semibold text-[#023337]">
                          {p.name}
                        </p>
                        <p className="text-dash-caption font-bold text-orange-500">
                          ₦{p.price.toLocaleString("en-NG")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center text-dash-body text-gray-500">
                    {p.createdDate}
                  </td>
                  <td className="px-4 py-4 text-center text-dash-body font-medium text-[#023337]">
                    {p.totalQuantity}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <StockBadge available={available} />
                  </td>
                  <td className="px-4 py-4 text-center text-dash-body text-gray-500">
                    {p.orderedQuantity}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <ProductActionsPopover
                      product={p}
                      onRestock={() => onRestock(p)}
                      onChangePrice={() => onChangePrice(p)}
                      onDelete={() => onDelete(p)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="sm:hidden divide-y divide-gray-100">
        {products.map((p) => {
          const available = getAvailableStock(p);
          return (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-black text-dash-body text-white flex-shrink-0",
                  p.colorClass,
                )}
              >
                {p.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-dash-body font-semibold text-[#023337] truncate">
                  {p.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-dash-caption font-bold text-orange-500">
                    ₦{p.price.toLocaleString("en-NG")}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-dash-caption font-semibold",
                      available > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700",
                    )}
                  >
                    {available > 0 ? `${available} in stock` : "Out of stock"}
                  </span>
                </div>
              </div>
              <ProductActionsPopover
                product={p}
                onRestock={() => onRestock(p)}
                onChangePrice={() => onChangePrice(p)}
                onDelete={() => onDelete(p)}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
