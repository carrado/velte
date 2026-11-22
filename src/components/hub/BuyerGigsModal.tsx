"use client";

import { useMemo, useState } from "react";
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
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  StoreIcon,
  UploadIcon,
  ZapIcon,
} from "@/components/icons";
import { modalScrimClass } from "@/lib/modalScrim";
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import type {
  HubBuyerGigItem,
  HubBuyerGigsData,
  HubGigItem,
} from "@/types/hub";

interface BuyerGigsModalProps {
  open: boolean;
  onClose: () => void;
  isPremium?: boolean;
  onUpgrade?: () => void;
}

export function BuyerGigsModal({
  open,
  onClose,
  isPremium = true,
  onUpgrade,
}: BuyerGigsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"explore" | "my_gigs">("explore");
  const [modeFilter, setModeFilter] = useState<"all" | "remote" | "on-site">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");

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

  // 1. Fetch available gigs
  const { data: exploreData, isLoading: loadingExplore } = useQuery<{
    success: boolean;
    data: HubGigItem[];
  }>({
    queryKey: ["hub", "gigs", "explore", modeFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (modeFilter !== "all") params.set("workMode", modeFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const res = await fetch(`/api/hub/gigs?${params.toString()}`);
      if (!res.ok) throw new Error("Could not fetch available gigs");
      return res.json();
    },
    enabled: open && activeTab === "explore",
  });

  // 2. Fetch my gigs & won tasks
  const { data: myGigsData, isLoading: loadingMyGigs } = useQuery<{
    success: boolean;
    data: HubBuyerGigsData;
  }>({
    queryKey: ["hub", "gigs", "mine"],
    queryFn: async () => {
      const res = await fetch("/api/hub/gigs/mine");
      if (!res.ok) throw new Error("Could not fetch your gigs");
      return res.json();
    },
    enabled: open,
  });

  const availableGigs: HubGigItem[] = useMemo(() => {
    const raw = exploreData?.data;
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray((raw as { data?: HubGigItem[] }).data)) {
      return (raw as { data: HubGigItem[] }).data;
    }
    return [];
  }, [exploreData]);

  const myGigsInfo = useMemo(() => {
    const defaultData: HubBuyerGigsData = {
      gigs: [],
      metrics: {
        totalWon: 0,
        activeTasks: 0,
        completedTasks: 0,
        totalEarnedKobo: 0,
      },
    };
    if (!myGigsData?.data) return defaultData;
    return myGigsData.data;
  }, [myGigsData]);

  if (!open) return null;

  // Handle Apply Submission
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGigToApply) return;
    if (pitch.trim().length < 10) {
      toast.error("Please write a pitch of at least 10 characters.");
      return;
    }

    setSubmittingApply(true);
    try {
      const res = await fetch(`/api/hub/gigs/${selectedGigToApply.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitch: pitch.trim(),
          proposedDuration: duration.trim(),
          phone: contactPhone.trim() || undefined,
        }),
      });

      const resData = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(resData?.error || "Failed to submit proposal.");
      }

      toast.success("Proposal submitted! The vendor has been notified.");
      setSelectedGigToApply(null);
      setPitch("");
      setContactPhone("");
      queryClient.invalidateQueries({ queryKey: ["hub", "gigs"] });
      setActiveTab("my_gigs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmittingApply(false);
    }
  };

  // Handle Proof Submission
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGigToSubmit) return;
    if (proofNotes.trim().length < 5) {
      toast.error("Please describe the work completed.");
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
        throw new Error(resData?.error || "Failed to submit proof of work.");
      }

      toast.success(
        "Proof of work submitted! The vendor is reviewing your submission.",
      );
      setSelectedGigToSubmit(null);
      setProofNotes("");
      setProofLink("");
      queryClient.invalidateQueries({ queryKey: ["hub", "gigs"] });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Proof submission failed.",
      );
    } finally {
      setSubmittingProof(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buyer Gigs & Bounties"
      className={cn(
        "fixed inset-0 z-50 h-dvh w-dvw flex items-end sm:items-center justify-center p-2 sm:p-4",
        modalScrimClass(),
      )}
      onClick={onClose}
    >
      <div
        className="bg-surface w-full sm:max-w-3xl rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <BriefcaseIcon size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-ink">
                  Vendor Tasks &amp; Gigs
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Earn ₦ Bounties
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-ink/60">
                Win jobs posted by verified vendors and earn cash rewards
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-ink hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-gray-100 dark:border-white/5 px-4 bg-gray-50/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setActiveTab("explore")}
            className={cn(
              "py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2",
              activeTab === "explore"
                ? "border-orange-500 text-orange-600 dark:text-orange-400"
                : "border-transparent text-gray-500 hover:text-ink",
            )}
          >
            <SearchIcon size={14} />
            <span>Explore Available Gigs</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
              {availableGigs.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("my_gigs")}
            className={cn(
              "py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2",
              activeTab === "my_gigs"
                ? "border-orange-500 text-orange-600 dark:text-orange-400"
                : "border-transparent text-gray-500 hover:text-ink",
            )}
          >
            <BriefcaseIcon size={14} />
            <span>My Gigs &amp; Won Tasks</span>
            {myGigsInfo.metrics.totalWon > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-bold">
                {myGigsInfo.metrics.totalWon} won
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Explore Available Gigs */}
        {activeTab === "explore" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Filter & Search Bar */}
            <div className="p-3.5 border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setModeFilter("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    modeFilter === "all"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-ink/70 hover:bg-gray-200 dark:hover:bg-white/10",
                  )}
                >
                  All Modes
                </button>
                <button
                  type="button"
                  onClick={() => setModeFilter("remote")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    modeFilter === "remote"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-ink/70 hover:bg-gray-200 dark:hover:bg-white/10",
                  )}
                >
                  Remote Only
                </button>
                <button
                  type="button"
                  onClick={() => setModeFilter("on-site")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    modeFilter === "on-site"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-ink/70 hover:bg-gray-200 dark:hover:bg-white/10",
                  )}
                >
                  On-site Tasks
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <SearchIcon
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search tasks, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-ink placeholder:text-gray-400 focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* Gigs List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {loadingExplore ? (
                <div className="py-16 text-center text-xs text-gray-400">
                  Loading available vendor gigs...
                </div>
              ) : availableGigs.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-400 mx-auto flex items-center justify-center">
                    <BriefcaseIcon size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-ink">
                    No Gigs Match Your Filter
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-ink/60 max-w-sm mx-auto">
                    Check back soon — vendors regularly post new on-ground
                    verification, cataloging, and delivery tasks.
                  </p>
                </div>
              ) : (
                availableGigs.map((gig) => (
                  <div
                    key={gig.id}
                    className="p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-surface hover:border-orange-500/40 transition-all flex flex-col gap-3 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap pb-1">
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                              gig.workMode === "remote"
                                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
                            )}
                          >
                            {gig.workMode === "remote"
                              ? "🌐 Remote"
                              : "📍 On-Site"}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-ink/60 border border-gray-200 dark:border-white/10">
                            {gig.category.replace("_", " & ")}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-ink leading-snug">
                          {gig.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-ink/70 leading-relaxed mt-1 line-clamp-2">
                          {gig.description}
                        </p>
                      </div>

                      {/* Reward Pill */}
                      <div className="sm:text-right shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 font-bold text-sm border border-orange-200/60 dark:border-orange-500/20">
                          <SparklesIcon size={14} className="text-amber-500" />
                          <span>{formatNaira(gig.rewardKobo)}</span>
                        </span>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                          {gig.rewardType === "instant"
                            ? "Fixed Payout"
                            : "Milestone Pay"}
                        </p>
                      </div>
                    </div>

                    {/* Skills Tags */}
                    {gig.requiredSkills && gig.requiredSkills.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[11px] font-semibold text-gray-400">
                          Skills:
                        </span>
                        {gig.requiredSkills.map((skill) => (
                          <span
                            key={skill}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-ink/60 border border-gray-100 dark:border-white/5"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer Info & Action */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5 flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden flex items-center justify-center font-bold text-[10px] text-gray-500 shrink-0">
                          {gig.vendor.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={gig.vendor.avatar}
                              alt={gig.vendor.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            gig.vendor.name.charAt(0)
                          )}
                        </div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">
                          {gig.vendor.name}
                        </span>
                        {gig.vendor.verified && (
                          <BadgeCheckIcon
                            size={14}
                            className="text-sky-500 shrink-0"
                          />
                        )}
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-400 truncate flex items-center gap-1">
                          <MapPinIcon size={12} />
                          <span>{gig.location}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {gig.hasApplied ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold",
                              gig.myApplicationStatus === "accepted"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                            )}
                          >
                            {gig.myApplicationStatus === "accepted"
                              ? "🎉 Won (In Progress)"
                              : "⏳ Proposal Submitted"}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedGigToApply(gig)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                          >
                            <span>Apply for Gig</span>
                            <ArrowRightIcon size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: My Won Gigs & Earnings */}
        {activeTab === "my_gigs" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-4 gap-2 p-4 bg-gray-50/70 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 text-center">
              <div className="p-2 rounded-xl bg-surface border border-gray-100 dark:border-white/5">
                <p className="text-[11px] text-gray-400 font-medium">
                  Gigs Won
                </p>
                <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {myGigsInfo.metrics.totalWon}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-surface border border-gray-100 dark:border-white/5">
                <p className="text-[11px] text-gray-400 font-medium">
                  In Progress
                </p>
                <p className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                  {myGigsInfo.metrics.activeTasks}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-surface border border-gray-100 dark:border-white/5">
                <p className="text-[11px] text-gray-400 font-medium">
                  Completed
                </p>
                <p className="text-base sm:text-lg font-bold text-ink mt-0.5">
                  {myGigsInfo.metrics.completedTasks}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-surface border border-gray-100 dark:border-white/5">
                <p className="text-[11px] text-gray-400 font-medium">
                  Total Earned
                </p>
                <p className="text-base sm:text-lg font-bold text-ink mt-0.5">
                  {formatNaira(myGigsInfo.metrics.totalEarnedKobo)}
                </p>
              </div>
            </div>

            {/* My Gigs Items List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {loadingMyGigs ? (
                <div className="py-16 text-center text-xs text-gray-400">
                  Loading your gigs history...
                </div>
              ) : myGigsInfo.gigs.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 mx-auto flex items-center justify-center">
                    <BriefcaseIcon size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-ink">
                    You Haven&apos;t Applied for Any Gigs Yet
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-ink/60 max-w-sm mx-auto">
                    Explore available vendor tasks in the Explore tab. Submit
                    proposals to win gigs and earn payouts upon completion.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("explore")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      <span>Explore Open Gigs</span>
                      <ArrowRightIcon size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                myGigsInfo.gigs.map((item) => (
                  <div
                    key={item.applicationId}
                    className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-surface flex flex-col gap-3 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-ink">
                            {item.title}
                          </h4>
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                              item.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : item.status === "accepted"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                  : item.status === "submitted"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                    : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-ink/60",
                            )}
                          >
                            {item.status === "accepted"
                              ? "🎉 Won (In Progress)"
                              : item.status === "submitted"
                                ? "⏳ Proof Under Review"
                                : item.status === "completed"
                                  ? "✅ Completed & Paid"
                                  : "⏳ Proposal Pending"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Vendor:{" "}
                          <span className="font-semibold text-ink">
                            {item.vendor.name}
                          </span>{" "}
                          · {item.location}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="font-bold text-sm text-orange-600 dark:text-orange-400">
                          {formatNaira(item.rewardKobo)}
                        </span>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {item.payoutStatus === "released"
                            ? "Paid Out"
                            : "Escrow Reward"}
                        </p>
                      </div>
                    </div>

                    {/* Proposal Snippet */}
                    <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-ink/70">
                      <p className="font-medium text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">
                        Your Pitch:
                      </p>
                      <p className="line-clamp-2">{item.pitch}</p>
                    </div>

                    {/* Action Bar for Won Gigs */}
                    {item.status === "accepted" && (
                      <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckIcon size={14} />
                          <span>Gig Awarded! Ready for your submission.</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedGigToSubmit(item)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          <UploadIcon size={13} />
                          <span>Submit Proof of Work</span>
                        </button>
                      </div>
                    )}

                    {item.status === "submitted" && (
                      <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
                        <span className="flex items-center gap-1">
                          <ClockIcon size={13} />
                          <span>
                            Proof of work submitted. Awaiting vendor approval
                            &amp; payout.
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sub-Modal: Apply For Gig */}
      {selectedGigToApply && (
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed inset-0 z-60 h-dvh w-dvw flex items-center justify-center p-4",
            modalScrimClass(),
          )}
          onClick={() => setSelectedGigToApply(null)}
        >
          <div
            className="bg-surface w-full sm:max-w-md rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-ink">Submit Proposal</h4>
                <p className="text-[11px] text-gray-500 truncate max-w-xs">
                  {selectedGigToApply.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGigToApply(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-ink cursor-pointer"
              >
                <CloseIcon size={15} />
              </button>
            </div>

            <form
              onSubmit={handleApply}
              className="p-4 space-y-3.5 overflow-y-auto"
            >
              <div className="p-3 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-orange-600 font-bold uppercase tracking-wider">
                    Task Reward
                  </p>
                  <p className="text-sm font-extrabold text-ink">
                    {formatNaira(selectedGigToApply.rewardKobo)}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-gray-500">
                  {selectedGigToApply.workMode === "remote"
                    ? "Remote Task"
                    : selectedGigToApply.location}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Why are you the best fit for this gig? *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain your relevant experience, location proximity, and readiness to complete this task..."
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-ink placeholder:text-gray-400 focus:outline-hidden focus:border-orange-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Turnaround Time
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 24 hours, 2 days"
                    className="w-full p-2.5 rounded-xl text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-ink focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Phone Contact (Optional)
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="080..."
                    className="w-full p-2.5 rounded-xl text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-ink focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGigToApply(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApply || pitch.trim().length < 10}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {submittingApply ? "Sending..." : "Submit Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal: Submit Proof of Work */}
      {selectedGigToSubmit && (
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed inset-0 z-60 h-dvh w-dvw flex items-center justify-center p-4",
            modalScrimClass(),
          )}
          onClick={() => setSelectedGigToSubmit(null)}
        >
          <div
            className="bg-surface w-full sm:max-w-md rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-ink">
                  Submit Proof of Work
                </h4>
                <p className="text-[11px] text-gray-500 truncate max-w-xs">
                  {selectedGigToSubmit.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGigToSubmit(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-ink cursor-pointer"
              >
                <CloseIcon size={15} />
              </button>
            </div>

            <form
              onSubmit={handleSubmitProof}
              className="p-4 space-y-3.5 overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Completion Notes &amp; Summary *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail the work carried out (e.g. visited store, verified address 12 Awolowo Way, took photos, confirmed stock availability)..."
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-ink placeholder:text-gray-400 focus:outline-hidden focus:border-emerald-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Proof Link or Image URL (Google Drive, Cloudinary, Dropbox)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-ink focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGigToSubmit(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProof || proofNotes.trim().length < 5}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {submittingProof ? "Submitting..." : "Send to Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
