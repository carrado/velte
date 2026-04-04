"use client";

import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import {
  fetchBestSelling,
  type BestSellingProduct,
} from "@/services/dashboard";

function ProductImage() {
  return (
    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
      <div className="w-5 h-5 bg-gray-300 rounded" />
    </div>
  );
}

function StatusBadge({ status }: { status: BestSellingProduct["status"] }) {
  if (status === "Stock") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] inline-block" />
        <span className="text-xs text-[#22C55E] font-medium">Stock</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] inline-block" />
      <span className="text-xs text-[#EF4444] font-medium">Stock out</span>
    </div>
  );
}

export default function BestSellingProducts() {
  const { data, isLoading } = useQuery<BestSellingProduct[]>({
    queryKey: ["bestSelling"],
    queryFn: fetchBestSelling,
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#111827]">
          Best selling product
        </h3>
        <button className="flex items-center gap-2 bg-orange-500 text-white rounded-lg px-4 py-2 text-xs font-medium hover:bg-orange-600 transition-colors cursor-pointer">
          <SlidersHorizontal size={13} />
          Filter
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-orange-50 rounded-lg">
              <th className="text-left py-2.5 px-3 text-orange-700 font-semibold rounded-l-lg">
                PRODUCT
              </th>
              <th className="text-left py-2.5 px-3 text-orange-700 font-semibold">
                TOTAL ORDER
              </th>
              <th className="text-left py-2.5 px-3 text-orange-700 font-semibold">
                STATUS
              </th>
              <th className="text-right py-2.5 px-3 text-orange-700 font-semibold rounded-r-lg">
                PRICE
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#E5E7EB] animate-pulse"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-gray-200 rounded-lg" />
                        <div className="h-3 bg-gray-200 rounded w-20" />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-3 bg-gray-200 rounded w-8" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-3 bg-gray-200 rounded w-14" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="h-3 bg-gray-200 rounded w-12 ml-auto" />
                    </td>
                  </tr>
                ))
              : (data ?? []).map((product, index) => (
                  <tr
                    key={product.id}
                    className={`border-b border-[#E5E7EB] last:border-0 hover:bg-gray-50 transition-colors ${
                      index === 0 ? "mt-1" : ""
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <ProductImage />
                        <span className="font-medium text-[#111827]">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#6B7280]">
                      {product.totalOrder}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#111827]">
                      ${product.price}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-4">
        <button className="text-xs border border-[#E5E7EB] rounded-full px-4 py-1.5 text-[#6B7280] hover:border-orange-500 hover:text-orange-500 transition-colors cursor-pointer">
          Details
        </button>
      </div>
    </div>
  );
}
