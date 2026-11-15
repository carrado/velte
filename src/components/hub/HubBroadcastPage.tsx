"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Broadcast,
  ChatCircleDots,
  Check,
  CheckCircle,
  Clock,
  Crown,
  Fire,
  Image as ImageIcon,
  Info,
  Lightbulb,
  Lightning,
  Megaphone,
  PaperPlaneRight,
  Radio,
  Sparkle,
  SpinnerGap,
  Storefront,
  Tag,
  Trash,
  UploadSimple,
  Wallet,
  Users,
} from "@phosphor-icons/react";

import { HubHero } from "@/components/hub/HubHero";
import { HubSidebarFooter } from "@/components/hub/HubSidebarFooter";
import { ProtectedPosterPreview } from "@/components/hub/ProtectedPosterPreview";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import { useHubWebSocket } from "@/hooks/useHubWebSocket";
import { useUserStore } from "@/store/userStore";
import { isEnterpriseVendor } from "@/components/EnterpriseBadge";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatNaira } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { uploadAdvertMedia, validateImageFile } from "@/lib/cloudinary";
import { categoriesApi } from "@/services/products";
import {
  cancelHubBroadcast,
  createHubBroadcast,
  fetchHubBroadcasts,
  fetchHubContext,
  fetchHubHome,
  hubPageQueryOptions,
  sendHubBroadcast,
} from "@/services/hub";
import type { CategoryProduct } from "@/types/product";

type BroadcastFormat = "custom" | "advert" | "product";
type TargetAudience = "all_online" | "premium_only" | "nearby";
type ActionCta = "chat" | "store" | "product";

const MESSAGE_MAX = 280;

const FORMAT_OPTIONS: {
  key: BroadcastFormat;
  label: string;
  hint: string;
  icon: typeof Sparkle;
}[] = [
  {
    key: "custom",
    label: "Flash Deal / Update",
    hint: "One-off announcement or discount with optional image",
    icon: Sparkle,
  },
  {
    key: "advert",
    label: "Amplify Pinned Advert",
    hint: "Push your pinned Hub advert straight into buyers' feeds",
    icon: Megaphone,
  },
  {
    key: "product",
    label: "Spotlight Inventory Item",
    hint: "Feature a fast-selling product with photo and price tag",
    icon: Lightning,
  },
];

const PRESET_MESSAGES = [
  "⚡ FLASH SALE: Get 15% OFF all items in our store today only! Tap below to chat and claim.",
  "📦 RESTOCK ALERT: Fresh new arrivals just landed. Order right now before stocks run out!",
  "🚚 FREE DELIVERY WEEKEND: Enjoy instant free shipping on all orders over ₦25,000 this weekend.",
  "🔥 HOT DEAL: Limited quantity available at wholesale prices. DM us immediately for reservations.",
];

