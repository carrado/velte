"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import { walletApi } from "@/services/wallet";
import { queryKeys } from "@/lib/query-keys";
import { formatNaira, cn } from "@/lib/utils";
import type { WalletMonthlySpendPoint } from "@/types/wallet";

// orange-600 rather than the orange-500 UI accent — the bars need ≥3:1
// contrast against the white card (validated), the buttons don't.
const BAR_COLOR = "#ea580c";

const RANGE_OPTIONS = [3, 6, 12] as const;

function monthLabel(p: WalletMonthlySpendPoint) {
  return new Date(p.year, p.month - 1, 1).toLocaleString("en-NG", {
    month: "short",
  });
}

function compactNaira(kobo: number) {
  const naira = kobo / 100;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}m`;
  if (naira >= 1_000) return `₦${Math.round(naira / 1_000)}k`;
  return `₦${naira}`;
}

function SpendTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as WalletMonthlySpendPoint & {
    label: string;
  };
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-lg px-3 py-2">
      <p className="text-dash-caption font-semibold text-gray-900">
        {point.label}{" "}
        <span className="font-normal text-gray-400">{point.year}</span>
      </p>
      <p className="text-dash-caption text-gray-600 mt-0.5">
        {formatNaira(point.spentKobo)} · {point.leads}{" "}
        {point.leads === 1 ? "lead" : "leads"}
      </p>
    </div>
  );
}

export default function LeadGenerationCard() {
  const [months, setMonths] = useState<(typeof RANGE_OPTIONS)[number]>(6);

  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.wallet.stats(months),
    queryFn: () => walletApi.getStats(months),
    staleTime: 30_000,
  });

  const data = (stats?.monthly ?? []).map((p) => ({
    ...p,
    label: monthLabel(p),
  }));
  const hasActivity = (stats?.totalLeads ?? 0) > 0;

  return (
    <div className="bg-white rounded-none sm:rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-dash-heading font-semibold text-gray-900">
            Lead Generation
          </h2>
          <p className="text-dash-secondary text-gray-400 mt-0.5">
            Amount spent on buyer leads · last {months} months
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-200 p-0.5">
          {RANGE_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonths(m)}
              className={cn(
                "px-3 py-1 text-dash-caption font-medium rounded-md transition-colors cursor-pointer",
                months === m
                  ? "bg-orange-500 text-white"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-56 rounded-xl bg-gray-50 animate-pulse" />
      ) : hasActivity ? (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="#f3f4f6"
                strokeDasharray="0"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                dy={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={44}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={compactNaira}
              />
              <Tooltip
                content={<SpendTooltip />}
                cursor={{ fill: "#f9fafb" }}
              />
              <Bar
                dataKey="spentKobo"
                fill={BAR_COLOR}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-56 flex flex-col items-center justify-center text-center gap-2">
          <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
            <Zap size={17} className="text-orange-500" />
          </div>
          <p className="text-dash-body font-semibold text-gray-700">
            No leads yet
          </p>
          <p className="text-dash-secondary text-gray-400 max-w-xs">
            When buyers find you through Velte, each lead is charged from your
            wallet and your spend shows up here.
          </p>
        </div>
      )}
    </div>
  );
}
