"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchFoodDashboardStats } from "@/services/dashboard";
import {
  Timer,
  TrendingUp,
  TrendingDown,
  ChefHat,
  CheckCircle2,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

function SkeletonCard() {
  return (
    <div className="bg-white sm:rounded-2xl shadow-sm p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

export default function FoodStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["foodDashboardStats"],
    queryFn: fetchFoodDashboardStats,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const cards: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    note: string;
    trend?: { value: number; positiveIsGood: boolean };
  }[] = [
    {
      title: "Avg Prep Time",
      value: `${data.avgPrepMins.value} min`,
      icon: Timer,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
      note: `${Math.abs(data.avgPrepMins.change)} min vs last week`,
      trend: { value: data.avgPrepMins.change, positiveIsGood: false },
    },
    {
      title: "Orders Today",
      value: data.ordersToday.value,
      icon: Package,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      note: `${data.ordersToday.growth > 0 ? "+" : ""}${data.ordersToday.growth}% vs yesterday`,
      trend: { value: data.ordersToday.growth, positiveIsGood: true },
    },
    {
      title: "In Preparation",
      value: data.ordersInPrep.value,
      icon: ChefHat,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      note: "Active orders right now",
    },
    {
      title: "Completion Rate",
      value: `${data.completionRate.percentage}%`,
      icon: CheckCircle2,
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
      note: "Last 7 days",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(
        ({ title, value, icon: Icon, iconBg, iconColor, note, trend }) => {
          const isPositive = trend
            ? trend.positiveIsGood
              ? trend.value > 0
              : trend.value < 0
            : true;

          return (
            <div key={title} className="bg-white sm:rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-dash-body font-semibold text-[#111827]">
                  {title}
                </p>
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center",
                    iconBg,
                  )}
                >
                  <Icon size={15} className={iconColor} />
                </div>
              </div>
              <p className="text-dash-display font-bold text-[#111827] mb-1">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
              {trend ? (
                <div className="flex items-center gap-1 text-dash-secondary">
                  {isPositive ? (
                    <TrendingUp size={12} className="text-green-500" />
                  ) : (
                    <TrendingDown size={12} className="text-red-500" />
                  )}
                  <span
                    className={cn(
                      "font-medium",
                      isPositive ? "text-green-500" : "text-red-500",
                    )}
                  >
                    {note}
                  </span>
                </div>
              ) : (
                <p className="text-dash-secondary text-[#6B7280]">{note}</p>
              )}
            </div>
          );
        },
      )}
    </div>
  );
}
