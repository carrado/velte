"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/error-message";
import { useNavigation } from "@/components/NavigationProgressContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  ArrowUp,
  ArrowDown,
  Truck,
  Info,
  Clock,
  XCircle,
  CheckCircle2,
  Eye,
  ChefHat,
  BellRing,
  Bike,
  Package,
  RefreshCw,
  AlertTriangle,
  Banknote,
  Loader2,
} from "lucide-react";
import { useIsFood } from "@/hooks/useBusinessType";
import { Pagination } from "@/components/Pagination";
import {
  fetchOrders,
  fetchOrderStats,
  updateOrderStatus,
} from "@/services/orders";
import { transactionService } from "@/services/transactions";
import type {
  Order,
  OrderFilter,
  OrderStatus,
  OrderListParams,
  SortOption,
} from "@/types/order";
import type { FilterField } from "@/types/common";
import FilterPopover from "../FilterPopover";
import SortMenu from "../SortMenu";
import TabBar from "../TabBar";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Stat cards ────────────────────────────────────────────────────────────────

const STAT_TOOLTIPS: Record<string, string> = {
  "Total Orders":
    "The total number of orders placed by customers across all statuses in the last 7 days.",
  "New Orders":
    "Orders that were newly placed in the last 7 days and are yet to be processed.",
  "Completed Orders":
    "Orders that have been successfully delivered to customers in the last 7 days.",
  "Canceled Orders":
    "Orders that were canceled by customers or your team before fulfillment in the last 7 days.",
};

function StatCard({
  title,
  value,
  meta,
}: {
  title: string;
  value: number | string;
  meta: React.ReactNode;
}) {
  return (
    <div className="bg-white sm:rounded-xl shadow-sm p-5 flex-1 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-dash-body font-semibold text-[#23272e]">{title}</p>
        <Tooltip>
          <TooltipTrigger>
            <Info
              size={15}
              className="text-[#9CA3AF] cursor-pointer hover:text-orange-400 transition-colors"
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-center">
            <p>{STAT_TOOLTIPS[title]}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-dash-display font-bold text-[#023337] mb-1">
        {value.toLocaleString()}
      </p>
      <div className="text-dash-secondary text-[#6a717f] flex items-center gap-1">
        {meta}
      </div>
    </div>
  );
}

// ── Status + payment badges ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case "Delivered":
      return (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={15} className="text-[#21c45d]" />
          <span className="text-dash-body text-[#21c45d] font-medium">
            Delivered
          </span>
        </div>
      );
    case "Pending":
      return (
        <div className="flex items-center gap-1.5">
          <Clock size={15} className="text-[#f59f0a]" />
          <span className="text-dash-body text-[#f59f0a] font-medium">
            Pending
          </span>
        </div>
      );
    case "Shipped":
      return (
        <div className="flex items-center gap-1.5">
          <Truck size={15} className="text-[#374151]" />
          <span className="text-dash-body text-[#374151] font-medium">
            Shipped
          </span>
        </div>
      );
    case "Cancelled":
      return (
        <div className="flex items-center gap-1.5">
          <XCircle size={15} className="text-[#ef4343]" />
          <span className="text-dash-body text-[#ef4343] font-medium">
            Cancelled
          </span>
        </div>
      );
    case "Preparing":
      return (
        <div className="flex items-center gap-1.5">
          <ChefHat size={15} className="text-[#f97316]" />
          <span className="text-dash-body text-[#f97316] font-medium">
            Preparing
          </span>
        </div>
      );
    case "Ready":
      return (
        <div className="flex items-center gap-1.5">
          <BellRing size={15} className="text-[#0891b2]" />
          <span className="text-dash-body text-[#0891b2] font-medium">
            Ready
          </span>
        </div>
      );
    case "OnTheWay":
      return (
        <div className="flex items-center gap-1.5">
          <Bike size={15} className="text-[#7c3aed]" />
          <span className="text-dash-body text-[#7c3aed] font-medium">
            On the Way
          </span>
        </div>
      );
  }
}