export function HubBroadcastPage({ userId }: { userId: string }) {
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const user = useUserStore((s) => s.user);
  const vendorStore = useUserStore((s) => s.vendorStore);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [format, setFormat] = useState<BroadcastFormat>("custom");
  const [message, setMessage] = useState(PRESET_MESSAGES[0]);
  const [selectedAdvertId, setSelectedAdvertId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [audience, setAudience] = useState<TargetAudience>("all_online");
  const [ctaType, setCtaType] = useState<ActionCta>("chat");

  // Interaction States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dispatchingDraftId, setDispatchingDraftId] = useState<string | null>(
    null,
  );
  const [cancellingDraftId, setCancellingDraftId] = useState<string | null>(
    null,
  );
  const [needTopup, setNeedTopup] = useState(false);

  // Queries
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

  const listingsQuery = useQuery({
    queryKey: queryKeys.products.list({ limit: 50 }),
    queryFn: () => categoriesApi.getProducts({ limit: 50 }),
    ...hubPageQueryOptions,
  });

  const myBroadcastsQuery = useQuery({
    queryKey: ["hub", "broadcasts", "mine"],
    queryFn: fetchHubBroadcasts,
  });

  const context = contextQuery.data ?? null;
  const home = homeQuery.data ?? null;
  const myBroadcasts = myBroadcastsQuery.data ?? [];

  const isEnterprise = Boolean(
    isEnterpriseVendor(user) || home?.enterprise || context?.enterprise,
  );

  const activeAdverts = useMemo(
    () => (home?.adverts ?? []).filter((a) => a.status === "active"),
    [home?.adverts],
  );

  const listings = useMemo(
    () =>
      (listingsQuery.data?.products ?? []).filter(
        (product: CategoryProduct) => !product.isSuspended,
      ),
    [listingsQuery.data],
  );

  const selectedAdvert = useMemo(
    () => activeAdverts.find((a) => a.id === selectedAdvertId) ?? null,
    [activeAdverts, selectedAdvertId],
  );

  const selectedProduct = useMemo(
    () => listings.find((p) => p.id === selectedProductId) ?? null,
    [listings, selectedProductId],
  );

  // Display Image in preview based on selected format
  const activePreviewImage = useMemo(() => {
    if (format === "advert" && selectedAdvert?.imageUrl) {
      return selectedAdvert.imageUrl;
    }
    if (format === "product" && selectedProduct?.mainImageUrl) {
      return selectedProduct.mainImageUrl;
    }
    return customImageUrl;
  }, [format, selectedAdvert, selectedProduct, customImageUrl]);

  const storeName =
    vendorStore?.name ||
    user?.company?.name ||
    user?.businessName ||
    user?.name ||
    "Your Store";
  const storeAvatar = vendorStore?.avatar || user?.avatar || null;

  // Live WebSocket connections & Real Backend Buyer Pool
  const { clientCount } = useHubWebSocket();
  const liveOnlineCount = clientCount && clientCount > 0 ? clientCount : 1;

  const reachPool = context?.reachPool;
  const totalRegisteredBuyers = reachPool?.all ?? 0;
  const recentActiveBuyers = reachPool?.recent ?? 0;
  const premiumBuyers = reachPool?.premium ?? 0;

  // Real, authentic estimated reach based on actual database counts & online clients
  const estimatedReach = useMemo(() => {
    switch (audience) {
      case "premium_only": {
        const count = premiumBuyers > 0 ? `${premiumBuyers}` : "0";
        return {
          count: `${count} VIP buyer${premiumBuyers === 1 ? "" : "s"}`,
          label: "Verified Premium Buyers",
        };
      }
      case "nearby": {
        const count =
          recentActiveBuyers > 0
            ? recentActiveBuyers
            : totalRegisteredBuyers > 0
              ? totalRegisteredBuyers
              : 1;
        return {
          count: `${count} local buyer${count === 1 ? "" : "s"}`,
          label: "Nearby Regional Shoppers",
        };
      }
      case "all_online":
      default: {
        const count =
          totalRegisteredBuyers > 0 ? totalRegisteredBuyers : liveOnlineCount;
        return {
          count: `${count} buyer${count === 1 ? "" : "s"} (${liveOnlineCount} online now)`,
          label: "Active Shoppers Across Sectors",
        };
      }
    }
  }, [
    audience,
    premiumBuyers,
    recentActiveBuyers,
    totalRegisteredBuyers,
    liveOnlineCount,
  ]);

  const audienceOptions = useMemo(
    () => [
      {
        key: "all_online" as TargetAudience,
        title: "All Sector Shoppers",
        reach: `${totalRegisteredBuyers} registered (${liveOnlineCount} online now)`,
        desc: "All registered buyers browsing in your product sectors",
        icon: Users,
      },
      {
        key: "premium_only" as TargetAudience,
        title: "Verified Premium",
        reach: `${premiumBuyers} verified buyer${premiumBuyers === 1 ? "" : "s"}`,
        desc: "Target high-intent shoppers with confirmed payment history",
        icon: Crown,
      },
      {
        key: "nearby" as TargetAudience,
        title: "Regional Shoppers",
        reach: `${recentActiveBuyers > 0 ? recentActiveBuyers : totalRegisteredBuyers} in delivery zone`,
        desc: "Shoppers in your state or geographic fulfillment zone",
        icon: Clock,
      },
    ],
    [totalRegisteredBuyers, liveOnlineCount, premiumBuyers, recentActiveBuyers],
  );

  // Pricing & Quota calculation
  const broadcastCostKobo = context?.broadcastCostKobo ?? 100000;
  const walletBalanceKobo = context?.walletBalanceKobo ?? 0;
  const sendsPerDay = context?.sendsPerDay ?? (isEnterprise ? 5 : 1);
  const sendsRemaining = context?.sendsRemaining ?? sendsPerDay;
  const hasSufficientBalance = walletBalanceKobo >= broadcastCostKobo;

  // Pick Custom Image Upload
  const handlePickUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadAdvertMedia(file, "adverts");
      setCustomImageUrl(url);
      toast.success("Broadcast image uploaded.");
    } catch {
      toast.error("Image upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Dispatch Broadcast Live
  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      toast.error("Please enter a broadcast message.");
      return;
    }
    if (format === "advert" && !selectedAdvertId) {
      toast.error("Please choose an active advert to amplify.");
      return;
    }
    if (format === "product" && !selectedProductId) {
      toast.error("Please choose a product listing to spotlight.");
      return;
    }

    if (!hasSufficientBalance) {
      setNeedTopup(true);
      toast.error(
        `Insufficient wallet balance (${formatNaira(walletBalanceKobo)}). Top up ${formatNaira(broadcastCostKobo)} to dispatch.`,
      );
      return;
    }

    setIsSubmitting(true);
    setNeedTopup(false);

    try {
      const result = await createHubBroadcast({
        message: message.trim(),
        imageUrl: activePreviewImage ?? null,
        advertId: format === "advert" ? selectedAdvertId : null,
        productId: format === "product" ? selectedProductId : null,
        format,
        targetAudience: audience,
        ctaType,
        sendNow: true,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.hub.home("vendor"),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.hub.context }),
        queryClient.invalidateQueries({
          queryKey: ["hub", "broadcasts", "mine"],
        }),
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      ]);

      toast.success(
        `Broadcast live! Reached ~${result.audienceCount ?? estimatedReach.count} online buyers.`,
      );

      // Redirect to the Hub timeline so vendor immediately sees their post
      setTimeout(() => {
        navigate("/hub#hub-feed");
      }, 900);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 402) {
        setNeedTopup(true);
        toast.error("Insufficient wallet balance. Please top up to proceed.");
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : "Couldn't send broadcast. Please try again.";
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message to save as draft.");
      return;
    }

    setIsSavingDraft(true);
    try {
      await createHubBroadcast({
        message: message.trim(),
        imageUrl: activePreviewImage ?? null,
        advertId: format === "advert" ? selectedAdvertId : null,
        productId: format === "product" ? selectedProductId : null,
        format,
        targetAudience: audience,
        ctaType,
        sendNow: false,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.hub.context }),
        queryClient.invalidateQueries({
          queryKey: ["hub", "broadcasts", "mine"],
        }),
      ]);

      toast.success("Broadcast draft saved. Drafts are free until dispatched.");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Couldn't save draft. Please try again.";
      toast.error(msg);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Send an Existing Draft
  const handleSendDraft = async (draftId: string) => {
    if (!hasSufficientBalance) {
      setNeedTopup(true);
      toast.error(
        "Insufficient wallet balance. Please top up ₦1,000 to send this draft.",
      );
      return;
    }

    setDispatchingDraftId(draftId);
    try {
      const result = await sendHubBroadcast(draftId);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.hub.home("vendor"),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.hub.context }),
        queryClient.invalidateQueries({
          queryKey: ["hub", "broadcasts", "mine"],
        }),
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      ]);

      toast.success(
        `Draft broadcast dispatched! (${result.audienceCount ?? "Active"} shoppers reached)`,
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Couldn't dispatch draft.";
      toast.error(msg);
    } finally {
      setDispatchingDraftId(null);
    }
  };

  // Cancel an Existing Draft
  const handleCancelDraft = async (draftId: string) => {
    setCancellingDraftId(draftId);
    try {
      await cancelHubBroadcast(draftId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.hub.context }),
        queryClient.invalidateQueries({
          queryKey: ["hub", "broadcasts", "mine"],
        }),
      ]);
      toast.success("Draft removed.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Couldn't cancel draft.";
      toast.error(msg);
    } finally {
      setCancellingDraftId(null);
    }
  };

  const drafts = useMemo(
    () => myBroadcasts.filter((b) => b.status === "draft"),
    [myBroadcasts],
  );

  return (
    <div className="w-full">
      <HubHero
        eyebrow="Vendor Hub"
        title={
          <span className="inline-flex items-center gap-2 flex-wrap">
            <span>Create Broadcast</span>
            <Broadcast size={28} weight="duotone" className="text-orange-400" />
          </span>
        }
        subtitle="Dispatch an urgent real-time message to active buyers online across your sectors. Announce flash deals, restocks, or amplify your pinned advert."
        photo="/hub/broadcast-hero.jpg"
        cardImage="/hub/broadcast-hero.jpg"
        cardBadge="Broadcast"
      />

      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ── LEFT COLUMN: Form Steps ── */}
          <div className="min-w-0 space-y-4">
            {/* ── Step 1: Broadcast Format ── */}
            <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 sm:p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white shadow-xs">
                  1
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">
                    Choose Broadcast Format
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-ink/60">
                    Select the visual anchor for your broadcast alert.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {FORMAT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = format === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setFormat(opt.key)}
                      className={cn(
                        "flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer relative",
                        isSelected
                          ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/20 shadow-xs ring-1 ring-orange-500"
                          : "border-gray-200 dark:border-white/10 bg-surface hover:border-gray-300 dark:hover:border-white/20",
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span
                          className={cn(
                            "inline-flex p-2 rounded-lg",
                            isSelected
                              ? "bg-orange-500 text-white"
                              : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-ink/80",
                          )}
                        >
                          <Icon size={18} weight="duotone" />
                        </span>
                        {isSelected && (
                          <span className="text-orange-500">
                            <Check size={16} weight="bold" />
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-ink leading-tight">
                        {opt.label}
                      </span>
                      <span className="mt-1 text-[11px] text-gray-500 dark:text-ink/60 leading-snug">
                        {opt.hint}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-selectors depending on format */}
              {format === "custom" && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-ink">
                      Optional Image or Banner Graphic:
                    </label>
                    {customImageUrl && (
                      <button
                        type="button"
                        onClick={() => setCustomImageUrl(null)}
                        className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:underline"
                      >
                        <Trash size={12} />
                        <span>Remove image</span>
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => void handlePickUpload(e.target.files)}
                  />

                  {customImageUrl ? (
                    <div className="relative aspect-[16/9] w-full max-w-md rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-canvas">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={customImageUrl}
                        alt="Uploaded broadcast artwork"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs hover:bg-black/90"
                      >
                        Change Photo
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 dark:border-white/15 bg-canvas px-4 py-6 text-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                        {isUploading ? (
                          <SpinnerGap size={18} className="animate-spin" />
                        ) : (
                          <UploadSimple size={18} weight="bold" />
                        )}
                      </div>
                      <p className="text-xs font-semibold text-ink">
                        {isUploading
                          ? "Uploading image…"
                          : "Upload a photo or promo banner"}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-ink/60">
                        PNG, JPG, or WebP up to 5MB (16:9 recommended)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {format === "advert" && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 space-y-2">
                  <label className="block text-xs font-semibold text-ink">
                    Select Active Hub Advert to Boost:
                  </label>
                  {activeAdverts.length > 0 ? (
                    <select
                      value={selectedAdvertId}
                      onChange={(e) => setSelectedAdvertId(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-surface px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    >
                      <option value="">-- Choose pinned advert --</option>
                      {activeAdverts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.headline} (Expires{" "}
                          {new Date(a.endsAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-canvas p-4 text-center space-y-2">
                      <p className="text-xs text-gray-500 dark:text-ink/60">
                        You don&apos;t have any active pinned adverts to boost.
                      </p>
                      <Link
                        href="/hub/advert"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:underline"
                      >
                        <span>Create a Hub Advert</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {format === "product" && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 space-y-2">
                  <label className="block text-xs font-semibold text-ink">
                    Select Product from Your Inventory:
                  </label>
                  {listings.length > 0 ? (
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-surface px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    >
                      <option value="">-- Choose catalog listing --</option>
                      {listings.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.price ? `(${formatNaira(p.price)})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-canvas p-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-ink/60">
                        No product listings found in your inventory.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── Step 2: Compose Message & Inspiration ── */}
            <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 sm:p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white shadow-xs">
                  2
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-ink">
                      Compose Broadcast Message
                    </h2>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        message.length > MESSAGE_MAX - 30
                          ? "text-rose-500"
                          : "text-gray-400",
                      )}
                    >
                      {message.length}/{MESSAGE_MAX}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-ink/60">
                    A sharp, compelling update that appears directly on online
                    buyers&apos; feed stream.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <textarea
                  rows={4}
                  maxLength={MESSAGE_MAX}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="E.g. FLASH SALE: 20% off all sneakers for the next 2 hours only! Chat us to order…"
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-canvas p-3 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                />
              </div>

              {/* Quick Inspiration Templates */}
              <div className="mt-3.5 space-y-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-ink/60 flex items-center gap-1.5 uppercase tracking-wide">
                  <Fire
                    size={14}
                    weight="duotone"
                    className="text-orange-500"
                  />
                  <span>Quick Templates</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_MESSAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessage(preset)}
                      className="text-left text-xs bg-gray-100/80 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:text-orange-600 dark:hover:text-orange-400 p-2 rounded-lg text-ink/80 transition-colors border border-transparent hover:border-orange-200 line-clamp-1 max-w-full cursor-pointer"
                    >
                      &quot;{preset.slice(0, 50)}…&quot;
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button CTA Selection */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                <label className="block text-xs font-bold text-ink mb-2">
                  Direct Buyer Call-To-Action Button:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCtaType("chat")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors",
                      ctaType === "chat"
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400"
                        : "border-gray-200 dark:border-white/10 bg-surface text-ink hover:bg-gray-50 dark:hover:bg-white/5",
                    )}
                  >
                    <ChatCircleDots size={16} weight="duotone" />
                    <span>Open Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCtaType("store")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors",
                      ctaType === "store"
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400"
                        : "border-gray-200 dark:border-white/10 bg-surface text-ink hover:bg-gray-50 dark:hover:bg-white/5",
                    )}
                  >
                    <Storefront size={16} weight="duotone" />
                    <span>View Store</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCtaType("product")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors",
                      ctaType === "product"
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400"
                        : "border-gray-200 dark:border-white/10 bg-surface text-ink hover:bg-gray-50 dark:hover:bg-white/5",
                    )}
                  >
                    <Tag size={16} weight="duotone" />
                    <span>View Item</span>
                  </button>
                </div>
              </div>
            </section>

            {/* ── Step 3: Audience Segmentation ── */}
            <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 sm:p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white shadow-xs">
                  3
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">
                    Target Audience Reach
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-ink/60">
                    Route your broadcast to specific shopper cohorts.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {audienceOptions.map((aud) => {
                  const Icon = aud.icon;
                  const isSelected = audience === aud.key;
                  return (
                    <button
                      key={aud.key}
                      type="button"
                      onClick={() => setAudience(aud.key)}
                      className={cn(
                        "flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer relative",
                        isSelected
                          ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/20 shadow-xs ring-1 ring-orange-500"
                          : "border-gray-200 dark:border-white/10 bg-surface hover:border-gray-300 dark:hover:border-white/20",
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span
                          className={cn(
                            "inline-flex p-1.5 rounded-lg",
                            isSelected
                              ? "bg-orange-500 text-white"
                              : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-ink/80",
                          )}
                        >
                          <Icon size={16} weight="duotone" />
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          Live
                        </span>
                      </div>
                      <span className="mt-1 text-sm font-bold text-ink">
                        {aud.title}
                      </span>
                      <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400">
                        {aud.reach}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-ink/60 leading-snug">
                        {aud.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Step 4: Dispatch & Summary ── */}
            <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 sm:p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white shadow-xs">
                  4
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">
                    Dispatch & Budget
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-ink/60">
                    Review estimated reach, quota, and launch your broadcast.
                  </p>
                </div>
              </div>

              {/* Delivery Parameters Box */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-canvas p-3.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-ink/50 block text-[11px]">
                    Estimated Reach
                  </span>
                  <span className="font-extrabold text-ink mt-0.5 block">
                    {estimatedReach.count} buyers
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-ink/50 block text-[11px]">
                    Delivery Time
                  </span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                    <Lightning size={13} weight="fill" />
                    <span>Instant (&lt;5s)</span>
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-ink/50 block text-[11px]">
                    Daily Quota
                  </span>
                  <span className="font-extrabold text-ink mt-0.5 block">
                    {sendsRemaining} of {sendsPerDay} remaining
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-ink/50 block text-[11px]">
                    Broadcast Cost
                  </span>
                  <span className="font-extrabold text-ink mt-0.5 block">
                    {formatNaira(broadcastCostKobo)}
                  </span>
                </div>
              </div>

              {/* Insufficient Wallet Warning */}
              {(!hasSufficientBalance || needTopup) && (
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <Wallet
                      size={18}
                      weight="duotone"
                      className="text-amber-600 shrink-0"
                    />
                    <span>
                      Wallet balance ({formatNaira(walletBalanceKobo)})
                      doesn&apos;t cover this broadcast (
                      {formatNaira(broadcastCostKobo)}).
                    </span>
                  </div>
                  <Link
                    href="/wallet"
                    className="inline-flex rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
                  >
                    Top Up Wallet
                  </Link>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  disabled={
                    isSubmitting ||
                    isSavingDraft ||
                    !message.trim() ||
                    sendsRemaining <= 0
                  }
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 py-3.5 px-6 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerGap size={18} className="animate-spin" />
                      <span>Dispatching Broadcast…</span>
                    </>
                  ) : (
                    <>
                      <PaperPlaneRight size={17} weight="bold" />
                      <span>
                        {sendsRemaining <= 0
                          ? "Daily Limit Reached"
                          : "Send Broadcast Now"}
                      </span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting || isSavingDraft || !message.trim()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-surface py-3.5 px-5 text-sm font-semibold text-ink hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingDraft ? (
                    <>
                      <SpinnerGap size={16} className="animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Save as Draft (Free)</span>
                  )}
                </button>
              </div>
            </section>

            {/* ── Saved Drafts Management ── */}
            {drafts.length > 0 && (
              <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink">
                    Saved Drafts ({drafts.length})
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-ink/60">
                    Drafts remain queued until sent
                  </span>
                </div>
                <div className="mt-3 divide-y divide-gray-100 dark:divide-white/5">
                  {drafts.map((d) => (
                    <div
                      key={d.id}
                      className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink line-clamp-2">
                          {d.message}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-ink/50">
                          Created{" "}
                          {new Date(
                            d.sentAt || Date.now(),
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSendDraft(d.id)}
                          disabled={dispatchingDraftId === d.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                        >
                          {dispatchingDraftId === d.id ? (
                            <SpinnerGap size={13} className="animate-spin" />
                          ) : (
                            <PaperPlaneRight size={13} weight="bold" />
                          )}
                          <span>Send Now</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCancelDraft(d.id)}
                          disabled={cancellingDraftId === d.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/10 px-2.5 py-1.5 font-medium text-gray-600 dark:text-ink/70 hover:bg-gray-100 dark:hover:bg-white/5"
                        >
                          <Trash size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── RIGHT COLUMN: Sticky Live Preview & Telemetry ── */}
          <aside className="space-y-4 lg:sticky lg:top-20">
            {/* Live Card Preview */}
            <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-sm font-bold text-ink">
                  Broadcast Live Preview
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Feed Stream</span>
                </span>
              </div>

              <div className="mt-3.5 rounded-2xl border border-orange-200 dark:border-orange-500/20 bg-gradient-to-b from-orange-50/50 to-transparent dark:from-orange-950/20 p-4 shadow-sm">
                {/* Vendor Identity Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {storeAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={storeAvatar}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-orange-300"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-xs">
                        {storeName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-ink truncate leading-tight">
                        {storeName}
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-ink/60">
                        Broadcasting to your sector
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-900/40 px-2 py-0.5 text-[9px] font-bold text-sky-700 dark:text-sky-300 shrink-0">
                    <Broadcast size={11} weight="bold" />
                    <span>Broadcast</span>
                  </span>
                </div>

                {/* Message Text Preview */}
                <p className="mt-3 text-xs text-ink leading-relaxed font-medium">
                  {message.trim() ||
                    "Your message will type out here in real-time as you compose it…"}
                </p>

                {/* Optional Media Preview */}
                {activePreviewImage && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-canvas aspect-[16/9] w-full">
                    {format === "advert" ? (
                      <ProtectedPosterPreview
                        src={activePreviewImage}
                        fit="cover"
                        className="w-full h-full"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activePreviewImage}
                        alt="Broadcast Media"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}

                {/* Call to action pill */}
                <div className="mt-3.5 pt-3 border-t border-orange-200/60 dark:border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 dark:text-ink/50">
                    Just now · {liveOnlineCount} active now
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 text-white text-[11px] font-bold px-3 py-1 shadow-xs">
                    {ctaType === "chat" && (
                      <>
                        <ChatCircleDots size={13} weight="fill" />
                        <span>Chat</span>
                      </>
                    )}
                    {ctaType === "store" && (
                      <>
                        <Storefront size={13} weight="fill" />
                        <span>Store</span>
                      </>
                    )}
                    {ctaType === "product" && (
                      <>
                        <Tag size={13} weight="fill" />
                        <span>View</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </section>

            {/* Live Hub Activity Telemetry */}
            <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <Radio
                    size={14}
                    weight="duotone"
                    className="text-emerald-600"
                  />
                  <span>Live Hub Activity</span>
                </h4>
              </div>
              <p className="mt-2 text-2xl font-black text-ink tracking-tight flex items-baseline gap-1.5">
                <span>{liveOnlineCount}</span>
                <span className="text-xs font-medium text-gray-500 dark:text-ink/60">
                  {liveOnlineCount === 1
                    ? "active user online now"
                    : "active users online now"}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-ink/60 leading-relaxed">
                {totalRegisteredBuyers > 0
                  ? `${totalRegisteredBuyers} registered buyer${totalRegisteredBuyers === 1 ? "" : "s"} across all Hub categories.`
                  : "Live WebSocket feed connection active."}
              </p>
            </section>

            {/* Broadcast Tips */}
            <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 shadow-xs text-xs space-y-2">
              <h4 className="font-bold text-ink flex items-center gap-1.5">
                <Lightbulb
                  size={16}
                  weight="duotone"
                  className="text-amber-500"
                />
                <span>Broadcast Tips</span>
              </h4>
              <ul className="space-y-1.5 text-gray-500 dark:text-ink/70 text-[11px] leading-relaxed">
                <li>
                  • Keep copy under 140 characters for highest click-through.
                </li>
                <li>
                  • Include a clear timeframe (&quot;today only&quot;,
                  &quot;weekend special&quot;).
                </li>
                <li>
                  • Link an active advert or product so buyers can purchase
                  instantly.
                </li>
              </ul>
            </section>

            <HubSidebarFooter />
          </aside>
        </div>
      </div>
    </div>
  );
}
