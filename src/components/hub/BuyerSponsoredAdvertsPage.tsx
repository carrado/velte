"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRightIcon,
  MegaphoneIcon,
  PlusIcon,
  SearchIcon,
} from "@/components/icons";
import {
  BarChart3,
  CheckCircle2,
  Eye,
  Lightbulb,
  MousePointer,
  Share2,
  Store,
  TrendingUp,
} from "lucide-react";
import { ProtectedPosterPreview } from "@/components/hub/ProtectedPosterPreview";
import { HubLink } from "@/components/hub/HubLink";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import { useBuyerStore } from "@/store/buyerStore";
import { isEnterpriseVendor, isPremiumBuyer } from "@/lib/enterprise";
import { EnterpriseAvatarBadge } from "@/components/EnterpriseBadge";
import { cn, timeAgo } from "@/lib/utils";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchBuyerSponsoredAdverts,
  hubPageQueryOptions,
} from "@/services/hub";
import type { HubBuyerPromotion } from "@/types/hub";

export function BuyerSponsoredAdvertsPage() {
  const { navigate } = useNavigation();
  const buyer = useBuyerStore((s) => s.buyer);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "cancelled" | "expired"
  >("all");
  const [sortBy, setSortBy] = useState<"newest" | "views" | "clicks">("newest");

  // Fetch buyer's placed adverts following the prefetch route convention
  const {
    data: rawAdverts,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.hub.buyerAdverts,
    queryFn: fetchBuyerSponsoredAdverts,
    ...hubPageQueryOptions,
  });

  const adverts: HubBuyerPromotion[] = useMemo(() => {
    if (Array.isArray(rawAdverts)) return rawAdverts;
    const raw =
      (rawAdverts as unknown as { data?: HubBuyerPromotion[] })?.data ??
      rawAdverts;
    if (Array.isArray(raw)) return raw;
    return [];
  }, [rawAdverts]);

  // Aggregate metrics
  const totalViews = useMemo(
    () => adverts.reduce((sum, a) => sum + (a.views || 0), 0),
    [adverts],
  );
  const totalClicks = useMemo(
    () => adverts.reduce((sum, a) => sum + (a.clicks || 0), 0),
    [adverts],
  );
  const activeCount = useMemo(
    () => adverts.filter((a) => a.status === "active").length,
    [adverts],
  );
  const averageCtr = useMemo(() => {
    if (totalViews === 0) return 0;
    return Number(((totalClicks / totalViews) * 100).toFixed(1));
  }, [totalViews, totalClicks]);

  // Filtered & sorted adverts
  const filteredAdverts = useMemo(() => {
    return adverts
      .filter((ad) => {
        const matchesStatus =
          statusFilter === "all" || ad.status === statusFilter;
        const q = searchQuery.trim().toLowerCase();
        const matchesQuery =
          !q ||
          ad.headline?.toLowerCase().includes(q) ||
          ad.vendorName?.toLowerCase().includes(q) ||
          ad.blurb?.toLowerCase().includes(q);

        return matchesStatus && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === "views") return (b.views || 0) - (a.views || 0);
        if (sortBy === "clicks") return (b.clicks || 0) - (a.clicks || 0);
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      });
  }, [adverts, statusFilter, searchQuery, sortBy]);

  const advertsToRender = filteredAdverts;

  const displayedActive = activeCount;
  const displayedViews = totalViews;
  const displayedClicks = totalClicks;
  const displayedCtr = averageCtr;

  const handleShare = (ad: HubBuyerPromotion) => {
    const shareUrl =
      typeof window !== "undefined"
        ? ad.vendorHandle
          ? `${window.location.origin}/store/${ad.vendorHandle}?promoter=${buyer?.id || ""}`
          : `${window.location.origin}/hub`
        : "";

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(shareUrl);
      toast.success("Campaign & storefront link copied to clipboard!");
    } else {
      toast.info("Share URL: " + shareUrl);
    }
  };

  return (
    <div className="w-full min-h-dvh bg-white dark:bg-canvas text-ink py-0 sm:py-8">
      {/* Import Caveat font for the handwriting text */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap');",
        }}
      />

      <div className="mx-auto max-w-7xl px-0 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* ========================================================= */}
        {/* HERO SECTION                                              */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden pt-4 sm:pt-2 pb-2 sm:pb-4 w-full">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Eyebrow, Headline, Value Props & CTAs */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 px-4 sm:px-0">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ffede6] dark:bg-orange-950/40 text-[#ff5500] text-xs font-bold border border-orange-200/60 dark:border-orange-500/20">
                <MegaphoneIcon size={14} className="text-[#ff5500]" />
                <span>Buyer Promoter &amp; Sponsored Network</span>
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-black tracking-tight text-ink leading-[1.12]">
                  Back Top Vendors. <br />
                  <span className="text-[#ff5500]">
                    Drive Reach &amp; Earn.
                  </span>
                </h1>
                <p className="mt-4 text-sm sm:text-base text-gray-600 dark:text-ink/75 leading-relaxed max-w-xl">
                  Sponsor your favorite verified businesses on Velte. Elevate
                  vendor listings to priority feed placements, monitor real-time
                  impressions, and earn promoter commission tokens when shoppers
                  buy.
                </p>
              </div>

              {/* CTAs */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/hub/advert")}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#ff5500] hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/25 transition-all transform active:scale-95 cursor-pointer"
                >
                  <PlusIcon size={16} />
                  <span>Place New Advert</span>
                  <ArrowRightIcon size={14} />
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white dark:bg-canvas border border-[#ff5500] text-ink hover:text-[#ff5500] font-bold text-sm transition-colors cursor-pointer"
                >
                  <span className="text-[#ff5500] text-xs">▶</span>
                  <span>How Promotion Works</span>
                </a>
              </div>
            </div>

            {/* Right Column: Hero Photo with Impressions Badge & Handwriting Script */}
            <div className="lg:col-span-5 relative flex justify-center items-center px-4 sm:px-0">
              <div className="relative w-full max-w-[460px] aspect-[16/11] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-gray-100 dark:border-white/10 bg-gray-100 dark:bg-white/5">
                <img
                  src="/hub/adverts-hero.jpg"
                  alt="Grow your business with Velte"
                  className="w-full h-full object-cover object-center select-none"
                />

                {/* Subtle gradient vignette at bottom right for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10 pointer-events-none" />

                {/* Floating Top-Right Badge: +12,480 Impressions */}
                <div className="absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-canvas/95 backdrop-blur-md shadow-md text-xs font-bold text-ink border border-gray-100 dark:border-white/10">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <span>+12,480 Impressions</span>
                </div>

                {/* Floating Bottom-Right Text: Grow your business with Velte! */}
                <div className="absolute right-4 bottom-4 text-right select-none pointer-events-none transform -rotate-3">
                  <div
                    style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
                    className="text-white text-2xl sm:text-3xl font-bold leading-[1.08] drop-shadow-md tracking-wide"
                  >
                    Grow your
                    <br />
                    business with
                    <br />
                    Velte!
                  </div>
                  <svg
                    viewBox="0 0 120 18"
                    className="w-24 sm:w-28 ml-auto text-[#ff5500] fill-none stroke-current mt-0.5"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  >
                    <path d="M 4 8 Q 60 18 116 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* METRICS CARDS BAR                                         */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* Card 1: Active Campaigns */}
          <div className="rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-x border-gray-100 dark:border-white/10 bg-surface p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#ff5500] shrink-0">
                <MegaphoneIcon size={14} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-ink/60">
                ACTIVE CAMPAIGNS
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-ink mt-2">
              {displayedActive}
            </p>
            <span className="text-xs text-gray-500 dark:text-ink/60 font-medium mt-1 block">
              Live in feed
            </span>
          </div>

          {/* Card 2: Total Impressions */}
          <div className="rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-x border-gray-100 dark:border-white/10 bg-surface p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 shrink-0">
                <Eye size={14} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-ink/60">
                TOTAL IMPRESSIONS
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-ink mt-2">
              {displayedViews.toLocaleString()}
            </p>
            <span className="text-xs text-gray-500 dark:text-ink/60 font-medium mt-1 block">
              Verified views
            </span>
          </div>

          {/* Card 3: Storefront Clicks */}
          <div className="rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-x border-gray-100 dark:border-white/10 bg-surface p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 shrink-0">
                <MousePointer size={14} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-ink/60">
                STOREFRONT CLICKS
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-ink mt-2">
              {displayedClicks.toLocaleString()}
            </p>
            <span className="text-xs text-gray-500 dark:text-ink/60 font-medium mt-1 block">
              Buyer visits converted
            </span>
          </div>

          {/* Card 4: Engagement CTR */}
          <div className="rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-x border-gray-100 dark:border-white/10 bg-surface p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-500 shrink-0">
                <BarChart3 size={14} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-ink/60">
                ENGAGEMENT CTR
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-ink mt-2">
              {displayedCtr}%
            </p>
            <span className="text-xs text-gray-500 dark:text-ink/60 font-medium mt-1 block">
              Click-to-view ratio
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION HEADER & FILTERS                                  */}
        {/* ========================================================= */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-4 sm:px-0">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-6 rounded-full bg-[#ff5500] inline-block" />
                <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                  Sponsored Adverts
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-ink/60 mt-1">
                Boost your store and get more visibility from interested buyers.
              </p>
            </div>

            {/* Filter Pills & Sort Dropdown */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 p-1 rounded-full border border-gray-200/80 dark:border-white/10 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shrink-0">
                {(["all", "active", "cancelled", "expired"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer capitalize whitespace-nowrap shrink-0",
                        statusFilter === status
                          ? "bg-[#ff5500] text-white shadow-xs"
                          : "text-gray-600 dark:text-ink/70 hover:text-ink",
                      )}
                    >
                      {status === "all" ? "All Adverts" : status}
                    </button>
                  ),
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="font-semibold text-gray-400">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "newest" | "views" | "clicks")
                  }
                  className="py-1.5 px-3 rounded-xl bg-surface border border-gray-200 dark:border-white/10 text-xs font-bold text-ink focus:border-[#ff5500] focus:outline-none cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="views">Most Views</option>
                  <option value="clicks">Most Clicks</option>
                </select>
              </div>
            </div>
          </div>

          {/* Full-Width Search Input */}
          <div className="relative w-full px-4 sm:px-0">
            <SearchIcon
              size={16}
              className="absolute left-7 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by headline or vendor store name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm rounded-full bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 text-ink placeholder:text-gray-400 focus:outline-none focus:border-[#ff5500] focus:bg-surface transition-all shadow-xs"
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* CAMPAIGN LIST                                             */}
        {/* ========================================================= */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
            <p className="mt-3 text-sm text-gray-500 font-medium">
              Loading your sponsored advert campaigns...
            </p>
          </div>
        ) : error ? (
          <div className="py-16 text-center rounded-none sm:rounded-3xl border-y sm:border border-x-0 sm:border-x border-rose-200 dark:border-rose-900/30 p-8 bg-surface">
            <p className="text-sm text-rose-500 font-bold">
              Could not load your sponsored adverts.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
            >
              Retry
            </button>
          </div>
        ) : advertsToRender.length === 0 ? (
          <div className="py-16 text-center rounded-none sm:rounded-3xl border-y sm:border border-x-0 sm:border-x border-dashed border-gray-200 dark:border-white/10 p-8 sm:p-12 bg-surface">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 mb-4">
              <MegaphoneIcon size={32} />
            </span>
            <h3 className="text-lg font-bold text-ink">
              {adverts.length === 0
                ? "No Sponsored Adverts Yet"
                : "No campaigns match your current filter"}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mt-2 leading-relaxed">
              Sponsor vendor products to get them prioritized at the top of the
              Velte Hub. You earn promoter rewards whenever buyers purchase
              through your advert link.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/hub/advert")}
                className="px-5 py-2.5 rounded-xl bg-[#ff5500] hover:bg-orange-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Place Your First Advert
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-ink font-bold text-xs hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {advertsToRender.map((ad) => {
              const storeUrl = ad.vendorHandle
                ? `/store/${ad.vendorHandle}`
                : null;
              const ctr =
                ad.views > 0
                  ? ((ad.clicks / ad.views) * 100).toFixed(1)
                  : "0.0";
              const imageSrc = ad.imageUrl || "/hub/advert-spaghetti.jpg";

              return (
                <div
                  key={ad.id}
                  className="rounded-none sm:rounded-3xl border-y sm:border border-x-0 sm:border-x border-gray-100 dark:border-white/10 bg-surface overflow-hidden shadow-xs hover:border-orange-500/30 transition-all p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-stretch"
                >
                  {/* Left Column: Image with Active Badge */}
                  <div className="relative w-full md:w-[280px] lg:w-[320px] shrink-0 rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100 dark:bg-white/5">
                    {ad.imageUrl ? (
                      <ProtectedPosterPreview
                        src={ad.imageUrl}
                        fit="cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={imageSrc}
                        alt={ad.headline}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-3 left-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-white/95 dark:bg-canvas/95 shadow-sm uppercase tracking-wide border",
                          ad.status === "active"
                            ? "text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
                            : ad.status === "cancelled"
                              ? "text-rose-500 dark:text-rose-400 border-rose-100 dark:border-rose-900/30"
                              : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            ad.status === "active"
                              ? "bg-emerald-500"
                              : ad.status === "cancelled"
                                ? "bg-rose-500"
                                : "bg-gray-400 dark:bg-gray-500",
                          )}
                        />
                        {ad.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Info, Stats, Actions */}
                  <div className="flex-1 flex flex-col justify-between py-1 min-w-0 space-y-3.5">
                    {/* Header Row: Vendor Info & Timestamp */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-ink font-bold text-sm flex items-center justify-center shrink-0 border border-gray-200/60 dark:border-white/10 overflow-hidden">
                            {ad.vendorAvatar ? (
                              <img
                                src={ad.vendorAvatar}
                                alt={ad.vendorName}
                                className="h-full w-full object-cover rounded-full"
                              />
                            ) : (
                              ad.vendorName?.[0] || "C"
                            )}
                          </div>
                          {isEnterpriseVendor(ad) && (
                            <EnterpriseAvatarBadge size="sm" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-sm sm:text-base text-ink truncate block">
                            {ad.vendorName}
                          </span>
                          {Boolean(ad.verified || ad.vendorVerified) && (
                            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2
                                size={12}
                                className="fill-emerald-500 text-white"
                              />
                              Verified Seller
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-xs text-gray-400 font-medium shrink-0">
                        {timeAgo(ad.createdAt)}
                      </span>
                    </div>

                    {/* Headline & Blurb */}
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-ink leading-snug hover:text-[#ff5500] transition-colors">
                        {ad.headline}
                      </h3>
                      {ad.blurb && (
                        <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-ink/65 leading-relaxed line-clamp-2">
                          {ad.blurb}
                        </p>
                      )}
                    </div>

                    {/* Stats Box */}
                    <div className="bg-gray-50/70 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-xl p-3 grid grid-cols-3 divide-x divide-gray-200/60 dark:divide-white/10 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-center gap-1">
                          <Eye size={12} />
                          VIEWS
                        </span>
                        <p className="text-base sm:text-lg font-black text-ink mt-0.5">
                          {ad.views || 0}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-center gap-1">
                          <TrendingUp size={12} />
                          CLICKS
                        </span>
                        <p className="text-base sm:text-lg font-black text-[#ff5500] mt-0.5">
                          {ad.clicks || 0}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-center gap-1">
                          <BarChart3 size={12} />
                          CTR
                        </span>
                        <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {ctr}%
                        </p>
                      </div>
                    </div>

                    {/* Footer Actions Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5">
                      {storeUrl ? (
                        <HubLink
                          href={storeUrl}
                          className="text-xs font-bold text-[#ff5500] hover:underline flex items-center gap-1.5"
                        >
                          <Store size={14} />
                          <span>Visit Store</span>
                        </HubLink>
                      ) : (
                        <span className="text-xs font-bold text-[#ff5500] flex items-center gap-1.5">
                          <Store size={14} />
                          <span>Visit Store</span>
                        </span>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleShare(ad)}
                          className="p-1.5 text-gray-400 hover:text-ink transition-colors cursor-pointer"
                          title="Share Campaign Link"
                        >
                          <Share2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate("/hub/advert")}
                          className="px-5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#ff5500] font-bold text-xs border border-orange-200/80 transition-colors cursor-pointer"
                        >
                          Boost Again
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================= */}
        {/* HOW IT WORKS                                              */}
        {/* ========================================================= */}
        <div
          id="how-it-works"
          className="rounded-none sm:rounded-3xl bg-[#fff7f2] dark:bg-orange-950/20 border-y sm:border border-x-0 sm:border-x border-orange-100 dark:border-orange-900/30 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 scroll-mt-6"
        >
          {/* Left: Lightbulb + Headline */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/50 text-[#ff5500] shrink-0">
              <Lightbulb size={24} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-ink">
                How Buyer-Sponsored Adverts Work
              </h3>
              <p className="text-xs text-gray-500 dark:text-ink/60 mt-0.5 max-w-xs">
                Backing verified merchants on Velte benefits both buyers and
                vendors.
              </p>
            </div>
          </div>

          {/* Right: 3 Steps Connected by Arrows */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6 flex-1 justify-end w-full lg:w-auto">
            {/* Step 1 */}
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ff5500] text-white font-bold text-xs shrink-0">
                1
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-ink">
                  Priority Discovery
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-ink/60 mt-0.5">
                  Your sponsored advert reaches more buyers.
                </p>
              </div>
            </div>

            <ArrowRightIcon
              size={16}
              className="text-gray-300 hidden md:block shrink-0"
            />

            {/* Step 2 */}
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ff5500] text-white font-bold text-xs shrink-0">
                2
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-ink">
                  Real-Time Reach Tracking
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-ink/60 mt-0.5">
                  View clicks and monitor performance.
                </p>
              </div>
            </div>

            <ArrowRightIcon
              size={16}
              className="text-gray-300 hidden md:block shrink-0"
            />

            {/* Step 3 */}
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ff5500] text-white font-bold text-xs shrink-0">
                3
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-ink">
                  Promoter Commissions
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-ink/60 mt-0.5">
                  Earn rewards for successful referrals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
