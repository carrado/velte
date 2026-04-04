"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  fetchWeeklyReport,
  type WeeklyReportPoint,
} from "@/services/dashboard";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111827] text-white text-xs rounded-lg px-3 py-2 shadow-lg">
        <p className="font-semibold">{label}</p>
        <p>${(payload[0].value / 1000).toFixed(1)}k</p>
      </div>
    );
  }
  return null;
}

const formatYAxis = (value: number) => {
  if (value === 0) return "0k";
  return `${value / 1000}k`;
};

const stats = [
  { label: "Customers", value: "52k", active: true },
  { label: "Total Products", value: "3.5k", active: false },
  { label: "Stock Products", value: "2.5k", active: false },
  { label: "Out of Stock", value: "0.5k", active: false },
  { label: "Revenue", value: "250k", active: false },
];

export default function WeeklyReport() {
  const [period, setPeriod] = useState<"this_week" | "last_week">("this_week");

  const { data, isLoading } = useQuery<WeeklyReportPoint[]>({
    queryKey: ["weeklyReport", period],
    queryFn: () => fetchWeeklyReport(period),
  });

  const chartData = data ?? [];

  const renderXAxisTick = (props: {
    x: number;
    y: number;
    payload: { value: string };
  }) => {
    const { x, y, payload } = props;
    const isWed = payload.value === "Wed";
    return (
      <text
        x={x}
        y={y + 12}
        textAnchor="middle"
        fontSize={11}
        fontWeight={isWed ? 700 : 400}
        fill={isWed ? "#F97316" : "#9CA3AF"}
      >
        {payload.value}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#111827]">
          Report for this week
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden text-xs">
            <button
              onClick={() => setPeriod("this_week")}
              className={`px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                period === "this_week"
                  ? "border-b-2 border-orange-500 text-orange-500 bg-orange-50"
                  : "text-[#6B7280] hover:bg-gray-50"
              }`}
            >
              This week
            </button>
            <button
              onClick={() => setPeriod("last_week")}
              className={`px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                period === "last_week"
                  ? "border-b-2 border-orange-500 text-orange-500 bg-orange-50"
                  : "text-[#6B7280] hover:bg-gray-50"
              }`}
            >
              Last week
            </button>
          </div>
          <MoreVertical size={16} className="text-[#9CA3AF]" />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 mb-5 border-b border-[#E5E7EB] pb-4">
        {stats.map((stat) => (
          <div key={stat.label} className="relative pb-2">
            <p className="text-sm font-bold text-[#111827]">{stat.value}</p>
            <p className="text-[11px] text-[#9CA3AF]">{stat.label}</p>
            {stat.active && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
            )}
          </div>
        ))}
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-[200px] flex items-center justify-center">
          <div className="animate-pulse bg-gray-100 rounded w-full h-full" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#F3F4F6"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={renderXAxisTick as never}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              ticks={[0, 10000, 20000, 30000, 40000, 50000]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#F97316"
              strokeWidth={2}
              fill="url(#orangeGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "#F97316",
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
