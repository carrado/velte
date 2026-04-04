"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { fetchTopProducts, type TopProduct } from "@/services/dashboard";

function ProductImage() {
  return (
    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
      <div className="w-6 h-6 bg-gray-300 rounded" />
    </div>
  );
}

export default function TopProducts() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<TopProduct[]>({
    queryKey: ["topProducts"],
    queryFn: fetchTopProducts,
  });

  const filtered = (data ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#111827]">Top Products</h3>
        <button className="text-xs text-orange-500 hover:underline cursor-pointer">
          All product
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] bg-gray-50 text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {/* Product list */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-12" />
              </div>
            ))
          : filtered.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-colors"
              >
                <ProductImage />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#111827] truncate">
                    {product.name}
                  </p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Item: {product.sku}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#111827] flex-shrink-0">
                  ${product.price.toFixed(2)}
                </span>
              </div>
            ))}
      </div>
    </div>
  );
}