function PaymentBadge({ status }: { status: "Paid" | "Unpaid" }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full ${status === "Paid" ? "bg-[#21c45d]" : "bg-[#f59f0a]"}`}
      />
      <span className="text-dash-body text-[#111827]">{status}</span>
    </div>
  );
}

// ── Action lookup tables ──────────────────────────────────────────────────────

const FOOD_NEXT_ACTION: Partial<
  Record<
    OrderStatus,
    {
      status: OrderStatus;
      label: string;
      icon: React.ElementType;
      className: string;
    }
  >
> = {
  Pending: {
    status: "Preparing",
    label: "Start Preparing",
    icon: ChefHat,
    className: "bg-orange-500 hover:bg-orange-600 text-white",
  },
  Preparing: {
    status: "Ready",
    label: "Mark as Ready",
    icon: BellRing,
    className: "bg-cyan-500 hover:bg-cyan-600 text-white",
  },
  Ready: {
    status: "OnTheWay",
    label: "Out for Delivery",
    icon: Bike,
    className: "bg-purple-500 hover:bg-purple-600 text-white",
  },
  OnTheWay: {
    status: "Delivered",
    label: "Mark as Delivered",
    icon: CheckCircle2,
    className: "bg-green-500 hover:bg-green-600 text-white",
  },
};

const RETAIL_NEXT_ACTION: Partial<
  Record<
    OrderStatus,
    {
      label: string;
      icon: React.ElementType;
      className: string;
      shipModal?: true;
    }
  >
> = {
  Pending: {
    label: "Mark as Shipped",
    icon: Truck,
    className: "bg-orange-500 hover:bg-orange-600 text-white",
    shipModal: true,
  },
  Shipped: {
    label: "Mark as Delivered",
    icon: CheckCircle2,
    className: "bg-green-500 hover:bg-green-600 text-white",
  },
};

// ── Unified order card ────────────────────────────────────────────────────────

function OrderCard({
  order,
  isFood,
  mutating,
  onView,
  onDirectAction,
  onShipClick,
  onCancelClick,
}: {
  order: Order;
  isFood: boolean;
  mutating: boolean;
  onView: () => void;
  onDirectAction: (status: OrderStatus) => void;
  onShipClick: () => void;
  onCancelClick: () => void;
}) {
  const actionCfg = isFood
    ? (FOOD_NEXT_ACTION[order.status] ?? null)
    : (RETAIL_NEXT_ACTION[order.status] ?? null);

  const handlePrimaryClick = () => {
    if (!actionCfg) return;
    if (!isFood && "shipModal" in actionCfg && actionCfg.shipModal) {
      onShipClick();
    } else if (isFood) {
      const fa = FOOD_NEXT_ACTION[order.status];
      if (fa) onDirectAction(fa.status);
    } else {
      const ra = RETAIL_NEXT_ACTION[order.status];
      if (ra && !("shipModal" in ra)) onDirectAction("Delivered");
    }
  };

  return (
    <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3.5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-dash-body flex-shrink-0 border overflow-hidden",
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
          <p className="text-dash-body font-bold text-[#023337] leading-tight truncate">
            {order.product.name}
          </p>
          <p className="text-dash-caption text-gray-400 font-medium mt-0.5">
            {order.orderId}
          </p>
        </div>
        <button
          onClick={onView}
          title="View order"
          className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer flex-shrink-0"
        >
          <Eye size={15} />
        </button>
      </div>

      {/* Date + price */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-dash-caption text-gray-400">
          <Clock size={11} />
          <span>{order.date}</span>
        </div>
        <span className="text-dash-body font-bold text-orange-500">
          ₦{order.price.toFixed(2)}
        </span>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-3">
        <PaymentBadge status={order.payment} />
        <span className="w-px h-3.5 bg-gray-200" />
        <StatusBadge status={order.status} />
      </div>

      {/* Primary action */}
      {actionCfg && (
        <button
          onClick={handlePrimaryClick}
          disabled={mutating}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-dash-body font-semibold transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed",
            actionCfg.className,
          )}
        >
          {mutating ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <actionCfg.icon size={15} />
          )}
          {actionCfg.label}
        </button>
      )}

      {/* Cancel — Pending only, both types */}
      {order.status === "Pending" && (
        <button
          onClick={onCancelClick}
          disabled={mutating}
          className="w-full text-dash-caption text-red-400 hover:text-red-600 font-medium transition-colors disabled:opacity-50 cursor-pointer"
        >
          Cancel order
        </button>
      )}

      {/* Terminal state pills */}
      {order.status === "Delivered" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl">
          <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
          <p className="text-dash-caption text-green-700 font-medium">
            Order fulfilled
          </p>
        </div>
      )}
      {order.status === "Cancelled" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
          <XCircle size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-dash-caption text-red-600 font-medium">
            Order cancelled
          </p>
        </div>
      )}
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3.5 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 bg-gray-200 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-gray-200 rounded w-3/4" />
              <div className="h-2.5 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
          <div className="flex justify-between">
            <div className="h-2.5 bg-gray-100 rounded w-24" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
          <div className="flex gap-3">
            <div className="h-3 bg-gray-100 rounded w-16" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
          <div className="h-10 bg-gray-100 rounded-xl" />
        </div>
      ))}
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
          {isPaid && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle
                size={14}
                className="text-amber-500 mt-0.5 flex-shrink-0"
              />
              <p className="text-dash-caption text-amber-700">
                This order has already been paid. You will be prompted to
                initiate a refund on the next step.
              </p>
            </div>
          )}
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

function RefundTransferModal({
  isOpen,
  order,
  onSkipAndCancel,
  onTransferSuccess,
}: {
  isOpen: boolean;
  order: Order | null;
  onSkipAndCancel: () => void;
  onTransferSuccess: () => void;
}) {
  const [isTransferring, setIsTransferring] = useState(false);

  if (!isOpen || !order) return null;

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
    <div className="fixed inset-0 z-50 flex h-full items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
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

          <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-dash-caption text-gray-400 font-medium">
                Item
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

          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <AlertTriangle
              size={13}
              className="text-blue-400 mt-0.5 flex-shrink-0"
            />
            <p className="text-dash-caption text-blue-600">
              The order will be cancelled after the refund is initiated.
              Skipping will cancel the order without a refund.
            </p>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-5">
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

// ── Tabs + filter config ──────────────────────────────────────────────────────

const RETAIL_TABS: { key: OrderFilter; label: string }[] = [
  { key: "all", label: "All orders" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "cancelled", label: "Cancelled" },
];

const FOOD_TABS: { key: OrderFilter; label: string }[] = [
  { key: "all", label: "All orders" },
  { key: "completed", label: "Delivered" },
  { key: "pending", label: "In Progress" },
  { key: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 10;

const DEFAULT_FILTERS: Record<string, string> = {
  startDate: "",
  endDate: "",
  paymentStatus: "all",
  orderStatus: "all",
};

const PAYMENT_STATUS_FIELD: FilterField = {
  type: "select",
  key: "paymentStatus",
  label: "Payment Status",
  options: [
    { value: "all", label: "All" },
    { value: "Paid", label: "Paid" },
    { value: "Unpaid", label: "Unpaid" },
  ],
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price low to high" },
  { value: "price_desc", label: "Price high to low" },
];

const SORT_MAP: Record<
  SortOption,
  { sort_by: "created_at" | "price"; sort_order: "asc" | "desc" }
> = {
  newest: { sort_by: "created_at", sort_order: "desc" },
  oldest: { sort_by: "created_at", sort_order: "asc" },
  price_asc: { sort_by: "price", sort_order: "asc" },
  price_desc: { sort_by: "price", sort_order: "desc" },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrderManagement() {
  const pathname = usePathname();
  const userId = pathname.split("/").filter(Boolean)[0];
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const isFood = useIsFood();

  const TABS = isFood ? FOOD_TABS : RETAIL_TABS;

  const ordersFilterFields: FilterField[] = [
    PAYMENT_STATUS_FIELD,
    {
      type: "select",
      key: "orderStatus",
      label: "Order Status",
      options: isFood
        ? [
            { value: "all", label: "All" },
            { value: "pending", label: "In Progress" },
            { value: "completed", label: "Delivered" },
            { value: "cancelled", label: "Cancelled" },
          ]
        : [
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ],
    },
  ];

  const [activeTab, setActiveTab] = useState<OrderFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] =
    useState<Record<string, string>>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Ship confirmation modal state
  const [shippedModalOpen, setShippedModalOpen] = useState(false);
  const [pendingShippedOrderId, setPendingShippedOrderId] = useState<
    string | null
  >(null);

  // Cancel + refund modal state
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [cancelModalStep, setCancelModalStep] = useState<
    "confirm" | "refund" | null
  >(null);

  // Debounce the search box before it reaches the server
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever a filter that changes the result set changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [activeTab, debouncedSearch, filters, sortBy]);

  // ── build query params ─────────────────────────────────────────────────────

  const queryParams = useMemo<OrderListParams>(() => {
    const { sort_by, sort_order } = SORT_MAP[sortBy];
    // The dropdown filter (orderStatus) overrides the active tab when set.
    const effectiveTab = (
      filters["orderStatus"] !== "all" ? filters["orderStatus"] : activeTab
    ) as OrderFilter;

    const params: OrderListParams = {
      page,
      limit: PAGE_SIZE,
      sort_by,
      sort_order,
    };
    if (effectiveTab !== "all") params.tab = effectiveTab;
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (filters["paymentStatus"] && filters["paymentStatus"] !== "all") {
      params.payment_status =
        filters["paymentStatus"] === "Paid" ? "paid" : "unpaid";
    }
    if (filters["startDate"]) params.start_date = filters["startDate"];
    if (filters["endDate"]) params.end_date = filters["endDate"];
    return params;
  }, [page, sortBy, activeTab, debouncedSearch, filters]);

  // ── data ─────────────────────────────────────────────────────────────────

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.orders.stats,
    queryFn: fetchOrderStats,
  });
  const { data: listData, isLoading: ordersLoading } = useQuery({
    queryKey: queryKeys.orders.list(queryParams),
    queryFn: () => fetchOrders(queryParams),
    placeholderData: keepPreviousData,
  });
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats });
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, "Failed to update order status.")),
  });

  const orders = listData?.orders ?? [];
  const totalPages = listData?.pagination.total_pages ?? 1;
  const allCount = stats?.totalOrders.value ?? 0;

  // ── handlers ─────────────────────────────────────────────────────────────

  function handleTabChange(tab: OrderFilter) {
    setActiveTab(tab);
    setPage(1);
    setFilters((prev) => ({ ...prev, orderStatus: "all" }));
  }

  const confirmMarkShipped = () => {
    if (pendingShippedOrderId) {
      mutation.mutate({ id: pendingShippedOrderId, status: "Shipped" });
      setShippedModalOpen(false);
      setPendingShippedOrderId(null);
    }
  };

  const handleCancelClick = (order: Order) => {
    setCancelingOrder(order);
    setCancelModalStep("confirm");
  };

  const handleCancelConfirm = () => {
    if (!cancelingOrder) return;
    if (cancelingOrder.payment === "Paid") {
      setCancelModalStep("refund");
    } else {
      mutation.mutate({ id: cancelingOrder.id, status: "Cancelled" });
      setCancelModalStep(null);
      setCancelingOrder(null);
    }
  };

  const handleSkipAndCancel = () => {
    if (cancelingOrder)
      mutation.mutate({ id: cancelingOrder.id, status: "Cancelled" });
    setCancelModalStep(null);
    setCancelingOrder(null);
  };

  const handleTransferSuccess = () => {
    if (cancelingOrder)
      mutation.mutate({ id: cancelingOrder.id, status: "Cancelled" });
    setCancelModalStep(null);
    setCancelingOrder(null);
  };

  const handleViewOrder = (orderId: string) =>
    navigate(`/${userId}/orders/${orderId}`);

  return (
    <div className="space-y-5">
      {/* Modals */}
      <ShippedConfirmationModal
        isOpen={shippedModalOpen}
        onClose={() => setShippedModalOpen(false)}
        onConfirm={confirmMarkShipped}
      />
      <CancelConfirmModal
        isOpen={cancelModalStep === "confirm"}
        isPaid={cancelingOrder?.payment === "Paid"}
        onClose={() => {
          setCancelModalStep(null);
          setCancelingOrder(null);
        }}
        onConfirm={handleCancelConfirm}
      />
      <RefundTransferModal
        isOpen={cancelModalStep === "refund"}
        order={cancelingOrder}
        onSkipAndCancel={handleSkipAndCancel}
        onTransferSuccess={handleTransferSuccess}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm p-4 flex-1 min-w-[200px] animate-pulse"
            >
              <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Total Orders"
              value={stats!.totalOrders.value}
              meta={
                <>
                  <ArrowUp size={13} className="text-[#21c45d]" />
                  <span className="text-[#21c45d] font-medium">
                    {stats!.totalOrders.growth}%
                  </span>
                  <span className="ml-1">Last 7 days</span>
                </>
              }
            />
            <StatCard
              title="New Orders"
              value={stats!.newOrders.value}
              meta={
                <>
                  <ArrowUp size={13} className="text-[#21c45d]" />
                  <span className="text-[#21c45d] font-medium">
                    {stats!.newOrders.growth}%
                  </span>
                  <span className="ml-1">Last 7 days</span>
                </>
              }
            />
            <StatCard
              title="Completed Orders"
              value={stats!.completedOrders.value}
              meta={
                <>
                  <span className="text-[#21c45d] font-medium">
                    {stats!.completedOrders.percentage}%
                  </span>
                  <span className="ml-1">Last 7 days</span>
                </>
              }
            />
            <StatCard
              title="Canceled Orders"
              value={stats!.canceledOrders.value}
              meta={
                <>
                  <ArrowDown size={13} className="text-[#ef4343]" />
                  <span className="text-[#ef4343] font-medium">
                    {Math.abs(stats!.canceledOrders.growth)}%
                  </span>
                  <span className="ml-1">Last 7 days</span>
                </>
              }
            />
          </>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white sm:rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 sm:p-4 py-4 px-3 flex-wrap border-b border-gray-100">
          <TabBar
            tabs={TABS.map((t) => ({
              ...t,
              count: t.key === "all" ? allCount : undefined,
            }))}
            activeTab={activeTab}
            onChange={handleTabChange}
          />
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={isFood ? "Search orders" : "Search order report"}
                className="pl-3 pr-9 py-2 text-dash-body bg-[#f9fafb] border border-[#e5e7eb] rounded-lg w-full"
              />
              <Search
                size={16}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6a717f]"
              />
            </div>
            <FilterPopover
              values={filters}
              defaultValues={DEFAULT_FILTERS}
              fields={ordersFilterFields}
              onApply={(newFilters) => {
                setFilters(newFilters);
                setPage(1);
              }}
              onReset={() => {
                setFilters(DEFAULT_FILTERS);
                setPage(1);
              }}
            />
            <SortMenu
              currentSort={sortBy}
              onSort={(option) => {
                setSortBy(option);
                setPage(1);
              }}
              options={SORT_OPTIONS}
            />
          </div>
        </div>
      </div>

      {/* Order cards */}
      {ordersLoading ? (
        <OrderSkeleton />
      ) : orders.length === 0 ? (
        <div className="bg-white sm:rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={24} className="text-orange-300" />
          </div>
          <p className="text-dash-heading font-bold text-gray-700">
            No orders found
          </p>
          <p className="text-dash-body text-gray-400 mt-1">
            Orders matching your filters will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isFood={isFood}
              mutating={mutation.isPending}
              onView={() => handleViewOrder(order.id)}
              onDirectAction={(status) =>
                mutation.mutate({ id: order.id, status })
              }
              onShipClick={() => {
                setPendingShippedOrderId(order.id);
                setShippedModalOpen(true);
              }}
              onCancelClick={() => handleCancelClick(order)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!ordersLoading && orders.length > 0 && (
        <div className="bg-white sm:rounded-xl shadow-sm">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
