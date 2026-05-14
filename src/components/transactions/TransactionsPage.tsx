"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Link2,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  CreditCard,
  Search,
} from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { cn } from "@/lib/utils";
import type {
  PaymentLinkData,
  Transaction,
  TransactionTabFilter,
} from "@/types/transaction";
import type { ColumnDef, FilterField } from "@/types/common";
import FilterPopover from "../FilterPopover";
import SortMenu from "../SortMenu";
import TabBar from "../TabBar";
import DataTable from "../DataTable";
import MobileCard from "../MobileCard";
import { Input } from "../ui/input";
import GeneratePaymentLinkModal from "./GeneratePaymentLinkModal";
import { transactionService } from "@/services/transactions";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

const STATUS_CONFIG = {
  Complete: { dot: "bg-green-500", text: "text-green-600" },
  Pending: { dot: "bg-yellow-400", text: "text-yellow-600" },
  Canceled: { dot: "bg-red-500", text: "text-red-600" },
} as const;

type TxSortOption = "newest" | "oldest" | "amount_asc" | "amount_desc";

const SORT_OPTIONS: { value: TxSortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount_asc", label: "Amount low to high" },
  { value: "amount_desc", label: "Amount high to low" },
];

const DEFAULT_FILTERS: Record<string, string> = {
  startDate: "",
  endDate: "",
  paymentMethod: "all",
  txStatus: "all",
};

const TX_FILTER_FIELDS: FilterField[] = [
  {
    type: "select",
    key: "paymentMethod",
    label: "Payment Method",
    options: [
      { value: "all", label: "All" },
      { value: "CC", label: "Credit Card" },
      { value: "PayPal", label: "PayPal" },
      { value: "Bank", label: "Bank Transfer" },
    ],
  },
  {
    type: "select",
    key: "txStatus",
    label: "Transaction Status",
    options: [
      { value: "all", label: "All" },
      { value: "Complete", label: "Complete" },
      { value: "Pending", label: "Pending" },
      { value: "Canceled", label: "Canceled" },
    ],
  },
];

const TABS: { key: TransactionTabFilter; label: string }[] = [
  { key: "all", label: "All order" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "canceled", label: "Canceled" },
];

// ── Stat card (unchanged design) ─────────────────────────────────────────────

