"use client";

import { usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useNavigation } from "@/components/NavigationProgressContext";
import { useState } from "react";
import { fetchOrders, updateOrderStatus } from "@/services/orders";
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
  ChevronRight,
  RefreshCw,
  Banknote,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ElementType;
  }
> = {
  Pending: {
    label: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Clock,
  },
  Shipped: {
    label: "Shipped",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Truck,
  },
  Delivered: {
    label: "Delivered",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    icon: CheckCircle2,
  },
  Cancelled: {
    label: "Cancelled",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: XCircle,
  },
};

// ── Timeline ──────────────────────────────────────────────────────────────────

const TIMELINE_STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  {
    status: "Pending",
    label: "Order Placed",
    desc: "Order received and awaiting processing",
  },
  {
    status: "Shipped",
    label: "Shipped",
    desc: "Order dispatched to delivery carrier",
  },
  {
    status: "Delivered",
    label: "Delivered",
    desc: "Order successfully delivered to customer",
  },
];

function OrderTimeline({ currentStatus }: { currentStatus: OrderStatus }) {
  if (currentStatus === "Cancelled") {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <XCircle size={18} className="text-red-500" />
        </div>
        <div>
          <p className="text-dash-body font-semibold text-red-700">
            Order Cancelled
          </p>
          <p className="text-dash-caption text-red-500">
            This order was cancelled before fulfillment
          </p>
        </div>
      </div>
    );
  }

  const activeIdx = TIMELINE_STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className="relative">
      <div className="absolute left-[17px] top-5 bottom-5 w-0.5 bg-gray-100" />
      <div className="space-y-0">
        {TIMELINE_STEPS.map((step, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <div
              key={step.status}
              className="relative flex items-start gap-4 pb-5 last:pb-0"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10 transition-all",
                  isDone
                    ? "bg-green-500 border-green-500"
                    : isActive
                      ? "bg-orange-500 border-orange-500"
                      : "bg-white border-gray-200",
                )}
              >
                {isDone ? (
                  <CheckCircle2 size={16} className="text-white" />
                ) : isActive ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                )}
              </div>
              <div className="pt-1.5">
                <p
                  className={cn(
                    "text-dash-body font-semibold leading-tight",
                    isDone || isActive ? "text-[#023337]" : "text-gray-400",
                  )}
                >
                  {step.label}
                </p>
                <p
                  className={cn(
                    "text-dash-caption mt-0.5",
                    isDone || isActive ? "text-gray-500" : "text-gray-300",
                  )}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
          accent
            ? "bg-orange-50 border border-orange-100"
            : "bg-gray-50 border border-gray-100",
        )}
      >
        <Icon
          size={14}
          className={accent ? "text-orange-500" : "text-gray-400"}
        />
      </div>
      <div>
        <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
          {label}
        </p>
        <div className="text-dash-body font-semibold text-[#023337]">
          {value}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Icon size={14} className="text-orange-500" />
        </div>
        <h3 className="text-dash-heading font-bold text-[#023337]">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

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
    <div className="fixed inset-0 z-50 flex h-full items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
            <Truck size={18} className="text-white" />
          </div>
          <h3 className="text-dash-heading font-bold text-[#023337]">
            Confirm Shipment
          </h3>
        </div>
        <div className="px-6 py-5">
          <p className="text-dash-body text-gray-600">
            Once marked as <strong>Shipped</strong>, this order cannot be
            cancelled. Are you sure you want to continue?
          </p>
          <div className="flex items-start gap-2 mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
            <AlertTriangle
              size={14}
              className="text-orange-500 mt-0.5 flex-shrink-0"
            />
            <p className="text-dash-caption text-orange-700">
              Make sure the order details are correct before dispatching to the
              carrier. This step cannot be reversed.
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
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
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cancel confirmation modal ─────────────────────────────────────────────────

