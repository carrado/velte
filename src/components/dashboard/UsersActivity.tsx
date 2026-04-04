"use client";

import { useQuery } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Cell } from "recharts";
import {
  fetchUsersActivity,
  type UsersActivity as UsersActivityData,
} from "@/services/dashboard";

export default function UsersActivity() {
  const { data, isLoading } = useQuery<UsersActivityData>({
    queryKey: ["usersActivity"],
    queryFn: fetchUsersActivity,
  });

  const chartData = (data?.perMinute ?? []).map((v, i) => ({
    id: i,
    value: v,
  }));
  const total = data?.total ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-orange-500 font-medium">
          Today's User Activity
        </p>
        <MoreVertical size={16} className="text-[#9CA3AF]" />
      </div>

      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-7 bg-gray-200 rounded w-24 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-28 mb-3" />
          <div className="h-[60px] bg-gray-100 rounded" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-[#111827]">
            {(total / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-[#9CA3AF] mb-3">Users</p>
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={chartData} barSize={6} barGap={2}>
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      index === chartData.length - 1 ? "#EA580C" : "#F97316"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
