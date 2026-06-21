"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useParams } from "next/navigation";
import { naira } from "@/lib/plans";
import { trackOrder } from "@/services/track";
import type { TrackOrderData } from "@/types/track";
import type { OrderStatus } from "@/types/order";
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  ChefHat,
  BellRing,
  Bike,
  MapPin,
  Loader2,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

// ── Status + timeline config ──────────────────────────────────────────────────

type Step = {
  status: OrderStatus;
  label: string;
  desc: string;
  icon: React.ElementType;
};

const RETAIL_STEPS: Step[] = [
  {
    status: "Pending",
    label: "Order Placed",
    desc: "We received your order",
    icon: Clock,
  },
  {
    status: "Shipped",
    label: "Shipped",
    desc: "On its way to you",
    icon: Truck,
  },
  {
    status: "Delivered",
    label: "Delivered",
    desc: "Order delivered",
    icon: CheckCircle2,
  },
];

const FOOD_STEPS: Step[] = [
  {
    status: "Pending",
    label: "Order Placed",
    desc: "We received your order",
    icon: Clock,
  },
  {
    status: "Preparing",
    label: "Preparing",
    desc: "Your order is being prepared",
    icon: ChefHat,
  },
  {
    status: "Ready",
    label: "Ready",
    desc: "Ready for pickup or delivery",
    icon: BellRing,
  },
  {
    status: "OnTheWay",
    label: "On the Way",
    desc: "The rider is heading to you",
    icon: Bike,
  },
  {
    status: "Delivered",
    label: "Delivered",
    desc: "Order delivered",
    icon: CheckCircle2,
  },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  Pending: "Pending",
  Shipped: "Shipped",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
  Preparing: "Preparing",
  Ready: "Ready",
  OnTheWay: "On the Way",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TrackPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [key, setKey] = useState("");
  const [data, setData] = useState<TrackOrderData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The key is required on every visit — nothing is persisted, so a refresh
  // returns the customer to the key gate.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await trackOrder(token, trimmed);
      setData(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't verify that key. Please check and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!data) {
    return (
      <KeyGate
        value={key}
        onChange={setKey}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
      />
    );
  }

  return <TrackingView data={data} />;
}

// ── Key gate ──────────────────────────────────────────────────────────────────

function KeyGate({
  value,
  onChange,
  onSubmit,
  submitting,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-900">
            <KeyRound size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Track your order
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter the tracking key we sent to your email to view your order
            status.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-6">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Tracking key
            </span>
            <input
              type="text"
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. A1B2C3"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-lg tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </label>

          {error ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !value.trim()}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-center font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Verifying…
              </>
            ) : (
              "View my order"
            )}
          </button>
        </form>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400">
          <ShieldCheck size={13} /> Your key keeps this order private · Powered
          by Velte
        </p>
      </div>
    </div>
  );
}

// ── Tracking view ─────────────────────────────────────────────────────────────

