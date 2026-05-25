"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchBestSelling,
  type BestSellingProduct,
} from "@/services/dashboard";
import { useIsFood } from "@/hooks/useBusinessType";

function ProductImage() {
  return (
    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
      <div className="w-5 h-5 bg-gray-300 rounded" />
    </div>
  );
}

function StatusBadge({
  status,
  isFood,
}: {
  status: BestSellingProduct["status"];
  isFood: boolean;
}) {
  if (status === "Stock") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] inline-block" />
        <span className="text-dash-caption text-[#22C55E] font-medium">
          {isFood ? "Available" : "Stock"}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] inline-block" />
      <span className="text-dash-caption text-[#EF4444] font-medium">
        {isFood ? "Unavailable" : "Stock out"}
      </span>
    </div>
  );
}

export default function BestSellingProducts() {
  const isFood = useIsFood();
  const { data, isLoading } = useQuery<BestSellingProduct[]>({
    queryKey: ["bestSelling"],
    queryFn: fetchBestSelling,
  });

  return (
    <div className="bg-white sm:rounded-2xl shadow-sm sm:p-5 py-5 px-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-dash-heading font-semibold text-[#111827]">
          {isFood ? "Most Ordered Dishes" : "Best selling product"}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-dash-caption">
          <thead>
            <tr className="bg-orange-50 rounded-lg">
              <th className="text-left py-2.5 px-3 text-orange-700 font-semibold rounded-l-lg">
                {isFood ? "MENU ITEM" : "PRODUCT"}
              </th>
              <th className="text-left py-2.5 px-3 text-orange-700 font-semibold">
                TOTAL ORDERS
              </th>
              <th className="text-left py-2.5 px-3 text-orange-700 font-semibold">
                {isFood ? "AVAILABILITY" : "STATUS"}
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
                    <td className="py-3">
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
                    <td className="py-3">
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
                      <StatusBadge status={product.status} isFood={isFood} />
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#111827]">
                      ${product.price}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
