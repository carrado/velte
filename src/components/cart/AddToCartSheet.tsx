"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DetailSheet } from "@/components/DetailSheet";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { ProtectedImage } from "@/components/ProtectedImage";
import {
  CloseIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  StoreIcon,
} from "@/components/icons";
import { ApiError } from "@/lib/api-client";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { fmt } from "@/lib/product-price";
import { cn } from "@/lib/utils";
import { cartApi } from "@/services/cart";
import { useBuyerStore } from "@/store/buyerStore";
import { useCartStore } from "@/store/cartStore";
import type { CartAddOutcome, CartMissingOption } from "@/types/cart";

const MAX_QTY = 20;

function applyLine(outcome: Extract<CartAddOutcome, { status: "ok" }>) {
  const { quantity, ...rest } = outcome.line;
  const added = useCartStore.getState().addItem(rest, quantity);
  if (added) useCartStore.getState().openDrawer();
  return added;
}

export type AddToCartProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  /** Listed unit price in naira (already /100 from kobo). Null = quote. */
  unitPriceNaira: number | null;
  currencySymbol: string;
  checkoutEligible?: boolean;
  quoteOnRequest?: boolean;
};

export function AddToCartSheet({
  open,
  onClose,
  product,
  vendorName,
}: {
  open: boolean;
  onClose: () => void;
  product: AddToCartProduct;
  vendorId: string;
  vendorName: string;
}) {
  const buyer = useBuyerStore((s) => s.buyer);
  const clearCart = useCartStore((s) => s.clear);
  const [quantity, setQuantity] = useState(1);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<CartMissingOption[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<{
    currentVendorName: string;
    line: Extract<CartAddOutcome, { status: "ok" }>["line"];
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuantity(1);
    setPicks({});
    setMissing(null);
    setError(null);
    setMismatch(null);
    setBusy(false);
  }, [open, product.id]);

  const unitLabel =
    product.unitPriceNaira != null
      ? fmt(product.unitPriceNaira, product.currencySymbol)
      : null;
  const lineTotal =
    product.unitPriceNaira != null ? product.unitPriceNaira * quantity : null;
  const lineLabel =
    lineTotal != null ? fmt(lineTotal, product.currencySymbol) : "Quote";

  const notCheckoutReady =
    Boolean(product.quoteOnRequest) || product.checkoutEligible === false;

  const requiredReady =
    !missing || missing.filter((g) => g.required).every((g) => picks[g.name]);

  async function submit() {
    if (busy) return;
    if (product.quoteOnRequest) {
      setError("This listing is quote-only — contact the vendor instead.");
      return;
    }
    setBusy(true);
    setError(null);
    setMismatch(null);
    try {
      const options = Object.entries(picks).map(([groupName, optionName]) => ({
        groupName,
        optionName,
      }));

      const result = await cartApi.validateAdd({
        productId: product.id,
        quantity,
        options: options.length > 0 ? options : undefined,
        clientRequestId: `pdp:${product.id}:${quantity}:${options
          .map((o) => o.optionName)
          .join(",")}`,
      });

      if (result.status === "ok") {
        const live = useCartStore.getState();
        if (
          live.vendorId &&
          live.vendorId !== result.line.vendorId &&
          live.items.length > 0
        ) {
          setMismatch({
            currentVendorName: live.vendorName ?? "another store",
            line: result.line,
          });
          return;
        }
        if (applyLine(result)) {
          toast.success(`Added ${result.line.name} to cart`);
          onClose();
        }
        return;
      }

      if (result.status === "needs_options") {
        setMissing(result.missing);
        setError(null);
        return;
      }

      if (result.status === "needs_signin") {
        setError("Sign in with Google to add this to your cart.");
        return;
      }

      setError(result.reason);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Sign in with Google to add this to your cart.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't add that to your cart.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const ctaLabel = busy
    ? "Adding…"
    : missing
      ? "Confirm & add"
      : `Add to cart · ${lineLabel}`;

  return (
    <DetailSheet
      open={open}
      onClose={onClose}
      footer={
        <div className="space-y-3">
          {buyer && lineTotal != null && !mismatch && (
            <div className="flex items-baseline justify-between gap-3 px-0.5">
              <span className="text-xs font-medium text-gray-500">
                Subtotal · {quantity} {quantity === 1 ? "item" : "items"}
              </span>
              <span className="text-base font-bold tabular-nums text-ink">
                {lineLabel}
              </span>
            </div>
          )}

          {!buyer ? (
            <div className="space-y-2.5">
              <p className="text-center text-xs leading-relaxed text-gray-500">
                Sign in to add this and pay on Velte. We hold the payment until
                delivery is confirmed.
              </p>
              <GoogleSignInButton variant="compact" />
            </div>
          ) : mismatch ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                clearCart();
                applyLine({ status: "ok", line: mismatch.line });
                toast.success(`Added ${mismatch.line.name} to cart`);
                onClose();
              }}
              className="w-full rounded-2xl bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-60 transition-colors"
            >
              Empty cart &amp; add this
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || !requiredReady}
              onClick={() => void submit()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-60 transition-colors"
            >
              <ShoppingCartIcon size={18} />
              {ctaLabel}
            </button>
          )}
        </div>
      }
    >
      {/* Hero */}
      <div className="relative">
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
          {product.imageUrl ? (
            <ProtectedImage
              src={optimizedImageUrl(product.imageUrl)}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <ShoppingCartIcon size={36} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95"
        >
          <CloseIcon size={18} />
        </button>

        <span className="absolute top-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          Add to cart
        </span>
      </div>

      <div className="space-y-5 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        {/* Title block */}
        <div>
          <h2 className="text-xl font-bold leading-snug tracking-tight text-ink">
            {product.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <StoreIcon size={12} className="shrink-0" />
              <span className="truncate max-w-[14rem]">{vendorName}</span>
            </span>
            {unitLabel && (
              <>
                <span className="text-gray-300" aria-hidden>
                  ·
                </span>
                <span className="text-sm font-bold text-orange-500 tabular-nums">
                  {unitLabel}
                  <span className="ml-1 text-xs font-medium text-gray-400">
                    each
                  </span>
                </span>
              </>
            )}
            {!unitLabel && (
              <>
                <span className="text-gray-300" aria-hidden>
                  ·
                </span>
                <span className="text-sm font-semibold text-ink">
                  Contact for quote
                </span>
              </>
            )}
          </div>
        </div>

        {/* Quantity */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink">Quantity</p>
            <p className="text-[11px] text-gray-500">Up to {MAX_QTY}</p>
          </div>
          <div className="inline-flex items-center rounded-xl border border-gray-200 bg-surface shadow-sm">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={quantity <= 1 || busy}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-10 w-10 items-center justify-center text-lg font-semibold text-ink disabled:opacity-35 hover:bg-gray-50 rounded-l-xl transition-colors"
            >
              −
            </button>
            <span className="min-w-[2.75rem] text-center text-sm font-bold tabular-nums text-ink">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={quantity >= MAX_QTY || busy}
              onClick={() => setQuantity((q) => Math.min(MAX_QTY, q + 1))}
              className="flex h-10 w-10 items-center justify-center text-lg font-semibold text-ink disabled:opacity-35 hover:bg-gray-50 rounded-r-xl transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Options */}
        {missing && missing.length > 0 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-ink">Options</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Pick what you need before adding.
              </p>
            </div>
            {missing.map((group) => (
              <div key={group.groupId} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {group.name}
                  {group.required ? (
                    <span className="normal-case tracking-normal text-orange-500">
                      {" "}
                      · required
                    </span>
                  ) : null}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {group.options.map((opt) => {
                    const selected = picks[group.name] === opt.name;
                    return (
                      <button
                        key={opt.optionId}
                        type="button"
                        onClick={() =>
                          setPicks((prev) => ({
                            ...prev,
                            [group.name]: opt.name,
                          }))
                        }
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                          selected
                            ? "border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500"
                            : "border-gray-200 bg-surface text-ink hover:border-orange-300",
                        )}
                      >
                        {opt.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Status messages */}
        {notCheckoutReady && !error && !mismatch && (
          <p className="text-xs leading-relaxed text-gray-500">
            This listing may not be checkout-ready yet. We’ll confirm when you
            add — use Contact vendor if cart isn’t available.
          </p>
        )}

        {mismatch && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-900">
            Your cart is at{" "}
            <span className="font-semibold">{mismatch.currentVendorName}</span>.
            Empty it to shop at {vendorName}.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-relaxed text-red-700">
            {error}
          </div>
        )}

        {!notCheckoutReady && !error && !mismatch && (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-gray-500">
            <ShieldCheckIcon
              size={14}
              className="mt-0.5 shrink-0 text-emerald-600"
            />
            <span>
              One store per cart. Payment is held on Velte and released after
              delivery is confirmed.
            </span>
          </p>
        )}
      </div>
    </DetailSheet>
  );
}