function TrackingView({ data }: { data: TrackOrderData }) {
  const isFood = data.businessType === "food";
  const isCancelled = data.status === "Cancelled";
  const isDelivered = data.status === "Delivered";
  const steps = isFood ? FOOD_STEPS : RETAIL_STEPS;
  const rawIdx = steps.findIndex((s) => s.status === data.status);
  const activeIdx = rawIdx === -1 ? steps.length - 1 : rawIdx;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        {/* Header card */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                {data.storeName}
              </p>
              <h1 className="mt-1 text-lg font-semibold text-gray-900">
                Order {data.orderRef}
              </h1>
            </div>
            <span
              className={
                "rounded-full px-3 py-1 text-xs font-semibold " +
                (isCancelled
                  ? "bg-red-50 text-red-600"
                  : isDelivered
                    ? "bg-green-50 text-green-600"
                    : "bg-amber-50 text-amber-600")
              }
            >
              {STATUS_LABEL[data.status]}
            </span>
          </div>

          {/* Product summary */}
          <div className="mt-5 flex items-start gap-3">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-100">
              {data.product.image ? (
                <img
                  src={data.product.image}
                  alt={data.product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-300">
                  <Package size={22} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900">{data.product.name}</p>
              <p className="mt-0.5 text-sm text-gray-500">
                Qty {data.product.quantity} · {naira(data.product.unitPrice)}{" "}
                each
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{naira(data.total)}</p>
              <p
                className={
                  "mt-0.5 text-xs font-medium " +
                  (data.payment === "Paid"
                    ? "text-green-600"
                    : "text-amber-600")
                }
              >
                {data.payment}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            Placed {formatDate(data.placedAt)}
          </p>
        </div>

        {/* Timeline card */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            Order progress
          </h2>

          {isCancelled ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-red-50 p-4">
              <XCircle size={20} className="flex-shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Order cancelled
                </p>
                <p className="text-xs text-red-500">
                  This order was cancelled. Contact the store for help.
                </p>
              </div>
            </div>
          ) : (
            <ol className="mt-4">
              {steps.map((step, i) => {
                const done = i < activeIdx;
                const active = i === activeIdx;
                const last = i === steps.length - 1;
                const StepIcon = step.icon;
                return (
                  <li key={step.status} className="flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <div
                        className={
                          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 " +
                          (done
                            ? "border-green-500 bg-green-500"
                            : active
                              ? "border-gray-900 bg-gray-900"
                              : "border-gray-200 bg-white")
                        }
                      >
                        {done ? (
                          <CheckCircle2 size={15} className="text-white" />
                        ) : (
                          <StepIcon
                            size={14}
                            className={active ? "text-white" : "text-gray-300"}
                          />
                        )}
                      </div>
                      {!last && (
                        <div
                          className={
                            "my-1 w-0.5 flex-1 " +
                            (done ? "bg-green-300" : "bg-gray-100")
                          }
                          style={{ minHeight: 24 }}
                        />
                      )}
                    </div>
                    <div className={last ? "pb-0" : "pb-5"}>
                      <p
                        className={
                          "text-sm font-medium leading-tight " +
                          (done || active ? "text-gray-900" : "text-gray-400")
                        }
                      >
                        {step.label}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {step.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Fulfillment card */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            {data.fulfillment.type === "pickup" ? "Pickup" : "Delivery"} details
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            {data.customerName ? (
              <Row label="Recipient" value={data.customerName} />
            ) : null}
            <Row
              icon={MapPin}
              label={
                data.fulfillment.type === "pickup"
                  ? "Pickup"
                  : "Delivery address"
              }
              value={
                data.fulfillment.type === "pickup"
                  ? "Customer pickup"
                  : (data.fulfillment.address ?? "—")
              }
            />
            {isFood ? (
              <Row
                icon={Clock}
                label="Est. prep time"
                value={
                  isDelivered
                    ? "Completed"
                    : isCancelled
                      ? "N/A"
                      : data.fulfillment.estimatedPrepMins
                        ? `~${data.fulfillment.estimatedPrepMins} mins`
                        : "—"
                }
              />
            ) : (
              <>
                <Row
                  icon={Truck}
                  label="Carrier"
                  value={data.fulfillment.carrier ?? "Standard Delivery"}
                />
                <Row
                  icon={Clock}
                  label="Est. delivery"
                  value={
                    isDelivered
                      ? formatDate(data.updatedAt)
                      : isCancelled
                        ? "N/A"
                        : (data.fulfillment.estimate ?? "3 – 5 business days")
                  }
                />
              </>
            )}
          </div>
        </div>

        <p className="pt-1 text-center text-xs text-gray-400">
          Last updated {formatDate(data.updatedAt)} · Powered by Velte
        </p>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex items-center gap-1.5 text-gray-400">
        {Icon ? <Icon size={14} /> : null}
        {label}
      </span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}
