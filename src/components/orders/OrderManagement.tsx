"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Truck,
  Clock,
  XCircle,
  CheckCircle2,
  Settings,
  X,
  Filter,
} from "lucide-react";
import {
  fetchOrders,
  fetchOrderStats,
  updateOrderStatus,
} from "@/services/orders";
import type {
  Order,
  OrderFilter,
  OrderStatus,
  FilterState,
  SortOption,
  SettingsData,
} from "@/types/order";

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
    <div className="bg-white rounded-xl shadow-sm p-4 flex-1 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[#23272e]">{title}</p>
        <MoreHorizontal size={16} className="text-[#6a717f]" />
      </div>
      <p className="text-3xl font-bold text-[#023337] mb-1">
        {value.toLocaleString()}
      </p>
      <div className="text-xs text-[#6a717f] flex items-center gap-1">
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
          <span className="text-sm text-[#21c45d] font-medium">Delivered</span>
        </div>
      );
    case "Pending":
      return (
        <div className="flex items-center gap-1.5">
          <Clock size={15} className="text-[#f59f0a]" />
          <span className="text-sm text-[#f59f0a] font-medium">Pending</span>
        </div>
      );
    case "Shipped":
      return (
        <div className="flex items-center gap-1.5">
          <Truck size={15} className="text-[#374151]" />
          <span className="text-sm text-[#374151] font-medium">Shipped</span>
        </div>
      );
    case "Cancelled":
      return (
        <div className="flex items-center gap-1.5">
          <XCircle size={15} className="text-[#ef4343]" />
          <span className="text-sm text-[#ef4343] font-medium">Cancelled</span>
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
      <span className="text-sm text-[#111827]">{status}</span>
    </div>
  );
}

function RowActions({
  orderId,
  status,
  onMarkShipped,
  onMarkDelivered,
  onMarkCancelled,
}: {
  orderId: string;
  status: OrderStatus;
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

  if (status === "Delivered") return null;

  const getActions = () => {
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
  };

  const actions = getActions();
  if (actions.length === 0) return null;

  return (
    <div ref={ref} className="relative flex justify-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md hover:bg-orange-50 text-[#6a717f] hover:text-orange-500 transition-colors cursor-pointer"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-48 bg-white rounded-lg shadow-lg border border-[#e5e7eb] py-1 text-sm">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[#111827] hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer"
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
          <h3 className="text-lg font-semibold text-[#111827]">
            Confirm Shipment
          </h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-gray-600">
            Once marked as <strong>Shipped</strong>, this order cannot be
            cancelled. Are you sure you want to continue?
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600"
          >
            Yes, Mark as Shipped
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterPopover({
  filters,
  onApply,
  onReset,
}: {
  filters: FilterState;
  onApply: (newFilters: FilterState) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleApply = () => {
    onApply(localFilters);
    setOpen(false);
  };
  const handleReset = () => {
    const defaultFilters: FilterState = {
      startDate: "",
      endDate: "",
      paymentStatus: "all",
      orderStatus: "all",
    };
    setLocalFilters(defaultFilters);
    onReset();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 border border-[#d1d5db] rounded bg-white hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer"
      >
        <Filter size={18} className="text-[#6a717f]" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-40 w-80 bg-white rounded-lg shadow-lg border border-[#e5e7eb] p-4 text-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#023337] mb-1">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={localFilters.startDate}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      startDate: e.target.value,
                    })
                  }
                  className="flex-1 px-2 py-1.5 border border-[#e5e7eb] rounded text-sm"
                />
                <input
                  type="date"
                  value={localFilters.endDate}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      endDate: e.target.value,
                    })
                  }
                  className="flex-1 px-2 py-1.5 border border-[#e5e7eb] rounded text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#023337] mb-1">
                Payment Status
              </label>
              <select
                value={localFilters.paymentStatus}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    paymentStatus: e.target
                      .value as FilterState["paymentStatus"],
                  })
                }
                className="w-full px-2 py-1.5 border border-[#e5e7eb] rounded text-sm"
              >
                <option value="all">All</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#023337] mb-1">
                Order Status
              </label>
              <select
                value={localFilters.orderStatus}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    orderStatus: e.target.value as OrderFilter,
                  })
                }
                className="w-full px-2 py-1.5 border border-[#e5e7eb] rounded text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleReset}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                onClick={handleApply}
                className="flex-1 px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortMenu({
  currentSort,
  onSort,
}: {
  currentSort: SortOption;
  onSort: (option: SortOption) => void;
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

  const options: { value: SortOption; label: string }[] = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "price_asc", label: "Price low to high" },
    { value: "price_desc", label: "Price high to low" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 border border-[#d1d5db] rounded bg-white hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer"
      >
        <ArrowUpDown size={18} className="text-[#6a717f]" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-40 w-48 bg-white rounded-lg shadow-lg border border-[#e5e7eb] py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onSort(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-orange-50 transition-colors ${currentSort === opt.value ? "bg-orange-100 text-orange-600" : "text-[#111827]"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#e5e7eb] animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="py-3 px-3">
          <div className="h-4 bg-gray-100 rounded w-full max-w-[100px]" />
        </td>
      ))}
    </tr>
  );
}

