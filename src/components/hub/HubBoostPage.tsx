"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import {
  BarChartIcon,
  CheckCircleIcon,
  CheckIcon,
  CrownIcon,
  InfoIcon,
  LightbulbIcon,
  SearchIcon,
  StarIcon,
  WalletIcon,
} from "@/components/icons";
import { HubHero } from "@/components/hub/HubHero";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import { HubSidebarFooter } from "@/components/hub/HubSidebarFooter";
import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { SECTOR_BY_VALUE } from "@/lib/sectors";
import { cn, formatNaira } from "@/lib/utils";
import {
  cancelHubBoost,
  createHubBoost,
  fetchHubBoosts,
  fetchHubContext,
  fetchHubHome,
  hubPageQueryOptions,
} from "@/services/hub";
import { categoriesApi } from "@/services/products";
import type { CategoryProduct } from "@/types/product";

const DURATION_COPY: Record<number, { label: string; hint: string }> = {
  3: { label: "3 Days", hint: "Great for quick visibility" },
  7: { label: "7 Days", hint: "Best for more reach" },
  14: { label: "14 Days", hint: "Maximum exposure" },
};

function listingPrice(product: CategoryProduct): string | null {
  if (product.quoteOnRequest) return "Contact for quote";
  const format = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;
  if (product.priceMax && product.priceMax > product.price) {
    return `${format(product.price)} – ${format(product.priceMax)}`;
  }
  if (product.price > 0) return format(product.price);
  return null;
}

function sectorLabel(value?: string) {
  if (!value) return null;
  return SECTOR_BY_VALUE[value]?.label ?? value.replace(/_/g, " ");
}

function formatReach(min?: number, max?: number) {
  if (
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    (min === 0 && max === 0)
  ) {
    return "0";
  }
  const low = (min as number).toLocaleString("en-NG");
  const high = (max as number).toLocaleString("en-NG");
  return min === max ? low : `${low} – ${high}`;
}

function formatBoostDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function HubBoostPage({ userId }: { userId: string }) {
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

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
  const boostsQuery = useQuery({
    queryKey: queryKeys.hub.boosts,
    queryFn: fetchHubBoosts,
    ...hubPageQueryOptions,
  });

  const context = contextQuery.data ?? null;
  const home = homeQuery.data ?? null;
  const listings = useMemo(
    () =>
      (listingsQuery.data?.products ?? []).filter(
        (product) => !product.isSuspended,
      ),
    [listingsQuery.data],
  );
  const boosts = boostsQuery.data ?? [];
  const tiers = context?.boostTiers ?? [];
  const selectedDays = days ?? tiers[0]?.days ?? null;
  const selectedTier = tiers.find((tier) => tier.days === selectedDays) ?? null;
  const activeIds = new Set(
    boosts.filter((row) => row.status === "active").map((row) => row.productId),
  );
  const selected = listings.find((item) => item.id === selectedId) ?? null;
  const selectedIsLive = selectedId != null && activeIds.has(selectedId);
  const activeCount = activeIds.size;
  const atCap =
    context != null &&
    activeCount >= context.maxActiveAdverts &&
    !selectedIsLive;
  const costKobo = selectedTier?.costKobo ?? 0;
  const canAfford =
    context != null &&
    (costKobo === 0 || context.walletBalanceKobo >= costKobo);
  const canConfirm =
    Boolean(selectedId) &&
    selectedDays != null &&
    !selectedIsLive &&
    !atCap &&
    canAfford &&
    !busy;

  const visibleListings = listings.filter((product) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return product.name.toLowerCase().includes(needle);
  });

  const ownFeatured =
    home?.featured.find(
      (item) => home.store?.handle != null && item.handle === home.store.handle,
    ) ?? null;
  const walletHref = "/wallet";

  const reload = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.hub.boosts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.hub.context }),
      queryClient.invalidateQueries({ queryKey: queryKeys.hub.home("vendor") }),
    ]);
  };

  const confirm = async () => {
    if (!selectedId || selectedDays == null || !canConfirm) return;
    setBusy(true);
    try {
      const result = await createHubBoost(selectedId, selectedDays);
      toast.success(
        result.alreadyActive
          ? "That listing is already boosted."
          : "Listing boosted.",
      );
      setSelectedId(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't boost that listing.",
      );
    } finally {
      setBusy(false);
    }
  };

  const stopBoost = async (id: string) => {
    setMenuId(null);
    try {
      await cancelHubBoost(id);
      toast.success("Boost stopped.");
      await reload();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't stop that boost.",
      );
    }
  };

  if (
    contextQuery.isPending ||
    homeQuery.isPending ||
    listingsQuery.isPending ||
    boostsQuery.isPending
  ) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 rounded-2xl bg-gray-100" />
        <div className="h-72 rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-surface p-10 text-center">
        <p className="font-semibold text-ink">Couldn&apos;t load Boost</p>
        <button
          type="button"
          onClick={() => navigate("/hub")}
          className="mt-4 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <HubHero
        eyebrow="Vendor Hub"
        title="Boost your listing"
        subtitle="Put one of your products in front of more buyers on the Hub. Choose a listing, pick how long it stays sponsored, and confirm."
        cardImage="/hub/boost-product.jpg"
        cardBadge="Sponsored"
      />

      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  1
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">
                    Select a Listing to Boost
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Choose a product or service you want to promote. The listing
                    will remain the same — it just gets more visibility on the
                    Hub.
                  </p>
                </div>
              </div>
              <label className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
                <SearchIcon size={16} className="text-gray-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search your listings..."
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-gray-400"
                />
              </label>
              {listings.length === 0 ? (
                <p className="mt-6 py-8 text-center text-sm text-gray-500">
                  You don&apos;t have a listing to boost yet. Add one, then come
                  back.
                </p>
              ) : visibleListings.length === 0 ? (
                <p className="mt-6 py-8 text-center text-sm text-gray-500">
                  No listing matches that search.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {visibleListings.map((product) => {
                    const picked = product.id === selectedId;
                    const live = activeIds.has(product.id);
                    const price = listingPrice(product);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setSelectedId(product.id)}
                        className={cn(
                          "overflow-hidden rounded-2xl border bg-surface text-left transition-colors",
                          picked
                            ? "border-orange-500 ring-2 ring-orange-500/20"
                            : "border-gray-200 hover:border-orange-300",
                        )}
                      >
                        <div className="relative h-28 bg-gray-100">
                          {product.mainImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.mainImageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                          {picked && (
                            <span className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white">
                              <CheckIcon size={12} />
                            </span>
                          )}
                          {live && (
                            <span className="absolute top-2 left-2 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              Boosted
                            </span>
                          )}
                        </div>
                        <div className="px-2.5 py-2">
                          <p className="truncate text-sm font-semibold text-ink">
                            {product.name}
                          </p>
                          {sectorLabel(product.sectorValue) && (
                            <p className="truncate text-[11px] text-gray-400">
                              {sectorLabel(product.sectorValue)}
                            </p>
                          )}
                          {price && (
                            <p className="mt-0.5 text-xs font-semibold text-ink">
                              {price}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  2
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">
                    Choose Boost Duration
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    The longer you boost, the more people you reach.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {tiers.map((tier) => {
                  const copy = DURATION_COPY[tier.days];
                  const picked = tier.days === selectedDays;
                  return (
                    <button
                      key={tier.days}
                      type="button"
                      onClick={() => setDays(tier.days)}
                      className={cn(
                        "rounded-2xl border bg-canvas px-4 py-4 text-left transition-colors",
                        picked
                          ? "border-orange-500 ring-2 ring-orange-500/20"
                          : "border-gray-200 hover:border-orange-300",
                      )}
                    >
                      <span
                        className={cn(
                          "mb-3 flex h-4 w-4 items-center justify-center rounded-full border",
                          picked
                            ? "border-orange-500 bg-orange-500"
                            : "border-gray-300",
                        )}
                      >
                        {picked && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      <p className="text-sm font-bold text-ink">
                        {copy?.label ?? `${tier.days} Days`}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {copy?.hint ?? "Boost duration"}
                      </p>
                      <p className="mt-3 text-lg font-bold text-ink">
                        {tier.costKobo === 0
                          ? "Free"
                          : formatNaira(tier.costKobo)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  3
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">
                    Review & Confirm
                  </h2>
                </div>
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-800">
                <LightbulbIcon size={16} className="mt-0.5 shrink-0" />
                {context.enterprise
                  ? "Your listing will appear as sponsored on the Hub for the selected duration. Enterprise boosts do not debit your wallet."
                  : "Your listing will appear as sponsored on the Hub for the selected duration. Payment will be deducted from your wallet."}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-3">
                  <WalletIcon size={18} className="text-gray-400" />
                  <div>
                    <p className="text-[11px] text-gray-500">Wallet Balance</p>
                    <p className="text-sm font-bold text-ink">
                      {formatNaira(context.walletBalanceKobo)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-3">
                  <BarChartIcon size={18} className="text-gray-400" />
                  <div>
                    <p className="text-[11px] text-gray-500">Estimated Reach</p>
                    <p className="inline-flex items-center gap-1 text-sm font-bold text-ink">
                      {formatReach(
                        selectedTier?.reachMin,
                        selectedTier?.reachMax,
                      )}{" "}
                      buyers
                      <span title="Estimate based on boost amount and duration. Real Hub views are not counted yet.">
                        <InfoIcon size={13} className="text-gray-400" />
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              {!canAfford && costKobo > 0 && (
                <p className="mt-3 text-xs text-red-500">
                  Top up your wallet to cover {formatNaira(costKobo)}.{" "}
                  <Link href={walletHref} className="font-semibold underline">
                    Go to wallet
                  </Link>
                </p>
              )}
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={!canConfirm}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy
                  ? "Confirming…"
                  : atCap
                    ? `Limit reached (${context.maxActiveAdverts} live)`
                    : selectedIsLive
                      ? "Already boosted"
                      : "Confirm Boost"}
                <ArrowRight size={16} />
              </button>
            </section>

            <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4 sm:p-5">
              <h2 className="text-base font-bold text-ink">My Boosts</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                View and manage your active and past boosts.
              </p>
              {boosts.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  No boosts yet. Pick a listing above to start one.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      <tr>
                        <th className="pb-2 font-semibold">Listing</th>
                        <th className="pb-2 font-semibold">Duration</th>
                        <th className="pb-2 font-semibold">Start Date</th>
                        <th className="pb-2 font-semibold">Status</th>
                        <th className="pb-2 font-semibold">Reach</th>
                        <th className="pb-2 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {boosts.map((row) => (
                        <tr key={row.id}>
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                {row.productImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={row.productImage}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </span>
                              <span>
                                <span className="block font-semibold text-ink">
                                  {row.productName}
                                </span>
                                {row.productPrice != null &&
                                  row.productPrice > 0 && (
                                    <span className="block text-xs text-gray-500">
                                      ₦
                                      {row.productPrice.toLocaleString("en-NG")}
                                    </span>
                                  )}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-gray-600">
                            {row.days} Days
                          </td>
                          <td className="py-3 text-gray-600">
                            {formatBoostDate(row.startsAt)}
                          </td>
                          <td className="py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 text-xs font-semibold capitalize",
                                row.status === "active"
                                  ? "text-orange-600"
                                  : "text-gray-500",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  row.status === "active"
                                    ? "bg-orange-500"
                                    : "bg-gray-300",
                                )}
                              />
                              {row.status}
                            </span>
                          </td>
                          <td className="py-3 text-gray-600">
                            {formatReach(row.reachMin, row.reachMax)}
                          </td>
                          <td className="relative py-3">
                            {row.status === "active" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMenuId((current) =>
                                      current === row.id ? null : row.id,
                                    )
                                  }
                                  className="px-2 text-lg leading-none text-gray-400"
                                  aria-label="Boost actions"
                                >
                                  ···
                                </button>
                                {menuId === row.id && (
                                  <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-gray-200 bg-surface py-1 shadow-lg">
                                    <button
                                      type="button"
                                      onClick={() => void stopBoost(row.id)}
                                      className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-gray-50"
                                    >
                                      Stop boost
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4">
              <h3 className="text-sm font-bold text-ink">Listing Preview</h3>
              {selected ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-gray-100">
                  <div className="relative h-40 bg-gray-100">
                    {selected.mainImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selected.mainImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <span className="absolute top-2 right-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      Boosted
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-ink">
                      {selected.name}
                    </p>
                    {sectorLabel(selected.sectorValue) && (
                      <p className="text-xs text-gray-500">
                        {sectorLabel(selected.sectorValue)}
                      </p>
                    )}
                    {listingPrice(selected) && (
                      <p className="mt-1 text-sm font-bold text-ink">
                        {listingPrice(selected)}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {home?.store?.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                          <CheckIcon size={11} />
                          Verified Vendor
                        </span>
                      )}
                      {ownFeatured?.trusted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                          Trusted
                        </span>
                      )}
                    </div>
                    <span className="mt-2 inline-flex items-center gap-0.5 text-xs">
                      {Array.from({ length: 5 }, (_, index) => {
                        const rated =
                          ownFeatured != null &&
                          ownFeatured.ratingCount > 0 &&
                          ownFeatured.ratingAvg != null;
                        const filled =
                          rated &&
                          index < Math.round(ownFeatured.ratingAvg as number);
                        return (
                          <StarIcon
                            key={index}
                            size={12}
                            weight={filled ? "fill" : "regular"}
                            className={
                              filled ? "text-amber-400" : "text-gray-300"
                            }
                          />
                        );
                      })}
                      <span className="text-gray-400">
                        ({ownFeatured?.ratingCount ?? 0})
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 py-8 text-center text-sm text-gray-500">
                  Select a listing to preview it here.
                </p>
              )}
            </section>

            <section className="rounded-none lg:rounded-2xl border border-gray-200 bg-surface p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                <BarChartIcon size={16} className="text-orange-500" />
                Why boost?
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-ink">
                {[
                  "More visibility on the Hub",
                  "Reach more potential buyers",
                  "Get more inquiries and sales",
                  "Simple and fast setup",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircleIcon
                      size={16}
                      className="mt-0.5 shrink-0 text-orange-500"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {!context.enterprise && (
              <section className="rounded-none lg:rounded-2xl border border-orange-200 bg-orange-50 p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                  <CrownIcon size={18} />
                </span>
                <h3 className="mt-3 text-base font-bold text-ink">
                  Want even more reach?
                </h3>
                <p className="mt-1 text-xs text-gray-600">
                  Place a store advert for top Hub placement, or upgrade to
                  Enterprise for free boosts and more tools.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/hub/advert")}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-canvas"
                >
                  Place a store advert
                  <ArrowRight size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/pricing?for=vendors")}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-orange-300 bg-surface px-4 py-2.5 text-sm font-semibold text-ink"
                >
                  Upgrade to Enterprise
                  <ArrowRight size={16} aria-hidden />
                </button>
              </section>
            )}

            <HubSidebarFooter />
          </aside>
        </div>
      </div>
    </div>
  );
}
