"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPopularByHour } from "@/services/dashboard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Clock } from "lucide-react";

export default function PopularByTimeOfDay() {
  const { data, isLoading } = useQuery({
    queryKey: ["popularByHour"],
    queryFn: fetchPopularByHour,
  });

  const maxCount = data ? Math.max(...data.map((d) => d.count)) : 0;
  const peaks = data?.filter((d) => d.label) ?? [];

  return (
    <div className="bg-white sm:rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Clock size={14} className="text-orange-500" />
        </div>
        <div>
          <h3 className="text-dash-heading font-bold text-[#023337]">
            Popular Hours
          </h3>
          <p className="text-dash-caption text-gray-400">
            Order volume by time of day
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-3">
        {isLoading || !data ? (
          <div className="h-44 animate-pulse bg-gray-100 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} barCategoryGap="25%">
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  fontSize: 12,
                }}
                labelStyle={{ fontWeight: 600, color: "#023337" }}
                formatter={(value: number) => [`${value} orders`, ""]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.count === maxCount ? "#f97316" : "#fed7aa"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {peaks.length > 0 && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            {peaks.map((d) => (
              <div key={d.hour} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                <span className="text-dash-caption text-gray-500 font-medium">
                  {d.hour}: {d.label} Rush
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
