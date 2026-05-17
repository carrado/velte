"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, TrendingUp, TrendingDown } from "lucide-react";
import { fetchDashboardStats } from "@/services/dashboard";

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white sm:rounded-2xl shadow-sm p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: fetchDashboardStats,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const { totalSales, totalOrders, pending, canceled } = data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Card 1 — Total Sales */}
      <div className="bg-white sm:rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-dash-body font-semibold text-[#111827]">
              Total Sales
            </p>
            <p className="text-dash-caption text-[#9CA3AF]">Last 7 days</p>
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
                The total revenue generated from all completed sales in the
                selected period.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-end gap-2 mb-1">
          <span className="text-dash-display font-bold text-[#111827]">
            $350K
          </span>
          <span className="text-dash-body text-[#6B7280] mb-0.5">Sales</span>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <TrendingUp size={13} className="text-orange-500" />
          <span className="text-dash-secondary font-semibold text-orange-500">
            +{totalSales.growth}%
          </span>
        </div>
        <div className="text-dash-secondary text-[#6B7280]">
          Previous 7 days{" "}
          <span className="text-orange-500 font-medium">
            ${totalSales.previous}
          </span>
        </div>
      </div>

      {/* Card 2 — Total Orders */}
      <div className="bg-white sm:rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-dash-body font-semibold text-[#111827]">
              Total Orders
            </p>
            <p className="text-dash-caption text-[#9CA3AF]">Last 7 days</p>
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
                The total number of orders placed by customers in the selected
                period, regardless of status.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-end gap-2 mb-1">
          <span className="text-dash-display font-bold text-[#111827]">
            10.7K
          </span>
          <span className="text-dash-body text-[#6B7280] mb-0.5">order</span>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <TrendingUp size={13} className="text-orange-500" />
          <span className="text-dash-secondary font-semibold text-orange-500">
            +{totalOrders.growth}%
          </span>
        </div>
        <div className="text-dash-secondary text-[#6B7280]">
          Previous 7 days{" "}
          <span className="text-blue-500 font-medium">
            ({(totalOrders.previous / 1000).toFixed(1)}k)
          </span>
        </div>
      </div>

      {/* Card 3 — Customers */}
      <div className="bg-white sm:rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-6">
            <span className="text-dash-body font-semibold text-[#111827]">
              Total Customers
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Info
                size={15}
                className="text-[#9CA3AF] cursor-pointer hover:text-orange-400 transition-colors"
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-center">
              <p>
                The total number of customers who have placed at least one order
                on your store.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div>
          <span className="text-dash-display font-bold text-[#111827]">
            {pending.orders}
          </span>
          <p className="text-dash-secondary text-[#9CA3AF]">customers</p>
        </div>
      </div>
    </div>
  );
}
