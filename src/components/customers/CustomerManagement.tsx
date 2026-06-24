"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCustomers, fetchCustomerStats } from "@/services/customers";
import type { DayPoint } from "@/services/customers";
import { queryKeys } from "@/lib/query-keys";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, ArrowUp, ArrowDown, Search } from "lucide-react";
import { Pagination } from "../Pagination";
import type {
  Customer,
  CustomerFilter,
  CustomerSort,
  CustomerStatus,
} from "@/types/customer";
import type { ColumnDef, FilterField } from "@/types/common";
import TabBar from "../TabBar";
import DataTable from "../DataTable";
import MobileCard from "../MobileCard";
import FilterPopover from "../FilterPopover";
import SortMenu from "../SortMenu";
import { Input } from "../ui/input";

// Compact display for the overview cards: 1500 → "1.5k", 250000 → "250k".
function formatCompact(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m : m.toFixed(1)}m`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  return String(n);
}

const CY_START = 30;
const CH = 150;
const CX_START = 40;
const CW = 640;
const SVG_W = 700;
const SVG_H = 210;

const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAY: Record<string, string> = {
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
};
// Fallback while the stats query is loading, so the chart axes still render.
const EMPTY_WEEK: DayPoint[] = DAY_ORDER.map((day) => ({ day, value: 0 }));

function getX(i: number, len: number) {
  return CX_START + (i / Math.max(1, len - 1)) * CW;
}
function getY(value: number, maxVal: number) {
  return CY_START + (1 - value / maxVal) * CH;
}
function buildLinePath(data: DayPoint[], maxVal: number): string {
  const pts = data.map((d, i) => ({
    x: getX(i, data.length),
    y: getY(d.value, maxVal),
  }));
  return pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cpX = ((prev.x + pt.x) / 2).toFixed(1);
    return `${acc} C ${cpX} ${prev.y.toFixed(1)}, ${cpX} ${pt.y.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, "");
}
// Round the chart's top value up to a clean multiple of 5 so the five gridline
// steps are whole numbers; never below 5 so a quiet week still gets a sane axis.
function niceMax(v: number): number {
  return Math.max(5, Math.ceil(v / 5) * 5);
}

const STATUS_STYLES: Record<CustomerStatus, { dot: string; text: string }> = {
  Active: { dot: "bg-green-500", text: "text-green-600" },
  Inactive: { dot: "bg-red-500", text: "text-red-600" },
  VIP: { dot: "bg-amber-400", text: "text-amber-600" },
};

function StatusBadge({ status }: { status: CustomerStatus }) {
  const { dot, text } = STATUS_STYLES[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <span className={`text-dash-body ${text}`}>{status}</span>
    </span>
  );
}

const TABS: { key: CustomerFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

const SORT_OPTIONS: { value: CustomerSort; label: string }[] = [
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "orders_asc", label: "Orders low–high" },
  { value: "orders_desc", label: "Orders high–low" },
];

const DEFAULT_FILTERS: Record<string, string> = {
  startDate: "",
  endDate: "",
  status: "all",
};

const CUSTOMER_FILTER_FIELDS: FilterField[] = [
  {
    type: "select",
    key: "status",
    label: "Status",
    options: [
      { value: "all", label: "All" },
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" },
    ],
  },
];

const ITEMS_PER_PAGE = 10;

