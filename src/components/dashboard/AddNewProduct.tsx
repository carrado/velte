"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchAddableProducts,
  type AddableProduct,
} from "@/services/dashboard";

function ProductRow({ product }: { product: AddableProduct }) {
  return (
    <div className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <div className="w-5 h-5 bg-gray-300 rounded" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#111827] truncate">
          {product.name}
        </p>
        <p className="text-[11px] text-[#9CA3AF]">
          ${product.price.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

export default function AddNewProduct() {
  const { data: products, isLoading: prodLoading } = useQuery<AddableProduct[]>(
    {
      queryKey: ["addableProducts"],
      queryFn: fetchAddableProducts,
    },
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#111827]">
          Add New Product
        </h3>
        <button className="text-xs text-orange-500 hover:underline cursor-pointer font-medium">
          + Add New
        </button>
      </div>

      {/* Products */}
      <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
        Product
      </p>

      {prodLoading ? (
        <div className="space-y-2 animate-pulse mb-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-0.5 mb-2">
          {(products ?? []).map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </div>
      )}

      <button className="text-xs text-blue-500 hover:underline cursor-pointer">
        See more
      </button>
    </div>
  );
}
