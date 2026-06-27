"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Loader2,
} from "lucide-react";
import { useIsFood } from "@/hooks/useBusinessType";
import { useOrdersConnection } from "@/hooks/useOrdersConnection";
import { fetchOrderStats, updateOrderStatus } from "@/services/orders";
import type {
  Order,
  OrderFilter,
  OrderStatus,
  OrderListParams,
  PaymentStatus,
  SortOption,
} from "@/types/order";
import type { FilterField } from "@/types/common";
import FilterPopover from "../FilterPopover";
import SortMenu from "../SortMenu";
import TabBar from "../TabBar";
import RefundTransferModal from "./RefundTransferModal";
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

// ── Status + payment indicators ───────────────────────────────────────────────

const STATUS_META: Record<
  OrderStatus,
  { label: string; dot: string; text: string; bar: string }
> = {
  Pending: {
    label: "Pending",
    dot: "bg-amber-500",
    text: "text-amber-700",
    bar: "bg-amber-400",
  },
  Preparing: {
    label: "Preparing",
    dot: "bg-orange-500",
    text: "text-orange-700",
    bar: "bg-orange-400",
  },
  Ready: {
    label: "Ready",
    dot: "bg-cyan-500",
    text: "text-cyan-700",
    bar: "bg-cyan-400",
  },
  OnTheWay: {
    label: "On the Way",
    dot: "bg-violet-500",
    text: "text-violet-700",
    bar: "bg-violet-400",
  },
  Shipped: {
    label: "Shipped",
    dot: "bg-blue-500",
    text: "text-blue-700",
    bar: "bg-blue-400",
  },
  Delivered: {
    label: "Delivered",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bar: "bg-emerald-400",
  },
  Cancelled: {
    label: "Cancelled",
    dot: "bg-rose-500",
    text: "text-rose-600",
    bar: "bg-gray-300",
  },
};

const PAYMENT_META: Record<
  PaymentStatus,
  { label: string; dot: string; text: string }
> = {
  Paid: { label: "Paid", dot: "bg-emerald-500", text: "text-emerald-700" },
  Awaiting: { label: "Awaiting", dot: "bg-amber-500", text: "text-amber-700" },
  Unpaid: { label: "Unpaid", dot: "bg-gray-300", text: "text-gray-500" },
};

function Indicator({
  dot,
  text,
  label,
}: {
  dot: string;
  text: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      <span className={cn("text-dash-body font-medium leading-none", text)}>
        {label}
      </span>
    </span>
  );
}

