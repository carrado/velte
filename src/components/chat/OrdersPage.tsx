"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { TruckIllustration } from "@/components/icons";
import {
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  StoreIcon,
} from "@/components/icons/hero";
import { displayNgPhone } from "@/lib/orderFulfillment";
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import { queryKeys } from "@/lib/query-keys";
import { cartApi } from "@/services/cart";
import { useBuyerStore } from "@/store/buyerStore";
import { useNow } from "@/hooks/useNow";
import type { CartOrder } from "@/types/cart";

export function OrdersPage() {
  const buyer = useBuyerStore((s) => s.buyer);
  const now = useNow();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: queryKeys.cart.buyerOrders,
    queryFn: cartApi.listOrders,
    enabled: Boolean(buyer),
    staleTime: 30_000,
  });

  if (!buyer) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <TruckIllustration size={64} className="mx-auto" />
          <h1 className="mt-4 text-lg font-bold text-ink">
            Sign in to see your orders
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            When you check out from your cart, the order lands here.
          </p>
          <div className="mt-6 flex justify-center">
            <GoogleSignInButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Your orders
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            We hold the payment until the vendor confirms.
          </p>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-36 rounded-2xl bg-gray-50 animate-pulse" />
            <div className="h-36 rounded-2xl bg-gray-50 animate-pulse" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-surface p-8 text-center sm:p-10">
            <TruckIllustration size={64} className="mx-auto" />
            <p className="mt-4 text-base font-semibold text-ink">
              No orders yet
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-gray-500">
              When you check out from your cart, the order lands here.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id}>
                <BuyerOrderCard order={order} now={now} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  paid: "Paid, held",
  accepted: "Accepted",
  dispatched: "On the way",
  delivered: "Delivered",
  received: "Confirmed",
  disputed: "Dispute open",
  confirmed: "Confirmed",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

function ReviewForm({
  label,
  placeholder,
  doneLabel,
  onSubmit,
}: {
  label: string;
  placeholder: string;
  doneLabel: string;
  onSubmit: (rating: number, text: string) => Promise<boolean>;
}) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await onSubmit(rating, text);
      if (ok) {
        setDone(true);
        toast.success("Review saved.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="text-xs text-gray-500">{doneLabel}</p>;

  return (
    <div className="space-y-2 rounded-xl border border-gray-100 bg-canvas/40 p-3">
      <p className="text-xs font-semibold text-ink">{label}</p>
      <select
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        className="rounded-lg border border-gray-200 bg-surface px-2 py-1 text-sm"
        aria-label={label}
      >
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n} star{n === 1 ? "" : "s"}
          </option>
        ))}
      </select>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-surface px-3 py-2 text-sm"
        rows={2}
      />
      <button
        type="button"
        onClick={() => void send()}
        disabled={busy}
        className="cursor-pointer rounded-full bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "Submit review"}
      </button>
    </div>
  );
}

async function postReview(body: {
  orderId: string;
  kind: "vendor" | "product";
  productId?: string;
  rating: number;
  text: string;
}) {
  const res = await fetch("/api/trust/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    toast.error(payload?.error || "Couldn't save that review.");
    return false;
  }
  return true;
}

