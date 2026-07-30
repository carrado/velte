"use client";

import { Target, Zap, Gauge } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { formatNaira } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import type { WalletStats } from "@/types/wallet";

function MiniSparkline({
  data,
  dataKey,
  color,
}: {
  data: Record<string, number>[];
  dataKey: string;
  color: string;
}) {
  if (data.length < 2) return null;
  const gradientId = `wallet-spark-${dataKey}`;
  return (
    <div className="h-9 w-20 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconClass,
  label,
  value,
  format = (n) => Math.round(n).toLocaleString("en-NG"),
  sub,
  accessory,
}: {
  icon: React.ComponentType<{ size?: number }>;
  iconClass: string;
  label: string;
  value: number;
  format?: (n: number) => string;
  sub?: string;
  accessory?: React.ReactNode;
}) {
  const animated = useCountUp(value);
  const display = format(animated);

  return (
    <div className="bg-white rounded-none sm:rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}
          >
            <Icon size={15} />
          </div>
          <span className="text-dash-secondary text-gray-400 truncate">
            {label}
          </span>
        </div>
        {accessory}
      </div>
      <p className="text-xl font-bold text-[#023337] tabular-nums">{display}</p>
      {sub && <p className="text-dash-caption text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function WalletStatCards({
  stats,
  isLoading,
}: {
  stats: WalletStats | undefined;
  isLoading: boolean;
}) {
  const monthly = (stats?.monthly ?? []).map((p) => ({
    spentNaira: p.spentKobo / 100,
    leads: p.leads,
  }));

  const totalSpent = stats?.totalSpentKobo ?? 0;
  const totalToppedUp = stats?.totalToppedUpKobo ?? 0;
  const totalLeads = stats?.totalLeads ?? 0;
  const utilizationPct =
    totalToppedUp > 0 ? Math.round((totalSpent / totalToppedUp) * 100) : 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-none sm:rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        icon={Target}
        iconClass="bg-orange-50 text-orange-500"
        label="Spent on Leads"
        value={totalSpent}
        format={formatNaira}
        sub={`${formatNaira(stats?.monthSpentKobo ?? 0)} this month`}
        accessory={
          <MiniSparkline data={monthly} dataKey="spentNaira" color="#f97316" />
        }
      />
      <StatCard
        icon={Zap}
        iconClass="bg-teal-50 text-teal-600"
        label="Leads Received"
        value={totalLeads}
        sub={`${stats?.monthLeads ?? 0} this month`}
        accessory={
          <MiniSparkline data={monthly} dataKey="leads" color="#0d9488" />
        }
      />
      <StatCard
        icon={Gauge}
        iconClass="bg-green-50 text-green-600"
        label="Funds Utilized"
        value={utilizationPct}
        format={(n) => `${Math.round(n)}%`}
        sub={`of ${formatNaira(totalToppedUp)} topped up · ${stats?.topupsCount ?? 0} top-up${(stats?.topupsCount ?? 0) === 1 ? "" : "s"}`}
        accessory={
          <div className="w-16 shrink-0">
            <MiniBar pct={utilizationPct} color="#16a34a" />
          </div>
        }
      />
    </div>
  );
}