function MetaCell({
  label,
  align = "left",
  children,
}: {
  label: string;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("bg-white px-4 py-2.5", align === "right" && "text-right")}
    >
      <p className="mb-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      {children}
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
  // A manual-transfer payment held for the vendor to confirm blocks
  // fulfillment — they can only verify it (on the order page) or cancel.
  const awaitingPayment = order.payment === "Awaiting";
  const actionCfg = awaitingPayment
    ? null
    : isFood
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

  const statusMeta = STATUS_META[order.status];
  const paymentMeta = PAYMENT_META[order.payment];
  const showCancel = order.status === "Pending";
  const hasFooter = !!actionCfg || showCancel;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-300 hover:shadow-[0_2px_8px_rgba(2,51,55,0.06)]">
      {/* Status accent rail */}
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-[3px]", statusMeta.bar)}
      />

      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 text-dash-secondary font-semibold",
            order.product.color,
          )}
        >
          {order.product.image ? (
            <img
              src={order.product.image}
              alt={order.product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            order.product.initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-dash-heading font-semibold leading-snug text-[#023337]">
            {order.product.name}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-dash-caption text-gray-400">
            <span className="font-mono tracking-tight">{order.orderId}</span>
            <span className="h-0.5 w-0.5 rounded-full bg-gray-300" />
            <span>{order.date}</span>
          </div>
        </div>
        <button
          onClick={onView}
          title="View order"
          className="flex-shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#023337] cursor-pointer"
        >
          <Eye size={15} />
        </button>
      </div>

      {/* Meta strip — hairline-separated columns */}
      <div className="grid grid-cols-3 gap-px border-t border-gray-100 bg-gray-100">
        <MetaCell label="Status">
          <Indicator
            dot={statusMeta.dot}
            text={statusMeta.text}
            label={statusMeta.label}
          />
        </MetaCell>
        <MetaCell label="Payment">
          <Indicator
            dot={paymentMeta.dot}
            text={paymentMeta.text}
            label={paymentMeta.label}
          />
        </MetaCell>
        <MetaCell label="Total" align="right">
          <span className="text-dash-body font-bold leading-none text-[#023337]">
            ₦
            {order.price.toLocaleString("en-NG", {
              minimumFractionDigits: 2,
            })}
          </span>
        </MetaCell>
      </div>

      {/* Footer — actions */}
      {hasFooter && (
        <div className="border-t border-gray-100 p-3">
          {awaitingPayment && showCancel && (
            <div className="mb-2.5 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2">
              <Clock
                size={13}
                className="mt-0.5 flex-shrink-0 text-amber-500"
              />
              <p className="text-dash-caption leading-snug text-amber-700">
                Confirm payment before fulfilling — open the order to verify.
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            {actionCfg && (
              <button
                onClick={handlePrimaryClick}
                disabled={mutating}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#023337] py-2.5 text-dash-body font-semibold text-white transition-colors hover:bg-[#034950] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {mutating ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <actionCfg.icon size={15} />
                )}
                {actionCfg.label}
              </button>
            )}
            {showCancel && (
              <button
                onClick={onCancelClick}
                disabled={mutating}
                className={cn(
                  "flex items-center justify-center rounded-lg border border-gray-200 py-2.5 text-dash-body font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 cursor-pointer",
                  actionCfg ? "px-3.5" : "flex-1",
                )}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function OrderSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white animate-pulse"
        >
          <div className="flex items-start gap-3 p-4">
            <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-gray-200" />
            <div className="flex-1 space-y-2 pt-0.5">
              <div className="h-3 w-3/4 rounded bg-gray-200" />
              <div className="h-2.5 w-1/2 rounded bg-gray-100" />
            </div>
            <div className="h-6 w-6 rounded-md bg-gray-100" />
          </div>
          <div className="grid grid-cols-3 gap-px border-t border-gray-100 bg-gray-100">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="space-y-1.5 bg-white px-4 py-2.5">
                <div className="h-2 w-10 rounded bg-gray-100" />
                <div className="h-3 w-14 rounded bg-gray-200" />
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 p-3">
            <div className="h-9 rounded-lg bg-gray-100" />
          </div>
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

  // ── build query params ─────────────────────────────────────────────────────
  // Cursor-paged: no `page` here. Changing any of these starts a fresh
  // connection (new query key), so there's no page to reset.

  const queryParams = useMemo<Omit<OrderListParams, "page">>(() => {
    const { sort_by, sort_order } = SORT_MAP[sortBy];
    // The dropdown filter (orderStatus) overrides the active tab when set.
    const effectiveTab = (
      filters["orderStatus"] !== "all" ? filters["orderStatus"] : activeTab
    ) as OrderFilter;

    const params: Omit<OrderListParams, "page"> = {
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
  }, [sortBy, activeTab, debouncedSearch, filters]);

  // ── data ─────────────────────────────────────────────────────────────────

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.orders.stats,
    queryFn: fetchOrderStats,
  });
  const {
    data: listData,
    isLoading: ordersLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOrdersConnection(queryParams);
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

  const orders = listData?.pages.flatMap((p) => p.orders) ?? [];
  const allCount = stats?.totalOrders.value ?? 0;

  // ── handlers ─────────────────────────────────────────────────────────────

  function handleTabChange(tab: OrderFilter) {
    setActiveTab(tab);
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
    // "Awaiting" means the customer submitted a verified transfer receipt, so
    // cancelling may require sending the money back — route through the refund.
    if (
      cancelingOrder.payment === "Paid" ||
      cancelingOrder.payment === "Awaiting"
    ) {
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
        isPaid={
          cancelingOrder?.payment === "Paid" ||
          cancelingOrder?.payment === "Awaiting"
        }
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
              }}
              onReset={() => {
                setFilters(DEFAULT_FILTERS);
              }}
            />
            <SortMenu
              currentSort={sortBy}
              onSort={(option) => {
                setSortBy(option);
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

      {/* Load more (cursor-paged) */}
      {!ordersLoading && orders.length > 0 && hasNextPage && (
        <div className="bg-white sm:rounded-xl shadow-sm flex justify-center py-4 border-t border-gray-100">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 text-dash-body text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isFetchingNextPage && (
              <Loader2 size={16} className="animate-spin" />
            )}
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
