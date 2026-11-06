"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

import {
  AlertCircleIcon,
  CheckIcon,
  CrownIcon,
  EyeIcon,
  InfoIcon,
  LightbulbIcon,
  LoaderIcon,
  SendIcon,
  SparklesIcon,
  StarIcon,
  UploadIcon,
  ZapIcon,
} from "@/components/icons";
import { HubHero } from "@/components/hub/HubHero";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import { HubSidebarFooter } from "@/components/hub/HubSidebarFooter";
import {
  PosterPreviewLightbox,
  ProtectedPosterPreview,
} from "@/components/hub/ProtectedPosterPreview";
import { ApiError, api } from "@/lib/api-client";
import { uploadAdvertMedia, validateImageFile } from "@/lib/cloudinary";
import { extractLogoPalette } from "@/lib/extractLogoPalette";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatNaira } from "@/lib/utils";
import {
  fetchHubContext,
  fetchHubHome,
  generateAiPoster,
  hubPageQueryOptions,
} from "@/services/hub";

type AdvertSource = "upload" | "ai";

const HEADLINE_MAX = 60;
const BLURB_MAX = 200;

/** e.g. "3:42 PM · Sat 1 Nov" — 24h after this vendor used up their slots. */
function formatAiPosterResetAt(resetAt: Date): string {
  const time = new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(resetAt);
  const day = new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(resetAt);
  return `${time} · ${day}`;
}

const REFINEMENT_CHIPS: { label: string; icon: string }[] = [
  { label: "Warmer studio lighting", icon: "✨" },
  { label: "Dark minimalist background", icon: "🎨" },
  { label: "Close-up on product", icon: "📸" },
  { label: "Luxury commercial look", icon: "💎" },
  { label: "Bolder vibrant colors", icon: "⚡" },
  { label: "Clean natural daylight", icon: "🌿" },
];

const SOURCES: {
  key: AdvertSource;
  label: string;
  hint: string;
  icon: typeof UploadIcon;
}[] = [
  {
    key: "upload",
    label: "Upload Artwork",
    hint: "Your own design or poster",
    icon: UploadIcon,
  },
  {
    key: "ai",
    label: "AI",
    hint: "Generate poster + copy",
    icon: SparklesIcon,
  },
];