export default function CustomerManagement() {
  const { data: customers = [] } = useQuery({
    queryKey: queryKeys.customers.list,
    queryFn: fetchCustomers,
  });

  const { data: stats } = useQuery({
    queryKey: queryKeys.customers.stats,
    queryFn: fetchCustomerStats,
  });

  const [activeMetric, setActiveMetric] = useState(0);
  const [weekFilter, setWeekFilter] = useState<"this" | "last">("this");
  const [activeTab, setActiveTab] = useState<CustomerFilter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<CustomerSort>("name_asc");
  const [filters, setFilters] =
    useState<Record<string, string>>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const changeCurrentPage = (value: number) => {
    setCurrentPage(value);
    setTimeout(() => {
      tableContainerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  // New-customers-per-day for the selected week, with the scale, peak marker, and
  // axis labels all derived from the real values.
  const chartData: DayPoint[] =
    (weekFilter === "this" ? stats?.thisWeek : stats?.lastWeek) ?? EMPTY_WEEK;
  const peakIndex = chartData.reduce(
    (best, d, i, arr) => (d.value > arr[best].value ? i : best),
    0,
  );
  const peakValue = chartData[peakIndex].value;
  const maxVal = niceMax(Math.max(0, ...chartData.map((d) => d.value)));

  const linePath = buildLinePath(chartData, maxVal);
  const peakX = getX(peakIndex, chartData.length);
  const peakY = getY(peakValue, maxVal);
  const baseY = CY_START + CH;
  const areaPath = `${linePath} L ${(CX_START + CW).toFixed(1)} ${baseY} L ${CX_START.toFixed(1)} ${baseY} Z`;

  const ttW = 100;
  const ttH = 36;
  const ttArrowH = 8;
  const ttX = peakX - ttW / 2;
  const ttY = peakY - ttH - ttArrowH;
  // Six gridline labels, top (max) → bottom (0), as whole numbers.
  const yAxisLabels = Array.from({ length: 6 }, (_, i) =>
    formatCompact(Math.round((maxVal * (5 - i)) / 5)),
  );

  let filtered = customers.filter((c) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && c.status === "Active") ||
      (activeTab === "inactive" && c.status === "Inactive") ||
      (activeTab === "vip" && c.status === "VIP");
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q);
    const matchesStatusFilter =
      filters["status"] === "all" || c.status === filters["status"];
    return matchesTab && matchesSearch && matchesStatusFilter;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "name_asc") return a.name.localeCompare(b.name);
    if (sortBy === "name_desc") return b.name.localeCompare(a.name);
    if (sortBy === "orders_asc") return a.orders - b.orders;
    if (sortBy === "orders_desc") return b.orders - a.orders;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [activeTab, search, filters, sortBy]);

  const tabCounts: Record<CustomerFilter, number> = {
    all: customers.length,
    active: customers.filter((c) => c.status === "Active").length,
    inactive: customers.filter((c) => c.status === "Inactive").length,
    vip: customers.filter((c) => c.status === "VIP").length,
  };

  // Overview cards, computed from the live customer list. "Shop visitors" and
  // "conversion rate" need analytics we don't track here, so the cards show real
  // customer metrics instead of placeholder figures.
  const overviewMetrics = useMemo(() => {
    const totalOrders = customers.reduce((sum, c) => sum + (c.orders || 0), 0);
    const active = customers.filter((c) => c.status === "Active").length;
    const vip = customers.filter((c) => c.status === "VIP").length;
    return [
      { label: "Total customers", value: formatCompact(customers.length) },
      { label: "Active customers", value: formatCompact(active) },
      { label: "VIP customers", value: formatCompact(vip) },
      { label: "Total orders", value: formatCompact(totalOrders) },
    ];
  }, [customers]);

  // Top summary cards, computed from the live customer list + the new-customers
  // stats. (We don't track shop visitors, so that card is replaced by a real
  // "Active customers" figure rather than a placeholder.)
  const newThisWeek = (stats?.thisWeek ?? []).reduce((s, d) => s + d.value, 0);
  const newLastWeek = (stats?.lastWeek ?? []).reduce((s, d) => s + d.value, 0);
  const newGrowthPct =
    newLastWeek > 0
      ? Math.round(((newThisWeek - newLastWeek) / newLastWeek) * 100)
      : newThisWeek > 0
        ? 100
        : 0;
  const activeCustomers = customers.filter((c) => c.status === "Active").length;
  const activePct =
    customers.length > 0
      ? Math.round((activeCustomers / customers.length) * 100)
      : 0;

  const summaryCards: {
    title: string;
    value: string;
    caption: string;
    pct?: number;
  }[] = [
    {
      title: "Total customers",
      value: formatCompact(customers.length),
      caption: "All time",
    },
    {
      title: "New customers",
      value: formatCompact(newThisWeek),
      caption: "Last 7 days",
      pct: newGrowthPct,
    },
    {
      title: "Active customers",
      value: formatCompact(activeCustomers),
      caption: `${activePct}% of total`,
    },
  ];

  const columns: ColumnDef<Customer>[] = [
    {
      key: "id",
      header: "Customer ID",
      headerClassName: "text-center",
      className: "text-center",
      cell: (c) => c.code,
    },
    {
      key: "name",
      header: "Name",
      headerClassName: "text-center",
      className: "text-center",
      cell: (c) => c.name,
    },
    {
      key: "phone",
      header: "Phone",
      headerClassName: "text-center",
      className: "text-center",
      cell: (c) => c.phone,
    },
    {
      key: "orders",
      header: "Orders",
      headerClassName: "text-center",
      className: "text-center",
      cell: (c) => c.orders,
    },
    {
      key: "spend",
      header: "Total spend",
      headerClassName: "text-center",
      className: "text-center",
      cell: (c) => `₦${c.spend}`,
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "text-center",
      className: "text-center",
      cell: (c) => (
        <div className="flex justify-center">
          <StatusBadge status={c.status} />
        </div>
      ),
    },
  ];

  const CUSTOMER_STAT_TOOLTIPS: Record<string, string> = {
    "Total customers":
      "The total number of unique customers who have interacted with your store to date.",
    "New customers":
      "Customers who made their first purchase in the last 7 days.",
    "Active customers":
      "Customers currently marked active, as a share of your total customer base.",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 lg:w-[260px] lg:flex-shrink-0">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className="bg-white sm:rounded-lg shadow-sm p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-dash-body font-medium text-gray-700">
                  {card.title}
                </h3>
                <Tooltip>
                  <TooltipTrigger>
                    <Info
                      size={15}
                      className="text-[#9CA3AF] cursor-pointer hover:text-orange-400 transition-colors"
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-[200px] text-center"
                  >
                    <p>{CUSTOMER_STAT_TOOLTIPS[card.title]}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-dash-display font-bold text-[#023337]">
                  {card.value}
                </span>
                {card.pct !== undefined && (
                  <span
                    className={`flex items-center gap-0.5 text-dash-body font-medium ${
                      card.pct < 0 ? "text-red-500" : "text-orange-500"
                    }`}
                  >
                    {card.pct < 0 ? (
                      <ArrowDown size={13} />
                    ) : (
                      <ArrowUp size={13} />
                    )}
                    {Math.abs(card.pct)}%
                  </span>
                )}
              </div>
              <p className="text-dash-secondary text-gray-400">
                {card.caption}
              </p>
            </div>
          ))}
        </div>

        <div className="flex-1 bg-white sm:rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5">
            <h3 className="flex-1 text-dash-body font-medium text-gray-800">
              Customer overview
            </h3>
            <div className="flex items-center bg-orange-50 rounded-xl p-1 flex-shrink-0">
              {(["this", "last"] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setWeekFilter(w)}
                  className={`px-3 py-1.5 rounded-lg text-dash-secondary font-medium transition-colors cursor-pointer ${
                    weekFilter === w
                      ? "bg-white text-orange-500 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {w === "this" ? "This week" : "Last week"}
                </button>
              ))}
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Info
                  size={15}
                  className="text-[#9CA3AF] cursor-pointer hover:text-orange-400 transition-colors flex-shrink-0"
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-center">
                <p>
                  A weekly trend of customer activity including visits and
                  conversions across the selected period.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex overflow-x-auto mt-3 px-5 gap-1">
            {overviewMetrics.map((m, i) => (
              <button
                key={m.label}
                onClick={() => setActiveMetric(i)}
                className={`flex-shrink-0 flex flex-col gap-1 px-3 py-3 text-left border-b-2 transition-colors cursor-pointer min-w-[100px] ${
                  i === activeMetric
                    ? "border-orange-500 bg-orange-50/40"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-dash-heading font-bold text-gray-800">
                  {m.value}
                </span>
                <span className="text-dash-secondary text-gray-400 whitespace-nowrap">
                  {m.label}
                </span>
              </button>
            ))}
          </div>

          <div className="px-5 pb-4 pt-2 overflow-x-auto">
            <div style={{ minWidth: "380px" }}>
              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="w-full"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.15" />
                    <stop
                      offset="100%"
                      stopColor="#f97316"
                      stopOpacity="0.01"
                    />
                  </linearGradient>
                </defs>
                {yAxisLabels.map((label, i) => (
                  <text
                    key={label}
                    x="35"
                    y={CY_START + i * (CH / 5) + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#9ca3af"
                    fontFamily="sans-serif"
                  >
                    {label}
                  </text>
                ))}
                {Array.from({ length: 6 }, (_, i) => (
                  <line
                    key={i}
                    x1={CX_START}
                    y1={CY_START + i * (CH / 5)}
                    x2={CX_START + CW}
                    y2={CY_START + i * (CH / 5)}
                    stroke="#f3f4f6"
                    strokeWidth="1"
                  />
                ))}
                <path d={areaPath} fill="url(#areaGrad)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {peakValue > 0 && (
                  <>
                    <line
                      x1={peakX}
                      y1={peakY + 6}
                      x2={peakX}
                      y2={baseY}
                      stroke="#f97316"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                    <circle
                      cx={peakX}
                      cy={peakY}
                      r="4"
                      fill="white"
                      stroke="#f97316"
                      strokeWidth="2"
                    />
                    <rect
                      x={ttX}
                      y={ttY}
                      width={ttW}
                      height={ttH}
                      rx="6"
                      fill="#023337"
                    />
                    <polygon
                      points={`${peakX - 5},${ttY + ttH} ${peakX + 5},${ttY + ttH} ${peakX},${ttY + ttH + ttArrowH}`}
                      fill="#023337"
                    />
                    <text
                      x={peakX}
                      y={ttY + 14}
                      textAnchor="middle"
                      fill="white"
                      fontSize="9"
                      fontFamily="sans-serif"
                    >
                      {FULL_DAY[chartData[peakIndex].day]}
                    </text>
                    <text
                      x={peakX}
                      y={ttY + 27}
                      textAnchor="middle"
                      fill="white"
                      fontSize="11"
                      fontFamily="sans-serif"
                      fontWeight="600"
                    >
                      {peakValue.toLocaleString()} new
                    </text>
                  </>
                )}
                {chartData.map((d, i) => (
                  <text
                    key={d.day}
                    x={getX(i, chartData.length)}
                    y={SVG_H - 4}
                    textAnchor="middle"
                    fontSize="11"
                    fill={i === peakIndex ? "#023337" : "#9ca3af"}
                    fontWeight={i === peakIndex ? "600" : "400"}
                    fontFamily="sans-serif"
                  >
                    {d.day}
                  </text>
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={tableContainerRef}
        className="bg-white sm:rounded-lg shadow-sm overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:p-4 py-4 px-3 gap-3 border-b border-gray-100">
          <TabBar
            tabs={TABS.map((t) => ({
              ...t,
              count: t.key === "all" ? tabCounts.all : undefined,
            }))}
            activeTab={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
          />
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers"
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
              fields={CUSTOMER_FILTER_FIELDS}
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
          keyExtractor={(c) => c.id}
          emptyMessage="No customers found."
          mobileCard={(customer) => (
            <MobileCard
              title={customer.name}
              subtitle={customer.code}
              badge={<StatusBadge status={customer.status} />}
              fields={[
                { label: "Phone", value: customer.phone },
                { label: "Orders", value: customer.orders },
                { label: "Total spend", value: `₦${customer.spend}` },
              ]}
            />
          )}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={changeCurrentPage}
        />
      </div>
    </div>
  );
}
