"use client";

import { usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useNavigation } from "@/components/NavigationProgressContext";
import { useState } from "react";
import {
  getOrder,
  updateOrderStatus,
  confirmOrderPayment,
  rejectOrderPayment,
  getOrderReceiptImage,
} from "@/services/orders";
import { transactionService } from "@/services/transactions";
import type { Order, OrderStatus } from "@/types/order";
import {
  ArrowLeft,
  Truck,
  Clock,
  XCircle,
  CheckCircle2,
  Package,
  CreditCard,
  Calendar,
  Hash,
  MapPin,
  User,
  AlertTriangle,
  Banknote,
  Loader2,
  ChefHat,
  BellRing,
  Bike,
  Route,
  RefreshCw,
  Eye,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsFood } from "@/hooks/useBusinessType";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    topBar: string;
    dotBg: string;
    icon: React.ElementType;
  }
> = {
  Pending: {
    label: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    topBar: "bg-amber-400",
    dotBg: "bg-amber-500",
    icon: Clock,
  },
  Shipped: {
    label: "Shipped",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    topBar: "bg-blue-400",
    dotBg: "bg-blue-500",
    icon: Truck,
  },
  Delivered: {
    label: "Delivered",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    topBar: "bg-green-400",
    dotBg: "bg-green-500",
    icon: CheckCircle2,
  },
  Cancelled: {
    label: "Cancelled",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    topBar: "bg-red-400",
    dotBg: "bg-red-500",
    icon: XCircle,
  },
  Preparing: {
    label: "Preparing",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    topBar: "bg-orange-400",
    dotBg: "bg-orange-500",
    icon: ChefHat,
  },
  Ready: {
    label: "Ready for Pickup",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    topBar: "bg-cyan-400",
    dotBg: "bg-cyan-500",
    icon: BellRing,
  },
  OnTheWay: {
    label: "On the Way",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    topBar: "bg-purple-400",
    dotBg: "bg-purple-500",
    icon: Bike,
  },
};

// ── Timeline step definitions ─────────────────────────────────────────────────

type TimelineStep = {
  status: OrderStatus;
  label: string;
  desc: string;
  icon: React.ElementType;
};

const RETAIL_STEPS: TimelineStep[] = [
  {
    status: "Pending",
    label: "Order Placed",
    desc: "Awaiting processing",
    icon: Clock,
  },
  {
    status: "Shipped",
    label: "Shipped",
    desc: "Dispatched to delivery carrier",
    icon: Truck,
  },
  {
    status: "Delivered",
    label: "Delivered",
    desc: "Successfully delivered to customer",
    icon: CheckCircle2,
  },
];

const FOOD_STEPS: TimelineStep[] = [
  {
    status: "Pending",
    label: "Order Placed",
    desc: "Received, awaiting confirmation",
    icon: Clock,
  },
  {
    status: "Preparing",
    label: "Preparing",
    desc: "Kitchen is preparing your order",
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
    desc: "Rider is on the way",
    icon: Bike,
  },
  {
    status: "Delivered",
    label: "Delivered",
    desc: "Delivered to customer",
    icon: CheckCircle2,
  },
];

// ── Hero card ─────────────────────────────────────────────────────────────────