function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsData;
  onSave: (newSettings: SettingsData) => void;
}) {
  const [localSettings, setLocalSettings] = useState<SettingsData>(settings);
  useEffect(() => {
    if (isOpen) setLocalSettings(settings);
  }, [isOpen, settings]);
  if (!isOpen) return null;
  const handleSave = () => {
    if (localSettings.minDurationDays < 0) localSettings.minDurationDays = 0;
    if (localSettings.maxDurationDays > 7) localSettings.maxDurationDays = 7;
    if (localSettings.minDurationDays > 2) localSettings.minDurationDays = 2;
    onSave(localSettings);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center h-full w-full bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-lg font-semibold text-[#111827]">
            Order Settings
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">
              Minimum duration (days)
            </label>
            <input
              type="number"
              min="0"
              max="2"
              value={localSettings.minDurationDays}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  minDurationDays: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-orange-400"
            />
            <p className="text-xs text-[#6a717f]">Cannot exceed 2 days</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">
              Maximum duration (days)
            </label>
            <input
              type="number"
              min="1"
              max="7"
              value={localSettings.maxDurationDays}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  maxDurationDays: parseInt(e.target.value) || 7,
                })
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-orange-400"
            />
            <p className="text-xs text-[#6a717f]">Cannot exceed 7 days</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">
              Delivery type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="deliveryType"
                  value="bulk"
                  checked={localSettings.deliveryType === "bulk"}
                  onChange={() =>
                    setLocalSettings({ ...localSettings, deliveryType: "bulk" })
                  }
                  className="accent-orange-500"
                />
                <span>Bulk deliveries</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="deliveryType"
                  value="single"
                  checked={localSettings.deliveryType === "single"}
                  onChange={() =>
                    setLocalSettings({
                      ...localSettings,
                      deliveryType: "single",
                    })
                  }
                  className="accent-orange-500"
                />
                <span>Single deliveries</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">
              Payment method for vendors
            </label>
            <select
              value={localSettings.paymentMethod}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  paymentMethod: e.target.value,
                })
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-orange-400"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="paypal">PayPal</option>
              <option value="stripe">Stripe</option>
              <option value="cash">Cash on Delivery</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkActionDropdown({
  selectedCount,
  allowedActions,
  onAction,
}: {
  selectedCount: number;
  allowedActions: { label: string; status: OrderStatus }[];
  onAction: (status: OrderStatus) => void;
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
  if (selectedCount === 0 || allowedActions.length === 0) return null;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2.5 text-sm font-bold"
      >
        <Plus size={18} /> Bulk Action ({selectedCount}){" "}
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 w-56 bg-white rounded-lg shadow-lg border py-1">
          {allowedActions.map((action) => (
            <button
              key={action.status}
              onClick={() => {
                onAction(action.status);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-orange-50 hover:text-orange-600"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
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
const DEFAULT_SETTINGS: SettingsData = {
  minDurationDays: 1,
  maxDurationDays: 7,
  deliveryType: "bulk",
  paymentMethod: "bank_transfer",
};

export default function OrderManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<OrderFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    paymentStatus: "all",
    orderStatus: "all",
  });
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [shippedModalOpen, setShippedModalOpen] = useState(false);
  const [pendingShippedOrderId, setPendingShippedOrderId] = useState<
    string | null
  >(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["orderStats"],
    queryFn: fetchOrderStats,
  });
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", activeTab],
    queryFn: () => fetchOrders(activeTab),
  });
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
  const bulkMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: OrderStatus }) =>
      Promise.all(ids.map((id) => updateOrderStatus(id, status))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedOrders(new Set());
    },
  });

  let filtered = orders.filter((o) => {
    const matchesSearch =
      o.orderId.toLowerCase().includes(search.toLowerCase()) ||
      o.product.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filters.startDate && new Date(o.date) < new Date(filters.startDate))
      return false;
    if (filters.endDate && new Date(o.date) > new Date(filters.endDate))
      return false;
    if (filters.paymentStatus !== "all" && o.payment !== filters.paymentStatus)
      return false;
    if (filters.orderStatus !== "all") {
      if (
        filters.orderStatus === "completed" &&
        !(o.status === "Delivered" || o.status === "Shipped")
      )
        return false;
      if (filters.orderStatus === "pending" && o.status !== "Pending")
        return false;
      if (filters.orderStatus === "cancelled" && o.status !== "Cancelled")
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
    setSelectedOrders(new Set());
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

  const selectedOrderObjects = paginated.filter((o) =>
    selectedOrders.has(o.id),
  );
  const selectedStatuses = selectedOrderObjects.map((o) => o.status);
  const allPending =
    selectedStatuses.length > 0 &&
    selectedStatuses.every((s) => s === "Pending");
  const allShipped =
    selectedStatuses.length > 0 &&
    selectedStatuses.every((s) => s === "Shipped");
  let bulkActions: { label: string; status: OrderStatus }[] = [];
  if (allPending)
    bulkActions = [
      { label: "Mark as Shipped", status: "Shipped" },
      { label: "Mark as Cancelled", status: "Cancelled" },
    ];
  else if (allShipped)
    bulkActions = [{ label: "Mark as Delivered", status: "Delivered" }];

  const handleBulkAction = (newStatus: OrderStatus) =>
    bulkMutation.mutate({ ids: Array.from(selectedOrders), status: newStatus });
  const toggleSelectAll = () => {
    if (selectedOrders.size === paginated.length) setSelectedOrders(new Set());
    else setSelectedOrders(new Set(paginated.map((o) => o.id)));
  };
  const toggleSelectOne = (id: string) => {
    const newSet = new Set(selectedOrders);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedOrders(newSet);
  };
  const handleSaveSettings = (newSettings: SettingsData) =>
    setSettings(newSettings);
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

  const MobileOrderCard = ({
    order,
    isSelected,
    onSelect,
  }: {
    order: Order;
    isSelected: boolean;
    onSelect: (id: string) => void;
  }) => {
    return (
      <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(order.id)}
              className="accent-orange-500 w-4 h-4"
            />
            <div
              className={`w-10 h-10 rounded border flex items-center justify-center text-xs font-bold ${order.product.color}`}
            >
              {order.product.initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {order.product.name}
              </p>
              <p className="text-xs text-gray-400">{order.orderId}</p>
            </div>
          </div>
          <RowActions
            orderId={order.id}
            status={order.status}
            onMarkShipped={() => handleMarkShipped(order.id)}
            onMarkDelivered={() => handleMarkDelivered(order.id)}
            onMarkCancelled={() => handleMarkCancelled(order.id)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
          <div>
            <p className="text-gray-400">Date</p>
            <p className="font-medium text-gray-700">{order.date}</p>
          </div>
          <div>
            <p className="text-gray-400">Price</p>
            <p className="font-medium text-gray-700">
              ${order.price.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Payment</p>
            <PaymentBadge status={order.payment} />
          </div>
          <div>
            <p className="text-gray-400">Status</p>
            <StatusBadge status={order.status} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-[#023337]"></h2>
        <div className="flex items-center gap-3">
          <BulkActionDropdown
            selectedCount={selectedOrders.size}
            allowedActions={bulkActions}
            onAction={handleBulkAction}
          />
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 border border-[#e5e7eb] bg-white hover:bg-orange-50 text-[#023337] rounded-lg px-4 py-2.5 text-sm font-bold"
          >
            <Settings size={18} /> Settings <ChevronDown size={15} />
          </button>
        </div>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
      <ShippedConfirmationModal
        isOpen={shippedModalOpen}
        onClose={() => setShippedModalOpen(false)}
        onConfirm={confirmMarkShipped}
      />

      <div className="flex gap-4 flex-wrap">
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

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 flex-wrap border-b border-[#e5e7eb]">
          <div className="grid grid-cols-2 gap-1 md:flex md:flex-row w-full md:w-auto bg-orange-50 rounded-lg p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-white text-[#111827] shadow-sm"
                    : "text-[#4b5563] hover:text-[#111827]"
                }`}
              >
                {tab.label}
                {tab.key === "all" && (
                  <span className="text-xs font-bold text-orange-500">
                    ({tabCounts.all})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search order report"
                className="pl-3 pr-9 py-2 text-sm bg-[#f9fafb] border border-[#e5e7eb] rounded-lg w-56"
              />
              <Search
                size={16}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6a717f]"
              />
            </div>
            <FilterPopover
              filters={filters}
              onApply={(newFilters) => {
                setFilters(newFilters);
                setPage(1);
              }}
              onReset={() => {
                setFilters({
                  startDate: "",
                  endDate: "",
                  paymentStatus: "all",
                  orderStatus: "all",
                });
                setPage(1);
              }}
            />
            <SortMenu
              currentSort={sortBy}
              onSort={(option) => {
                setSortBy(option);
                setPage(1);
              }}
            />
            <button className="p-2 border border-[#d1d5db] rounded bg-white hover:bg-orange-50 cursor-pointer">
              <MoreHorizontal size={18} className="text-[#6a717f]" />
            </button>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-orange-50">
                <th className="text-left px-4 py-3 w-16">
                  <input
                    type="checkbox"
                    checked={
                      paginated.length > 0 &&
                      selectedOrders.size === paginated.length
                    }
                    onChange={toggleSelectAll}
                    className="accent-orange-500"
                  />
                </th>
                <th className="text-left px-3 py-3 w-32">Order Id</th>
                <th className="text-left px-3 py-3 w-56">Product</th>
                <th className="text-left px-3 py-3 w-28">Date</th>
                <th className="text-left px-3 py-3 w-24">Price</th>
                <th className="text-left px-3 py-3 w-28">Payment</th>
                <th className="text-left px-3 py-3 w-32">Status</th>
                <th className="text-center px-3 py-3 w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6a717f]">
                    No orders found.
                  </td>
                </tr>
              ) : (
                paginated.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[#e5e7eb] last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleSelectOne(order.id)}
                        className="accent-orange-500"
                      />
                    </td>
                    <td className="px-3 py-3 font-medium">{order.orderId}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded border flex items-center justify-center text-xs font-bold ${order.product.color}`}
                        >
                          {order.product.initials}
                        </div>
                        <span className="leading-tight line-clamp-2 max-w-[160px]">
                          {order.product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">{order.date}</td>
                    <td className="px-3 py-3">${order.price.toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <PaymentBadge status={order.payment} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-3 py-3">
                      <RowActions
                        orderId={order.id}
                        status={order.status}
                        onMarkShipped={() => handleMarkShipped(order.id)}
                        onMarkDelivered={() => handleMarkDelivered(order.id)}
                        onMarkCancelled={() => handleMarkCancelled(order.id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3 p-4">
          {ordersLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-50 rounded-lg p-4 animate-pulse h-32"
              />
            ))
          ) : paginated.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              No orders found.
            </div>
          ) : (
            paginated.map((order) => (
              <MobileOrderCard
                key={order.id}
                order={order}
                isSelected={selectedOrders.has(order.id)}
                onSelect={toggleSelectOne}
              />
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-4 border-t border-[#e5e7eb]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white rounded-lg shadow-sm border disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from(
              { length: Math.min(totalPages, 5) },
              (_, i) => i + 1,
            ).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded text-sm font-medium ${page === p ? "bg-orange-200 text-[#023337] font-bold" : "border border-[#d1d5db] hover:bg-orange-50"}`}
              >
                {p}
              </button>
            ))}
            {totalPages > 5 && (
              <>
                <span className="px-1 text-[#6a717f]">...</span>
                <button
                  onClick={() => setPage(totalPages)}
                  className="w-9 h-9 rounded text-sm font-medium border hover:bg-orange-50"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white rounded-lg shadow-sm border disabled:opacity-40"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
