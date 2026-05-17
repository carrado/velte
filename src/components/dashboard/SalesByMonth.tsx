"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, TrendingUp, TrendingDown } from "lucide-react";
import { fetchSalesByMonths, MonthlySale } from "@/services/dashboard";

// ── Month Row ─────────────────────────────────────────────────────────────────

const maxSales = 30000;

function MonthRow({ item }: { item: MonthlySale }) {
  const widthPercent = Math.round((item.sales / maxSales) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-dash-body text-[#111827] font-medium">
          {item.month}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-dash-body font-semibold text-[#111827]">
            ${(item.sales / 1000).toFixed(0)}k
          </span>
          <div
            className={`flex items-center gap-0.5 text-dash-secondary font-medium ${
              item.positive ? "text-orange-500" : "text-[#EF4444]"
            }`}
          >
            {item.positive ? (
              <TrendingUp size={11} />
            ) : (
              <TrendingDown size={11} />
            )}
            <span>
              {item.positive ? "+" : ""}
              {item.change}%
            </span>
          </div>
        </div>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${widthPercent}%`, backgroundColor: "#8B5CF6" }}
        />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SalesByMonth() {
  const { data, isLoading } = useQuery<MonthlySale[]>({
    queryKey: ["monthlySales"],
    queryFn: fetchSalesByMonths,
  });

  return (
    <div className="bg-white sm:rounded-2xl shadow-sm p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-dash-heading font-semibold text-[#111827]">
            Sales – Last 3 Months
          </h3>
          <span className="text-dash-micro bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">
            Sales
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger>
            <Info
              size={15}
              className="text-[#9CA3AF] cursor-pointer hover:text-orange-400 transition-colors"
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-center">
            <p>
              A month-by-month breakdown of your total sales revenue over the
              last 3 months, with percentage change vs. the prior month.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse flex-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-1.5 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 flex-1">
          {(data ?? []).map((item) => (
            <MonthRow key={item.month} item={item} />
          ))}
        </div>
      )}

      <button className="mt-4 w-full text-dash-body border border-[#E5E7EB] rounded-full py-2 text-[#6B7280] hover:border-orange-500 hover:text-orange-500 transition-colors cursor-pointer">
        View More
      </button>
    </div>
  );
}
