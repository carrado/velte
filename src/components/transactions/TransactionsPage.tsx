"use client";

import { useState } from "react";
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
import type { Transaction, TransactionTabFilter } from "@/types/transaction";
import type { ColumnDef, FilterField } from "@/types/common";
import FilterPopover from "../FilterPopover";
import SortMenu from "../SortMenu";
import TabBar from "../TabBar";
import DataTable from "../DataTable";
import MobileCard from "../MobileCard";
import { Input } from "../ui/input";

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    customerId: "#CUST001",
    name: "John Doe",
    date: "01-01-2025",
    total: "$2,904",
    method: "CC",
    status: "Complete",
  },
  {
    id: "2",
    customerId: "#CUST002",
    name: "John Doe",
    date: "01-01-2025",
    total: "$1,750",
    method: "PayPal",
    status: "Complete",
  },
  {
    id: "3",
    customerId: "#CUST003",
    name: "John Doe",
    date: "01-01-2025",
    total: "$3,410",
    method: "CC",
    status: "Complete",
  },
  {
    id: "4",
    customerId: "#CUST004",
    name: "John Doe",
    date: "01-01-2025",
    total: "$2,904",
    method: "Bank",
    status: "Complete",
  },
  {
    id: "5",
    customerId: "#CUST005",
    name: "Jane Smith",
    date: "01-01-2025",
    total: "$980",
    method: "CC",
    status: "Canceled",
  },
  {
    id: "6",
    customerId: "#CUST006",
    name: "Emily Davis",
    date: "01-01-2025",
    total: "$2,904",
    method: "PayPal",
    status: "Pending",
  },
  {
    id: "7",
    customerId: "#CUST007",
    name: "Jane Smith",
    date: "01-01-2025",
    total: "$1,320",
    method: "Bank",
    status: "Canceled",
  },
  {
    id: "8",
    customerId: "#CUST008",
    name: "John Doe",
    date: "01-01-2025",
    total: "$2,904",
    method: "CC",
    status: "Complete",
  },
  {
    id: "9",
    customerId: "#CUST009",
    name: "Emily Davis",
    date: "01-01-2025",
    total: "$2,904",
    method: "PayPal",
    status: "Pending",
  },
  {
    id: "10",
    customerId: "#CUST010",
    name: "Jane Smith",
    date: "01-01-2025",
    total: "$2,904",
    method: "Bank",
    status: "Canceled",
  },
  {
    id: "11",
    customerId: "#CUST011",
    name: "Robert Brown",
    date: "02-01-2025",
    total: "$1,520",
    method: "CC",
    status: "Complete",
  },
  {
    id: "12",
    customerId: "#CUST012",
    name: "Emily Davis",
    date: "02-01-2025",
    total: "$3,200",
    method: "PayPal",
    status: "Pending",
  },
  {
    id: "13",
    customerId: "#CUST013",
    name: "John Doe",
    date: "03-01-2025",
    total: "$875",
    method: "Bank",
    status: "Complete",
  },
  {
    id: "14",
    customerId: "#CUST014",
    name: "Jane Smith",
    date: "03-01-2025",
    total: "$4,100",
    method: "CC",
    status: "Canceled",
  },
  {
    id: "15",
    customerId: "#CUST015",
    name: "Robert Brown",
    date: "04-01-2025",
    total: "$2,250",
    method: "PayPal",
    status: "Complete",
  },
];

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