function CancelConfirmModal({
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
    <div className="fixed inset-0 z-50 flex h-full items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center">
            <XCircle size={18} className="text-white" />
          </div>
          <h3 className="text-dash-heading font-bold text-[#023337]">
            Cancel Order
          </h3>
        </div>
        <div className="px-6 py-5">
          <p className="text-dash-body text-gray-600">
            Are you sure you want to cancel this order? This action cannot be
            undone.
          </p>
          <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle
              size={14}
              className="text-amber-500 mt-0.5 flex-shrink-0"
            />
            <p className="text-dash-caption text-amber-700">
              If the customer already paid, you will be prompted to initiate a
              refund on the next step.
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
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

// ── Refund transfer modal ─────────────────────────────────────────────────────

function RefundTransferModal({
  isOpen,
  order,
  onClose,
  onTransferSuccess,
}: {
  isOpen: boolean;
  order: Order;
  onClose: () => void;
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
        `₦${order.price.toFixed(2)} refund queued successfully. Processing in 1–3 business days.`,
      );
      setTimeout(() => onTransferSuccess(), 600);
    } catch (err: any) {
      toast.error(err?.message ?? "Transfer failed. Please try again.");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex h-full items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
            <Banknote size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-dash-heading font-bold text-[#023337]">
              Refund Transfer
            </h3>
            <p className="text-dash-caption text-gray-400">
              Order {order.orderId}
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Amount highlight */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-4 text-center">
            <p className="text-dash-caption text-orange-400 uppercase tracking-wide font-semibold mb-1">
              Refund Amount
            </p>
            <p className="text-[2rem] font-black text-orange-600 leading-none">
              ₦{order.price.toFixed(2)}
            </p>
            <p className="text-dash-caption text-orange-400 mt-1">
              Full order value will be refunded
            </p>
          </div>

          {/* Summary rows */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-dash-caption text-gray-400 font-medium">
                Product
              </span>
              <span className="text-dash-caption font-semibold text-[#023337] max-w-[160px] text-right truncate">
                {order.product.name}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-dash-caption text-gray-400 font-medium">
                Order ID
              </span>
              <span className="text-dash-caption font-semibold text-[#023337]">
                {order.orderId}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-dash-caption text-gray-400 font-medium">
                Reason
              </span>
              <span className="text-dash-caption font-semibold text-[#023337]">
                Order Cancelled
              </span>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <AlertTriangle
              size={13}
              className="text-blue-400 mt-0.5 flex-shrink-0"
            />
            <p className="text-dash-caption text-blue-600">
              The order will only be cancelled after the refund is initiated.
              Skipping will cancel the order without a refund.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
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
                <Loader2 size={15} className="animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Banknote size={15} /> Transfer ₦{order.price.toFixed(2)}
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
      <div className="h-5 w-32 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 h-48" />
          <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 h-40" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 h-32" />
          <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 h-48" />
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

  const [modalStep, setModalStep] = useState<
    "cancel_confirm" | "refund_transfer" | "ship_confirm" | null
  >(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: queryKeys.orders.list("all"),
    queryFn: () => fetchOrders("all"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      const labels: Record<OrderStatus, string> = {
        Shipped: "Order marked as shipped.",
        Delivered: "Order marked as delivered.",
        Cancelled: "Order has been cancelled.",
        Pending: "Order status updated.",
      };
      toast.success(labels[variables.status]);
    },
    onError: () => {
      toast.error("Failed to update order status. Please try again.");
    },
  });

  const order: Order | undefined = orders.find((o) => o.id === orderId);

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

  const cfg = STATUS_CONFIG[order.status];
  const StatusIcon = cfg.icon;

  const handleShipClick = () => setModalStep("ship_confirm");

  const handleShipConfirm = () => {
    statusMutation.mutate({ id: order.id, status: "Shipped" });
    setModalStep(null);
  };

  const handleCancelClick = () => setModalStep("cancel_confirm");

  // Step 2 — open refund modal, order not yet cancelled
  const handleCancelConfirm = () => setModalStep("refund_transfer");

  // Step 3a — refund succeeded, now cancel
  const handleTransferSuccess = () => {
    statusMutation.mutate({ id: order.id, status: "Cancelled" });
    setModalStep(null);
  };

  // Step 3b — skipped refund, still cancel
  const handleRefundClose = () => {
    setModalStep(null);
  };

  return (
    <div className="space-y-5">
      {/* Modals */}
      <CancelConfirmModal
        isOpen={modalStep === "cancel_confirm"}
        onClose={() => setModalStep(null)}
        onConfirm={handleCancelConfirm}
      />
      <RefundTransferModal
        isOpen={modalStep === "refund_transfer"}
        order={order}
        onClose={handleRefundClose}
        onTransferSuccess={handleTransferSuccess}
      />
      <ShippedConfirmationModal
        isOpen={modalStep === "ship_confirm"}
        onClose={() => setModalStep(null)}
        onConfirm={handleShipConfirm}
      />

      {/* Header banner */}
      <div
        className={cn(
          "sm:rounded-2xl border px-5 py-4 flex items-center justify-between gap-4 flex-wrap",
          cfg.bg,
          cfg.border,
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border",
              cfg.bg,
              cfg.border,
            )}
          >
            <StatusIcon size={20} className={cfg.color} />
          </div>
          <div>
            <p className="text-dash-caption text-gray-500 font-medium">
              Order {order.orderId}
            </p>
            <p className={cn("text-dash-heading font-bold", cfg.color)}>
              {cfg.label}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-dash-caption font-bold border",
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

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Left */}
        <div className="lg:col-span-1 space-y-5">
          <SectionCard title="Order Progress" icon={RefreshCw}>
            <OrderTimeline currentStatus={order.status} />
          </SectionCard>

          <SectionCard title="Update Status" icon={ChevronRight}>
            {order.status === "Pending" && (
              <div className="space-y-2.5">
                <button
                  onClick={handleShipClick}
                  disabled={statusMutation.isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-dash-body font-semibold bg-orange-500 transition-all disabled:opacity-60 cursor-pointer"
                >
                  <Truck size={16} /> Mark as Shipped
                </button>{" "}
                <button
                  onClick={handleCancelClick}
                  disabled={statusMutation.isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-dash-body font-semibold bg-red-500 hover:bg-red-600 transition-all disabled:opacity-60 cursor-pointer"
                >
                  <XCircle size={16} /> Cancel Order
                </button>
              </div>
            )}
            {order.status === "Shipped" && (
              <button
                onClick={() =>
                  statusMutation.mutate({ id: order.id, status: "Delivered" })
                }
                disabled={statusMutation.isPending}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-dash-body font-semibold bg-green-500 hover:bg-green-600 transition-all disabled:opacity-60 cursor-pointer"
              >
                <CheckCircle2 size={16} /> Mark as Delivered
              </button>
            )}
            {order.status === "Delivered" && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2
                  size={14}
                  className="text-green-500 flex-shrink-0"
                />
                <p className="text-dash-caption text-green-700 font-medium">
                  Order has been successfully fulfilled.
                </p>
              </div>
            )}
            {order.status === "Cancelled" && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <XCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-dash-caption text-red-600 font-medium">
                  This order was cancelled and cannot be modified.
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right */}
        <div className="lg:col-span-2 space-y-5">
          <SectionCard title="Product Details" icon={Package}>
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0 border",
                  order.product.color,
                )}
              >
                {order.product.initials}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-dash-title font-bold text-[#023337] leading-tight">
                  {order.product.name}
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      Unit Price
                    </p>
                    <p className="text-dash-body font-bold text-[#023337]">
                      ₦{order.price.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      Quantity
                    </p>
                    <p className="text-dash-body font-bold text-[#023337]">1</p>
                  </div>
                  <div>
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      Total
                    </p>
                    <p className="text-dash-title font-black text-orange-500">
                      ₦{order.price.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-dash-caption text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      SKU
                    </p>
                    <p className="text-dash-body font-mono font-semibold text-gray-500">
                      {order.product.initials}-{order.id.padStart(4, "0")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Order Information" icon={Hash}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow
                icon={Hash}
                label="Order ID"
                value={order.orderId}
                accent
              />
              <InfoRow icon={Calendar} label="Order Date" value={order.date} />
              <InfoRow
                icon={CreditCard}
                label="Payment Method"
                value="Credit / Debit Card"
              />
              <InfoRow
                icon={CreditCard}
                label="Payment Status"
                value={
                  <span
                    className={cn(
                      "font-bold",
                      order.payment === "Paid"
                        ? "text-green-600"
                        : "text-amber-600",
                    )}
                  >
                    {order.payment}
                  </span>
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="Shipping Details" icon={Truck}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow icon={User} label="Customer" value="John Doe" />
              <InfoRow
                icon={MapPin}
                label="Delivery Address"
                value="123 Main Street, Lagos, Nigeria"
              />
              <InfoRow icon={Truck} label="Carrier" value="Standard Delivery" />
              <InfoRow
                icon={Clock}
                label="Est. Delivery"
                value={
                  order.status === "Delivered"
                    ? order.date
                    : order.status === "Cancelled"
                      ? "N/A"
                      : "3 – 5 business days"
                }
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
