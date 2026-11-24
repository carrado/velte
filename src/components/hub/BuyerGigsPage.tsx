"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BriefcaseIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  FileTextIcon,
  GlobeIcon,
  LockIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  SparklesIcon,
  StoreIcon,
  UploadIcon,
  ZapIcon,
} from "@/components/icons";
import {
  Camera,
  ShieldCheck,
  Trophy,
  BarChart3,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { modalScrimClass } from "@/lib/modalScrim";
import { HubLink } from "@/components/hub/HubLink";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import { useBuyerStore } from "@/store/buyerStore";
import { isPremiumBuyer } from "@/lib/enterprise";
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchHubGigs,
  fetchMyBuyerGigs,
  hubPageQueryOptions,
} from "@/services/hub";
import type {
  HubBuyerGigItem,
  HubBuyerGigsData,
  HubGigItem,
} from "@/types/hub";
import { ProtectedPosterPreview } from "@/components/hub/ProtectedPosterPreview";

export function BuyerGigsPage() {
  const queryClient = useQueryClient();
  const buyer = useBuyerStore((s) => s.buyer);

  const isPremium = Boolean(
    isPremiumBuyer(buyer) ||
    buyer?.tier === "buyer_premium" ||
    (buyer as { isPremium?: boolean })?.isPremium ||
    (buyer as { plan?: string })?.plan === "buyer_premium",
  );

  const [activeTab, setActiveTab] = useState<"explore" | "mine" | "guide">(
    "explore",
  );
  const [modeFilter, setModeFilter] = useState<"all" | "remote" | "on-site">(
    "all",
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "submitted" | "completed"
  >("all");

  // Sub-modal states
  const [selectedGigToApply, setSelectedGigToApply] =
    useState<HubGigItem | null>(null);
  const [selectedGigToSubmit, setSelectedGigToSubmit] =
    useState<HubBuyerGigItem | null>(null);

  // Form states for application
  const [pitch, setPitch] = useState("");
  const [duration, setDuration] = useState("2-3 days");
  const [contactPhone, setContactPhone] = useState("");
  const [submittingApply, setSubmittingApply] = useState(false);

  // Form states for proof submission
  const [proofNotes, setProofNotes] = useState("");
  const [proofLink, setProofLink] = useState("");
  const [submittingProof, setSubmittingProof] = useState(false);

  // 1. Fetch available gigs following the prefetch route convention
  const {
    data: exploreData,
    isLoading: loadingExplore,
    refetch: refetchExplore,
  } = useQuery({
    queryKey: queryKeys.hub.gigs.explore(
      modeFilter,
      searchQuery,
      selectedCategory,
    ),
    queryFn: () =>
      fetchHubGigs({
        workMode: modeFilter,
        search: searchQuery,
        category: selectedCategory,
      }),
    ...hubPageQueryOptions,
  });

  // 2. Fetch my gigs & won tasks following the prefetch route convention
  const {
    data: myGigsData,
    isLoading: loadingMyGigs,
    refetch: refetchMyGigs,
  } = useQuery({
    queryKey: queryKeys.hub.gigs.mine,
    queryFn: fetchMyBuyerGigs,
    ...hubPageQueryOptions,
  });

  const availableGigs: HubGigItem[] = useMemo(() => {
    if (Array.isArray(exploreData)) return exploreData;
    const raw =
      (exploreData as unknown as { data?: HubGigItem[] })?.data ?? exploreData;
    if (Array.isArray(raw)) return raw;
    return [];
  }, [exploreData]);

  const myGigs: HubBuyerGigItem[] = useMemo(() => {
    const raw =
      (myGigsData as { data?: HubBuyerGigsData })?.data?.gigs ??
      myGigsData?.gigs;
    if (Array.isArray(raw)) return raw;
    return [];
  }, [myGigsData]);

  const metrics = (myGigsData as { data?: HubBuyerGigsData })?.data?.metrics ??
    myGigsData?.metrics ?? {
      totalWon: myGigs.filter((g) => g.isWon).length,
      activeTasks: myGigs.filter((g) => g.status === "accepted").length,
      completedTasks: myGigs.filter((g) => g.status === "completed").length,
      totalEarnedKobo: myGigs
        .filter((g) => g.payoutStatus === "released")
        .reduce((sum, g) => sum + (g.rewardKobo || 0), 0),
    };

  const filteredMyGigs = useMemo(() => {
    if (statusFilter === "all") return myGigs;
    if (statusFilter === "active")
      return myGigs.filter((g) => g.status === "accepted");
    if (statusFilter === "submitted")
      return myGigs.filter((g) => g.status === "submitted");
    if (statusFilter === "completed")
      return myGigs.filter((g) => g.status === "completed");
    return myGigs;
  }, [myGigs, statusFilter]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    availableGigs.forEach((g) => {
      if (g.category) set.add(g.category);
    });
    return Array.from(set);
  }, [availableGigs]);

  // Handle Apply Submission
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGigToApply) return;
    if (!pitch.trim()) {
      toast.error("Please explain your approach or pitch for this gig");
      return;
    }

    setSubmittingApply(true);
    try {
      const res = await fetch(`/api/hub/gigs/${selectedGigToApply.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitch: pitch.trim(),
          proposedDuration: duration,
          contactPhone: contactPhone.trim() || undefined,
        }),
      });

      const resData = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(resData?.error || "Failed to submit proposal");
      }

      toast.success(
        "Proposal submitted! The vendor will review your application.",
      );
      setSelectedGigToApply(null);
      setPitch("");
      setContactPhone("");
      void queryClient.invalidateQueries({ queryKey: ["hub", "gigs"] });
      setActiveTab("mine");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error applying for gig",
      );
    } finally {
      setSubmittingApply(false);
    }
  };

  // Handle Proof Submission
  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGigToSubmit) return;
    if (!proofNotes.trim()) {
      toast.error("Please describe the work completed and findings");
      return;
    }

    setSubmittingProof(true);
    try {
      const res = await fetch(
        `/api/hub/gigs/${selectedGigToSubmit.gigId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: proofNotes.trim(),
            links: proofLink.trim() ? [proofLink.trim()] : [],
          }),
        },
      );

      const resData = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(resData?.error || "Failed to submit proof of work");
      }

      toast.success(
        "Proof of work submitted! Payout will release upon vendor approval.",
      );
      setSelectedGigToSubmit(null);
      setProofNotes("");
      setProofLink("");
      void queryClient.invalidateQueries({ queryKey: ["hub", "gigs"] });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error submitting proof",
      );
    } finally {
      setSubmittingProof(false);
    }
  };

  const gigListToRender = availableGigs;

  return (
    <div className="w-full min-h-dvh bg-white dark:bg-canvas py-0 sm:py-6 text-ink">
      <div className="mx-auto max-w-7xl px-0 sm:px-6 lg:px-8 space-y-6 sm:space-y-10">
        {/* ========================================================= */}
        {/* HERO SECTION                                              */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden pt-4 sm:pt-2 pb-6 sm:pb-8 w-full">
          {/* Warm curved background arch on the right */}
          <div
            aria-hidden="true"
            className="absolute right-0 top-0 bottom-0 w-full lg:w-[54%] rounded-l-[140px] sm:rounded-l-[200px] bg-gradient-to-bl from-orange-200/50 via-orange-100/35 to-transparent pointer-events-none -z-0"
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Headline, Description, Feature Badges & CTAs */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 px-4 sm:px-0">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-black tracking-tight text-ink leading-[1.12]">
                  Fulfill Tasks. Verify Stores. <br />
                  <span className="text-[#ff5500]">Earn Cash Bounties.</span>
                </h1>
                <p className="mt-4 text-sm sm:text-base text-gray-600 dark:text-ink/75 leading-relaxed max-w-xl">
                  Support verified merchants across Nigeria by conducting
                  storefront KYC audits, inventory checks, and digital reviews.
                  Every task is backed by Velte Escrow and paid directly to your
                  wallet upon completion.
                </p>
              </div>

              {/* Activity Feature Badges */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff5500] text-white shadow-xs">
                    <ShieldCheck size={14} />
                  </span>
                  <span className="text-xs font-bold text-ink leading-tight">
                    Storefront <br className="hidden sm:inline" />
                    KYC &amp; Audits
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff5500] text-white shadow-xs">
                    <Camera size={14} />
                  </span>
                  <span className="text-xs font-bold text-ink leading-tight">
                    Catalog &amp; <br className="hidden sm:inline" />
                    Photo Audits
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff5500] text-white shadow-xs">
                    <ShieldCheck size={14} />
                  </span>
                  <span className="text-xs font-bold text-ink leading-tight">
                    100% Escrow <br className="hidden sm:inline" />
                    Protected
                  </span>
                </div>
              </div>

              {/* CTAs */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("explore")}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#ff5500] hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/25 transition-all transform active:scale-95 cursor-pointer"
                >
                  <span>Explore Opportunities</span>
                  <ArrowRightIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("guide")}
                  className="inline-flex items-center gap-2 px-4 py-3 text-xs font-bold text-ink hover:text-[#ff5500] transition-colors cursor-pointer"
                >
                  <span className="text-[#ff5500] text-xs">▶</span>
                  <span>Learn More</span>
                </button>
              </div>
            </div>

            {/* Right Column: Lady Auditor with Floating Overlays */}
            <div className="lg:col-span-5 relative flex justify-center items-center">
              <div className="relative w-full max-w-[420px] aspect-[4/4.2] sm:aspect-[4/4.5] flex items-end justify-center">
                {/* Lady Photo */}
                <img
                  src="/hub/gigs-hero-lady-hd.png"
                  alt="Velte verified task auditor"
                  className="w-full h-full object-contain object-bottom drop-shadow-xl select-none pointer-events-none"
                />

                {/* Floating Top Badge: Escrow Guaranteed */}
                <div className="absolute top-4 right-2 sm:right-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-canvas/95 backdrop-blur-md border border-gray-100 dark:border-white/10 shadow-lg text-xs font-bold text-ink">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckIcon size={10} />
                  </span>
                  <span>
                    Escrow Guaranteed:{" "}
                    <strong className="font-extrabold text-ink">₦25,000</strong>
                  </span>
                </div>

                {/* Floating Bottom Card: Storefront KYC Verification */}
                <div className="absolute bottom-4 left-2 right-2 sm:left-4 sm:right-4 p-3 rounded-2xl bg-white/95 dark:bg-canvas/95 backdrop-blur-md border border-gray-100 dark:border-white/10 shadow-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#ff5500]">
                      <MapPinIcon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-ink truncate">
                          Storefront KYC Verification
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-ink/60 truncate">
                        Lagos, Nigeria · Field Audit Bounty
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("explore")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff5500] hover:bg-orange-600 text-white shadow-sm transition-transform active:scale-90 cursor-pointer"
                  >
                    <ArrowRightIcon size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* METRICS BAR                                               */}
        {/* ========================================================= */}
        <div className="w-full rounded-none sm:rounded-2xl bg-surface border-y sm:border border-x-0 sm:border-x border-gray-100 dark:border-white/10 shadow-sm p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-white/10">
          <div className="flex items-center gap-3.5 px-3 py-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#ff5500]">
              <Trophy size={20} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-[#ff5500] tracking-tight">
                {formatNaira((metrics.totalEarnedKobo || 0) / 100)}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-ink/60 font-medium">
                Escrow payouts released
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 px-3 py-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#ff5500]">
              <BarChart3 size={20} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-ink tracking-tight">
                {metrics.totalWon}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-ink/60 font-medium">
                Gigs won
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 px-3 py-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#ff5500]">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-ink tracking-tight">
                {metrics.activeTasks}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-ink/60 font-medium">
                Active in progress
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 px-3 py-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-ink tracking-tight">
                {metrics.completedTasks}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-ink/60 font-medium">
                Tasks validated
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TABS NAVIGATION                                           */}
        {/* ========================================================= */}
        <div className="border-b border-gray-100 dark:border-white/10 pb-2 overflow-x-auto px-4 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-2 min-w-max">
            <button
              type="button"
              onClick={() => setActiveTab("explore")}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
                activeTab === "explore"
                  ? "bg-[#ff5500] text-white shadow-sm"
                  : "bg-surface border border-gray-200 dark:border-white/10 text-gray-600 dark:text-ink/70 hover:border-orange-500/40",
              )}
            >
              <BriefcaseIcon size={14} className="shrink-0" />
              <span className="whitespace-nowrap">Explore Opportunities</span>
              {availableGigs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold shrink-0">
                  {availableGigs.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("mine")}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
                activeTab === "mine"
                  ? "bg-[#ff5500] text-white shadow-sm"
                  : "bg-surface border border-gray-200 dark:border-white/10 text-gray-600 dark:text-ink/70 hover:border-orange-500/40",
              )}
            >
              <ZapIcon size={14} className="shrink-0" />
              <span className="whitespace-nowrap">
                My Tasks ({myGigs.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("guide")}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
                activeTab === "guide"
                  ? "bg-[#ff5500] text-white shadow-sm"
                  : "bg-surface border border-gray-200 dark:border-white/10 text-gray-600 dark:text-ink/70 hover:border-orange-500/40",
              )}
            >
              <FileTextIcon size={14} className="shrink-0" />
              <span className="whitespace-nowrap">How Escrow Works</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: EXPLORE AVAILABLE GIGS                             */}
        {/* ========================================================= */}
        {activeTab === "explore" && (
          <div className="space-y-6 sm:space-y-8">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1 px-4 sm:px-0">
              <div>
                <div className="h-1 w-10 bg-[#ff5500] rounded-full mb-2.5" />
                <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                  Explore Opportunities
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-ink/60 mt-1">
                  Find tasks that match your skills and start earning today.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setModeFilter("all");
                    setSelectedCategory("all");
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-[#ff5500] text-[#ff5500] hover:bg-orange-50 dark:hover:bg-orange-950/20 font-bold text-xs transition-all cursor-pointer"
                >
                  <span>View All Opportunities</span>
                  <ArrowRightIcon size={13} />
                </button>
              </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-none sm:rounded-2xl bg-surface border-y sm:border border-x-0 sm:border-x border-gray-200 dark:border-white/10 shadow-xs">
              <div className="relative flex-1">
                <SearchIcon
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search tasks, e.g. 'audit', 'catalog', 'social'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-orange-500 focus:bg-surface focus:outline-none text-ink placeholder:text-gray-400 transition-all"
                />
              </div>

              {/* Work Mode Filters */}
              <div className="flex items-center gap-1.5 self-center sm:self-auto shrink-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {(["all", "remote", "on-site"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setModeFilter(mode)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer capitalize whitespace-nowrap shrink-0",
                      modeFilter === mode
                        ? "bg-[#ff5500] text-white shadow-xs"
                        : "text-gray-600 dark:text-ink/70 hover:bg-gray-100 dark:hover:bg-white/5",
                    )}
                  >
                    {mode === "all" ? "All Modes" : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Gig List / Grid */}
            {loadingExplore ? (
              <div className="py-20 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
                <p className="mt-3 text-sm text-gray-500 font-medium">
                  Loading available vendor bounties...
                </p>
              </div>
            ) : gigListToRender.length === 0 ? (
              <div className="py-16 text-center rounded-none sm:rounded-3xl border-y sm:border border-x-0 sm:border-x border-dashed border-gray-200 dark:border-white/10 p-8 sm:p-12 bg-surface">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 mb-4">
                  <BriefcaseIcon size={28} />
                </div>
                <h3 className="text-lg font-bold text-ink">
                  No Opportunities Found
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-ink/60 mt-1 max-w-md mx-auto">
                  {searchQuery ||
                  modeFilter !== "all" ||
                  selectedCategory !== "all"
                    ? "No bounties match your current filter criteria. Try resetting filters to explore all tasks."
                    : "There are currently no active merchant bounties available. Check back soon for new task postings!"}
                </p>
                {(searchQuery ||
                  modeFilter !== "all" ||
                  selectedCategory !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setModeFilter("all");
                      setSelectedCategory("all");
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#ff5500] text-white text-xs font-bold shadow-xs hover:bg-orange-600 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {gigListToRender.map((gig) => {
                  const hasApplied = gig.hasApplied;
                  const cardImage =
                    gig.imageUrl ||
                    gig.posterUrl ||
                    (gig.images && gig.images[0]) ||
                    gig.vendor?.avatar ||
                    null;
                  return (
                    <div
                      key={gig.id}
                      className="group flex flex-col justify-between rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-x border-gray-100 dark:border-white/10 bg-surface overflow-hidden shadow-xs hover:shadow-md hover:border-orange-500/30 transition-all"
                    >
                      <div>
                        {/* Card Image with Floating WorkMode Badge */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-white/5">
                          {cardImage ? (
                            <ProtectedPosterPreview
                              src={cardImage}
                              fit="cover"
                              className="h-full w-full group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent text-[#ff5500] p-4 text-center">
                              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 shadow-xs flex items-center justify-center mb-2">
                                <BriefcaseIcon
                                  size={24}
                                  className="text-[#ff5500]"
                                />
                              </div>
                              <span className="text-[11px] font-bold text-gray-500 dark:text-ink/60 uppercase tracking-wider">
                                {gig.category.replace(/_/g, " ")}
                              </span>
                            </div>
                          )}
                          <div className="absolute top-3 right-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs capitalize",
                                gig.workMode === "remote"
                                  ? "bg-white/95 dark:bg-canvas/95 text-gray-700 dark:text-ink/80 border border-gray-200/60 dark:border-white/10"
                                  : "bg-white/95 dark:bg-canvas/95 text-orange-600 dark:text-orange-400 border border-orange-200/80",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  gig.workMode === "remote"
                                    ? "bg-gray-400"
                                    : "bg-[#ff5500]",
                                )}
                              />
                              {gig.workMode === "remote" ? "Remote" : "On-Site"}
                            </span>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-5 space-y-3">
                          {/* Title */}
                          <h3 className="text-base font-bold text-ink line-clamp-2 leading-snug group-hover:text-[#ff5500] transition-colors">
                            {gig.title}
                          </h3>

                          {/* Reward */}
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-[#ff5500]">
                              {formatNaira(gig.rewardKobo / 100)}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                              Instant Escrow Payout
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-gray-500 dark:text-ink/65 line-clamp-3 leading-relaxed">
                            {gig.description}
                          </p>

                          {/* Meta Row: Location & Time */}
                          <div className="flex items-center gap-4 pt-1 text-xs text-gray-400 font-medium">
                            <span className="inline-flex items-center gap-1 truncate">
                              <MapPinIcon
                                size={12}
                                className="text-gray-400 shrink-0"
                              />
                              <span className="truncate">
                                {gig.location || "Nigeria"}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1 shrink-0">
                              <ClockIcon size={12} />
                              <span>{timeAgo(gig.createdAt)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Vendor & Action */}
                      <div className="p-5 pt-0">
                        <div className="pt-3.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-3">
                          <HubLink
                            href={
                              gig.vendor.handle
                                ? `/store/${gig.vendor.handle}`
                                : "#"
                            }
                            className="flex items-center gap-2.5 min-w-0"
                            onClick={(e) =>
                              !gig.vendor.handle && e.preventDefault()
                            }
                          >
                            <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                              {gig.vendor.avatar ? (
                                <img
                                  src={gig.vendor.avatar}
                                  alt={gig.vendor.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                gig.vendor.name[0]
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-ink truncate flex items-center gap-1">
                                <span className="truncate">
                                  {gig.vendor.name}
                                </span>
                                {gig.vendor.verified && (
                                  <CheckCircle2
                                    size={12}
                                    className="fill-emerald-500 text-white shrink-0"
                                  />
                                )}
                              </span>
                              <span className="text-[10px] text-gray-400 truncate block">
                                {gig.vendor.handle
                                  ? `@${gig.vendor.handle}`
                                  : gig.location ||
                                    (gig.vendor.verified
                                      ? "Verified Merchant"
                                      : "Merchant")}
                              </span>
                            </div>
                          </HubLink>

                          {hasApplied ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3.5 py-1.5 rounded-full shrink-0">
                              <CheckIcon size={13} />
                              Applied
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedGigToApply(gig)}
                              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-[#ff5500] hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                            >
                              <span>Apply</span>
                              <ArrowRightIcon size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MY WON GIGS & EARNINGS                             */}
        {/* ========================================================= */}
        {activeTab === "mine" && (
          <div className="space-y-6">
            {/* Status Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 px-4 sm:px-0">
              {(["all", "active", "submitted", "completed"] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer shrink-0",
                      statusFilter === st
                        ? "bg-orange-600 text-white shadow-sm"
                        : "bg-surface border border-gray-200 dark:border-white/10 text-gray-600 dark:text-ink/70 hover:border-orange-500/30",
                    )}
                  >
                    {st === "all"
                      ? `All My Gigs (${myGigs.length})`
                      : st === "active"
                        ? `In Progress (${myGigs.filter((g) => g.status === "accepted").length})`
                        : st === "submitted"
                          ? `Under Review (${myGigs.filter((g) => g.status === "submitted").length})`
                          : `Completed & Paid (${myGigs.filter((g) => g.status === "completed").length})`}
                  </button>
                ),
              )}
            </div>

            {loadingMyGigs ? (
              <div className="py-20 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
                <p className="mt-3 text-sm text-gray-500 font-medium">
                  Loading your gig records...
                </p>
              </div>
            ) : filteredMyGigs.length === 0 ? (
              <div className="py-16 text-center rounded-none sm:rounded-3xl border-y sm:border border-x-0 sm:border-x border-dashed border-gray-200 dark:border-white/10 p-8 bg-surface">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 mb-3">
                  <BriefcaseIcon size={28} />
                </span>
                <h3 className="text-base font-bold text-ink">
                  No gig applications in this category
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Browse open tasks in the Explore tab and submit pitches to
                  vendors to win jobs and cash bounties.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("explore")}
                  className="mt-4 px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition-colors cursor-pointer"
                >
                  Explore Available Gigs
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMyGigs.map((item) => {
                  const isWon = item.isWon;
                  const canSubmitProof = item.status === "accepted";
                  const isReview = item.status === "submitted";
                  const isCompleted = item.status === "completed";

                  return (
                    <div
                      key={item.applicationId}
                      className="rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-x border-gray-200 dark:border-white/10 bg-surface p-5 sm:p-6 shadow-sm hover:border-orange-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Status Pills */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                              isCompleted
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : canSubmitProof
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                  : isReview
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                    : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400",
                            )}
                          >
                            {item.status === "accepted"
                              ? "Active · In Progress"
                              : item.status === "submitted"
                                ? "Proof Submitted · In Review"
                                : item.status === "completed"
                                  ? "Completed & Paid"
                                  : "Application Pending"}
                          </span>

                          <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                            <ClockIcon size={12} />
                            Applied {timeAgo(item.createdAt)}
                          </span>

                          <span className="text-[11px] font-medium text-gray-400">
                            Duration: {item.proposedDuration}
                          </span>
                        </div>

                        {/* Title & Reward */}
                        <h3 className="text-base font-bold text-ink truncate">
                          {item.title}
                        </h3>

                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                            {formatNaira(item.rewardKobo / 100)}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">
                            • Vendor: {item.vendor.name}
                          </span>
                        </div>

                        {/* Pitch preview */}
                        <p className="text-xs text-gray-500 dark:text-ink/60 bg-gray-50 dark:bg-white/[0.02] p-2.5 rounded-xl border border-gray-100 dark:border-white/5 line-clamp-2">
                          <strong className="text-ink font-semibold">
                            Your Pitch:{" "}
                          </strong>
                          {item.pitch}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 flex items-center gap-2">
                        {canSubmitProof && (
                          <button
                            type="button"
                            onClick={() => setSelectedGigToSubmit(item)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                          >
                            <UploadIcon size={14} />
                            <span>Submit Proof of Work</span>
                          </button>
                        )}

                        {isReview && (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
                              <ClockIcon size={13} />
                              Awaiting Vendor Verification
                            </span>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                              <BadgeCheckIcon size={13} />₦ Payout Released
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: WORKFLOW & ESCROW GUIDELINES                       */}
        {/* ========================================================= */}
        {activeTab === "guide" && (
          <div className="rounded-none sm:rounded-3xl border-y sm:border border-x-0 sm:border-x border-gray-200 dark:border-white/10 bg-surface p-5 sm:p-8 space-y-8">
            <div>
              <h2 className="text-xl font-bold text-ink">
                How Velte Vendor Bounties &amp; Escrow Work
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-ink/60">
                A safe, transparent proof-of-work mechanism designed for
                high-reputation buyers to support stores and earn money.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 space-y-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-sm">
                  1
                </span>
                <h3 className="text-sm font-bold text-ink">
                  Discover &amp; Pitch
                </h3>
                <p className="text-xs text-gray-500 dark:text-ink/60 leading-relaxed">
                  Browse open tasks in the Explore tab. Submit a concise
                  proposal with your completion timeframe and contact details.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 space-y-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-sm">
                  2
                </span>
                <h3 className="text-sm font-bold text-ink">Vendor Selection</h3>
                <p className="text-xs text-gray-500 dark:text-ink/60 leading-relaxed">
                  The vendor reviews applications and selects the best
                  candidate. When selected, the gig moves to your active
                  dashboard.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 space-y-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-sm">
                  3
                </span>
                <h3 className="text-sm font-bold text-ink">Submit Proof</h3>
                <p className="text-xs text-gray-500 dark:text-ink/60 leading-relaxed">
                  Perform the requested work (audit, photography, social share,
                  review) and submit documented findings with links and notes.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 space-y-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-sm">
                  4
                </span>
                <h3 className="text-sm font-bold text-ink">
                  Instant Escrow Payout
                </h3>
                <p className="text-xs text-gray-500 dark:text-ink/60 leading-relaxed">
                  Once the vendor validates your submission, funds held in
                  escrow are released instantly to your Velte wallet.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* APPLY FOR GIG SUB-MODAL                                   */}
      {/* ========================================================= */}
      {selectedGigToApply && (
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4",
            modalScrimClass(),
          )}
          onClick={() => !submittingApply && setSelectedGigToApply(null)}
        >
          <div
            className="bg-surface w-full max-w-lg rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 flex flex-col max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md">
                  Submit Proposal
                </span>
                <h2 className="text-lg font-bold text-ink mt-2">
                  {selectedGigToApply.title}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Bounty Reward:{" "}
                  <strong className="text-orange-600 dark:text-orange-400 font-bold">
                    {formatNaira(selectedGigToApply.rewardKobo / 100)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGigToApply(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-ink hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Why are you the best fit for this task?
                </label>
                <textarea
                  required
                  rows={4}
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  placeholder="Outline your experience, relevant background, or how you intend to fulfill this task accurately..."
                  className="w-full p-3 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-orange-500 focus:bg-surface focus:outline-none text-ink placeholder:text-gray-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Estimated Time
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full p-2.5 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-orange-500 focus:bg-surface focus:outline-none text-ink"
                  >
                    <option value="Same day (within 24h)">Within 24h</option>
                    <option value="2-3 days">2 - 3 Days</option>
                    <option value="4-5 days">4 - 5 Days</option>
                    <option value="1 week">1 Week</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="080 1234 5678"
                    className="w-full p-2.5 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-orange-500 focus:bg-surface focus:outline-none text-ink placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 text-[11px] text-orange-800 dark:text-orange-300">
                🔒 <strong>Escrow Protected:</strong> Funds for this bounty are
                pre-funded into Velte Escrow. Upon completion and vendor
                approval, funds release directly to your wallet.
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedGigToApply(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApply}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingApply ? "Submitting..." : "Send Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBMIT PROOF OF WORK MODAL                                */}
      {/* ========================================================= */}
      {selectedGigToSubmit && (
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4",
            modalScrimClass(),
          )}
          onClick={() => !submittingProof && setSelectedGigToSubmit(null)}
        >
          <div
            className="bg-surface w-full max-w-lg rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 flex flex-col max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md">
                  Submit Deliverable
                </span>
                <h2 className="text-lg font-bold text-ink mt-2">
                  {selectedGigToSubmit.title}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Vendor: {selectedGigToSubmit.vendor.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGigToSubmit(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-ink hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleProofSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Work Notes &amp; Findings
                </label>
                <textarea
                  required
                  rows={4}
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  placeholder="Detail your completed actions, findings, audit results, or work summary..."
                  className="w-full p-3 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-orange-500 focus:bg-surface focus:outline-none text-ink placeholder:text-gray-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Proof Link (Google Drive / Live Post / Report URL)
                </label>
                <input
                  type="url"
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-orange-500 focus:bg-surface focus:outline-none text-ink placeholder:text-gray-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedGigToSubmit(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProof}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingProof ? "Submitting..." : "Submit Proof of Work"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
