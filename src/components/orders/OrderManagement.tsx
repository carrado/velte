"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";
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
  MoreHorizontal,
  Eye,
} from "lucide-react";
import { Pagination } from "@/components/Pagination";
import {
  fetchOrders,
  fetchOrderStats,
  updateOrderStatus,
} from "@/services/orders";
import type {
  Order,
  OrderFilter,
  OrderRowMenuAction,
  OrderStatus,
  SortOption,
} from "@/types/order";
import type { ColumnDef, FilterField } from "@/types/common";
import FilterPopover from "../FilterPopover";
import SortMenu from "../SortMenu";
import TabBar from "../TabBar";
import DataTable from "../DataTable";
import MobileCard from "../MobileCard";
import { Input } from "../ui/input";

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

function RowActions({
  orderId,
  status,
  onView,
  onMarkShipped,
  onMarkDelivered,
  onMarkCancelled,
}: {
  orderId: string;
  status: OrderStatus;
  onView: () => void;
  onMarkShipped: () => void;
  onMarkDelivered: () => void;
  onMarkCancelled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const statusActions: OrderRowMenuAction[] = (() => {
    if (status === "Pending") {
      return [
        {
          label: "Mark as Shipped",
          icon: <Truck size={15} />,
          onClick: onMarkShipped,
        },
        {
          label: "Mark as Cancelled",
          icon: <XCircle size={15} />,
          onClick: onMarkCancelled,
        },
      ];
    }
    if (status === "Shipped") {
      return [
        {
          label: "Mark as Delivered",
          icon: <CheckCircle2 size={15} />,
          onClick: onMarkDelivered,
        },
      ];
    }
    return [];
  })();

  const allActions: OrderRowMenuAction[] = [
    {
      label: "View Order",
      icon: <Eye size={15} />,
      onClick: onView,
      highlight: false,
    },
    ...statusActions,
  ];

  return (
    <div ref={ref} className="relative flex justify-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md hover:bg-orange-50 text-[#6a717f] hover:text-orange-500 transition-colors cursor-pointer"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-52 bg-white rounded-lg shadow-lg border border-[#e5e7eb] py-1 text-dash-body">
          {allActions.map((action, i) => (
            <button
              key={action.label}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                action.highlight === true
                  ? "text-orange-600 hover:bg-orange-50 font-medium"
                  : "text-[#111827] hover:bg-orange-50 hover:text-orange-600"
              } ${i > 0 && i === 1 && statusActions.length > 0 ? "border-t border-gray-100 mt-1 pt-2.5" : ""}`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
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
    <div className="fixed inset-0 z-50 flex items-center h-full justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-dash-heading font-semibold text-[#111827]">
            Confirm Shipment
          </h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-dash-body text-gray-600">
            Once marked as <strong>Shipped</strong>, this order cannot be
            cancelled. Are you sure you want to continue?
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dash-body font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-dash-body font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600"
          >
            Yes, Mark as Shipped
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS: { key: OrderFilter; label: string }[] = [
  { key: "all", label: "All order" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 10;

const DEFAULT_FILTERS: Record<string, string> = {
  startDate: "",
  endDate: "",
  paymentStatus: "all",
  orderStatus: "all",
};

const ORDERS_FILTER_FIELDS: FilterField[] = [
  {
    type: "select",
    key: "paymentStatus",
    label: "Payment Status",
    options: [
      { value: "all", label: "All" },
      { value: "Paid", label: "Paid" },
      { value: "Unpaid", label: "Unpaid" },
    ],
  },
  {
    type: "select",
    key: "orderStatus",
    label: "Order Status",
    options: [
      { value: "all", label: "All" },
      { value: "pending", label: "Pending" },
      { value: "completed", label: "Completed" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price low to high" },
  { value: "price_desc", label: "Price high to low" },
];

export default function OrderManagement() {
  const pathname = usePathname();
  const userId = pathname.split("/").filter(Boolean)[0];
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<OrderFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] =
    useState<Record<string, string>>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [shippedModalOpen, setShippedModalOpen] = useState(false);
  const [pendingShippedOrderId, setPendingShippedOrderId] = useState<
    string | null
  >(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.orders.stats,
    queryFn: fetchOrderStats,
  });
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: queryKeys.orders.list(activeTab),
    queryFn: () => fetchOrders(activeTab),
  });
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  let filtered = orders.filter((o) => {
    const matchesSearch =
      o.orderId.toLowerCase().includes(search.toLowerCase()) ||
      o.product.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (
      filters["startDate"] &&
      new Date(o.date) < new Date(filters["startDate"])
    )
      return false;
    if (filters["endDate"] && new Date(o.date) > new Date(filters["endDate"]))
      return false;
    if (
      filters["paymentStatus"] !== "all" &&
      o.payment !== filters["paymentStatus"]
    )
      return false;
    if (filters["orderStatus"] !== "all") {
      if (
        filters["orderStatus"] === "completed" &&
        !(o.status === "Delivered" || o.status === "Shipped")
      )
        return false;
      if (filters["orderStatus"] === "pending" && o.status !== "Pending")
        return false;
      if (filters["orderStatus"] === "cancelled" && o.status !== "Cancelled")
        return false;
    } else if (activeTab !== "all") {
      if (
        activeTab === "completed" &&
        !(o.status === "Delivered" || o.status === "Shipped")
      )
        return false;
      if (activeTab === "pending" && o.status !== "Pending") return false;
      if (activeTab === "cancelled" && o.status !== "Cancelled") return false;
    }
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "newest")
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === "oldest")
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === "price_asc") return a.price - b.price;
    if (sortBy === "price_desc") return b.price - a.price;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleTabChange(tab: OrderFilter) {
    setActiveTab(tab);
    setPage(1);
    setFilters((prev) => ({ ...prev, orderStatus: "all" }));
  }

  const tabCounts: Record<OrderFilter, number> = {
    all: orders.length,
    completed: orders.filter(
      (o) => o.status === "Delivered" || o.status === "Shipped",
    ).length,
    pending: orders.filter((o) => o.status === "Pending").length,
    cancelled: orders.filter((o) => o.status === "Cancelled").length,
  };

  const handleMarkShipped = (orderId: string) => {
    setPendingShippedOrderId(orderId);
    setShippedModalOpen(true);
  };
  const confirmMarkShipped = () => {
    if (pendingShippedOrderId) {
      mutation.mutate({ id: pendingShippedOrderId, status: "Shipped" });
      setShippedModalOpen(false);
      setPendingShippedOrderId(null);
    }
  };
  const handleMarkDelivered = (orderId: string) =>
    mutation.mutate({ id: orderId, status: "Delivered" });
  const handleMarkCancelled = (orderId: string) =>
    mutation.mutate({ id: orderId, status: "Cancelled" });
  const handleViewOrder = (orderId: string) =>
    navigate(`/${userId}/orders/${orderId}`);

  const columns: ColumnDef<Order>[] = [
    {
      key: "orderId",
      header: "Order Id",
      cell: (o) => <span className="font-medium">{o.orderId}</span>,
    },
    {
      key: "product",
      header: "Product",
      cell: (o) => (
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded border flex items-center justify-center text-dash-caption font-bold ${o.product.color}`}
          >
            {o.product.initials}
          </div>
          <span className="leading-tight line-clamp-2 max-w-[160px]">
            {o.product.name}
          </span>
        </div>
      ),
    },
    { key: "date", header: "Date", cell: (o) => o.date },
    { key: "price", header: "Price", cell: (o) => `$${o.price.toFixed(2)}` },
    {
      key: "payment",
      header: "Payment",
      cell: (o) => <PaymentBadge status={o.payment} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-center",
      className: "text-center",
      cell: (o) => (
        <RowActions
          orderId={o.id}
          status={o.status}
          onView={() => handleViewOrder(o.id)}
          onMarkShipped={() => handleMarkShipped(o.id)}
          onMarkDelivered={() => handleMarkDelivered(o.id)}
          onMarkCancelled={() => handleMarkCancelled(o.id)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <ShippedConfirmationModal
        isOpen={shippedModalOpen}
        onClose={() => setShippedModalOpen(false)}
        onConfirm={confirmMarkShipped}
      />

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

      <div className="bg-white sm:rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 sm:p-4 py-4 px-3 flex-wrap border-b border-gray-100">
          <TabBar
            tabs={TABS.map((t) => ({
              ...t,
              count: t.key === "all" ? tabCounts.all : undefined,
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
                placeholder="Search order report"
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
              fields={ORDERS_FILTER_FIELDS}
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

        <DataTable
          columns={columns}
          data={paginated}
          keyExtractor={(o) => o.id}
          isLoading={ordersLoading}
          emptyMessage="No orders found."
          mobileCard={(order) => (
            <MobileCard
              title={order.product.name}
              subtitle={order.orderId}
              initials={{
                text: order.product.initials,
                className: order.product.color,
              }}
              action={
                <RowActions
                  orderId={order.id}
                  status={order.status}
                  onView={() => handleViewOrder(order.id)}
                  onMarkShipped={() => handleMarkShipped(order.id)}
                  onMarkDelivered={() => handleMarkDelivered(order.id)}
                  onMarkCancelled={() => handleMarkCancelled(order.id)}
                />
              }
              fields={[
                { label: "Date", value: order.date },
                { label: "Price", value: `$${order.price.toFixed(2)}` },
                {
                  label: "Payment",
                  value: <PaymentBadge status={order.payment} />,
                },
                {
                  label: "Status",
                  value: <StatusBadge status={order.status} />,
                },
              ]}
            />
          )}
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