function OrderHeroCard({
  order,
  isFood,
  steps,
  activeIdx,
}: {
  order: Order;
  isFood: boolean;
  steps: TimelineStep[];
  activeIdx: number;
}) {
  const cfg = STATUS_CONFIG[order.status];
  const StatusIcon = cfg.icon;
  const isCancelled = order.status === "Cancelled";
  const isDelivered = order.status === "Delivered";

  return (
    <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 pt-4 pb-5">
        {/* Main row */}
        <div className="flex items-start gap-4">
          {/* Large product avatar — product photo when available, else initials */}
          <div
            className={cn(
              "w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0 border-2 overflow-hidden",
              order.product.color,
            )}
          >
            {order.product.image ? (
              <img
                src={order.product.image}
                alt={order.product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              order.product.initials
            )}
          </div>

          {/* Centre: name + id + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-dash-caption text-gray-400 font-mono font-medium tracking-wide">
                {order.orderId}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-dash-caption font-bold px-2 py-0.5 rounded-full border",
                  cfg.bg,
                  cfg.border,
                  cfg.color,
                )}
              >
                <StatusIcon size={10} />
                {cfg.label}
              </span>
            </div>
            <h1 className="text-dash-title font-black text-[#023337] leading-tight line-clamp-2">
              {order.product.name}
            </h1>
            <p className="text-dash-caption text-gray-400 mt-1 flex items-center gap-1">
              <Calendar size={11} />
              {order.date}
            </p>
          </div>

          {/* Right: price */}
          <div className="text-right flex-shrink-0 hidden sm:block">
            <p className="text-[1.625rem] font-black text-[#023337] leading-none tracking-tight">
              ₦
              {order.price.toLocaleString("en-NG", {
                minimumFractionDigits: 2,
              })}
            </p>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-dash-caption font-bold border",
                order.payment === "Paid"
                  ? "bg-green-50 text-green-600 border-green-200"
                  : "bg-amber-50 text-amber-600 border-amber-200",
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  order.payment === "Paid" ? "bg-green-500" : "bg-amber-500",
                )}
              />
              {order.payment}
            </div>
          </div>
        </div>

        {/* Mobile: price row */}
        <div className="flex items-center justify-between mt-3 sm:hidden">
          <p className="text-[1.375rem] font-black text-[#023337]">
            ₦{order.price.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </p>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-dash-caption font-bold border",
              order.payment === "Paid"
                ? "bg-green-50 text-green-600 border-green-200"
                : "bg-amber-50 text-amber-600 border-amber-200",
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                order.payment === "Paid" ? "bg-green-500" : "bg-amber-500",
              )}
            />
            {order.payment}
          </div>
        </div>

        {/* Footer strip: progress dots + type badge */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          {/* Progress dots */}
          {isCancelled ? (
            <div className="flex items-center gap-1.5">
              <XCircle size={12} className="text-red-400" />
              <span className="text-dash-caption text-red-500 font-medium">
                Order cancelled
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i < activeIdx
                        ? "w-5 bg-green-400"
                        : i === activeIdx
                          ? cn("w-6", cfg.dotBg)
                          : "w-1.5 bg-gray-200",
                    )}
                  />
                ))}
              </div>
              <span className="text-dash-caption text-gray-400 font-medium">
                {isDelivered
                  ? "Complete"
                  : `Step ${activeIdx + 1} of ${steps.length}`}
              </span>
            </div>
          )}

          {/* Business type badge */}
          <div className="flex items-center gap-1.5 text-dash-caption text-gray-400 font-medium">
            {isFood ? (
              <ChefHat size={12} className="text-gray-400" />
            ) : (
              <Package size={12} className="text-gray-400" />
            )}
            {isFood ? "Food Order" : "Retail Order"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Journey + actions card (left column) ──────────────────────────────────────

type ActionDef = {
  label: string;
  hint: string;
  icon: React.ElementType;
  className: string;
  onClick: () => void;
};

function JourneyCard({
  order,
  isFood,
  steps,
  activeIdx,
  isMutating,
  onAction,
  onShipClick,
  onCancelClick,
}: {
  order: Order;
  isFood: boolean;
  steps: TimelineStep[];
  activeIdx: number;
  isMutating: boolean;
  onAction: (status: OrderStatus) => void;
  onShipClick: () => void;
  onCancelClick: () => void;
}) {
  const isCancelled = order.status === "Cancelled";
  const isDelivered = order.status === "Delivered";

  // Compute primary action
  let action: ActionDef | null = null;
  if (!isFood) {
    if (order.status === "Pending")
      action = {
        label: "Mark as Shipped",
        hint: "Dispatch to carrier and notify the customer",
        icon: Truck,
        className: "bg-orange-500 hover:bg-orange-600",
        onClick: onShipClick,
      };
    else if (order.status === "Shipped")
      action = {
        label: "Mark as Delivered",
        hint: "Confirm the customer received their package",
        icon: CheckCircle2,
        className: "bg-green-500 hover:bg-green-600",
        onClick: () => onAction("Delivered"),
      };
  } else {
    if (order.status === "Pending")
      action = {
        label: "Start Preparing",
        hint: "Let the customer know the kitchen has started",
        icon: ChefHat,
        className: "bg-orange-500 hover:bg-orange-600",
        onClick: () => onAction("Preparing"),
      };
    else if (order.status === "Preparing")
      action = {
        label: "Mark as Ready",
        hint: "Notify the customer their order is ready",
        icon: BellRing,
        className: "bg-cyan-500 hover:bg-cyan-600",
        onClick: () => onAction("Ready"),
      };
    else if (order.status === "Ready")
      action = {
        label: "Out for Delivery",
        hint: "Rider has picked up and is heading out",
        icon: Bike,
        className: "bg-purple-500 hover:bg-purple-600",
        onClick: () => onAction("OnTheWay"),
      };
    else if (order.status === "OnTheWay")
      action = {
        label: "Mark as Delivered",
        hint: "Confirm the customer received their order",
        icon: CheckCircle2,
        className: "bg-green-500 hover:bg-green-600",
        onClick: () => onAction("Delivered"),
      };
  }

  const showCancel = order.status === "Pending";
  const hasFooter = !!action || showCancel || isDelivered;

  return (
    <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Route size={13} className="text-orange-500" />
          </div>
          <h3 className="text-dash-heading font-bold text-[#023337]">
            Order Journey
          </h3>
        </div>
        {!isCancelled && (
          <span
            className={cn(
              "text-dash-caption font-bold px-2 py-0.5 rounded-full",
              isDelivered
                ? "bg-green-50 text-green-600"
                : "bg-orange-50 text-orange-500",
            )}
          >
            {isDelivered ? "Complete" : `${activeIdx + 1} / ${steps.length}`}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="px-5 py-5">
        {isCancelled ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <XCircle size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-dash-body font-semibold text-red-700">
                Order Cancelled
              </p>
              <p className="text-dash-caption text-red-400 mt-0.5">
                This order was cancelled before fulfillment
              </p>
            </div>
          </div>
        ) : (
          <div>
            {steps.map((step, i) => {
              const isDone = i < activeIdx;
              const isActive = i === activeIdx;
              const isLast = i === steps.length - 1;
              const StepIcon = step.icon;

              return (
                <div key={step.status} className="flex gap-3.5">
                  {/* Circle + connector */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10 transition-all",
                        isDone
                          ? "bg-green-500 border-green-500"
                          : isActive
                            ? "bg-orange-500 border-orange-500 ring-4 ring-orange-100"
                            : "bg-white border-gray-200",
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 size={14} className="text-white" />
                      ) : isActive ? (
                        <StepIcon size={13} className="text-white" />
                      ) : (
                        <StepIcon size={13} className="text-gray-300" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          "w-0.5 flex-1 min-h-[22px] mt-1 mb-1",
                          isDone ? "bg-green-300" : "bg-gray-100",
                        )}
                      />
                    )}
                  </div>

                  {/* Label + desc */}
                  <div
                    className={cn(
                      "flex-1 pb-4 last:pb-0",
                      isLast ? "pb-0" : "",
                    )}
                  >
                    <p
                      className={cn(
                        "text-dash-body font-semibold leading-tight pt-1",
                        isDone || isActive ? "text-[#023337]" : "text-gray-400",
                      )}
                    >
                      {step.label}
                    </p>
                    <p
                      className={cn(
                        "text-dash-caption mt-0.5",
                        isDone
                          ? "text-gray-400"
                          : isActive
                            ? "text-gray-500"
                            : "text-gray-300",
                      )}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action footer */}
      {hasFooter && (
        <div className="px-5 pb-5 pt-1 space-y-2.5 border-t border-gray-100">
          <p className="text-dash-caption text-gray-400 font-semibold uppercase tracking-wide pt-3 mb-3">
            {isDelivered ? "Status" : "Next Action"}
          </p>

          {action && (
            <>
              <button
                onClick={action.onClick}
                disabled={isMutating}
                className={cn(
                  "w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl !text-white text-dash-body font-semibold transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed",
                  action.className,
                )}
              >
                {isMutating ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <action.icon size={16} />
                )}
                {action.label}
              </button>
              <p className="text-dash-caption text-gray-400 text-center leading-snug">
                {action.hint}
              </p>
            </>
          )}

          {showCancel && (
            <button
              onClick={onCancelClick}
              disabled={isMutating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-600 text-dash-body font-medium border border-red-200 bg-white hover:bg-red-50 transition-all cursor-pointer disabled:opacity-60"
            >
              <XCircle size={15} />
              Cancel Order
            </button>
          )}

          {isDelivered && (
            <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={15} className="text-green-600" />
              </div>
              <div>
                <p className="text-dash-body font-semibold text-green-700">
                  Order Fulfilled
                </p>
                <p className="text-dash-caption text-green-500">
                  Successfully delivered to customer
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Icon size={13} className="text-orange-500" />
        </div>
        <h3 className="text-dash-heading font-bold text-[#023337]">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  accent = false,
  full = false,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  full?: boolean;
}) {
  return (
    <div className={cn("flex items-start gap-3", full ? "col-span-2" : "")}>
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border",
          accent
            ? "bg-orange-50 border-orange-100"
            : "bg-gray-50 border-gray-100",
        )}
      >
        <Icon
          size={13}
          className={accent ? "text-orange-500" : "text-gray-400"}
        />
      </div>
      <div className="min-w-0">
        <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
          {label}
        </p>
        <div className="text-dash-body font-semibold text-[#023337] break-words">
          {value}
        </div>
      </div>
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

function ShippedConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Truck size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-dash-heading font-bold text-[#023337]">
              Confirm Shipment
            </h3>
            <p className="text-dash-caption text-gray-400">
              This action cannot be reversed
            </p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-dash-body text-gray-600">
            Once marked as <strong>Shipped</strong>, this order cannot be
            cancelled.
          </p>
          <div className="flex items-start gap-2.5 p-3 bg-orange-50 border border-orange-200 rounded-xl">
            <AlertTriangle
              size={14}
              className="text-orange-500 mt-0.5 flex-shrink-0"
            />
            <p className="text-dash-caption text-orange-700">
              Verify the order details before dispatching to the carrier.
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-dash-body font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-dash-body font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors cursor-pointer"
          >
            Yes, Ship It
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelConfirmModal({
  isOpen,
  isPaid,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  isPaid: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
            <XCircle size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-dash-heading font-bold text-[#023337]">
              Cancel Order
            </h3>
            <p className="text-dash-caption text-gray-400">
              This cannot be undone
            </p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-dash-body text-gray-600">
            Are you sure you want to cancel this order?
          </p>
          {isPaid && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle
                size={14}
                className="text-amber-500 mt-0.5 flex-shrink-0"
              />
              <p className="text-dash-caption text-amber-700">
                This order has been paid. You will be prompted to initiate a
                refund in the next step.
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-dash-body font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-dash-body font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer"
          >
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function RefundTransferModal({
  isOpen,
  order,
  onSkipAndCancel,
  onTransferSuccess,
}: {
  isOpen: boolean;
  order: Order;
  onSkipAndCancel: () => void;
  onTransferSuccess: () => void;
}) {
  const [isTransferring, setIsTransferring] = useState(false);

  if (!isOpen) return null;

  const handleTransfer = async () => {
    setIsTransferring(true);
    try {
      await transactionService.initiateOrderRefund({
        orderId: order.id,
        amount: order.price,
        reason: `Refund for cancelled order ${order.orderId} — ${order.product.name}`,
      });
      toast.success(
        `₦${order.price.toFixed(2)} refund queued. Processing in 1–3 business days.`,
      );
      setTimeout(() => onTransferSuccess(), 600);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Transfer failed. Please try again.";
      toast.error(message);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Banknote size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-dash-heading font-bold text-[#023337]">
              Refund Transfer
            </h3>
            <p className="text-dash-caption text-gray-400">{order.orderId}</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Amount */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-4 text-center">
            <p className="text-dash-caption text-orange-400 uppercase tracking-wide font-semibold mb-1">
              Refund Amount
            </p>
            <p className="text-[2rem] font-black text-orange-600 leading-none tracking-tight">
              ₦{order.price.toFixed(2)}
            </p>
            <p className="text-dash-caption text-orange-400 mt-1">
              Full order value will be refunded
            </p>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            {[
              { label: "Item", value: order.product.name, truncate: true },
              { label: "Order ID", value: order.orderId },
              { label: "Reason", value: "Order Cancelled" },
            ].map(({ label, value, truncate }) => (
              <div
                key={label}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <span className="text-dash-caption text-gray-400 font-medium flex-shrink-0">
                  {label}
                </span>
                <span
                  className={cn(
                    "text-dash-caption font-semibold text-[#023337] text-right ml-4",
                    truncate ? "truncate max-w-[160px]" : "",
                  )}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <AlertTriangle
              size={13}
              className="text-blue-400 mt-0.5 flex-shrink-0"
            />
            <p className="text-dash-caption text-blue-600">
              Skipping will cancel the order without a refund.
            </p>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onSkipAndCancel}
            disabled={isTransferring}
            className="flex-1 px-4 py-2.5 text-dash-body font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Skip & Cancel
          </button>
          <button
            onClick={handleTransfer}
            disabled={isTransferring}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-dash-body font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {isTransferring ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Banknote size={14} /> Transfer ₦{order.price.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ViewOrderSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-5 w-28 bg-gray-200 rounded" />
      {/* Hero skeleton */}
      <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-1 bg-gray-200" />
        <div className="px-5 py-5 flex items-start gap-4">
          <div className="w-[72px] h-[72px] bg-gray-200 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-32" />
            <div className="h-5 bg-gray-200 rounded w-48" />
            <div className="h-3 bg-gray-100 rounded w-24" />
          </div>
          <div className="hidden sm:block text-right space-y-2">
            <div className="h-7 bg-gray-200 rounded w-28" />
            <div className="h-5 bg-gray-100 rounded w-16 ml-auto" />
          </div>
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        <div className="space-y-4">
          <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 h-64" />
        </div>
        <div className="space-y-4">
          <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 h-40" />
          <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 h-36" />
          <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 h-36" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ViewOrderPage({ orderId }: { orderId: string }) {
  const pathname = usePathname();
  const userId = pathname.split("/").filter(Boolean)[0];
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const isFood = useIsFood();

  const [modalStep, setModalStep] = useState<
    "cancel_confirm" | "refund_transfer" | "ship_confirm" | null
  >(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => getOrder(orderId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats });
      const labels: Record<OrderStatus, string> = {
        Shipped: "Order marked as shipped.",
        Delivered: "Order marked as delivered.",
        Cancelled: "Order has been cancelled.",
        Pending: "Order status updated.",
        Preparing: "Order is now being prepared.",
        Ready: "Order is ready for pickup.",
        OnTheWay: "Order is on the way to the customer.",
      };
      toast.success(labels[variables.status]);
    },
    onError: () =>
      toast.error("Failed to update order status. Please try again."),
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (id: string) => confirmOrderPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats });
      toast.success("Payment confirmed.");
    },
    onError: () => toast.error("Failed to confirm payment. Please try again."),
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: (id: string) => rejectOrderPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats });
      setShowReceipt(false);
      toast.success("Payment rejected. The customer has been asked to resend.");
    },
    onError: () => toast.error("Failed to reject payment. Please try again."),
  });

  // The buyer's uploaded receipt — fetched on demand when the vendor opens it.
  const receiptQuery = useQuery({
    queryKey: ["order-receipt", orderId],
    queryFn: () => getOrderReceiptImage(orderId),
    enabled: showReceipt,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) return <ViewOrderSkeleton />;

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <XCircle size={28} className="text-red-400" />
        </div>
        <p className="text-dash-heading font-semibold text-gray-500">
          Order not found
        </p>
        <button
          onClick={() => navigate(`/${userId}/orders`)}
          className="flex items-center gap-2 text-dash-body text-orange-500 hover:underline cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Orders
        </button>
      </div>
    );
  }

  const isPaid = order.payment === "Paid";
  const steps = isFood ? FOOD_STEPS : RETAIL_STEPS;
  const activeIdx = steps.findIndex((s) => s.status === order.status);
  const resolvedActiveIdx = activeIdx === -1 ? steps.length - 1 : activeIdx;

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleShipConfirm = () => {
    statusMutation.mutate({ id: order.id, status: "Shipped" });
    setModalStep(null);
  };

  const handleCancelConfirm = () => {
    if (!isPaid) {
      statusMutation.mutate({ id: order.id, status: "Cancelled" });
      setModalStep(null);
    } else {
      setModalStep("refund_transfer");
    }
  };

  const handleSkipAndCancel = () => {
    statusMutation.mutate({ id: order.id, status: "Cancelled" });
    setModalStep(null);
  };

  const handleTransferSuccess = () => {
    statusMutation.mutate({ id: order.id, status: "Cancelled" });
    setModalStep(null);
  };

  return (
    <div className="space-y-5">
      {/* Modals */}
      <ShippedConfirmationModal
        isOpen={modalStep === "ship_confirm"}
        onClose={() => setModalStep(null)}
        onConfirm={handleShipConfirm}
      />
      <CancelConfirmModal
        isOpen={modalStep === "cancel_confirm"}
        isPaid={isPaid}
        onClose={() => setModalStep(null)}
        onConfirm={handleCancelConfirm}
      />
      <RefundTransferModal
        isOpen={modalStep === "refund_transfer"}
        order={order}
        onSkipAndCancel={handleSkipAndCancel}
        onTransferSuccess={handleTransferSuccess}
      />

      {/* Manual-transfer payment held for the vendor to confirm */}
      {order.payment === "Awaiting" && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div>
            <p className="text-dash-body font-semibold text-[#023337]">
              Payment awaiting your confirmation
            </p>
            <p className="text-dash-caption text-gray-500 mt-0.5">
              The customer uploaded a receipt we verified. Check it against your
              bank credit alert, then confirm only if the transfer truly landed.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowReceipt(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <Eye size={16} /> View receipt
            </button>
            <button
              type="button"
              onClick={() => confirmPaymentMutation.mutate(order.id)}
              disabled={
                confirmPaymentMutation.isPending ||
                rejectPaymentMutation.isPending
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {confirmPaymentMutation.isPending
                ? "Confirming…"
                : "Confirm payment received"}
            </button>
            <button
              type="button"
              onClick={() => rejectPaymentMutation.mutate(order.id)}
              disabled={
                rejectPaymentMutation.isPending ||
                confirmPaymentMutation.isPending
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rejectPaymentMutation.isPending
                ? "Rejecting…"
                : "Couldn't find payment"}
            </button>
          </div>
        </div>
      )}

      {/* Receipt preview — the buyer's uploaded transfer receipt */}
      {showReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowReceipt(false)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-md overflow-auto rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-dash-body font-semibold text-[#023337]">
                <Receipt size={16} /> Customer&apos;s receipt
              </p>
              <button
                type="button"
                onClick={() => setShowReceipt(false)}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <XCircle size={20} />
              </button>
            </div>

            {receiptQuery.isLoading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
                <Loader2 size={28} className="animate-spin" />
                <p className="text-dash-caption">Loading receipt…</p>
              </div>
            )}
            {receiptQuery.isError && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-gray-500">
                <AlertTriangle size={28} className="text-amber-400" />
                <p className="text-dash-caption">
                  Couldn&apos;t load the receipt. It may have expired — ask the
                  customer to resend it.
                </p>
              </div>
            )}
            {receiptQuery.data && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={receiptQuery.data}
                alt="Payment receipt uploaded by the customer"
                className="w-full rounded-xl border border-gray-100"
              />
            )}
          </div>
        </div>
      )}

      {/* Hero */}
      <OrderHeroCard
        order={order}
        isFood={isFood}
        steps={steps}
        activeIdx={resolvedActiveIdx}
      />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
        {/* Left: journey */}
        <JourneyCard
          order={order}
          isFood={isFood}
          steps={steps}
          activeIdx={resolvedActiveIdx}
          isMutating={statusMutation.isPending}
          onAction={(status) => statusMutation.mutate({ id: order.id, status })}
          onShipClick={() => setModalStep("ship_confirm")}
          onCancelClick={() => setModalStep("cancel_confirm")}
        />

        {/* Right: details */}
        <div className="space-y-5">
          {/* Item details */}
          <SectionCard
            title={isFood ? "Menu Item" : "Product"}
            icon={isFood ? ChefHat : Package}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0 border-2 overflow-hidden",
                  order.product.color,
                )}
              >
                {order.product.image ? (
                  <img
                    src={order.product.image}
                    alt={order.product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  order.product.initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-dash-title font-bold text-[#023337] leading-tight">
                  {order.product.name}
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      Unit Price
                    </p>
                    <p className="text-dash-body font-bold text-[#023337]">
                      ₦{order.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      Qty
                    </p>
                    <p className="text-dash-body font-bold text-[#023337]">
                      {order.quantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      Total
                    </p>
                    <p className="text-dash-body font-black text-orange-500">
                      ₦{order.total.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      {isFood ? "Code" : "SKU"}
                    </p>
                    <p className="text-dash-body font-mono font-semibold text-gray-500 truncate">
                      {order.sku ??
                        `${order.product.initials}-${order.id.slice(0, 6).toUpperCase()}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Order details */}
          <SectionCard title="Order Details" icon={Hash}>
            <div className="grid grid-cols-2 gap-5">
              <InfoRow
                icon={Hash}
                label="Order ID"
                value={order.orderId}
                accent
              />
              <InfoRow icon={Calendar} label="Order Date" value={order.date} />
              <InfoRow
                icon={CreditCard}
                label="Payment"
                value={order.paymentMethod}
              />
              <InfoRow
                icon={CreditCard}
                label="Payment Status"
                value={
                  <span
                    className={cn(
                      "font-bold",
                      isPaid ? "text-green-600" : "text-amber-600",
                    )}
                  >
                    {order.payment}
                  </span>
                }
              />
            </div>
          </SectionCard>

          {/* Fulfillment */}
          <SectionCard
            title={isFood ? "Delivery Details" : "Shipping Details"}
            icon={isFood ? Bike : Truck}
          >
            <div className="grid grid-cols-2 gap-5">
              <InfoRow
                icon={User}
                label="Customer"
                value={order.customer.name}
              />
              {order.customer.phone && (
                <InfoRow
                  icon={CreditCard}
                  label="Phone"
                  value={order.customer.phone}
                />
              )}
              <InfoRow
                icon={MapPin}
                label={
                  order.fulfillment.type === "pickup"
                    ? "Pickup"
                    : "Delivery Address"
                }
                value={
                  order.fulfillment.type === "pickup"
                    ? "Customer pickup"
                    : (order.fulfillment.address ??
                      order.customer.address ??
                      "—")
                }
                full
              />
              {isFood ? (
                <>
                  <InfoRow
                    icon={ChefHat}
                    label="Order Type"
                    value={
                      order.fulfillment.type === "pickup"
                        ? "Pickup"
                        : "Food Delivery"
                    }
                  />
                  <InfoRow
                    icon={Clock}
                    label="Est. Prep Time"
                    value={
                      order.status === "Delivered"
                        ? "Completed"
                        : order.status === "Cancelled"
                          ? "N/A"
                          : order.fulfillment.estimatedPrepMins
                            ? `~${order.fulfillment.estimatedPrepMins} mins`
                            : "—"
                    }
                  />
                </>
              ) : (
                <>
                  <InfoRow
                    icon={Truck}
                    label="Carrier"
                    value={order.fulfillment.carrier ?? "Standard Delivery"}
                  />
                  <InfoRow
                    icon={Clock}
                    label="Est. Delivery"
                    value={
                      order.status === "Delivered"
                        ? order.date
                        : order.status === "Cancelled"
                          ? "N/A"
                          : (order.fulfillment.estimate ??
                            "3 – 5 business days")
                    }
                  />
                </>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
