"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CheckIcon } from "@/components/icons";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { categoriesApi } from "@/services/products";
import type { CategoryProduct } from "@/types/product";
import type { HubContext } from "@/types/hub";

type ActiveBoost = { productId: string; endsAt: string };

function listingPrice(product: CategoryProduct): string | null {
  if (product.quoteOnRequest) return "Contact for quote";
  const format = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;
  if (product.priceMax && product.priceMax > product.price) {
    return `${format(product.price)} – ${format(product.priceMax)}`;
  }
  if (product.price > 0) return format(product.price);
  return null;
}

/** Pick one listing the vendor already sells and label that card Sponsored.
 *  This is not Place Advert: no new headline, poster, or pin. */
export function HubBoostSheet({
  context,
  onSponsoredAction,
}: {
  context: HubContext;
  onSponsoredAction?: () => void;
}) {
  const [listings, setListings] = useState<CategoryProduct[] | null>(null);
  const [active, setActive] = useState<ActiveBoost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [products, boosts] = await Promise.all([
          categoriesApi.getProducts({ limit: 50 }),
          api.get<ActiveBoost[]>("/api/hub/boosts"),
        ]);
        if (cancelled) return;
        setListings(
          products.products.filter((product) => !product.isSuspended),
        );
        setActive(Array.isArray(boosts) ? boosts : []);
      } catch {
        if (!cancelled) {
          toast.error("Couldn't load your listings.");
          setListings([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeIds = new Set(active.map((row) => row.productId));
  const selectedIsLive = selectedId != null && activeIds.has(selectedId);
  const atCap = active.length >= context.maxActiveAdverts && !selectedIsLive;
  const canSponsor = Boolean(selectedId) && !selectedIsLive && !atCap && !busy;

  const sponsor = async () => {
    if (!selectedId || !canSponsor) return;
    setBusy(true);
    try {
      const result = await api.post<ActiveBoost & { alreadyActive?: boolean }>(
        "/api/hub/boosts",
        { productId: selectedId },
      );
      toast.success(
        result.alreadyActive
          ? "That listing is already sponsored."
          : "Listing sponsored.",
      );
      onSponsoredAction?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Couldn't sponsor that listing.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-600">
        Sponsor a listing you already sell. It keeps its name and photo, and
        only that card is labelled Sponsored for {context.advertDays} days.
      </p>
      <p className="mt-1 text-xs text-gray-400">
        This does not charge your wallet. A separate boost price is not set.
      </p>

      {listings === null ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-2xl bg-gray-100"
            />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-gray-200 bg-surface px-4 py-8 text-center text-sm text-gray-500">
          You don&apos;t have a listing to sponsor yet. Add one, then come back.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {listings.map((product) => {
            const selected = product.id === selectedId;
            const live = activeIds.has(product.id);
            const price = listingPrice(product);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedId(product.id)}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-surface text-left transition-colors",
                  selected
                    ? "border-orange-500 ring-2 ring-orange-500/30"
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
                  {live && (
                    <span className="absolute top-2 left-2 rounded-full bg-sky-100 dark:bg-sky-900/40 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                      Boosted
                    </span>
                  )}
                  {selected && (
                    <span className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white">
                      <CheckIcon size={12} />
                    </span>
                  )}
                </div>
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-semibold text-ink">
                    {product.name}
                  </p>
                  {price && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {price}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => void sponsor()}
        disabled={!canSponsor}
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy
          ? "Sponsoring…"
          : atCap
            ? `Limit reached (${context.maxActiveAdverts} live)`
            : selectedIsLive
              ? "Already boosted"
              : "Boost this listing"}
      </button>
    </div>
  );
}
