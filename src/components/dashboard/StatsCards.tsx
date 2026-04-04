"use client";

import { useQuery } from "@tanstack/react-query";
import { MoreVertical, TrendingUp, TrendingDown } from "lucide-react";
import { fetchDashboardStats } from "@/services/dashboard";

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-1/3" />
    </div>
  );
}

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
      {/* Card 1: Total Sales */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-[#111827]">Total Sales</p>
            <p className="text-[11px] text-[#9CA3AF]">Last 7 days</p>
          </div>
          <MoreVertical size={16} className="text-[#9CA3AF]" />
        </div>
        <div className="flex items-end gap-2 mb-1">
          <span className="text-2xl font-bold text-[#111827]">$350K</span>
          <span className="text-sm text-[#6B7280] mb-0.5">Sales</span>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <TrendingUp size={13} className="text-orange-500" />
          <span className="text-xs font-semibold text-orange-500">
            +{totalSales.growth}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-[#6B7280]">
            Previous 7days{" "}
            <span className="text-orange-500 font-medium">
              ${totalSales.previous}
            </span>
          </div>
          <button className="text-xs border border-[#E5E7EB] rounded-full px-3 py-1 text-[#6B7280] hover:border-orange-500 hover:text-orange-500 transition-colors cursor-pointer">
            Details
          </button>
        </div>
      </div>

      {/* Card 2: Total Orders */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-[#111827]">Total Orders</p>
            <p className="text-[11px] text-[#9CA3AF]">Last 7 days</p>
          </div>
          <MoreVertical size={16} className="text-[#9CA3AF]" />
        </div>
        <div className="flex items-end gap-2 mb-1">
          <span className="text-2xl font-bold text-[#111827]">10.7K</span>
          <span className="text-sm text-[#6B7280] mb-0.5">order</span>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <TrendingUp size={13} className="text-orange-500" />
          <span className="text-xs font-semibold text-orange-500">
            +{totalOrders.growth}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-[#6B7280]">
            Previous 7days{" "}
            <span className="text-blue-500 font-medium">
              ({(totalOrders.previous / 1000).toFixed(1)}k)
            </span>
          </div>
          <button className="text-xs border border-[#E5E7EB] rounded-full px-3 py-1 text-[#6B7280] hover:border-orange-500 hover:text-orange-500 transition-colors cursor-pointer">
            Details
          </button>
        </div>
      </div>

      {/* Card 3: Pending & Canceled */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-6">
            <span className="text-sm font-semibold text-[#111827]">
              Pending
            </span>
            <span className="text-sm font-semibold text-[#EF4444]">
              Canceled
            </span>
          </div>
          <MoreVertical size={16} className="text-[#9CA3AF]" />
        </div>
        <div className="flex gap-6 mb-1">
          <div>
            <span className="text-2xl font-bold text-[#111827]">
              {pending.orders}
            </span>
            <p className="text-xs text-[#9CA3AF]">user {pending.users}</p>
          </div>
          <div className="border-l border-[#E5E7EB] pl-6">
            <span className="text-2xl font-bold text-[#EF4444]">
              {canceled.value}
            </span>
            <div className="flex items-center gap-1">
              <TrendingDown size={11} className="text-[#EF4444]" />
              <span className="text-xs font-semibold text-[#EF4444]">
                {canceled.growth}%
              </span>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button className="text-xs border border-[#E5E7EB] rounded-full px-3 py-1 text-[#6B7280] hover:border-orange-500 hover:text-orange-500 transition-colors cursor-pointer">
            Details
          </button>
        </div>
      </div>
    </div>
  );
}
