"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  BadgeCheckIcon,
  BarChartIcon,
  CrownIcon,
  EyeIcon,
  HandbagIcon,
  LightbulbIcon,
  MessageCircleIcon,
  SparkleIcon,
  TargetIcon,
  TrendingUpIcon,
} from "@/components/icons";
import { EnterpriseAvatarBadge } from "@/components/EnterpriseBadge";
import { HubEnterpriseLockGate } from "@/components/hub/HubEnterpriseLockGate";
import { ApiError } from "@/lib/api-client";
import { isEnterpriseVendor } from "@/lib/enterprise";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatNaira } from "@/lib/utils";
import {
  fetchHubAnalytics,
  fetchHubHome,
  hubPageQueryOptions,
} from "@/services/hub";
import { useUserStore } from "@/store/userStore";
import type { HubAnalyticsData } from "@/types/hub";

export function HubAnalyticsPage({ userId }: { userId: string }) {
  const user = useUserStore((state) => state.user);
  const vendorStore = useUserStore((state) => state.vendorStore);
  const [visibleLeaderboardCount, setVisibleLeaderboardCount] = useState(10);

  const analyticsQuery = useQuery({
    queryKey: queryKeys.hub.analytics,
    queryFn: fetchHubAnalytics,
    ...hubPageQueryOptions,
  });

  const homeQuery = useQuery({
    queryKey: queryKeys.hub.home("vendor"),
    queryFn: () => fetchHubHome("vendor"),
    ...hubPageQueryOptions,
  });

  const isEnterprise =
    isEnterpriseVendor(user) || homeQuery.data?.enterprise === true;

  // If 403 Forbidden from backend or user is not enterprise, render the rich lock gate
  const errorStatus = (analyticsQuery.error as ApiError | undefined)?.status;
  if (
    errorStatus === 403 ||
    (!isEnterprise && !analyticsQuery.isLoading && !analyticsQuery.data)
  ) {
    return (
      <HubEnterpriseLockGate
        featureName="Insights & Analytics"
        description="Comprehensive store telemetry, 30-day conversion funnels, and live category performance benchmarking are exclusive to Enterprise Vendors."
        benefits={[
          "Live advert & catalog impression and click-through tracking",
          "4-Stage buyer conversion funnel with drop-off analytics",
          "Category Performance Leaderboard comparing against top market peers",
          "₦0 lead fees on all buyer inquiries with direct WhatsApp handoff",
        ]}
      />
    );
  }

  if (analyticsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-canvas pb-20 pt-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="space-y-6">
            <div className="h-24 animate-pulse rounded-3xl bg-gray-200 dark:bg-white/10" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/10"
                />
              ))}
            </div>
            <div className="h-80 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  const data: HubAnalyticsData | null = analyticsQuery.data ?? null;

  if (!data) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-8 text-center shadow-xs">
          <BarChartIcon
            size={40}
            className="mx-auto text-gray-400 dark:text-ink/40 mb-3"
          />
          <h2 className="text-lg font-bold text-ink">Telemetry Unavailable</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-ink/60">
            We couldn&apos;t load your store&apos;s performance metrics. Please
            try again.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => analyticsQuery.refetch()}
              className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
            >
              Retry
            </button>
            <Link
              href="/hub"
              className="rounded-xl border border-gray-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-ink hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              Back to Hub
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { telemetry, funnel, dailyTrends, leaderboard, myRank } = data;
  const currentVendorLogo = user?.avatar || vendorStore?.avatar || null;
  const displayedLeaderboard = leaderboard.slice(0, visibleLeaderboardCount);

  const maxViews = Math.max(...dailyTrends.map((t) => t.views), 10);
  const maxClicks = Math.max(...dailyTrends.map((t) => t.clicks), 5);

  return (
    <div className="min-h-screen bg-canvas pb-20 pt-6 text-ink">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
        {/* Header */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
                Store Insights & Performance
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-ink/60">
                Live visitor telemetry, customer funnel conversion, and category
                benchmark comparisons.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-gray-200 dark:border-white/10 bg-surface px-3.5 py-2 text-xs font-semibold text-ink shadow-xs">
                📅 Period: Last 30 Days
              </span>
            </div>
          </div>
        </div>

        {/* 4 Hero KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Views */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-5 shadow-xs transition-colors">
            <div className="flex items-center justify-between text-gray-500 dark:text-ink/60 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">
                Reach & Views
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-500/15">
                <EyeIcon size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-ink">
              {telemetry.views.toLocaleString()}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <TrendingUpIcon size={14} />
              <span>+14.2% vs previous period</span>
            </div>
          </div>

          {/* Card 2: Clicks & CTR */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-5 shadow-xs transition-colors">
            <div className="flex items-center justify-between text-gray-500 dark:text-ink/60 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">
                Store Clicks & CTR
              </span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 dark:bg-orange-500/15">
                <TargetIcon size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-ink">
                {telemetry.clicks.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-gray-500 dark:text-ink/60">
                ({telemetry.ctr}% CTR)
              </span>
            </div>
            <div className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>
                +{(telemetry.ctr - telemetry.categoryAvgCtr).toFixed(1)}% vs
                Category Avg ({telemetry.categoryAvgCtr}%)
              </span>
            </div>
          </div>

          {/* Card 3: Buyer Leads */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-5 shadow-xs transition-colors">
            <div className="flex items-center justify-between text-gray-500 dark:text-ink/60 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">
                Inquiries & Leads
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 dark:bg-purple-500/15">
                <MessageCircleIcon size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-ink">
              {telemetry.leadsCount}
            </div>
            <div className="mt-2.5 text-xs font-medium text-gray-500 dark:text-ink/60">
              Direct customer conversations
            </div>
          </div>

          {/* Card 4: Orders & Revenue */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-5 shadow-xs transition-colors">
            <div className="flex items-center justify-between text-gray-500 dark:text-ink/60 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">
                Gross Sales
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/15">
                <HandbagIcon size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-ink">
              {formatNaira(Math.round(telemetry.salesKobo / 100))}
            </div>
            <div className="mt-2.5 text-xs font-medium text-gray-500 dark:text-ink/60">
              {telemetry.ordersCount} completed orders
            </div>
          </div>
        </div>

        {/* 4-Stage Conversion Funnel Visualizer */}
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-surface p-6 sm:p-8 shadow-xs">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <span>30-Day Conversion Funnel</span>
                <span className="rounded-full bg-gray-100 dark:bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:text-ink/80 border border-gray-200 dark:border-white/10">
                  Discovery to Purchase
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-ink/60 mt-0.5">
                Shows conversion drop-off percentages between impressions,
                customer clicks, chat inquiries, and completed checkouts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1: Reach */}
            <div className="relative rounded-2xl border border-gray-200/80 dark:border-white/10 bg-canvas p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-ink/40">
                Step 1
              </div>
              <div className="mt-1 text-sm font-semibold text-ink">
                Hub Impressions
              </div>
              <div className="mt-3 text-2xl font-black text-ink">
                {funnel.reach.count.toLocaleString()}
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${funnel.reach.count > 0 ? 100 : 0}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-ink/50">
                {funnel.reach.count > 0
                  ? "100% Top of Funnel"
                  : "0% Baseline Reach"}
              </div>
            </div>

            {/* Step 2: Clicks */}
            <div className="relative rounded-2xl border border-gray-200/80 dark:border-white/10 bg-canvas p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-ink/40">
                Step 2
              </div>
              <div className="mt-1 text-sm font-semibold text-ink">
                Catalog Clicks
              </div>
              <div className="mt-3 text-2xl font-black text-ink">
                {funnel.clicks.count.toLocaleString()}
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{
                    width: `${Math.min(100, funnel.clicks.conversionPct * 10)}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
                {funnel.clicks.conversionPct}% conversion rate
              </div>
            </div>

            {/* Step 3: Leads */}
            <div className="relative rounded-2xl border border-gray-200/80 dark:border-white/10 bg-canvas p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-ink/40">
                Step 3
              </div>
              <div className="mt-1 text-sm font-semibold text-ink">
                Customer Leads
              </div>
              <div className="mt-3 text-2xl font-black text-ink">
                {funnel.leads.count.toLocaleString()}
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${Math.min(100, funnel.leads.conversionPct)}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-xs font-semibold text-purple-600 dark:text-purple-400">
                {funnel.leads.conversionPct}% from clicks
              </div>
            </div>

            {/* Step 4: Orders */}
            <div className="relative rounded-2xl border border-gray-200/80 dark:border-white/10 bg-canvas p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-ink/40">
                Step 4
              </div>
              <div className="mt-1 text-sm font-semibold text-ink">
                Completed Orders
              </div>
              <div className="mt-3 text-2xl font-black text-ink">
                {funnel.orders.count.toLocaleString()}
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${Math.min(100, funnel.orders.conversionPct)}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {funnel.orders.conversionPct}% closing rate
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Performance Trend Chart (Side by Side Bars) */}
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-surface p-6 sm:p-8 shadow-xs">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <BarChartIcon size={20} className="text-orange-500" />
                <span>7-Day Engagement & Conversion Trajectory</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-ink/60 mt-0.5">
                Daily views and clicks across the products you have listed on
                the app.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-ink/70">
                <span className="h-3 w-3 rounded-xs bg-orange-500 shadow-xs" />{" "}
                Product Views
              </span>
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-ink/70">
                <span className="h-3 w-3 rounded-xs bg-sky-500 shadow-xs" />{" "}
                Product Clicks
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end pt-8 pb-4 h-64 border-b border-gray-200 dark:border-white/10">
            {dailyTrends.map((trend, idx) => {
              const viewHeightPct = Math.max(
                12,
                Math.min(100, Math.round((trend.views / maxViews) * 100)),
              );
              const clickHeightPct = Math.max(
                12,
                Math.min(100, Math.round((trend.clicks / maxClicks) * 100)),
              );

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-2 h-full justify-end group flex-1 relative"
                >
                  {/* Floating Tooltip */}
                  <div className="absolute -top-7 text-[10px] font-bold rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 px-2 py-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                    {trend.views}v · {trend.clicks}c ({trend.ctr}%)
                  </div>

                  {/* 2 Bars Side by Side with subtle pillar track */}
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full max-w-[58px] rounded-xl bg-gray-50/80 dark:bg-white/[0.03] p-1 border border-transparent group-hover:border-orange-500/20 group-hover:bg-orange-50/20 dark:group-hover:bg-white/[0.06] transition-all">
                    {/* Bar 1: Views */}
                    <div className="w-1/2 flex flex-col items-center justify-end h-full">
                      <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {trend.views}
                      </span>
                      <div
                        className="w-full rounded-t-md sm:rounded-t-lg bg-gradient-to-t from-orange-600 to-amber-500 transition-all duration-300 group-hover:brightness-110 shadow-xs"
                        style={{ height: `${viewHeightPct}%` }}
                        title={`${trend.views} listing views`}
                      />
                    </div>

                    {/* Bar 2: Clicks */}
                    <div className="w-1/2 flex flex-col items-center justify-end h-full">
                      <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {trend.clicks}
                      </span>
                      <div
                        className="w-full rounded-t-md sm:rounded-t-lg bg-gradient-to-t from-blue-600 to-sky-400 transition-all duration-300 group-hover:brightness-110 shadow-xs"
                        style={{ height: `${clickHeightPct}%` }}
                        title={`${trend.clicks} listing clicks`}
                      />
                    </div>
                  </div>

                  {/* Day Date */}
                  <div className="text-[11px] font-semibold text-gray-500 dark:text-ink/60 group-hover:text-ink text-center truncate w-full transition-colors">
                    {trend.date.split(",")[0]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Performance Leaderboard */}
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-surface p-6 sm:p-8 shadow-xs">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CrownIcon size={20} weight="fill" className="text-amber-500" />
                <h2 className="text-lg font-bold text-ink">
                  Category Performance Leaderboard
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-ink/60 mt-1">
                Verified merchant sales volume, order completions, and closing
                efficiency across your sector.
              </p>
            </div>
            {myRank > 0 && (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <span>Your Store Rank:</span>
                <span className="rounded-lg bg-amber-500 text-white px-2 py-0.5">
                  #{myRank}
                </span>
              </div>
            )}
          </div>

          {/* Mobile Card-Based Leaderboard (Zero horizontal scroll, responsive cards) */}
          <div className="sm:hidden space-y-3">
            {displayedLeaderboard.map((entry) => {
              const entryLogo = entry.isCurrentVendor
                ? currentVendorLogo || entry.avatar
                : entry.avatar;
              const isEntryEnterprise = Boolean(
                entry.isEnterprise || entry.isCurrentVendor,
              );

              return (
                <div
                  key={entry.rank}
                  className={cn(
                    "rounded-2xl border p-4 transition-all shadow-xs relative",
                    entry.isCurrentVendor
                      ? "bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/40 dark:border-orange-500/50 ring-1 ring-orange-500/20"
                      : "bg-canvas border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20",
                  )}
                >
                  {/* Top Row: Rank + Merchant Info + Status Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Indicator */}
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          entry.rank === 1
                            ? "bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-xs"
                            : entry.rank === 2
                              ? "bg-gray-200 text-gray-800 dark:bg-white/15 dark:text-ink"
                              : entry.rank === 3
                                ? "bg-amber-700/80 text-white dark:bg-amber-800 dark:text-amber-100"
                                : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-ink/60",
                        )}
                      >
                        #{entry.rank}
                      </span>

                      {/* Store Avatar + Enterprise Badge */}
                      <div className="relative h-10 w-10 shrink-0">
                        {entryLogo ? (
                          <img
                            src={entryLogo}
                            alt={entry.name}
                            className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-white/10 shadow-xs"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold shadow-xs border border-orange-400/30">
                            {entry.name[0]}
                          </div>
                        )}
                        {isEntryEnterprise && (
                          <EnterpriseAvatarBadge size="sm" />
                        )}
                      </div>

                      {/* Store Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-ink truncate max-w-[140px]">
                            {entry.name}
                          </span>
                          {entry.verified && (
                            <BadgeCheckIcon
                              size={14}
                              weight="fill"
                              className="text-blue-500 shrink-0"
                            />
                          )}
                          {entry.isCurrentVendor && (
                            <span className="rounded-md bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2">
                              YOU
                            </span>
                          )}
                        </div>
                        {entry.handle && (
                          <div className="text-xs text-gray-400 dark:text-ink/40 truncate">
                            @{entry.handle}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className="shrink-0 inline-flex rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:text-ink/80 border border-gray-200 dark:border-white/10">
                      {entry.badge || "Verified Store"}
                    </span>
                  </div>

                  {/* Metrics Row (3 columns: Revenue, Orders, Conversion) */}
                  <div className="mt-3.5 grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-ink/40">
                        30d Revenue
                      </span>
                      <span className="text-xs font-bold text-ink mt-0.5 truncate">
                        {formatNaira(Math.round(entry.salesKobo / 100))}
                      </span>
                    </div>

                    <div className="flex flex-col text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-ink/40">
                        Orders
                      </span>
                      <span className="text-xs font-bold text-gray-700 dark:text-ink/80 mt-0.5">
                        {entry.orders}
                      </span>
                    </div>

                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-ink/40">
                        Conversion
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {entry.conversionRate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-ink/40">
                  <th className="pb-3 pr-4">Rank</th>
                  <th className="pb-3 px-4">Merchant Store</th>
                  <th className="pb-3 px-4 text-right">30d Revenue</th>
                  <th className="pb-3 px-4 text-right">Orders</th>
                  <th className="pb-3 px-4 text-right">Conversion</th>
                  <th className="pb-3 pl-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium">
                {displayedLeaderboard.map((entry) => {
                  const entryLogo = entry.isCurrentVendor
                    ? currentVendorLogo || entry.avatar
                    : entry.avatar;
                  const isEntryEnterprise = Boolean(
                    entry.isEnterprise || entry.isCurrentVendor,
                  );

                  return (
                    <tr
                      key={entry.rank}
                      className={
                        entry.isCurrentVendor
                          ? "bg-orange-500/10 dark:bg-orange-500/15 border-l-4 border-l-orange-500 font-semibold"
                          : "hover:bg-gray-50/70 dark:hover:bg-white/[0.03] transition-colors"
                      }
                    >
                      <td className="py-4 pr-4">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            entry.rank === 1
                              ? "bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-xs"
                              : entry.rank === 2
                                ? "bg-gray-200 text-gray-800 dark:bg-white/15 dark:text-ink"
                                : entry.rank === 3
                                  ? "bg-amber-700/80 text-white dark:bg-amber-800 dark:text-amber-100"
                                  : "text-gray-400 dark:text-ink/40"
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          {/* Logo container with EnterpriseAvatarBadge */}
                          <div className="relative h-9 w-9 shrink-0">
                            {entryLogo ? (
                              <img
                                src={entryLogo}
                                alt={entry.name}
                                className="h-9 w-9 rounded-full object-cover border border-gray-200 dark:border-white/10 shadow-xs"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shadow-xs border border-orange-400/30">
                                {entry.name[0]}
                              </div>
                            )}
                            {isEntryEnterprise && (
                              <EnterpriseAvatarBadge size="sm" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-ink font-semibold">
                              <span>{entry.name}</span>
                              {entry.verified && (
                                <BadgeCheckIcon
                                  size={14}
                                  weight="fill"
                                  className="text-blue-500 shrink-0"
                                />
                              )}
                              {entry.isCurrentVendor && (
                                <span className="rounded-md bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2">
                                  YOU
                                </span>
                              )}
                            </div>
                            {entry.handle && (
                              <div className="text-xs text-gray-400 dark:text-ink/40 font-normal">
                                @{entry.handle}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right text-ink font-semibold">
                        {formatNaira(Math.round(entry.salesKobo / 100))}
                      </td>
                      <td className="py-4 px-4 text-right text-gray-600 dark:text-ink/70">
                        {entry.orders}
                      </td>
                      <td className="py-4 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        {entry.conversionRate}
                      </td>
                      <td className="py-4 pl-4 text-center">
                        <span className="inline-flex rounded-full bg-gray-100 dark:bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-gray-700 dark:text-ink/80 border border-gray-200 dark:border-white/10">
                          {entry.badge || "Verified Store"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* See More CTA: Appends next 10 items underneath */}
          {visibleLeaderboardCount < leaderboard.length && (
            <div className="mt-6 flex justify-center border-t border-gray-100 dark:border-white/5 pt-4">
              <button
                type="button"
                onClick={() => setVisibleLeaderboardCount((prev) => prev + 10)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-canvas px-5 py-2.5 text-xs font-bold text-ink hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shadow-xs cursor-pointer active:scale-98"
              >
                <span>See More</span>
                <span className="text-[11px] text-gray-500 dark:text-ink/60 font-normal">
                  (Showing {displayedLeaderboard.length} of {leaderboard.length}
                  )
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Actionable Recommendations Panel */}
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-surface p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <SparkleIcon size={20} className="text-orange-500" />
            <h2 className="text-base font-bold text-ink">
              AI Growth & Optimization Recommendations
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-canvas p-5 shadow-xs hover:border-orange-500/30 transition-colors">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">
                <LightbulbIcon size={16} />
                <span>Peak Search Timing</span>
              </div>
              <p className="mt-2 text-xs text-gray-600 dark:text-ink/70 leading-relaxed">
                Buyer searches in your category spike between 7 PM — 10 PM on
                Fridays and Saturdays. Sponsor your top product during this
                window to capture 3x more inquiries.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-canvas p-5 shadow-xs hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                <LightbulbIcon size={16} />
                <span>Response Speed</span>
              </div>
              <p className="mt-2 text-xs text-gray-600 dark:text-ink/70 leading-relaxed">
                Responding to incoming buyer chats within 10 minutes increases
                closing conversion from 24% to 58%. Enable push notifications to
                never miss a buyer lead.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-canvas p-5 shadow-xs hover:border-purple-500/30 transition-colors">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">
                <LightbulbIcon size={16} />
                <span>Creative Refresh</span>
              </div>
              <p className="mt-2 text-xs text-gray-600 dark:text-ink/70 leading-relaxed">
                Advert posters experience engagement fatigue after 14 days.
                Generate a new high-contrast AI advert poster to refresh your
                storefront visibility.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
