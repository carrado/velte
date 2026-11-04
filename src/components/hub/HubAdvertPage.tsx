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
  HeadphonesIcon,
  InfoIcon,
  LightbulbIcon,
  MegaphoneIcon,
  SendIcon,
  SparklesIcon,
  StarIcon,
  UploadIcon,
  ZapIcon,
} from "@/components/icons";
import { HubHero } from "@/components/hub/HubHero";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import {
  PosterPreviewLightbox,
  ProtectedPosterPreview,
} from "@/components/hub/ProtectedPosterPreview";
import { ApiError, api } from "@/lib/api-client";
import { uploadProductMedia, validateImageFile } from "@/lib/cloudinary";
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

/** e.g. "3:42 PM WAT · Sat 1 Nov" — 24h after this vendor used up their slots. */
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
  return `${time} WAT · ${day}`;
}

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

/**
 * Create Advert — HubHero + Upload · AI creatives.
 * Listing promotion lives on Boost, not here.
 */
export function HubAdvertPage({ userId }: { userId: string }) {
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<AdvertSource>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [blurb, setBlurb] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCandidates, setAiCandidates] = useState<
    { id: string; url: string }[]
  >([]);
  const [aiHeadlineOptions, setAiHeadlineOptions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [needTopup, setNeedTopup] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
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

  const settingsHref = "/settings";
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
      const url = await uploadProductMedia(file);
      setImageUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const aiRemaining = context?.aiPosterRemaining ?? (enterprise ? 5 : 2);
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

  const runAiPoster = async () => {
    if (aiBusy || aiSlotsExhausted) return;
    const prompt = aiPrompt.trim();
    if (!prompt) {
      toast.error("Describe the advert you want — offer, message, and style.");
      return;
    }
    setAiBusy(true);
    try {
      const logoUrl = home?.store?.avatar ?? null;
      const palette = await extractLogoPalette(logoUrl);
      const result = await generateAiPoster({
        storeName: home?.store?.name ?? "Your store",
        prompt,
        logoUrl,
        palette,
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
        return next.slice(0, 6);
      });
      setImageUrl(result.imageUrl);
      if (result.headlines.length) {
        setAiHeadlineOptions(result.headlines);
        setHeadline(result.headlines[0].slice(0, HEADLINE_MAX));
      }
      if (result.blurb) setBlurb(result.blurb.slice(0, BLURB_MAX));
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
        result.remaining === 0
          ? "Poster ready — that was your last one for today."
          : `Poster ready — ${result.remaining} left.`,
      );
    } catch (err) {
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
      setAiBusy(false);
    }
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

  return (
    <div className="space-y-4">
      <HubHero
        eyebrow="Vendor Hub"
        title="Create Advert"
        subtitle="Pin a sponsored creative to the top of the Hub — upload your artwork or generate one with AI. To promote a listing, use Boost."
        cardImage="/hub/boost-product.jpg"
        cardBadge="Sponsored"
      />

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
                    onClick={() => setSource(item.key)}
                    className={cn(
                      "relative flex flex-col items-start gap-2 rounded-2xl border bg-canvas px-4 py-4 text-left transition-colors",
                      picked
                        ? "border-orange-500 ring-2 ring-orange-500/20"
                        : "border-gray-200 hover:border-orange-300",
                    )}
                  >
                    {picked && (
                      <span className="absolute bottom-3 right-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white">
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
          <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4 sm:p-5">
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
                <div className="space-y-3 rounded-2xl border border-gray-200 bg-canvas p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-gray-700">
                      Describe the advert — AI generates a poster and draft
                      write-ups you can edit.
                    </p>
                    {!aiSlotsExhausted && (
                      <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold tabular-nums text-ink ring-1 ring-gray-200">
                        {aiRemaining} left
                      </span>
                    )}
                  </div>
                  {aiSlotsExhausted && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-800">
                      <AlertCircleIcon
                        size={16}
                        className="mt-0.5 shrink-0 text-red-600"
                      />
                      <div className="min-w-0 space-y-1">
                        <p className="font-semibold text-red-800">
                          AI posters used up
                        </p>
                        {aiResetLabel ? (
                          <p>
                            Back at{" "}
                            <span className="font-semibold tabular-nums">
                              {aiResetLabel}
                            </span>
                            . New generations unlock then
                            {!enterprise && (
                              <>
                                {" "}
                                — upgrade to Enterprise anytime for more AI
                                posters
                              </>
                            )}
                            .
                          </p>
                        ) : (
                          <p>
                            New generations unlock 24 hours after your slots ran
                            out
                            {!enterprise && (
                              <>
                                . Upgrade to Enterprise anytime for more AI
                                posters
                              </>
                            )}
                            .
                          </p>
                        )}
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
                  <div className="flex flex-wrap gap-2">
                    {aiSlotsExhausted ? (
                      !enterprise && (
                        <button
                          type="button"
                          onClick={() => navigate("/pricing?for=vendors")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
                        >
                          <CrownIcon size={16} />
                          Upgrade to Enterprise
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => void runAiPoster()}
                        disabled={aiBusy || !aiPrompt.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                      >
                        <SparklesIcon size={16} />
                        {aiBusy
                          ? "Generating…"
                          : aiCandidates.length > 0
                            ? "Generate another image"
                            : "Generate poster"}
                      </button>
                    )}
                  </div>
                  {aiBusy && (
                    <p className="text-xs text-gray-600">
                      Designing your poster and drafting copy — usually under a
                      minute.
                    </p>
                  )}
                  {aiCandidates.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-gray-600">
                        Generated posters — tap to use
                      </p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {aiCandidates.map((c) => (
                          <div
                            key={c.id}
                            className={cn(
                              "overflow-hidden rounded-2xl border transition-colors",
                              imageUrl === c.url
                                ? "border-orange-500 ring-2 ring-orange-500/20"
                                : "border-gray-200 hover:border-orange-300",
                            )}
                          >
                            <ProtectedPosterPreview
                              src={c.url}
                              className="aspect-[3/2] w-full"
                              onClick={() => {
                                setImageUrl(c.url);
                                setLightboxSrc(c.url);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiHeadlineOptions.length > 1 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-gray-600">
                        Headline options — edit freely below
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
                                ? "bg-orange-500 text-white ring-orange-500"
                                : "bg-surface text-ink ring-gray-200 hover:ring-orange-300",
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

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
                  onChange={(e) => setBlurb(e.target.value.slice(0, BLURB_MAX))}
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
                  {imageUrl ? (
                    <ProtectedPosterPreview
                      src={imageUrl}
                      className="h-full w-full"
                      onClick={() => setLightboxSrc(imageUrl)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-500">
                      Preview image
                    </div>
                  )}
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
                <InfoIcon size={16} className="mt-0.5 shrink-0 text-sky-700" />
                <p>
                  Sponsored pins always show a clear{" "}
                  <span className="font-semibold">Sponsored</span> label.
                  Payment buys placement among vendors who already qualify —
                  never fake relevance.
                </p>
              </div>
            </div>
          </section>

          {/* Step 3 */}
          <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                3
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
                  <span className="font-semibold text-ink">Wallet Balance</span>
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
          <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4">
            <h3 className="text-sm font-bold text-ink">Your Advert Preview</h3>
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
              Strong photos and a clear offer convert better. Keep the headline
              under {HEADLINE_MAX} characters.
            </p>
          </section>

          <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4">
            <h3 className="text-sm font-bold text-ink">Related Actions</h3>
            <ul className="mt-2 divide-y divide-gray-200">
              <li>
                <button
                  type="button"
                  onClick={() => navigate("/hub/boost")}
                  className="flex w-full items-center gap-3 py-3 text-left text-sm font-semibold text-ink hover:text-orange-600"
                >
                  <ZapIcon size={16} className="text-orange-500" />
                  Promote a Listing
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate("/hub/boost")}
                  className="flex w-full items-center gap-3 py-3 text-left text-sm font-semibold text-ink hover:text-orange-600"
                >
                  <MegaphoneIcon size={16} className="text-orange-500" />
                  Boost Advert
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate("/hub")}
                  className="flex w-full items-center gap-3 py-3 text-left text-sm font-semibold text-ink hover:text-orange-600"
                >
                  <SendIcon size={16} className="text-orange-500" />
                  Broadcast
                </button>
              </li>
            </ul>
          </section>

          {!enterprise && (
            <section className="rounded-none lg:rounded-2xl border border-orange-200 bg-orange-50 p-5">
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

          <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                <HeadphonesIcon size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-ink">Need Help?</h3>
                <p className="mt-0.5 text-xs text-gray-600">
                  Our support team is here for you.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm font-semibold text-orange-600">
              <Link href={settingsHref}>Support</Link>
              <Link href={settingsHref}>Settings</Link>
              <Link href={settingsHref}>Feedback</Link>
            </div>
          </section>
        </aside>
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
