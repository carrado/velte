"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { transactionsListParamsFromUi } from "@/lib/transaction-list-params";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Info,
  ArrowUp,
  MoreVertical,
  Search,
  Link2,
  ArrowDown,
  CreditCard,
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
import PaymentLinkWarningModal from "./PaymentLinkWarningModal";
import { transactionService } from "@/services/transactions";
import type { PaymentLinkWarningVariant } from "@/types/transaction";
import { toast } from "sonner";
import { useOnboardingStore } from "@/store/onboardingStore";

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

const STAT_TOOLTIPS: Record<string, string> = {
  "Total Revenue":
    "Total revenue from all completed transactions to date. The change compares this week to last week.",
  "Completed Transactions":
    "All transactions successfully processed and completed to date. The change compares this week to last week.",
  "Pending Transactions":
    "Transactions initiated but still awaiting confirmation or processing.",
  "Failed Transactions":
    "Transactions that were attempted but failed or were canceled before completion.",
};

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
      <p className="text-dash-body text-gray-500">vs last week</p>
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
  const router = useRouter();
  const { id: userId } = useParams<{ id: string }>();
  const { currentStep, overlayPaused } = useOnboardingStore();
  const [activeTab, setActiveTab] = useState<TransactionTabFilter>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<TxSortOption>("newest");
  const [filters, setFilters] =
    useState<Record<string, string>>(DEFAULT_FILTERS);

  const queryClient = useQueryClient();

  // Modals
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);

  // Pause the onboarding overlay while the payment link modal is open so it
  // doesn't interfere with the modal. Resume when it closes (whether or not a
  // link was generated — completeStep(1) handles the step advance separately).
  useEffect(() => {
    const store = useOnboardingStore.getState();
    if (showPaymentLinkModal) {
      if (store.currentStep === 1) store.pauseOverlay();
    } else {
      store.resumeOverlay();
    }
  }, [showPaymentLinkModal]);
  const [warningModal, setWarningModal] =
    useState<PaymentLinkWarningVariant | null>(null);
  const [linkActionLoading, setLinkActionLoading] = useState(false);

  const sortMap: Record<
    TxSortOption,
    { sortBy: string; sortOrder: "asc" | "desc" }
  > = {
    newest: { sortBy: "date", sortOrder: "desc" },
    oldest: { sortBy: "date", sortOrder: "asc" },
    amount_asc: { sortBy: "total", sortOrder: "asc" },
    amount_desc: { sortBy: "total", sortOrder: "desc" },
  };

  const listParams = useMemo(() => {
    const { sortBy: sortField, sortOrder } = sortMap[sortBy];
    return transactionsListParamsFromUi({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      activeTab,
      search,
      sortBy: sortField,
      sortOrder,
      paymentMethod:
        filters.paymentMethod !== "all"
          ? (filters.paymentMethod as Transaction["method"])
          : undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    });
  }, [activeTab, search, currentPage, sortBy, filters]);

  const {
    data: listResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.transactions.list(listParams),
    queryFn: () => transactionService.getTransactions(listParams),
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (isError) toast.error("Failed to load transactions");
  }, [isError]);

  const transactions = listResponse?.transactions ?? [];
  const totalPages = listResponse?.pagination.totalPages ?? 1;
  const totalCount = listResponse?.pagination.total ?? 0;
  const stats = listResponse?.stats ?? {
    totalRevenue: "₦0",
    completedTransactions: 0,
    pendingTransactions: 0,
    failedTransactions: 0,
    revenueChange: "0%",
    completedChange: "0%",
    pendingChange: "0%",
    failedChange: "0%",
  };
  // A change string like "-8%" is a decrease. For most metrics up = good; for
  // failed transactions a decrease is the good (green) direction.
  const isUp = (change: string) => !change.trim().startsWith("-");

  const goToOrder = (orderId?: string | null) => {
    if (orderId) router.push(`/${userId}/orders/${orderId}`);
  };
  const paymentLink = listResponse?.paymentLink ?? null;
  const paymentLinkLoading = isLoading && !listResponse;
  const loading = isLoading && !listResponse;

  const handleTabChange = (tab: TransactionTabFilter) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const refreshPage = () => {
    setShowPaymentLinkModal(false);
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
  };

  const handlePaymentLinkWarningConfirm = async () => {
    if (!paymentLink || !warningModal) return;

    setLinkActionLoading(true);
    try {
      if (warningModal === "deactivate") {
        await transactionService.deactivatePaymentLink(paymentLink.id);
        toast.success("Payment link deactivated");
      } else {
        await transactionService.deletePaymentLink(paymentLink.id);
        toast.success("Payment link deleted");
      }
      setWarningModal(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    } catch {
      toast.error(
        warningModal === "deactivate"
          ? "Failed to deactivate payment link"
          : "Failed to delete payment link",
      );
    } finally {
      setLinkActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!paymentLink) return;

    setLinkActionLoading(true);
    try {
      await transactionService.reactivatePaymentLink(paymentLink.id);
      toast.success("Payment link reactivated");
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    } catch {
      toast.error("Failed to reactivate payment link");
    } finally {
      setLinkActionLoading(false);
    }
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
      cell: (t) =>
        t.orderId ? (
          <button
            onClick={() => goToOrder(t.orderId)}
            className="text-dash-body text-indigo-500 hover:underline cursor-pointer"
          >
            View Details
          </button>
        ) : (
          <span className="text-dash-body text-gray-300">—</span>
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
              positive={isUp(stats.revenueChange)}
              loading={loading}
            />
            <StatCard
              title="Completed Transactions"
              value={String(stats.completedTransactions)}
              change={stats.completedChange}
              positive={isUp(stats.completedChange)}
              loading={loading}
            />
            <StatCard
              title="Pending Transactions"
              value={String(stats.pendingTransactions)}
              change={stats.pendingChange}
              positive={isUp(stats.pendingChange)}
              loading={loading}
            />
            <StatCard
              title="Failed Transactions"
              value={String(stats.failedTransactions)}
              change={stats.failedChange}
              positive={!isUp(stats.failedChange)}
              loading={loading}
            />
          </div>
        </div>

        <div
          id="generate-link-section"
          className={cn(
            "lg:w-[360px] w-full flex-shrink-0",
            currentStep === 1 && overlayPaused && "relative z-[55]",
          )}
        >
          <div className="bg-white sm:rounded-lg shadow-sm p-5 flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <p className="text-dash-heading font-bold text-[#23272e]">
                Payment Method
              </p>
              <Tooltip>
                <TooltipTrigger>
                  <Info
                    size={15}
                    className="text-[#9CA3AF] cursor-pointer hover:text-orange-400 transition-colors"
                  />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[210px] text-center"
                >
                  <p>
                    Your active payment link and linked bank account used to
                    receive payments from customers.
                  </p>
                </TooltipContent>
              </Tooltip>
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
                  <span
                    className={cn(
                      "font-medium",
                      paymentLink.isActive
                        ? "text-green-500"
                        : "text-amber-600",
                    )}
                  >
                    {paymentLink.isActive ? "Active" : "Inactive"}
                  </span>
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
              {paymentLink && paymentLink.isActive && (
                <>
                  <button
                    type="button"
                    disabled={linkActionLoading}
                    onClick={() => setWarningModal("deactivate")}
                    className="flex-1 border border-red-200 bg-red-50 text-red-500 rounded-lg px-3 py-2 text-dash-body hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    Deactivate
                  </button>
                  <button
                    type="button"
                    disabled={linkActionLoading}
                    onClick={() => setWarningModal("delete")}
                    className="flex-1 border border-gray-300 text-gray-600 rounded-lg px-3 py-2 text-dash-body hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    Delete
                  </button>
                </>
              )}
              {paymentLink && !paymentLink.isActive && (
                <>
                  <button
                    type="button"
                    disabled={linkActionLoading}
                    onClick={handleReactivate}
                    className="flex-1 border border-green-200 bg-green-50 text-green-600 rounded-lg px-3 py-2 text-dash-body hover:bg-green-100 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    Reactivate
                  </button>
                  <button
                    type="button"
                    disabled={linkActionLoading}
                    onClick={() => setWarningModal("delete")}
                    className="flex-1 border border-gray-300 text-gray-600 rounded-lg px-3 py-2 text-dash-body hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    Delete
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
                  tx.orderId ? (
                    <button
                      onClick={() => goToOrder(tx.orderId)}
                      className="text-dash-body text-indigo-500 hover:underline cursor-pointer"
                    >
                      View Details
                    </button>
                  ) : null
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

      <GeneratePaymentLinkModal
        open={showPaymentLinkModal}
        onClose={() => refreshPage()}
      />

      <PaymentLinkWarningModal
        open={warningModal !== null}
        variant={warningModal ?? "deactivate"}
        loading={linkActionLoading}
        onClose={() => !linkActionLoading && setWarningModal(null)}
        onConfirm={handlePaymentLinkWarningConfirm}
      />
    </div>
  );
}
