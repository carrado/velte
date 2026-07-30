"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
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

const SPEND_COLOR = "#f97316";
const LEADS_COLOR = "#0d9488";
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

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as WalletMonthlySpendPoint & {
    label: string;
  };
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-lg px-3.5 py-2.5">
      <p className="text-dash-caption font-semibold text-gray-900 mb-1">
        {point.label}{" "}
        <span className="font-normal text-gray-400">{point.year}</span>
      </p>
      <p className="text-dash-caption text-gray-600 flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: SPEND_COLOR }}
        />
        {formatNaira(point.spentKobo)} spent
      </p>
      <p className="text-dash-caption text-gray-600 flex items-center gap-1.5 mt-0.5">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: LEADS_COLOR }}
        />
        {point.leads} {point.leads === 1 ? "lead" : "leads"}
      </p>
    </div>
  );
}

export default function WalletSpendChart() {
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
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
              <TrendingUp size={13} className="text-orange-500" />
            </div>
            <h2 className="text-dash-heading font-semibold text-gray-900">
              Spend &amp; Leads Trend
            </h2>
          </div>
          <p className="text-dash-secondary text-gray-400 mt-1.5">
            Lead spend against leads received · last {months} months
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
        <div className="h-64 rounded-xl bg-gray-50 animate-pulse" />
      ) : hasActivity ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="wallet-spend-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={SPEND_COLOR}
                    stopOpacity={0.28}
                  />
                  <stop offset="100%" stopColor={SPEND_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                dy={6}
              />
              <YAxis
                yAxisId="spend"
                axisLine={false}
                tickLine={false}
                width={44}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={compactNaira}
              />
              <YAxis
                yAxisId="leads"
                orientation="right"
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: "#e5e7eb" }}
              />
              <Area
                yAxisId="spend"
                type="monotone"
                dataKey="spentKobo"
                stroke={SPEND_COLOR}
                strokeWidth={2}
                fill="url(#wallet-spend-fill)"
                dot={{ r: 3, fill: SPEND_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="leads"
                type="monotone"
                dataKey="leads"
                stroke={LEADS_COLOR}
                strokeWidth={2}
                dot={{ r: 3, fill: LEADS_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-center gap-2">
          <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
            <TrendingUp size={17} className="text-orange-500" />
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
