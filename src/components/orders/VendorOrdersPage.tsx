"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { vendorOrdersApi } from "@/services/cart";
import { queryKeys } from "@/lib/query-keys";
import { fmt } from "@/lib/product-price";
import { displayNgPhone } from "@/lib/orderFulfillment";
import { buildWhatsappLink } from "@/lib/whatsapp";
import type { CartOrder } from "@/types/cart";
import { TruckIllustration } from "@/components/icons";
import {
  CheckCircleIcon,
  RefreshIcon,
  MapPinIcon,
  PhoneIcon,
} from "@/components/icons/hero";

function naira(kobo: number) {
  return fmt(kobo / 100, "₦");
}

export default function VendorOrdersPage() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: queryKeys.vendorOrders.list(),
    queryFn: () => vendorOrdersApi.list(),
  });

  const accept = useMutation({
    mutationFn: (id: string) => vendorOrdersApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendorOrders.list(),
      });
      toast.success(
        "Order accepted. Payout releases when delivery is approved.",
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Couldn't accept that order.",
      );
    },
  });

  const dispatch = useMutation({
    mutationFn: (id: string) =>
      vendorOrdersApi.dispatch(id, { method: "self" }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendorOrders.list(),
      });
      toast.success("Marked as dispatched.");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't dispatch that order.",
      );
    },
  });

  const deliver = useMutation({
    mutationFn: (id: string) => vendorOrdersApi.deliver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendorOrders.list(),
      });
      toast.success(
        "Delivered. The buyer has 48 hours to confirm or dispute before the payout releases.",
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't mark that delivered.",
      );
    },
  });

  if (isLoading) {
    return <div className="h-40 rounded-2xl bg-gray-50 animate-pulse" />;
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-surface p-8 text-center sm:p-10">
        <TruckIllustration size={64} className="mx-auto" />
        <p className="mt-4 text-base font-semibold text-ink">No orders yet</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-gray-500">
          When a customer orders a product, the order lands here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          busy={
            (accept.isPending && accept.variables === order.id) ||
            (dispatch.isPending && dispatch.variables === order.id) ||
            (deliver.isPending && deliver.variables === order.id)
          }
          onAccept={() => accept.mutate(order.id)}
          onDispatch={() => dispatch.mutate(order.id)}
          onDeliver={() => deliver.mutate(order.id)}
        />
      ))}
    </div>
  );
}

function statusLabel(order: CartOrder) {
  if (order.settlement === "released" || order.settlement === "releasing") {
    return order.settlement === "released" ? "Paid out" : "Payout on the way";
  }
  switch (order.status) {
    case "accepted":
      return "Accepted";
    case "dispatched":
      return "On the way";
    case "delivered":
    case "received":
      return "Delivered";
    case "disputed":
      return "On hold";
    case "confirmed":
      return "Confirmed";
    default:
      return "Awaiting you";
  }
}

function OrderCard({
  order,
  busy,
  onAccept,
  onDispatch,
  onDeliver,
}: {
  order: CartOrder;
  busy: boolean;
  onAccept: () => void;
  onDispatch: () => void;
  onDeliver: () => void;
}) {
  const fulfillment = order.fulfillment;
  const phoneDisplay = fulfillment ? displayNgPhone(fulfillment.phone) : null;
  const waLink = fulfillment
    ? buildWhatsappLink(
        fulfillment.phone,
        `Hi ${fulfillment.name}, this is about your Velte order.`,
      )
    : null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-surface p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {order.items.length === 1
              ? order.items[0].name
              : `${order.items.length} items`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
            order.status === "paid"
              ? "bg-amber-50 text-amber-700"
              : order.status === "disputed"
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
          }`}
        >
          {statusLabel(order)}
        </span>
      </div>

      <ul className="space-y-1.5">
        {order.items.map((item) => (
          <li
            key={item.productId}
            className="flex justify-between text-sm text-gray-600"
          >
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{naira(item.lineTotalKobo)}</span>
          </li>
        ))}
      </ul>

      <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1">
        <span>You receive</span>
        <span>{naira(order.subtotalKobo)}</span>
      </div>

      {fulfillment ? (
        <div className="rounded-xl bg-gray-50 px-3 py-3 space-y-1.5 text-sm text-gray-600">
          <p className="font-semibold text-gray-900">{fulfillment.name}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              href={`tel:+${fulfillment.phone}`}
              className="inline-flex items-center gap-1.5 font-medium text-orange-600 hover:text-orange-700"
            >
              <PhoneIcon size={13} />
              {phoneDisplay}
            </a>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-orange-600 hover:text-orange-700"
              >
                WhatsApp
              </a>
            )}
          </div>
          <p className="flex items-start gap-1.5">
            <MapPinIcon size={13} className="mt-0.5 shrink-0 text-gray-400" />
            <span>{fulfillment.address}</span>
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-400">
          No delivery details on this order.
        </p>
      )}

      {order.status === "paid" && (
        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold"
        >
          {busy ? (
            <>
              <RefreshIcon size={14} className="animate-spin" />
              Accepting…
            </>
          ) : (
            <>
              <CheckCircleIcon size={14} />
              Accept order
            </>
          )}
        </button>
      )}
      {order.status === "accepted" && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDispatch}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-ink disabled:opacity-60"
          >
            Mark dispatched
          </button>
          <button
            type="button"
            onClick={onDeliver}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold"
          >
            Handed over
          </button>
        </div>
      )}
      {order.status === "dispatched" && (
        <button
          type="button"
          onClick={onDeliver}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold"
        >
          Mark delivered
        </button>
      )}
    </div>
  );
}
