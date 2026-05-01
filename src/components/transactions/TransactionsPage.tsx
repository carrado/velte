"use client";

import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  MoreHorizontal,
  Link2,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  CreditCard,
} from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionTabFilter } from "@/types/transaction";

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
  Complete: { dot: "bg-green-500", text: "text-green-500" },
  Pending: { dot: "bg-yellow-400", text: "text-yellow-400" },
  Canceled: { dot: "bg-red-500", text: "text-red-500" },
} as const;

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
    <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-[#23272e]">{title}</p>
        <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
          <MoreVertical size={18} />
        </button>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-3xl font-bold text-[#023337]">{value}</p>
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

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<TransactionTabFilter>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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
    return matchesTab && matchesSearch;
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

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const tabs: { key: TransactionTabFilter; label: string }[] = [
    { key: "all", label: "All order" },
    { key: "completed", label: "Completed" },
    { key: "pending", label: "Pending" },
    { key: "canceled", label: "Canceled" },
  ];

  return (
    <div className="space-y-6">
      {/* Top row: stat cards + payment method */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 2×2 stat grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
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

        {/* Payment Method */}
        <div className="bg-white rounded-lg shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-[#23272e]">Payment Method</p>
            <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <MoreVertical size={18} />
            </button>
          </div>

          {/* Credit card visual */}
          <div className="relative rounded-xl p-4 text-white h-36 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700">
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -right-2 bottom-2 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
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

          {/* Card info */}
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

          {/* Actions */}
          <div className="flex gap-2 mt-auto pt-1">
            <button className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
              <Link2 size={15} />
              Generate Payment Link
            </button>
            <button className="border border-red-200 bg-red-50 text-red-500 rounded-lg px-3 py-2 text-sm hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap">
              Deactivate
            </button>
          </div>
        </div>
      </div>

      {/* Transaction table */}
      <div className="bg-white rounded-lg shadow-sm py-6 flex flex-col gap-6">
        {/* Controls */}
        <div className="flex items-center justify-between px-6 flex-wrap gap-3">
          {/* Status tabs */}
          <div className="bg-orange-50 flex items-center gap-0.5 p-1 rounded-lg flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer whitespace-nowrap",
                  activeTab === tab.key
                    ? "bg-white text-black font-medium shadow-sm"
                    : "text-gray-600 hover:text-gray-800",
                )}
              >
                {tab.key === "all" ? (
                  <>
                    All order{" "}
                    <span className="text-orange-500 font-bold text-xs">
                      ({MOCK_TRANSACTIONS.length})
                    </span>
                  </>
                ) : (
                  tab.label
                )}
              </button>
            ))}
          </div>

          {/* Search + filter buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 w-60">
              <input
                type="text"
                placeholder="Search payment history"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 min-w-0"
              />
              <Search size={16} className="text-gray-400 shrink-0" />
            </div>
            <button className="border border-gray-300 bg-white p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
              <SlidersHorizontal size={18} className="text-gray-600" />
            </button>
            <button className="border border-gray-300 bg-white p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
              <ArrowUpDown size={18} className="text-gray-600" />
            </button>
            <button className="border border-gray-300 bg-white p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
              <MoreHorizontal size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-orange-50">
                <th className="px-4 py-3 text-sm font-medium text-[#023337] text-center">
                  Customer Id
                </th>
                <th className="px-4 py-3 text-sm font-medium text-[#023337] text-center">
                  Name
                </th>
                <th className="px-4 py-3 text-sm font-medium text-[#023337] text-center">
                  Date
                </th>
                <th className="px-4 py-3 text-sm font-medium text-[#023337] text-center">
                  Total
                </th>
                <th className="px-4 py-3 text-sm font-medium text-[#023337] text-center">
                  Method
                </th>
                <th className="px-4 py-3 text-sm font-medium text-[#023337] text-center">
                  Status
                </th>
                <th className="px-4 py-3 text-sm font-medium text-[#023337] text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((tx) => {
                const s = STATUS_CONFIG[tx.status];
                return (
                  <tr
                    key={tx.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-center text-sm text-black">
                      {tx.customerId}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-black">
                      {tx.name}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-black">
                      {tx.date}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-black">
                      {tx.total}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-black">
                      {tx.method}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            s.dot,
                          )}
                        />
                        <span className={cn("text-sm", s.text)}>
                          {tx.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="text-sm text-indigo-500 hover:underline cursor-pointer">
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-sm text-gray-400"
                  >
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden px-4 space-y-3">
          {paginated.map((tx) => {
            const s = STATUS_CONFIG[tx.status];
            return (
              <div
                key={tx.id}
                className="border border-gray-100 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {tx.name}
                    </p>
                    <p className="text-xs text-gray-400">{tx.customerId}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", s.dot)} />
                    <span className={cn("text-xs font-medium", s.text)}>
                      {tx.status}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Date</p>
                    <p className="font-medium text-gray-700">{tx.date}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total</p>
                    <p className="font-medium text-gray-700">{tx.total}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Method</p>
                    <p className="font-medium text-gray-700">{tx.method}</p>
                  </div>
                </div>
                <button className="text-sm text-indigo-500 hover:underline cursor-pointer">
                  View Details
                </button>
              </div>
            );
          })}
          {paginated.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-400">
              No transactions found.
            </div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
