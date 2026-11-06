"use client";

import { useState } from "react";
import { toast } from "sonner";

import { cartApi } from "@/services/cart";
import { useCartStore } from "@/store/cartStore";
import { useBuyerStore } from "@/store/buyerStore";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { ShoppingCartIcon } from "@/components/icons/hero";
import { cn } from "@/lib/utils";
import type { CartAddOutcome, CartMissingOption } from "@/types/cart";

function applyLine(outcome: Extract<CartAddOutcome, { status: "ok" }>) {
  const { quantity, ...rest } = outcome.line;
  const added = useCartStore.getState().addItem(rest, quantity);
  if (added) useCartStore.getState().openDrawer();
  return added;
}

export function CartAddWidget({
  outcome,
  isLatest,
}: {
  outcome: CartAddOutcome;
  isLatest: boolean;
}) {
  // A successful add opens the existing cart sidebar — do not draw a
  // second cart of items in the thread.
  if (outcome.status === "ok") return null;
  if (outcome.status === "needs_signin") {
    return <CartSignInPrompt outcome={outcome} isLatest={isLatest} />;
  }
  if (outcome.status === "needs_options") {
    return <CartOptionsPrompt outcome={outcome} isLatest={isLatest} />;
  }
  if (outcome.status === "vendor_mismatch") {
    return <VendorMismatchCard outcome={outcome} isLatest={isLatest} />;
  }
  return null;
}

function CartSignInPrompt({
  outcome,
  isLatest,
}: {
  outcome: Extract<CartAddOutcome, { status: "needs_signin" }>;
  isLatest: boolean;
}) {
  const buyer = useBuyerStore((s) => s.buyer);
  const [busy, setBusy] = useState(false);

  if (!isLatest) return null;

  async function addNow() {
    setBusy(true);
    try {
      const result = await cartApi.validateAdd({
        productId: outcome.productId,
        quantity: outcome.quantity,
        clientRequestId: `retry:${outcome.productId}:${outcome.quantity}`,
      });
      if (result.status === "ok") {
        applyLine(result);
        toast.success(`Added ${result.line.name} to cart`);
      } else if (result.status === "ineligible") {
        toast.error(result.reason);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't add that to your cart.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-surface p-4 space-y-3">
      <p className="text-sm text-ink">
        Sign in to add <span className="font-semibold">{outcome.name}</span> to
        your cart.
      </p>
      {buyer ? (
        <button
          type="button"
          onClick={() => void addNow()}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl"
        >
          <ShoppingCartIcon size={15} />
          {busy ? "Adding…" : "Add to cart"}
        </button>
      ) : (
        <GoogleSignInButton variant="compact" />
      )}
    </div>
  );
}

function CartOptionsPrompt({
  outcome,
  isLatest,
}: {
  outcome: Extract<CartAddOutcome, { status: "needs_options" }>;
  isLatest: boolean;
}) {
  const buyer = useBuyerStore((s) => s.buyer);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!isLatest) {
    return (
      <p className="text-sm text-gray-500">
        Needed a few details for {outcome.name}.
      </p>
    );
  }

  function select(group: CartMissingOption, optionName: string) {
    setPicks((prev) => ({ ...prev, [group.name]: optionName }));
  }

  const ready = outcome.missing
    .filter((g) => g.required)
    .every((g) => picks[g.name]);

  async function confirm() {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const options = Object.entries(picks).map(([groupName, optionName]) => ({
        groupName,
        optionName,
      }));
      const result = await cartApi.validateAdd({
        productId: outcome.productId,
        quantity: outcome.quantity,
        options,
        clientRequestId: `opt:${outcome.productId}:${options
          .map((o) => o.optionName)
          .join(",")}`,
      });
      if (result.status === "ok") {
        applyLine(result);
        toast.success(`Added ${result.line.name} to cart`);
      } else if (result.status === "needs_signin") {
        toast.error("Sign in to add this to your cart.");
      } else if (
        result.status === "ineligible" ||
        result.status === "not_shown" ||
        result.status === "external"
      ) {
        toast.error(result.reason);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't add that to your cart.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-surface p-4 space-y-3">
      <p className="text-sm font-semibold text-ink">{outcome.name}</p>
      {outcome.missing.map((group) => (
        <div key={group.groupId} className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500">{group.name}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.options.map((opt) => {
              const selected = picks[group.name] === opt.name;
              return (
                <button
                  key={opt.optionId}
                  type="button"
                  onClick={() => select(group, opt.name)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                    selected
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "bg-surface border-gray-200 text-gray-700 hover:border-orange-300",
                  )}
                >
                  {opt.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!buyer ? (
        <GoogleSignInButton variant="compact" />
      ) : (
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={!ready || busy}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl"
        >
          <ShoppingCartIcon size={15} />
          {busy ? "Adding…" : "Add to cart"}
        </button>
      )}
    </div>
  );
}

function VendorMismatchCard({
  outcome,
  isLatest,
}: {
  outcome: Extract<CartAddOutcome, { status: "vendor_mismatch" }>;
  isLatest: boolean;
}) {
  const clear = useCartStore((s) => s.clear);
  if (!isLatest) return null;

  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 space-y-3">
      <p className="text-sm text-amber-900">
        Your cart is at {outcome.currentVendorName}. Empty it to add{" "}
        {outcome.line.name} from {outcome.line.vendorName}.
      </p>
      <button
        type="button"
        onClick={() => {
          clear();
          applyLine({ status: "ok", line: outcome.line });
          toast.success(`Added ${outcome.line.name} to cart`);
        }}
        className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
      >
        Empty cart and add this
      </button>
    </div>
  );
}