function AiGenerationProgressBar({
  progress,
  stage,
}: {
  progress: number;
  stage: string;
}) {
  const rounded = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div className="rounded-2xl border border-orange-200/90 bg-orange-50/70 p-4 space-y-2.5 shadow-xs transition-all animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex min-w-0 items-center gap-2 font-medium text-orange-950">
          <LoaderIcon
            size={14}
            className="animate-spin text-orange-600 shrink-0"
          />
          <span className="truncate">
            {stage || "Generating advert poster…"}
          </span>
        </div>
        <span className="font-bold text-orange-600 tabular-nums shrink-0 text-xs">
          {rounded}%
        </span>
      </div>

      {/* Progress Track and Bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-orange-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 transition-all duration-300 ease-out"
          style={{ width: `${Math.max(4, rounded)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>Designing creative & drafting copy</span>
        <span>~15–25s</span>
      </div>
    </div>
  );
}

/**
 * Create Advert — HubHero + Upload · AI creatives.
 * Listing promotion lives on Boost, not here.
 */
export function HubAdvertPage({ userId }: { userId: string }) {
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const step2Ref = useRef<HTMLElement>(null);

  const [source, setSource] = useState<AdvertSource>("upload");
  const [hasChosenOnMobile, setHasChosenOnMobile] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [blurb, setBlurb] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiEditPrompt, setAiEditPrompt] = useState("");
  const prevAiBlurbRef = useRef<string | null>(null);
  const [aiCandidates, setAiCandidates] = useState<
    { id: string; url: string }[]
  >([]);
  const [aiHeadlineOptions, setAiHeadlineOptions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [needTopup, setNeedTopup] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiProgressStage, setAiProgressStage] = useState("");
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const contextQuery = useQuery({
    queryKey: queryKeys.hub.context,
    queryFn: fetchHubContext,
    ...hubPageQueryOptions,
  });
  const homeQuery = useQuery({
    queryKey: queryKeys.hub.home("vendor"),
    queryFn: () => fetchHubHome("vendor"),
    ...hubPageQueryOptions,
  });

  const context = contextQuery.data ?? null;
  const home = homeQuery.data ?? null;

  const walletHref = "/wallet";
  const atCap = Boolean(
    context && context.activeAdverts >= context.maxActiveAdverts,
  );
  const costKobo = context?.advertCostKobo ?? 0;
  const enterprise = Boolean(context?.enterprise);
  const canAfford =
    context != null && (enterprise || context.walletBalanceKobo >= costKobo);
  const canPlace =
    Boolean(imageUrl) &&
    headline.trim().length > 0 &&
    !atCap &&
    canAfford &&
    !placing;

  const pickUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadAdvertMedia(file, "velte/adverts/artwork");
      setImageUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const aiRemaining = context?.aiPosterRemaining ?? (enterprise ? 15 : 5);
  const aiSlotsExhausted = aiRemaining <= 0;
  const aiResetIso = context?.aiPosterResetsAt ?? null;
  const aiResetAt =
    aiResetIso && !Number.isNaN(Date.parse(aiResetIso))
      ? new Date(aiResetIso)
      : null;
  const aiResetLabel = aiResetAt ? formatAiPosterResetAt(aiResetAt) : null;

  // Exhausted without a clock — one refetch so the backend can pin resetsAt.
  const triedResetPinRef = useRef(false);
  useEffect(() => {
    if (!aiSlotsExhausted || aiResetLabel || triedResetPinRef.current) return;
    triedResetPinRef.current = true;
    void queryClient.invalidateQueries({ queryKey: queryKeys.hub.context });
  }, [aiSlotsExhausted, aiResetLabel, queryClient]);

  // Clean up progress timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, []);

  const runAiPoster = async (customInstructions?: string) => {
    if (aiBusy || aiSlotsExhausted) return;
    const prompt = aiPrompt.trim();
    if (!prompt) {
      toast.error("Describe the advert you want — offer, message, and style.");
      return;
    }
    setAiBusy(true);
    setAiProgress(8);
    setAiProgressStage("Analyzing store branding & creative directions…");

    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    const startTime = Date.now();
    progressTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed < 3) {
        setAiProgress(Math.min(22, Math.round(8 + (elapsed / 3) * 14)));
        setAiProgressStage("Analyzing store branding & creative directions…");
      } else if (elapsed < 7) {
        setAiProgress(Math.min(44, Math.round(22 + ((elapsed - 3) / 4) * 22)));
        setAiProgressStage("Drafting high-converting headlines & copy…");
      } else {
        const curve = 1 - Math.exp(-(elapsed - 7) / 10);
        const nextProgress = Math.min(82, Math.round(44 + 38 * curve));
        setAiProgress((prev) => Math.max(prev, nextProgress));
        setAiProgressStage("Painting high-resolution advert creative…");
      }
    }, 200);

    try {
      const logoUrl = home?.store?.avatar ?? null;
      const palette = await extractLogoPalette(logoUrl);
      const result = await generateAiPoster({
        storeName: home?.store?.name ?? "Your store",
        prompt,
        instructions: customInstructions?.trim() || null,
        logoUrl,
        palette,
        onProgress: (progress, stage) => {
          if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
          }
          setAiProgress(progress);
          setAiProgressStage(stage);
        },
      });
      setAiCandidates((prev) => {
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `p-${Date.now()}`;
        const next = [
          { id, url: result.imageUrl },
          ...prev.filter((c) => c.url !== result.imageUrl),
        ];
        return next.slice(0, 8);
      });
      setImageUrl(result.imageUrl);
      if (result.headlines.length) {
        setAiHeadlineOptions(result.headlines);
        if (!headline.trim() || aiHeadlineOptions.includes(headline)) {
          setHeadline(result.headlines[0].slice(0, HEADLINE_MAX));
        }
      }
      if (result.blurb) {
        if (!blurb.trim() || blurb === prevAiBlurbRef.current) {
          setBlurb(result.blurb.slice(0, BLURB_MAX));
        }
        prevAiBlurbRef.current = result.blurb.slice(0, BLURB_MAX);
      }
      queryClient.setQueryData(queryKeys.hub.context, (old: typeof context) =>
        old
          ? {
              ...old,
              aiPosterRemaining: result.remaining,
              aiPosterUsed: result.used,
              aiPosterLimit: result.limit,
              aiPosterResetsAt: result.resetsAt ?? old.aiPosterResetsAt ?? null,
            }
          : old,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.hub.context });
      toast.success(
        customInstructions
          ? result.remaining === 0
            ? "Revision ready — that was your last slot for today."
            : `Revision ready — ${result.remaining} slot${result.remaining === 1 ? "" : "s"} left today.`
          : result.remaining === 0
            ? "Poster ready — that was your last one for today."
            : `Poster ready — ${result.remaining} slot${result.remaining === 1 ? "" : "s"} left.`,
      );

      setAiProgress(100);
      setAiProgressStage("Advert poster ready!");
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      if (err instanceof ApiError && err.status === 429) {
        const extra = err.data as {
          resetsAt?: string | null;
          remaining?: number;
        } | null;
        if (extra?.resetsAt) {
          queryClient.setQueryData(
            queryKeys.hub.context,
            (old: typeof context) =>
              old
                ? {
                    ...old,
                    aiPosterRemaining: 0,
                    aiPosterResetsAt: extra.resetsAt,
                  }
                : old,
          );
        }
      }
      toast.error(
        err instanceof Error ? err.message : "Couldn't generate an AI poster.",
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.hub.context });
    } finally {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setAiBusy(false);
      setAiProgress(0);
      setAiProgressStage("");
    }
  };

  const applyRefinementChip = (label: string) => {
    setAiEditPrompt((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return label;
      if (trimmed.toLowerCase().includes(label.toLowerCase())) return trimmed;
      return `${trimmed}, ${label}`;
    });
  };

  const handleRunAiEdit = async () => {
    if (aiBusy || aiSlotsExhausted) return;
    const instructions = aiEditPrompt.trim();
    if (!instructions) {
      toast.error("Tell the AI what to change or adjust in the poster.");
      return;
    }
    await runAiPoster(instructions);
    setAiEditPrompt("");
  };

  const place = async () => {
    if (!canPlace || !imageUrl || !context) return;
    setPlacing(true);
    setNeedTopup(false);
    try {
      await api.post("/api/hub/adverts", {
        imageUrl,
        headline: headline.trim().slice(0, 80),
        blurb: blurb.trim().slice(0, 280),
        templateId: null,
        productId: null,
        boosted: false,
      });
      toast.success("Advert pinned to the Hub.");
      setHeadline("");
      setBlurb("");
      setImageUrl(null);
      setAiPrompt("");
      setAiEditPrompt("");
      setHasChosenOnMobile(false);
      setAiCandidates([]);
      setAiHeadlineOptions([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.hub.context }),
        queryClient.invalidateQueries({ queryKey: queryKeys.hub.adverts }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.hub.home("vendor"),
        }),
      ]);
      navigate("/hub");
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setNeedTopup(true);
      } else {
        toast.error(
          err instanceof Error ? err.message : "Couldn't place this advert.",
        );
      }
    } finally {
      setPlacing(false);
    }
  };

  if (contextQuery.isPending || homeQuery.isPending) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 rounded-none lg:rounded-2xl bg-gray-100" />
        <div className="h-72 rounded-none lg:rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-10 text-center">
        <p className="font-semibold text-ink">
          Couldn&apos;t load Create Advert
        </p>
        <button
          type="button"
          onClick={() => contextQuery.refetch()}
          className="mt-4 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const previewHeadline = headline.trim() || "Your headline will appear here";
  const days = context.advertDays;
  const isStep2VisibleOnMobile = hasChosenOnMobile || Boolean(imageUrl);

  const scrollToStep2 = () => {
    const el = step2Ref.current;
    if (!el) return;

    const header = document.querySelector("header");
    const headerHeight = header ? header.getBoundingClientRect().height : 0;

    const main = el.closest("main");
    if (main && main.scrollHeight > main.clientHeight) {
      const mainRect = main.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetY = elRect.top - mainRect.top + main.scrollTop - 12;
      main.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    } else {
      const elTop = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(0, elTop - headerHeight - 12),
        behavior: "smooth",
      });
    }
  };

  const handleSelectSource = (key: AdvertSource) => {
    setSource(key);
    setHasChosenOnMobile(true);
    setTimeout(() => {
      scrollToStep2();
    }, 60);
  };

  return (
    <div className="w-full">
      <HubHero
        eyebrow="Vendor Hub"
        title="Create Advert"
        subtitle="Pin a sponsored creative to the top of the Hub — upload your artwork or generate one with AI. To promote a listing, use Boost."
        cardImage="/hub/boost-product.jpg"
        cardBadge="Sponsored"
      />

      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            {/* Step 1 */}
            <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  1
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">
                    Choose Your Advert Type
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-600">
                    Pick how you want to create the sponsored creative.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SOURCES.map((item) => {
                  const picked = source === item.key;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSelectSource(item.key)}
                      className={cn(
                        "relative flex flex-col items-start gap-2 rounded-2xl border bg-canvas px-4 py-4 text-left transition-colors",
                        picked
                          ? cn(
                              "lg:border-orange-500 lg:ring-2 lg:ring-orange-500/20",
                              hasChosenOnMobile
                                ? "border-orange-500 ring-2 ring-orange-500/20"
                                : "border-gray-200 hover:border-orange-300",
                            )
                          : "border-gray-200 hover:border-orange-300",
                      )}
                    >
                      {picked && (
                        <span
                          className={cn(
                            "absolute bottom-3 right-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white",
                            !hasChosenOnMobile && "hidden lg:inline-flex",
                          )}
                        >
                          <CheckIcon size={12} />
                        </span>
                      )}
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                        <Icon size={18} />
                      </span>
                      <span className="text-sm font-bold text-ink">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-gray-600">
                        {item.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 2 */}
            <section
              ref={step2Ref}
              className={cn(
                "rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4 sm:p-5",
                !isStep2VisibleOnMobile && "hidden lg:block",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  2
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">
                    {source === "upload"
                      ? "Upload Your Creative"
                      : "Generate with AI"}
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {source === "ai"
                      ? "Tell Velte what the advert should say — AI builds the poster and draft copy."
                      : "Add the image buyers will see on the Hub pin."}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {source === "upload" && (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-canvas px-4 py-10 text-center">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => void pickUpload(e.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      <UploadIcon size={16} />
                      {uploading
                        ? "Uploading…"
                        : imageUrl
                          ? "Replace Image"
                          : "Upload Image"}
                    </button>
                    <p className="max-w-sm text-[11px] text-gray-600">
                      PNG, JPG, WEBP · Max 5MB · Recommended 1200 × 628 (≈16:9)
                    </p>
                    {imageUrl && (
                      <ProtectedPosterPreview
                        src={imageUrl}
                        className="mt-2 h-40 w-full max-w-sm rounded-xl"
                        onClick={() => setLightboxSrc(imageUrl)}
                      />
                    )}
                  </div>
                )}

                {source === "ai" && (
                  <div className="space-y-4">
                    {!imageUrl ? (
                      <div className="space-y-3 rounded-2xl border border-gray-200 bg-canvas p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-gray-700">
                            Describe the advert — AI generates a poster and
                            draft write-ups you can edit.
                          </p>
                          {!aiSlotsExhausted && (
                            <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold tabular-nums text-ink ring-1 ring-gray-200">
                              {aiRemaining} left today
                            </span>
                          )}
                        </div>
                        {aiSlotsExhausted && (
                          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-900">
                            <AlertCircleIcon
                              size={16}
                              className="mt-0.5 shrink-0 text-amber-600"
                            />
                            <div className="min-w-0 space-y-0.5">
                              <p className="font-semibold text-amber-950">
                                You&apos;ve used all your AI slots for today
                              </p>
                              <p className="text-[11px] text-amber-800">
                                Resets{" "}
                                {aiResetLabel
                                  ? `by ${aiResetLabel}`
                                  : "tomorrow"}
                                .
                                {!enterprise && (
                                  <>
                                    {" "}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        navigate("/pricing?for=vendors")
                                      }
                                      className="font-bold text-orange-600 hover:underline cursor-pointer"
                                    >
                                      Upgrade to Enterprise
                                    </button>{" "}
                                    for 15 slots daily.
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                        <label className="block">
                          <span className="text-xs font-semibold text-gray-600">
                            What should this advert say?
                          </span>
                          <textarea
                            value={aiPrompt}
                            onChange={(e) =>
                              setAiPrompt(e.target.value.slice(0, 800))
                            }
                            rows={4}
                            placeholder="e.g. Weekend 20% off all handbags at Acme Stores, Lekki. Bright lifestyle poster, mention free same-day delivery in Lagos."
                            disabled={aiSlotsExhausted}
                            className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-orange-500/40 disabled:opacity-60"
                          />
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {aiSlotsExhausted ? (
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span>
                                All slots used. Resets{" "}
                                {aiResetLabel
                                  ? `by ${aiResetLabel}`
                                  : "tomorrow"}
                                .
                              </span>
                              {!enterprise && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate("/pricing?for=vendors")
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                                >
                                  <CrownIcon size={14} />
                                  Upgrade to Enterprise
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void runAiPoster()}
                              disabled={aiBusy || !aiPrompt.trim()}
                              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                            >
                              {aiBusy ? (
                                <>
                                  <LoaderIcon
                                    size={16}
                                    className="animate-spin"
                                  />
                                  Generating poster…
                                </>
                              ) : (
                                "Generate poster"
                              )}
                            </button>
                          )}
                        </div>
                        {aiBusy && (
                          <AiGenerationProgressBar
                            progress={aiProgress}
                            stage={aiProgressStage}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Active Generated Poster Preview */}
                        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                          <ProtectedPosterPreview
                            src={imageUrl}
                            className="aspect-[16/10] sm:aspect-[16/9] w-full"
                            onClick={() => setLightboxSrc(imageUrl)}
                          />
                          <div className="absolute top-3 right-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setLightboxSrc(imageUrl)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-black/80 transition-colors"
                            >
                              <EyeIcon size={14} />
                              Full view
                            </button>
                          </div>
                          <div className="absolute bottom-3 left-3">
                            <span className="rounded-full bg-orange-500/90 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                              Active Creative
                            </span>
                          </div>
                        </div>

                        {/* Poster Variations Gallery */}
                        {aiCandidates.length > 1 && (
                          <div className="rounded-xl border border-gray-200 bg-canvas p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-semibold text-ink">
                                Poster Variations ({aiCandidates.length})
                              </span>
                              <span className="text-[11px] text-gray-500">
                                Tap any variation to use it
                              </span>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {aiCandidates.map((c, index) => {
                                const isSelected = imageUrl === c.url;
                                const versionNumber =
                                  aiCandidates.length - index;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setImageUrl(c.url)}
                                    className={cn(
                                      "group relative overflow-hidden rounded-xl border text-left transition-all",
                                      isSelected
                                        ? "border-orange-500 ring-2 ring-orange-500/30"
                                        : "border-gray-200 opacity-80 hover:border-orange-300 hover:opacity-100",
                                    )}
                                  >
                                    <ProtectedPosterPreview
                                      src={c.url}
                                      className="aspect-square w-full"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 pt-4 text-white">
                                      <span className="text-[10px] font-semibold">
                                        v{versionNumber}
                                      </span>
                                      {isSelected && (
                                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-white">
                                          <CheckIcon size={10} />
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* AI Edit & Refine Module */}
                        <div className="rounded-2xl border border-orange-200/80 bg-gradient-to-b from-orange-50/50 to-surface p-4 sm:p-5 shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500 text-white shadow-xs">
                                <SparklesIcon size={15} />
                              </span>
                              <div>
                                <h3 className="text-sm font-bold text-ink">
                                  Refine Poster with AI
                                </h3>
                                <p className="text-[11px] text-gray-600">
                                  Prompt the AI for adjustments. Each revision
                                  uses 1 slot.
                                </p>
                              </div>
                            </div>
                            {!aiSlotsExhausted ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-800">
                                <ZapIcon size={12} />
                                {aiRemaining} slot{aiRemaining === 1 ? "" : "s"}{" "}
                                left today
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-800">
                                <AlertCircleIcon size={12} />
                                Slots used up
                              </span>
                            )}
                          </div>

                          {aiSlotsExhausted ? (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 space-y-0.5">
                              <p className="font-semibold text-amber-950">
                                All revision slots used for today
                              </p>
                              <p className="text-[11px] text-amber-800">
                                Resets{" "}
                                {aiResetLabel
                                  ? `by ${aiResetLabel}`
                                  : "tomorrow"}
                                .
                                {!enterprise && (
                                  <>
                                    {" "}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        navigate("/pricing?for=vendors")
                                      }
                                      className="font-bold text-orange-600 hover:underline cursor-pointer"
                                    >
                                      Upgrade to Enterprise
                                    </button>{" "}
                                    for more slots.
                                  </>
                                )}
                              </p>
                            </div>
                          ) : (
                            <div className="mt-3 space-y-3">
                              <div>
                                <textarea
                                  value={aiEditPrompt}
                                  onChange={(e) =>
                                    setAiEditPrompt(
                                      e.target.value.slice(0, 400),
                                    )
                                  }
                                  rows={2}
                                  placeholder="e.g. Make background darker with luxury gold lighting, zoom in on the product, warmer commercial tone..."
                                  disabled={aiBusy}
                                  className="w-full resize-none rounded-xl border border-gray-200 bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60"
                                />
                                <div className="mt-1.5 flex items-center justify-between">
                                  <span className="text-[11px] text-gray-500">
                                    Quick suggestions (tap to add):
                                  </span>
                                  <span className="text-[11px] tabular-nums text-gray-400">
                                    {aiEditPrompt.length}/400
                                  </span>
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {REFINEMENT_CHIPS.map((chip) => (
                                    <button
                                      key={chip.label}
                                      type="button"
                                      disabled={aiBusy}
                                      onClick={() =>
                                        applyRefinementChip(chip.label)
                                      }
                                      className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-surface px-2.5 py-1 text-[11px] font-medium text-ink hover:border-orange-400 hover:bg-orange-50/50 transition-colors disabled:opacity-50"
                                    >
                                      <span>{chip.icon}</span>
                                      <span>{chip.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                <p className="text-[11px] text-gray-500">
                                  Deducts 1 slot from your daily allowance (
                                  {aiRemaining} remaining).
                                </p>
                                <button
                                  type="button"
                                  onClick={() => void handleRunAiEdit()}
                                  disabled={aiBusy || !aiEditPrompt.trim()}
                                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                                >
                                  {aiBusy ? (
                                    <>
                                      <LoaderIcon
                                        size={16}
                                        className="animate-spin"
                                      />
                                      Refining poster…
                                    </>
                                  ) : (
                                    "Generate Revision"
                                  )}
                                </button>
                              </div>
                              {aiBusy && (
                                <AiGenerationProgressBar
                                  progress={aiProgress}
                                  stage={aiProgressStage}
                                />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Collapsible Original Advert Brief */}
                        <details className="group rounded-xl border border-gray-200 bg-canvas px-3.5 py-2.5 text-xs text-ink">
                          <summary className="flex cursor-pointer items-center justify-between font-semibold text-gray-700 select-none">
                            <span>Original Advert Brief</span>
                            <span className="text-[11px] text-orange-600 group-open:hidden">
                              View or modify
                            </span>
                          </summary>
                          <div className="mt-2.5 space-y-2 border-t border-gray-200 pt-2.5">
                            <textarea
                              value={aiPrompt}
                              onChange={(e) =>
                                setAiPrompt(e.target.value.slice(0, 800))
                              }
                              rows={3}
                              disabled={aiBusy || aiSlotsExhausted}
                              className="w-full resize-none rounded-lg border border-gray-200 bg-surface p-2.5 text-xs text-ink outline-none focus:ring-2 focus:ring-orange-500/30"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => void runAiPoster()}
                                disabled={
                                  aiBusy || aiSlotsExhausted || !aiPrompt.trim()
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
                              >
                                Re-generate from Brief (1 slot)
                              </button>
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Step 3: Advert Headline & Description (displayed only once poster exists) */}
            {imageUrl ? (
              <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                    3
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-ink">
                      Advert Headline &amp; Description
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-600">
                      Refine the copy buyers will see when your advert is pinned
                      on the Hub.
                    </p>
                  </div>
                </div>

                {aiHeadlineOptions.length > 1 && (
                  <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/40 p-3.5">
                    <p className="mb-2 text-xs font-semibold text-gray-700">
                      AI Suggested Headlines — tap to apply:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {aiHeadlineOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            setHeadline(option.slice(0, HEADLINE_MAX))
                          }
                          className={cn(
                            "rounded-full px-3 py-1.5 text-left text-xs font-medium ring-1 transition-colors",
                            headline === option.slice(0, HEADLINE_MAX)
                              ? "bg-orange-500 text-white ring-orange-500 shadow-xs"
                              : "bg-surface text-ink ring-gray-200 hover:ring-orange-300",
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <label className="block">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-600">
                        Advert Headline
                      </span>
                      <span className="text-[11px] tabular-nums text-gray-500">
                        {headline.length}/{HEADLINE_MAX}
                      </span>
                    </div>
                    <input
                      value={headline}
                      onChange={(e) =>
                        setHeadline(e.target.value.slice(0, HEADLINE_MAX))
                      }
                      maxLength={HEADLINE_MAX}
                      placeholder="e.g. Weekend sales on all sneakers"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-orange-500/40"
                    />
                  </label>
                  <label className="block">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-600">
                        Description
                      </span>
                      <span className="text-[11px] tabular-nums text-gray-500">
                        {blurb.length}/{BLURB_MAX}
                      </span>
                    </div>
                    <textarea
                      value={blurb}
                      onChange={(e) =>
                        setBlurb(e.target.value.slice(0, BLURB_MAX))
                      }
                      maxLength={BLURB_MAX}
                      rows={3}
                      placeholder="What should buyers know?"
                      className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-orange-500/40"
                    />
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-canvas">
                    <div className="relative h-28 bg-gray-100">
                      <ProtectedPosterPreview
                        src={imageUrl}
                        className="h-full w-full"
                        onClick={() => setLightboxSrc(imageUrl)}
                      />
                      <span className="pointer-events-none absolute top-2 left-2 z-[1] rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        Sponsored
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-bold text-ink">
                        {previewHeadline}
                      </p>
                      <span className="mt-1 inline-flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <StarIcon
                            key={i}
                            size={11}
                            weight="fill"
                            className="text-amber-400"
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-2xl bg-sky-50 px-3 py-3 text-xs leading-relaxed text-sky-800">
                    <InfoIcon
                      size={16}
                      className="mt-0.5 shrink-0 text-sky-700"
                    />
                    <p>
                      Sponsored pins always show a clear{" "}
                      <span className="font-semibold">Sponsored</span> label.
                      Payment buys placement among vendors who already qualify —
                      never fake relevance.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {/* Step 3 or 4: Duration & Budget */}
            <section
              className={cn(
                "rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4 sm:p-5",
                !isStep2VisibleOnMobile && "hidden lg:block",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  {imageUrl ? "4" : "3"}
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">
                    Set Duration &amp; Budget
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-600">
                    Confirm how long the pin stays live and how you pay.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">
                    Duration
                  </span>
                  <select
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-orange-500/40"
                    value={days}
                    disabled
                  >
                    <option value={days}>{days} days</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">
                    Payment Method
                  </span>
                  <div className="mt-1 flex items-center justify-between rounded-xl border border-gray-200 bg-surface px-3.5 py-2.5 text-sm">
                    <span className="font-semibold text-ink">
                      Wallet Balance
                    </span>
                    <span className="text-xs text-gray-600">
                      {formatNaira(context.walletBalanceKobo)} available
                    </span>
                  </div>
                </label>
              </div>

              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                <p className="font-bold text-ink">Advert Pricing</p>
                <p className="mt-1 text-amber-800">
                  {enterprise
                    ? "Free with Enterprise — your subscription covers this pin."
                    : `${formatNaira(costKobo)} / ${days} days for Basic. Subsidised (free) for Enterprise.`}
                </p>
                <p className="mt-1 text-amber-700">
                  Buyer Premium can also place an advert for your store at no
                  charge to you.
                </p>
              </div>

              {needTopup && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                  <p className="min-w-40 flex-1 text-xs text-ink">
                    Wallet balance ({formatNaira(context.walletBalanceKobo)})
                    doesn&apos;t cover this pin ({formatNaira(costKobo)}).
                  </p>
                  <Link
                    href={walletHref}
                    className="inline-flex rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                  >
                    Top up wallet
                  </Link>
                </div>
              )}

              <button
                type="button"
                onClick={() => void place()}
                disabled={!canPlace}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {placing ? (
                  "Creating…"
                ) : atCap ? (
                  `Limit reached (${context.maxActiveAdverts} live)`
                ) : (
                  <>
                    Create Advert
                    <SendIcon size={16} />
                  </>
                )}
              </button>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <section
              className={cn(
                "rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4",
                !isStep2VisibleOnMobile && "hidden lg:block",
              )}
            >
              <h3 className="text-sm font-bold text-ink">
                Your Advert Preview
              </h3>
              <div className="mt-3 overflow-hidden rounded-2xl border border-gray-100">
                <div className="relative h-44 bg-gray-100">
                  {imageUrl ? (
                    <ProtectedPosterPreview
                      src={imageUrl}
                      className="h-full w-full"
                      onClick={() => setLightboxSrc(imageUrl)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-500">
                      Add a creative to preview
                    </div>
                  )}
                  <span className="pointer-events-none absolute top-2 right-2 z-[1] rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    Sponsored
                  </span>
                </div>
                <div className="bg-surface p-3">
                  <p className="line-clamp-2 text-sm font-bold text-ink">
                    {previewHeadline}
                  </p>
                  {blurb.trim() && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                      {blurb}
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-800">
                <LightbulbIcon
                  size={16}
                  className="mt-0.5 shrink-0 text-sky-700"
                />
                Strong photos and a clear offer convert better. Keep the
                headline under {HEADLINE_MAX} characters.
              </p>
            </section>

            {!enterprise && (
              <section
                className={cn(
                  "rounded-none lg:rounded-2xl border border-orange-200 bg-orange-50 p-5",
                  !isStep2VisibleOnMobile && "hidden lg:block",
                )}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <CrownIcon size={18} />
                </span>
                <h3 className="mt-3 text-base font-bold text-ink">
                  Upgrade to Enterprise
                </h3>
                <p className="mt-1 text-xs text-gray-700">
                  Free advert pins, higher AI allowance, and more Hub tools.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/pricing?for=vendors")}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-canvas"
                >
                  View Enterprise Plan
                  <ArrowRight size={16} aria-hidden />
                </button>
              </section>
            )}

            <HubSidebarFooter
              className={!isStep2VisibleOnMobile ? "hidden lg:block" : ""}
            />
          </aside>
        </div>
      </div>

      {lightboxSrc && (
        <PosterPreviewLightbox
          src={lightboxSrc}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </div>
  );
}