function StatCard({
  title,
  value,
  change,
  positive = true,
}: {
  title: string;
  value: string;
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white sm:rounded-lg shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-[#23272e]">{title}</p>
        <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
          <MoreVertical size={18} />
        </button>
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        <p className="text-2xl sm:text-3xl font-bold text-[#023337]">{value}</p>
        <div
          className={cn(
            "flex items-center text-sm font-medium mb-1",
            positive ? "text-green-500" : "text-red-500",
          )}
        >
          {positive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {change}
        </div>
      </div>
      <p className="text-sm text-gray-500">Last 7 days</p>
    </div>
  );
}

function TxStatusBadge({ status }: { status: Transaction["status"] }) {
  const s = STATUS_CONFIG[status];
  return (
    <div className="flex items-center justify-center gap-2">
      <div className={cn("w-2 h-2 rounded-full", s.dot)} />
      <span className={cn("text-sm", s.text)}>{status}</span>
    </div>
  );
}

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<TransactionTabFilter>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<TxSortOption>("newest");
  const [filters, setFilters] =
    useState<Record<string, string>>(DEFAULT_FILTERS);

  const filtered = MOCK_TRANSACTIONS.filter((t) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "completed" && t.status === "Complete") ||
      (activeTab === "pending" && t.status === "Pending") ||
      (activeTab === "canceled" && t.status === "Canceled");
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.customerId.toLowerCase().includes(q);
    const matchesMethod =
      filters["paymentMethod"] === "all" ||
      t.method === filters["paymentMethod"];
    const matchesTxStatus =
      filters["txStatus"] === "all" || t.status === filters["txStatus"];
    return matchesTab && matchesSearch && matchesMethod && matchesTxStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleTabChange = (tab: TransactionTabFilter) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const tabCounts = {
    all: MOCK_TRANSACTIONS.length,
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
        <button className="text-sm text-indigo-500 hover:underline cursor-pointer">
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
              value="$15,045"
              change="14.4%"
              positive
            />
            <StatCard
              title="Completed Transactions"
              value="3,150"
              change="20%"
              positive
            />
            <StatCard
              title="Pending Transactions"
              value="150"
              change="85%"
              positive
            />
            <StatCard
              title="Failed Transactions"
              value="75"
              change="15%"
              positive={false}
            />
          </div>
        </div>

        <div className="lg:w-[360px] w-full flex-shrink-0">
          <div className="bg-white sm:rounded-lg shadow-sm p-5 flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-[#23272e]">
                Payment Method
              </p>
              <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <MoreVertical size={18} />
              </button>
            </div>

            <div className="relative rounded-xl p-4 text-white h-36 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700">
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
              <div className="absolute -right-2 bottom-2 w-20 h-20 rounded-full bg-white/10" />
              <div className="flex items-center justify-between relative z-10">
                <p className="text-sm font-semibold tracking-wide">Finaci</p>
                <CreditCard size={20} className="opacity-80" />
              </div>
              <div className="relative z-10">
                <p className="text-sm tracking-[0.18em] font-mono opacity-80">
                  •••• •••• •••• 2345
                </p>
                <div className="flex justify-between mt-1 text-[11px] opacity-70">
                  <span>Naman Manzoor</span>
                  <span>02/30</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <p>
                <span className="text-gray-500">Status: </span>
                <span className="text-green-500 font-medium">Active</span>
              </p>
              <p>
                <span className="text-gray-500">Transactions: </span>
                <span className="text-[#023337]">1,250</span>
              </p>
              <p>
                <span className="text-gray-500">Revenue: </span>
                <span className="text-[#023337] font-bold">$50,000</span>
              </p>
              <button className="text-indigo-500 hover:underline cursor-pointer text-left">
                View Transactions
              </button>
            </div>

            <div className="flex gap-2 mt-auto pt-1">
              <button className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                <Link2 size={15} />
                Generate Link
              </button>
              <button className="border border-red-200 bg-red-50 text-red-500 rounded-lg px-3 py-2 text-sm hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap">
                Deactivate
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white sm:rounded-lg shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:p-4 py-4 px-3 gap-3 border-b border-gray-100">
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
                  setCurrentPage(1);
                }}
                placeholder="Search transactions"
                className="pl-3 pr-9 py-2 text-sm bg-[#f9fafb] border border-[#e5e7eb] rounded-lg w-full"
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
          data={paginated}
          keyExtractor={(t) => t.id}
          emptyMessage="No transactions found."
          mobileCard={(tx) => {
            const s = STATUS_CONFIG[tx.status];
            return (
              <MobileCard
                title={tx.name}
                subtitle={tx.customerId}
                badge={
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", s.dot)} />
                    <span className={cn("text-xs font-medium", s.text)}>
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
                  <button className="text-sm text-indigo-500 hover:underline cursor-pointer">
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
    </div>
  );
}