function OrderReviews({ order }: { order: CartOrder }) {
  const queryClient = useQueryClient();
  const [vendorDone, setVendorDone] = useState(Boolean(order.vendorReviewed));
  const [productDone, setProductDone] = useState(
    () => new Set(order.productReviewedIds ?? []),
  );

  useEffect(() => {
    if (order.vendorReviewed) setVendorDone(true);
  }, [order.vendorReviewed]);

  useEffect(() => {
    setProductDone((current) => {
      const next = new Set(current);
      for (const id of order.productReviewedIds ?? []) next.add(id);
      return next;
    });
  }, [order.productReviewedIds]);

  const pendingProducts = order.items.filter(
    (item) => !productDone.has(item.productId),
  );
  const allDone = vendorDone && pendingProducts.length === 0;
  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.cart.buyerOrders,
    });
  };

  return (
    <div className="space-y-3 border-t border-gray-100 pt-3">
      <div>
        <p className="text-sm font-bold text-ink">Leave a review</p>
        <p className="mt-0.5 text-xs text-gray-500">
          Rate the seller and each item you bought. Both are optional, but
          separate.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Vendor
        </p>
        {vendorDone ? (
          <p className="text-xs text-gray-500">
            Vendor review saved
            {order.vendorName ? ` for ${order.vendorName}` : ""}.
          </p>
        ) : (
          <ReviewForm
            label={`Rate ${order.vendorName || "this vendor"}`}
            placeholder="How was dealing with this seller?"
            doneLabel="Thanks — the vendor can reply."
            onSubmit={async (rating, text) => {
              const ok = await postReview({
                orderId: order.id,
                kind: "vendor",
                rating,
                text,
              });
              if (ok) {
                setVendorDone(true);
                refresh();
              }
              return ok;
            }}
          />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {order.items.length === 1 ? "Product" : "Products"}
        </p>
        {pendingProducts.length === 0 ? (
          <p className="text-xs text-gray-500">
            Product review{order.items.length === 1 ? "" : "s"} saved.
          </p>
        ) : (
          pendingProducts.map((item) => (
            <ReviewForm
              key={item.productId}
              label={`Rate ${item.name}`}
              placeholder="How was this product or service?"
              doneLabel="Thanks — product review saved."
              onSubmit={async (rating, text) => {
                const ok = await postReview({
                  orderId: order.id,
                  kind: "product",
                  productId: item.productId,
                  rating,
                  text,
                });
                if (ok) {
                  setProductDone((current) => {
                    const next = new Set(current);
                    next.add(item.productId);
                    return next;
                  });
                  refresh();
                }
                return ok;
              }}
            />
          ))
        )}
      </div>

      {allDone && (
        <p className="text-xs text-gray-500">
          Thanks — your reviews for this order are in.
        </p>
      )}
    </div>
  );
}

function BuyerOrderCard({ order, now }: { order: CartOrder; now: number }) {
  const queryClient = useQueryClient();
  const done = order.status === "received" || order.status === "confirmed";
  const canAct = order.status === "delivered";

  const confirm = useMutation({
    mutationFn: () => cartApi.confirmReceipt(order.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.buyerOrders });
      toast.success("Receipt confirmed. The payout can release.");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Couldn't confirm that order.",
      );
    },
  });

  const dispute = useMutation({
    mutationFn: () =>
      cartApi.dispute(order.id, {
        reason: "other",
        detail: "The buyer reported a problem with this order.",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.buyerOrders });
      toast.success(
        "Dispute opened. The payout stays paused. The vendor stays visible.",
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Couldn't open that dispute.",
      );
    },
  });
  const storeHref = order.storeHandle ? `/store/${order.storeHandle}` : null;

  return (
    <article className="rounded-2xl border border-gray-100 bg-surface p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink truncate">
            {order.items.length === 1
              ? order.items[0].name
              : `${order.items.length} items`}
          </p>
          {order.vendorName &&
            (storeHref ? (
              <Link
                href={storeHref}
                className="mt-0.5 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange-600"
              >
                <StoreIcon size={13} />
                {order.vendorName}
              </Link>
            ) : (
              <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-gray-500">
                <StoreIcon size={13} />
                {order.vendorName}
              </p>
            ))}
          <p className="text-xs text-gray-400 mt-0.5">
            {timeAgo(order.paidAt ?? order.createdAt, now)}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            done
              ? "bg-green-50 text-green-700"
              : order.status === "disputed"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700",
          )}
        >
          {done ? <CheckCircleIcon size={12} /> : <ClockIcon size={12} />}
          {STATUS_LABEL[order.status] ?? "Preparing"}
        </span>
      </div>

      <ul className="space-y-1.5">
        {order.items.map((item) => (
          <li
            key={item.productId}
            className="flex justify-between gap-3 text-sm text-gray-600"
          >
            <span className="truncate">
              {item.name} × {item.quantity}
            </span>
            <span className="shrink-0">{formatNaira(item.lineTotalKobo)}</span>
          </li>
        ))}
      </ul>

      <div className="flex justify-between text-sm font-semibold text-ink pt-1">
        <span>You paid</span>
        <span>{formatNaira(order.totalKobo)}</span>
      </div>

      {canAct && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => confirm.mutate()}
            disabled={confirm.isPending || dispute.isPending}
            className="flex-1 cursor-pointer rounded-full bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirm.isPending ? "Confirming…" : "Confirm receipt"}
          </button>
          <button
            type="button"
            onClick={() => dispute.mutate()}
            disabled={confirm.isPending || dispute.isPending}
            className="flex-1 cursor-pointer rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-ink hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {dispute.isPending ? "Opening…" : "Dispute"}
          </button>
        </div>
      )}
      {(order.status === "received" || order.status === "confirmed") && (
        <OrderReviews order={order} />
      )}

      {order.status === "delivered" && order.confirmBy && (
        <p className="text-xs text-gray-500">
          If you do neither, the payout releases after the confirmation window,
          as long as delivery was approved.
        </p>
      )}

      {order.fulfillment && (
        <div className="rounded-xl bg-gray-50 px-3 py-3 space-y-1.5 text-sm text-gray-600">
          <p className="font-semibold text-ink">{order.fulfillment.name}</p>
          <p className="inline-flex items-center gap-1.5">
            <PhoneIcon size={13} className="text-gray-400" />
            {displayNgPhone(order.fulfillment.phone)}
          </p>
          <p className="flex items-start gap-1.5">
            <MapPinIcon size={13} className="mt-0.5 shrink-0 text-gray-400" />
            <span>{order.fulfillment.address}</span>
          </p>
        </div>
      )}
    </article>
  );
}