function StatCard({
  title,
  value,
  change,
  positive = true,
  loading = false,
}: {
  title: string;
  value: string;
  change: string;
  positive?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="bg-white sm:rounded-lg shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-dash-heading font-bold text-[#23272e]">{title}</p>
        <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
          <MoreVertical size={18} />
        </button>
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        {loading ? (
          <div className="h-8 w-24 bg-gray-100 animate-pulse rounded" />
        ) : (
          <>
            <p className="text-dash-display font-bold text-[#023337]">
              {value}
            </p>
            <div
              className={cn(
                "flex items-center text-dash-body font-medium mb-1",
                positive ? "text-green-500" : "text-red-500",
              )}
            >
              {positive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              {change}
            </div>
          </>
        )}
      </div>
      <p className="text-dash-body text-gray-500">Last 7 days</p>
    </div>
  );
}

// ── Status badge (unchanged design) ──────────────────────────────────────────

function TxStatusBadge({ status }: { status: Transaction["status"] }) {
  const s = STATUS_CONFIG[status];
  return (
    <div className="flex items-center justify-center gap-2">
      <div className={cn("w-2 h-2 rounded-full", s.dot)} />
      <span className={cn("text-dash-body", s.text)}>{status}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<TransactionTabFilter>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<TxSortOption>("newest");
  const [filters, setFilters] =
    useState<Record<string, string>>(DEFAULT_FILTERS);

  // Data state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentLink, setPaymentLink] = useState<PaymentLinkData | null>(null);
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: "$0",
    completedTransactions: 0,
    pendingTransactions: 0,
    failedTransactions: 0,
    revenueChange: "0%",
    completedChange: "0%",
    pendingChange: "0%",
    failedChange: "0%",
  });

  // Modal
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);

  // Map tab → status param
  const tabToStatus = {
    all: undefined,
    completed: "Complete" as const,
    pending: "Pending" as const,
    canceled: "Canceled" as const,
  };

  // Map sort option → sortBy + sortOrder
  const sortMap: Record<
    TxSortOption,
    { sortBy: string; sortOrder: "asc" | "desc" }
  > = {
    newest: { sortBy: "date", sortOrder: "desc" },
    oldest: { sortBy: "date", sortOrder: "asc" },
    amount_asc: { sortBy: "total", sortOrder: "asc" },
    amount_desc: { sortBy: "total", sortOrder: "desc" },
  };

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { sortBy: sortField, sortOrder } = sortMap[sortBy];
      const res = await transactionService.getTransactions({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        status: tabToStatus[activeTab],
        search: search || undefined,
        sortBy: sortField,
        sortOrder,
        paymentMethod:
          filters.paymentMethod !== "all"
            ? (filters.paymentMethod as Transaction["method"])
            : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });

      if (res.success) {
        setTransactions(res.data.transactions);
        setTotalPages(res.data.pagination.totalPages);
        setTotalCount(res.data.pagination.total);
        if (res.data.stats) setStats(res.data.stats);
        setPaymentLink(res.data.paymentLink || null);
        setPaymentLinkLoading(false);
      }
    } catch {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, currentPage, sortBy, filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleTabChange = (tab: TransactionTabFilter) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const refreshPage = () => {
    setShowPaymentLinkModal(false);
    fetchTransactions();
  };

  const columns: ColumnDef<Transaction>[] = [
    {
      key: "customerId",
      header: "Customer Id",
      headerClassName: "text-center",
      className: "text-center",
      cell: (t) => t.customerId,
    },
    {
      key: "name",
      header: "Name",
      headerClassName: "text-center",
      className: "text-center",
      cell: (t) => t.name,
    },
    {
      key: "date",
      header: "Date",
      headerClassName: "text-center",
      className: "text-center",
      cell: (t) => t.date,
    },
    {
      key: "total",
      header: "Total",
      headerClassName: "text-center",
      className: "text-center",
      cell: (t) => t.total,
    },
    {
      key: "method",
      header: "Method",
      headerClassName: "text-center",
      className: "text-center",
      cell: (t) => t.method,
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "text-center",
      className: "text-center",
      cell: (t) => <TxStatusBadge status={t.status} />,
    },
    {
      key: "action",
      header: "Action",
      headerClassName: "text-center",
      className: "text-center",
      cell: () => (
        <button className="text-dash-body text-indigo-500 hover:underline cursor-pointer">
          View Details
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Total Revenue"
              value={stats.totalRevenue}
              change={stats.revenueChange}
              positive
              loading={loading}
            />
            <StatCard
              title="Completed Transactions"
              value={String(stats.completedTransactions)}
              change={stats.completedChange}
              positive
              loading={loading}
            />
            <StatCard
              title="Pending Transactions"
              value={String(stats.pendingTransactions)}
              change={stats.pendingChange}
              positive
              loading={loading}
            />
            <StatCard
              title="Failed Transactions"
              value={String(stats.failedTransactions)}
              change={stats.failedChange}
              positive={false}
              loading={loading}
            />
          </div>
        </div>

        <div className="lg:w-[360px] w-full flex-shrink-0">
          <div className="bg-white sm:rounded-lg shadow-sm p-5 flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <p className="text-dash-heading font-bold text-[#23272e]">
                Payment Method
              </p>
              <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <MoreVertical size={18} />
              </button>
            </div>

            {/* Card visual */}
            <div className="relative rounded-xl p-4 text-white h-36 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700">
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
              <div className="absolute -right-2 bottom-2 w-20 h-20 rounded-full bg-white/10" />
              <div className="flex items-center justify-between relative z-10">
                <p className="text-dash-body font-semibold tracking-wide">
                  Payment Link
                </p>
                <CreditCard size={20} className="opacity-80" />
              </div>
              <div className="relative z-10">
                {paymentLinkLoading ? (
                  <div className="h-4 w-40 bg-white/20 animate-pulse rounded mb-2" />
                ) : paymentLink ? (
                  <p className="text-dash-body font-mono opacity-90 break-all leading-snug">
                    {paymentLink.url}
                  </p>
                ) : (
                  <p className="text-dash-body tracking-[0.18em] font-mono opacity-60">
                    •••• •••• •••• ••••
                  </p>
                )}
                <div className="flex justify-between mt-1 text-dash-caption opacity-70">
                  <span>
                    {paymentLink
                      ? paymentLink.accountName
                      : "No link generated"}
                  </span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-1.5 text-dash-body">
              <p>
                <span className="text-gray-500">Status: </span>
                {paymentLinkLoading ? (
                  <span className="inline-block h-3 w-12 bg-gray-100 animate-pulse rounded align-middle" />
                ) : paymentLink ? (
                  <span className="text-green-500 font-medium">Active</span>
                ) : (
                  <span className="text-gray-400 font-medium">Inactive</span>
                )}
              </p>
              <p>
                <span className="text-gray-500">Bank: </span>
                {paymentLinkLoading ? (
                  <span className="inline-block h-3 w-24 bg-gray-100 animate-pulse rounded align-middle" />
                ) : (
                  <span className="text-[#023337]">
                    {paymentLink ? paymentLink.bankName : "—"}
                  </span>
                )}
              </p>
              <p>
                <span className="text-gray-500">Account No: </span>
                {paymentLinkLoading ? (
                  <span className="inline-block h-3 w-24 bg-gray-100 animate-pulse rounded align-middle" />
                ) : (
                  <span className="text-[#023337]">
                    {paymentLink ? paymentLink.accountNumber : "—"}
                  </span>
                )}
              </p>
              {paymentLink && (
                <button
                  onClick={() =>
                    navigator.clipboard
                      .writeText(paymentLink.url)
                      .then(() => toast.success("Link copied!"))
                  }
                  className="text-indigo-500 hover:underline cursor-pointer text-left"
                >
                  Copy Link
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-1">
              {!paymentLink && (
                <button
                  onClick={() => setShowPaymentLinkModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 text-dash-body text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Link2 size={15} />
                  Generate Link
                </button>
              )}
              {paymentLink && (
                <>
                  <button className="border border-red-200 w-full bg-red-50 text-red-500 rounded-lg px-3 py-2 text-dash-body hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap">
                    Deactivate
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white sm:rounded-lg shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:p-4 py-4 px-3 gap-3 border-b border-gray-100">
          <TabBar
            tabs={TABS.map((t) => ({
              ...t,
              count: t.key === "all" ? totalCount : undefined,
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
                  setCurrentPage(1);
                }}
                placeholder="Search transactions"
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
              fields={TX_FILTER_FIELDS}
              onApply={(newFilters) => {
                setFilters(newFilters);
                setCurrentPage(1);
              }}
              onReset={() => {
                setFilters(DEFAULT_FILTERS);
                setCurrentPage(1);
              }}
            />
            <SortMenu
              currentSort={sortBy}
              onSort={(option) => {
                setSortBy(option);
                setCurrentPage(1);
              }}
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={transactions}
          keyExtractor={(t) => t.id}
          emptyMessage={loading ? "Loading…" : "No transactions found."}
          mobileCard={(tx) => {
            const s = STATUS_CONFIG[tx.status];
            return (
              <MobileCard
                title={tx.name}
                subtitle={tx.customerId}
                badge={
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", s.dot)} />
                    <span
                      className={cn("text-dash-secondary font-medium", s.text)}
                    >
                      {tx.status}
                    </span>
                  </div>
                }
                fields={[
                  { label: "Date", value: tx.date },
                  { label: "Total", value: tx.total },
                  { label: "Method", value: tx.method },
                ]}
                gridCols={3}
                footer={
                  <button className="text-dash-body text-indigo-500 hover:underline cursor-pointer">
                    View Details
                  </button>
                }
              />
            );
          }}
        />

        {totalPages > 1 && (
          <div className="px-4 py-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Generate Payment Link Modal */}
      <GeneratePaymentLinkModal
        open={showPaymentLinkModal}
        onClose={() => refreshPage()}
      />
    </div>
  );
}
