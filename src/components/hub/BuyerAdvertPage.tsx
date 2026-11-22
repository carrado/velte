"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  CheckIcon,
  CloseIcon,
  CrownIcon,
  MapPinIcon,
  MegaphoneIcon,
  RepeatIcon,
  SearchIcon,
  SparklesIcon,
  StoreIcon,
} from "@/components/icons";
import { modalScrimClass } from "@/lib/modalScrim";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import { queryKeys } from "@/lib/query-keys";
import { fetchHubHome, hubPageQueryOptions } from "@/services/hub";
import { useBuyerStore } from "@/store/buyerStore";
import { isPremiumBuyer } from "@/lib/enterprise";
import { cn, formatNaira } from "@/lib/utils";
import type { HubHome } from "@/types/hub";

interface AdvertVendorOption {
  vendorId: string;
  name: string;
  avatar: string | null;
  state?: string | null;
  sectors: string[];
  verified: boolean;
  images: string[];
}

export function BuyerAdvertPage({ buyerId }: { buyerId: string }) {
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const buyer = useBuyerStore((s) => s.buyer);

  const isPremium = Boolean(
    isPremiumBuyer(buyer) ||
    buyer?.tier === "buyer_premium" ||
    (buyer as { isPremium?: boolean })?.isPremium ||
    (buyer as { plan?: string })?.plan === "buyer_premium",
  );

  const { data: home, isPending } = useQuery<HubHome>({
    queryKey: queryKeys.hub.home("buyer"),
    queryFn: () => fetchHubHome("buyer"),
    ...hubPageQueryOptions,
  });

  // Extract vendors who have real imagery available from home data
  const advertVendors = useMemo<AdvertVendorOption[]>(() => {
    if (!home) return [];
    const map = new Map<string, AdvertVendorOption>();

    const add = (
      vendorId: string,
      name: string,
      avatar: string | null,
      state: string | null | undefined,
      sectors: string[],
      verified: boolean,
      imageUrls: Array<string | null | undefined>,
    ) => {
      if (!vendorId) return;
      const current = map.get(vendorId) ?? {
        vendorId,
        name,
        avatar,
        state: state ?? null,
        sectors: sectors ?? [],
        verified: Boolean(verified),
        images: [],
      };
      if (!current.name && name) current.name = name;
      if (!current.avatar && avatar) current.avatar = avatar;
      for (const url of imageUrls) {
        if (url && !current.images.includes(url)) current.images.push(url);
      }
      map.set(vendorId, current);
    };

    for (const v of home.featured ?? []) {
      add(
        v.vendorId,
        v.name,
        v.avatar,
        v.state || v.place,
        v.sectors || [],
        v.verified,
        [v.imageUrl],
      );
    }

    for (const item of home.timeline ?? []) {
      add(
        item.vendorId,
        item.storeName || "Vendor",
        item.avatar,
        item.place,
        item.sectors || [],
        Boolean(item.verified),
        [item.imageUrl, ...(item.images ?? [])],
      );
    }

    return [...map.values()].filter((v) => v.images.length > 0);
  }, [home]);

  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [headline, setHeadline] = useState("");
  const [blurb, setBlurb] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorPickerOpen, setVendorPickerOpen] = useState(false);
  const [selectedSectorFilter, setSelectedSectorFilter] = useState("all");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiHeadlines, setAiHeadlines] = useState<string[]>([]);
  const [aiBlurb, setAiBlurb] = useState<string | null>(null);

  const activeVendor = useMemo(() => {
    if (selectedVendorId) {
      return advertVendors.find((v) => v.vendorId === selectedVendorId) ?? null;
    }
    return advertVendors[0] ?? null;
  }, [advertVendors, selectedVendorId]);

  // Extract all sectors available among these vendors for quick filtering
  const allAvailableSectors = useMemo(() => {
    const set = new Set<string>();
    for (const v of advertVendors) {
      for (const s of v.sectors) {
        if (s) set.add(s);
      }
    }
    return Array.from(set);
  }, [advertVendors]);

  // Identify the listing associated with the selected creative photo
  const selectedListing = useMemo(() => {
    if (!selectedImage || !home?.timeline) return null;
    return (
      home.timeline.find(
        (item) =>
          item.imageUrl === selectedImage ||
          (item.images && item.images.includes(selectedImage)),
      ) ?? null
    );
  }, [selectedImage, home?.timeline]);

  // Safely extract formatted price or quote indicator from selected listing
  const selectedListingPrice = useMemo(() => {
    if (!selectedListing?.listing) return null;
    if (selectedListing.listing.quoteOnRequest) return "Contact for quote";
    if (selectedListing.listing.price > 0) {
      return formatNaira(selectedListing.listing.price);
    }
    return null;
  }, [selectedListing]);

  // Default selection when vendors load
  useMemo(() => {
    if (advertVendors.length > 0 && !selectedVendorId) {
      const first = advertVendors[0];
      setSelectedVendorId(first.vendorId);
      if (first.images[0]) setSelectedImage(first.images[0]);
    }
  }, [advertVendors, selectedVendorId]);

  const filteredVendors = useMemo(() => {
    return advertVendors.filter((v) => {
      const q = vendorSearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        v.name.toLowerCase().includes(q) ||
        (v.state && v.state.toLowerCase().includes(q)) ||
        v.sectors.some((s) => s.toLowerCase().includes(q));

      const matchesSector =
        selectedSectorFilter === "all" ||
        v.sectors.includes(selectedSectorFilter);

      return matchesQuery && matchesSector;
    });
  }, [advertVendors, vendorSearch, selectedSectorFilter]);

  const headlineSuggestions = [
    "⚡ Limited-time discount on top products today!",
    "⭐ Highly recommended seller with doorstep delivery",
    "✨ Exclusive new arrivals available in stock now",
  ];

  const handleSelectVendor = (vendor: AdvertVendorOption) => {
    setSelectedVendorId(vendor.vendorId);
    setAiHeadlines([]);
    setAiBlurb(null);
    if (vendor.images[0]) {
      setSelectedImage(vendor.images[0]);
    } else {
      setSelectedImage("");
    }
  };

  const handleGenerateAi = async () => {
    if (!activeVendor) {
      toast.error("Please choose a business first.");
      return;
    }

    setGeneratingAi(true);
    try {
      const briefParts = [
        selectedListing?.title
          ? `Product / Item being advertised: ${selectedListing.title}`
          : null,
        selectedListing?.body
          ? `Item description / category: ${selectedListing.body}`
          : null,
        selectedListingPrice ? `Price: ${selectedListingPrice}` : null,
        activeVendor.state
          ? `Vendor location: ${activeVendor.state}, Nigeria`
          : null,
        activeVendor.sectors.length
          ? `Sectors: ${activeVendor.sectors.join(", ")}`
          : null,
      ].filter(Boolean);

      const res = await fetch("/api/hub/draft-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: activeVendor.name,
          productName: selectedListing?.title || null,
          seedHeadline: headline.trim() || null,
          brief: briefParts.join(". ") || null,
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          errorData?.error || "Could not draft copy with AI right now.",
        );
      }

      const data = (await res.json()) as {
        headlines?: string[];
        blurb?: string;
      };

      if (data.headlines && data.headlines.length > 0) {
        setAiHeadlines(data.headlines);
        setHeadline(data.headlines[0]);
      }
      if (data.blurb) {
        setAiBlurb(data.blurb);
        setBlurb(data.blurb);
      }
      toast.success(
        selectedListing?.title
          ? `AI generated headlines & copy for "${selectedListing.title}"!`
          : "AI generated headlines & copy for your advert!",
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to generate AI advert copy.",
      );
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVendor) {
      toast.error("Please choose a vendor to promote.");
      return;
    }
    if (!selectedImage) {
      toast.error("Please select a featured photo from the vendor.");
      return;
    }
    if (headline.trim().length < 3) {
      toast.error("Please provide a headline (minimum 3 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/hub/buyer-adverts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: activeVendor.vendorId,
          imageUrl: selectedImage,
          headline: headline.trim(),
          blurb: blurb.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorData?.error || "Could not publish advert.");
      }

      toast.success("Advert placed successfully! Pinned on the Hub feed.");
      queryClient.removeQueries({ queryKey: ["hub"] });
      queryClient.invalidateQueries({ queryKey: ["hub"] });
      navigate("/hub");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to place advert.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <main className="flex-1 w-full max-w-[1240px] mx-auto px-0 sm:px-6 py-0 sm:py-8">
        {/* Hero Header */}
        <div className="pb-6 sm:pb-8 max-w-2xl px-4 sm:px-0 pt-4 sm:pt-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
            Place a Sponsored Advert
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-ink/60 leading-relaxed">
            Spotlight top Nigerian vendors and listings directly on the main
            Vendor Hub feed. Your advert will be pinned with a verified
            Sponsored badge.
          </p>
        </div>

        {/* Upgrade Gate if Buyer is not premium */}
        {!isPremium ? (
          <div className="bg-surface rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-x border-orange-200 dark:border-orange-500/20 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20 mb-4">
              <CrownIcon size={28} weight="fill" />
            </div>
            <h2 className="text-xl font-bold text-ink">
              Placing Adverts is a Premium Feature
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-ink/60 leading-relaxed max-w-md mx-auto">
              Upgrade to Buyer Premium to promote your preferred vendors,
              broadcast requests, unlock all business contacts, and browse
              uncapped listings.
            </p>
            <div className="mt-6">
              <Link
                href="/pricing?for=buyers"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 text-sm font-bold shadow-md shadow-orange-500/25 transition-all"
              >
                <span>Upgrade to Premium</span>
                <ArrowRightIcon size={14} />
              </Link>
            </div>
          </div>
        ) : (
          /* Main 2-Column Responsive Layout */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-8 items-start">
            {/* Left Column: Form Controls */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Choose Business (Scalable Active Card) */}
              <section className="bg-surface rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-x border-gray-200 dark:border-white/10 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold">
                      1
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-ink">
                      Selected Business
                    </h2>
                  </div>
                  <span className="text-xs text-gray-400">
                    {advertVendors.length}{" "}
                    {advertVendors.length === 1 ? "vendor" : "vendors"}{" "}
                    available
                  </span>
                </div>

                {activeVendor ? (
                  <div className="mt-4 p-4 rounded-xl border border-orange-500/30 bg-orange-50/40 dark:bg-orange-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-950/50 shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold text-orange-600 border border-orange-200 dark:border-orange-500/20">
                        {activeVendor.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={activeVendor.avatar}
                            alt={activeVendor.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          activeVendor.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-ink truncate">
                            {activeVendor.name}
                          </span>
                          {activeVendor.verified && (
                            <BadgeCheckIcon
                              size={15}
                              className="text-sky-500 shrink-0"
                            />
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                            Active Choice
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-ink/60 flex-wrap">
                          {activeVendor.state && (
                            <span className="inline-flex items-center gap-1">
                              <MapPinIcon size={11} className="text-gray-400" />
                              <span>{activeVendor.state}</span>
                            </span>
                          )}
                          {activeVendor.sectors[0] && (
                            <span>
                              · {activeVendor.sectors[0].replace(/_/g, " ")}
                            </span>
                          )}
                          <span>
                            · {activeVendor.images.length} creative photos
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setVendorPickerOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-surface hover:bg-gray-50 dark:hover:bg-white/5 hover:border-orange-300 dark:hover:border-orange-500/30 px-4 py-2 text-xs font-bold text-ink hover:text-orange-600 transition-all cursor-pointer shrink-0 shadow-xs"
                    >
                      <span>Change Business</span>
                      <ArrowRightIcon size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 p-8 rounded-xl border border-dashed border-gray-300 dark:border-white/15 text-center">
                    <p className="text-xs font-semibold text-gray-500 mb-3">
                      No business selected yet
                    </p>
                    <button
                      type="button"
                      onClick={() => setVendorPickerOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      <StoreIcon size={14} />
                      <span>Choose Business to Promote</span>
                    </button>
                  </div>
                )}
              </section>

              {/* Step 2: Choose Creative Photo */}
              <section className="bg-surface rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-x border-gray-200 dark:border-white/10 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-white/5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold">
                    2
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-ink">
                      Select Featured Photo
                    </h2>
                    <p className="text-[11px] text-gray-500 dark:text-ink/60">
                      Choose a product or catalog image from{" "}
                      {activeVendor?.name || "this store"}
                    </p>
                  </div>
                </div>

                {activeVendor && activeVendor.images.length > 0 ? (
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {activeVendor.images.map((url) => {
                      const isSelected = selectedImage === url;
                      return (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setSelectedImage(url)}
                          className={cn(
                            "group relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer",
                            isSelected
                              ? "border-orange-500 ring-2 ring-orange-500/30"
                              : "border-transparent hover:opacity-90",
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Vendor creative"
                            className="h-full w-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                              <span className="h-6 w-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md">
                                <CheckIcon size={14} />
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-gray-500 py-6 text-center">
                    Select a vendor above to load their catalog photos.
                  </p>
                )}
              </section>

              {/* Step 3: Write Headline & Copy */}
              <section className="bg-surface rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-x border-gray-200 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold shrink-0">
                      3
                    </span>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-ink">
                        Advert Headline &amp; Message
                      </h2>
                      <p className="text-[11px] text-gray-500 dark:text-ink/60">
                        Write an engaging title to grab shoppers&apos; attention
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateAi}
                    disabled={generatingAi || !activeVendor}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-3.5 py-1.5 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm shrink-0 self-start sm:self-auto"
                  >
                    <SparklesIcon
                      size={13}
                      className={generatingAi ? "animate-spin" : ""}
                    />
                    <span>
                      {generatingAi ? "AI Studying Listing…" : "Write with AI"}
                    </span>
                  </button>
                </div>

                {/* Listing Intelligence Insight Box */}
                {selectedListing && (
                  <div className="rounded-xl border border-orange-200/80 bg-gradient-to-r from-orange-50/80 to-amber-50/80 dark:border-orange-500/20 dark:from-orange-950/20 dark:to-amber-950/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white shadow-xs mt-0.5 sm:mt-0">
                        <SparklesIcon size={14} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-ink">
                            Selected Listing:
                          </span>
                          <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                            {selectedListing.title}
                          </span>
                          {selectedListingPrice && (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              · {selectedListingPrice}
                            </span>
                          )}
                        </div>
                        {selectedListing.body && (
                          <p className="text-[11px] text-gray-500 dark:text-ink/60 truncate max-w-md mt-0.5">
                            {selectedListing.body}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateAi}
                      disabled={generatingAi}
                      className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer shrink-0"
                    >
                      {generatingAi ? "Generating…" : "Generate AI Copy →"}
                    </button>
                  </div>
                )}

                {/* AI Generated Headlines (interactive cards) */}
                {aiHeadlines.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <SparklesIcon size={12} />
                        <span>AI Suggested Headlines (Click to apply)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateAi}
                        disabled={generatingAi}
                        className="text-[10px] font-semibold text-gray-400 hover:text-orange-500 hover:underline cursor-pointer"
                      >
                        Regenerate
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {aiHeadlines.map((h, i) => {
                        const isApplied = headline === h;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setHeadline(h)}
                            className={cn(
                              "p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer relative",
                              isApplied
                                ? "border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 ring-1 ring-orange-500"
                                : "border-gray-200 dark:border-white/10 hover:border-orange-300 bg-canvas/40 hover:bg-orange-50/30 text-ink",
                            )}
                          >
                            <span className="block text-[10px] font-bold uppercase text-orange-500 mb-1">
                              {i === 0
                                ? "Benefit Angle"
                                : i === 1
                                  ? "Urgency Angle"
                                  : "Quality Angle"}
                            </span>
                            <p className="line-clamp-2 leading-snug">{h}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Headline input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="advert-headline"
                      className="text-xs font-bold text-ink"
                    >
                      Headline <span className="text-orange-500">*</span>
                    </label>
                    <span
                      className={cn(
                        "text-[11px]",
                        headline.length > 70
                          ? "text-orange-600 font-bold"
                          : "text-gray-400",
                      )}
                    >
                      {headline.length} / 80
                    </span>
                  </div>
                  <input
                    id="advert-headline"
                    type="text"
                    maxLength={80}
                    placeholder="e.g. Flash Sale: 15% OFF all custom cakes this weekend only!"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-canvas/60 px-3.5 py-2.5 text-xs sm:text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {/* Default Suggestions if no AI yet */}
                  {aiHeadlines.length === 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {headlineSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setHeadline(s)}
                          className="text-[11px] rounded-lg border border-gray-200 dark:border-white/10 hover:border-orange-300 px-2 py-1 text-gray-600 dark:text-ink/70 hover:bg-orange-50/40 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Blurb / Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="advert-blurb"
                      className="text-xs font-bold text-ink"
                    >
                      Short Description (Optional)
                    </label>
                    <span
                      className={cn(
                        "text-[11px]",
                        blurb.length > 250
                          ? "text-orange-600 font-bold"
                          : "text-gray-400",
                      )}
                    >
                      {blurb.length} / 280
                    </span>
                  </div>
                  <textarea
                    id="advert-blurb"
                    rows={3}
                    maxLength={280}
                    placeholder="Share additional details such as delivery areas, operating hours, or special perks..."
                    value={blurb}
                    onChange={(e) => setBlurb(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-canvas/60 p-3 text-xs sm:text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none leading-relaxed"
                  />
                  {aiBlurb && blurb !== aiBlurb && (
                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => setBlurb(aiBlurb)}
                        className="text-[11px] text-orange-600 dark:text-orange-400 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <SparklesIcon size={11} />
                        <span>Restore AI drafted message</span>
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Publish Action Bar */}
              <div className="flex items-center justify-end gap-3 pt-2 px-4 sm:px-0">
                <Link
                  href="/hub"
                  className="rounded-xl border border-gray-200 dark:border-white/10 px-5 py-3 text-xs sm:text-sm font-semibold text-ink hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !activeVendor ||
                    !selectedImage ||
                    headline.trim().length < 3
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-6 py-3 text-xs sm:text-sm font-bold shadow-lg shadow-orange-500/25 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <MegaphoneIcon size={16} />
                  <span>
                    {submitting
                      ? "Publishing Advert…"
                      : "Publish Advert on Hub"}
                  </span>
                </button>
              </div>
            </form>

            {/* Right Column: Live Feed Preview */}
            <aside className="space-y-4 lg:sticky lg:top-24">
              <div className="flex items-center justify-between px-4 sm:px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Live Feed Preview
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Real-time
                </span>
              </div>

              {/* Preview Card */}
              <article className="rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-x border-gray-200 dark:border-white/10 bg-surface overflow-hidden shadow-md">
                {/* Image */}
                <div className="relative aspect-video w-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                  {selectedImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedImage}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 text-xs">
                      <StoreIcon size={28} className="mb-1 opacity-40" />
                      <span>Select a photo to preview</span>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 rounded-md bg-orange-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    Sponsored
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Store details with co-branded Buyer -> Vendor attribution */}
                  <div className="flex items-center gap-3">
                    {/* Compound avatar: Buyer's logo as main, Vendor's as subset */}
                    <div className="relative flex shrink-0 items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-neutral-900 text-white dark:bg-neutral-800 dark:text-ink flex items-center justify-center font-bold text-xs overflow-hidden ring-2 ring-surface shadow-xs">
                        {buyer?.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={buyer.avatar}
                            alt={buyer.name || "Buyer"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>
                            {(buyer?.name || "B").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div
                        title={`Vendor: ${activeVendor?.name || "Vendor"}`}
                        className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[9px] overflow-hidden ring-2 ring-surface shadow-xs"
                      >
                        {activeVendor?.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={activeVendor.avatar}
                            alt={activeVendor.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>
                            {(activeVendor?.name || "V")
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-ink truncate max-w-[120px] sm:max-w-none">
                          {buyer?.name || "Velte Technologies"}
                        </span>
                        <RepeatIcon
                          size={12}
                          className="text-orange-500 shrink-0"
                        />
                        <span className="text-xs font-semibold text-gray-700 dark:text-ink/90 truncate max-w-[120px] sm:max-w-none">
                          {activeVendor?.name || "Business Name"}
                        </span>
                        {activeVendor?.verified && (
                          <span
                            title="Verified Vendor"
                            className="inline-flex shrink-0 items-center"
                          >
                            <CheckIcon
                              size={13}
                              className="text-orange-500 shrink-0"
                            />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-ink/60 mt-0.5">
                        <span className="text-orange-600 dark:text-orange-400 font-medium">
                          Sponsored
                        </span>
                        <span>·</span>
                        <span>{activeVendor?.state || "Nigeria"}</span>
                        <span>·</span>
                        <span>Just now</span>
                      </div>
                    </div>
                  </div>

                  {/* Headline & description */}
                  <div>
                    <h3 className="text-sm font-bold text-ink leading-snug">
                      {headline || "Your promotional headline will appear here"}
                    </h3>
                    {blurb && (
                      <p className="mt-1 text-xs text-gray-600 dark:text-ink/75 leading-relaxed line-clamp-3">
                        {blurb}
                      </p>
                    )}
                  </div>

                  {/* Simulated Action */}
                  <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-400">
                    <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                      Contact card &rarr;
                    </span>
                    <span className="text-[11px]">Pins for 7 days</span>
                  </div>
                </div>
              </article>
            </aside>
          </div>
        )}
      </main>

      {/* Searchable Scalable Vendor Picker Modal */}
      {vendorPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose a business"
          className={cn(
            "fixed inset-0 z-50 h-dvh w-dvw flex items-end sm:items-center justify-center p-4",
            modalScrimClass(),
          )}
          onClick={() => setVendorPickerOpen(false)}
        >
          <div
            className="bg-surface w-full sm:max-w-2xl rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                  <StoreIcon size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    Choose a Business to Promote
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-ink/60 mt-0.5">
                    {advertVendors.length} businesses available with verified
                    catalog photos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVendorPickerOpen(false)}
                aria-label="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-ink hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            {/* Search Bar & Filters */}
            <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] space-y-3">
              <div className="relative">
                <SearchIcon
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search by business name, state, or product keyword..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-surface pl-10 pr-12 py-2.5 text-xs text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-xs"
                />
                {vendorSearch && (
                  <button
                    type="button"
                    onClick={() => setVendorSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink text-xs font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Sector quick filter pills */}
              {allAvailableSectors.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedSectorFilter("all")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer",
                      selectedSectorFilter === "all"
                        ? "bg-orange-500 text-white shadow-xs"
                        : "bg-surface border border-gray-200 dark:border-white/10 text-gray-600 dark:text-ink/70 hover:border-orange-300",
                    )}
                  >
                    All Sectors ({advertVendors.length})
                  </button>
                  {allAvailableSectors.map((sector) => {
                    const count = advertVendors.filter((v) =>
                      v.sectors.includes(sector),
                    ).length;
                    return (
                      <button
                        key={sector}
                        type="button"
                        onClick={() => setSelectedSectorFilter(sector)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer",
                          selectedSectorFilter === sector
                            ? "bg-orange-500 text-white shadow-xs"
                            : "bg-surface border border-gray-200 dark:border-white/10 text-gray-600 dark:text-ink/70 hover:border-orange-300",
                        )}
                      >
                        {sector.replace(/_/g, " ")} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vendor List */}
            <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
              {filteredVendors.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-400 mb-2">
                    <StoreIcon size={22} />
                  </span>
                  <p className="text-xs font-semibold text-ink">
                    No businesses found
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-ink/60 mt-1 max-w-xs mx-auto">
                    Try searching for another business name or clear your
                    filters.
                  </p>
                </div>
              ) : (
                filteredVendors.map((vendor) => {
                  const isSelected = activeVendor?.vendorId === vendor.vendorId;
                  return (
                    <div
                      key={vendor.vendorId}
                      onClick={() => {
                        handleSelectVendor(vendor);
                        setVendorPickerOpen(false);
                      }}
                      className={cn(
                        "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group",
                        isSelected
                          ? "border-orange-500 bg-orange-50/70 dark:bg-orange-950/30 ring-1 ring-orange-500"
                          : "border-gray-200 dark:border-white/10 hover:border-orange-300 dark:hover:border-orange-500/30 hover:bg-orange-50/30 dark:hover:bg-white/5",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-xl bg-gray-100 dark:bg-white/10 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-ink border border-gray-200 dark:border-white/10">
                          {vendor.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={vendor.avatar}
                              alt={vendor.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            vendor.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-ink group-hover:text-orange-600 transition-colors truncate">
                              {vendor.name}
                            </span>
                            {vendor.verified && (
                              <BadgeCheckIcon
                                size={14}
                                className="text-sky-500 shrink-0"
                              />
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-ink/60 mt-0.5 truncate flex items-center gap-1.5">
                            {vendor.state && (
                              <span className="inline-flex items-center gap-0.5">
                                <MapPinIcon
                                  size={10}
                                  className="text-gray-400"
                                />
                                <span>{vendor.state}</span>
                              </span>
                            )}
                            {vendor.sectors[0] && (
                              <span>
                                · {vendor.sectors[0].replace(/_/g, " ")}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Photo preview strip */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <div className="flex items-center -space-x-2 overflow-hidden">
                          {vendor.images.slice(0, 3).map((img, idx) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={idx}
                              src={img}
                              alt=""
                              className="h-7 w-7 rounded-lg object-cover ring-2 ring-surface border border-gray-200"
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {vendor.images.length} photos
                        </span>

                        <span
                          className={cn(
                            "ml-2 h-7 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-orange-500 text-white"
                              : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-ink/70 group-hover:bg-orange-500 group-hover:text-white",
                          )}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs bg-gray-50/50 dark:bg-white/[0.02]">
              <span className="text-gray-500 dark:text-ink/60">
                Showing {filteredVendors.length} of {advertVendors.length}{" "}
                businesses
              </span>
              <button
                type="button"
                onClick={() => setVendorPickerOpen(false)}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
