"use client";

import { usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useNavigation } from "@/components/NavigationProgressContext";
import { useState } from "react";
import { fetchOrders, updateOrderStatus } from "@/services/orders";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

// ── Timeline steps ────────────────────────────────────────────────────────────

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
      {/* Connecting line */}
      <div className="absolute left-[17px] top-5 bottom-5 w-0.5 bg-gray-100" />
      <div className="space-y-0">
        {TIMELINE_STEPS.map((step, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          const isPending = i > activeIdx;

          return (
            <div
              key={step.status}
              className="relative flex items-start gap-4 pb-5 last:pb-0"
            >
              {/* Node */}
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

              {/* Content */}
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

// ── Section card ──────────────────────────────────────────────────────────────

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

// ── Status change modal ───────────────────────────────────────────────────────

type StatusAction = {
  label: string;
  newStatus: OrderStatus;
  icon: React.ElementType;
  color: string;
  warning?: string;
};

function StatusModal({
  action,
  onClose,
  onConfirm,
}: {
  action: StatusAction;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const Icon = action.icon;
  return (
    <div className="fixed inset-0 z-50 flex items-center h-full justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center",
              action.color,
            )}
          >
            <Icon size={18} className="text-white" />
          </div>
          <h3 className="text-dash-heading font-bold text-[#023337]">
            {action.label}
          </h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-dash-body text-gray-600">
            Are you sure you want to mark this order as{" "}
            <strong>{action.newStatus}</strong>?
          </p>
          {action.warning && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle
                size={14}
                className="text-amber-500 mt-0.5 flex-shrink-0"
              />
              <p className="text-dash-caption text-amber-700">
                {action.warning}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-dash-body font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "flex-1 px-4 py-2.5 text-dash-body font-medium text-white rounded-xl transition-colors",
              action.color,
            )}
          >
            Confirm
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

  const [pendingAction, setPendingAction] = useState<StatusAction | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: queryKeys.orders.list("all"),
    queryFn: () => fetchOrders("all"),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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
          <ArrowLeft size={14} />
          Back to Orders
        </button>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[order.status];
  const StatusIcon = cfg.icon;

  // Build available actions based on current status
  const availableActions: StatusAction[] = [];
  if (order.status === "Pending") {
    availableActions.push({
      label: "Mark as Shipped",
      newStatus: "Shipped",
      icon: Truck,
      color: "bg-blue-500 hover:bg-blue-600 text-white",
      warning: "Once shipped, this order cannot be cancelled.",
    });
    availableActions.push({
      label: "Cancel Order",
      newStatus: "Cancelled",
      icon: XCircle,
      color: "bg-red-500 hover:bg-red-600 text-white",
    });
  }
  if (order.status === "Shipped") {
    availableActions.push({
      label: "Mark as Delivered",
      newStatus: "Delivered",
      icon: CheckCircle2,
      color: "bg-green-500 hover:bg-green-600 text-white",
    });
  }

  const handleConfirm = () => {
    if (pendingAction) {
      mutation.mutate({ id: order.id, status: pendingAction.newStatus });
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-5">
      {pendingAction && (
        <StatusModal
          action={pendingAction}
          onClose={() => setPendingAction(null)}
          onConfirm={handleConfirm}
        />
      )}

      {/* ── Header banner ── */}
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
              "w-10 h-10 rounded-xl flex items-center justify-center",
              cfg.bg,
              "border",
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

        {/* Payment badge */}
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

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ── Left col ── */}
        <div className="lg:col-span-1 space-y-5">
          {/* Order timeline */}
          <SectionCard title="Order Progress" icon={RefreshCw}>
            <OrderTimeline currentStatus={order.status} />
          </SectionCard>

          {/* Status actions */}
          {availableActions.length > 0 && (
            <SectionCard title="Update Status" icon={ChevronRight}>
              <div className="space-y-2.5">
                {availableActions.map((action) => {
                  const AIcon = action.icon;
                  return (
                    <button
                      key={action.newStatus}
                      onClick={() => setPendingAction(action)}
                      disabled={mutation.isPending}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-dash-body font-semibold transition-all",
                        action.color,
                        "disabled:opacity-60 disabled:cursor-not-allowed",
                      )}
                    >
                      <AIcon size={16} />
                      {action.label}
                    </button>
                  );
                })}
              </div>
              {order.status === "Delivered" && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle2
                    size={14}
                    className="text-green-500 flex-shrink-0"
                  />
                  <p className="text-dash-caption text-green-700 font-medium">
                    This order has been successfully fulfilled.
                  </p>
                </div>
              )}
              {order.status === "Cancelled" && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <XCircle size={14} className="text-red-400 flex-shrink-0" />
                  <p className="text-dash-caption text-red-600 font-medium">
                    This order has been cancelled and cannot be modified.
                  </p>
                </div>
              )}
            </SectionCard>
          )}

          {/* No actions — still show card with final state */}
          {availableActions.length === 0 &&
            (order.status === "Delivered" || order.status === "Cancelled") && (
              <SectionCard title="Update Status" icon={ChevronRight}>
                {order.status === "Delivered" ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle2
                      size={14}
                      className="text-green-500 flex-shrink-0"
                    />
                    <p className="text-dash-caption text-green-700 font-medium">
                      This order has been successfully fulfilled.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <XCircle size={14} className="text-red-400 flex-shrink-0" />
                    <p className="text-dash-caption text-red-600 font-medium">
                      This order has been cancelled and cannot be modified.
                    </p>
                  </div>
                )}
              </SectionCard>
            )}
        </div>

        {/* ── Right col ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Product card */}
          <SectionCard title="Product Details" icon={Package}>
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div
                className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0 border",
                  order.product.color,
                )}
              >
                {order.product.initials}
              </div>

              {/* Info */}
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
                      ${order.price.toFixed(2)}
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
                      ${order.price.toFixed(2)}
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

          {/* Order info */}
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

          {/* Shipping info (mock) */}
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
