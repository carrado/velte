"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, ArrowUp, MoreVertical, Search } from "lucide-react";
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

const customers: Customer[] = [
  {
    id: "#CUST001",
    name: "John Doe",
    phone: "+1234567890",
    orders: 25,
    spend: "3,450.00",
    status: "Active",
  },
  {
    id: "#CUST002",
    name: "John Doe",
    phone: "+1234567890",
    orders: 25,
    spend: "3,450.00",
    status: "Active",
  },
  {
    id: "#CUST003",
    name: "John Doe",
    phone: "+1234567890",
    orders: 25,
    spend: "3,450.00",
    status: "Active",
  },
  {
    id: "#CUST004",
    name: "John Doe",
    phone: "+1234567890",
    orders: 25,
    spend: "3,450.00",
    status: "Active",
  },
  {
    id: "#CUST005",
    name: "Jane Smith",
    phone: "+1234567890",
    orders: 5,
    spend: "250.00",
    status: "Inactive",
  },
  {
    id: "#CUST006",
    name: "Emily Davis",
    phone: "+1234567890",
    orders: 30,
    spend: "4,600.00",
    status: "VIP",
  },
  {
    id: "#CUST007",
    name: "Jane Smith",
    phone: "+1234567890",
    orders: 5,
    spend: "250.00",
    status: "Inactive",
  },
  {
    id: "#CUST008",
    name: "John Doe",
    phone: "+1234567890",
    orders: 25,
    spend: "3,450.00",
    status: "Active",
  },
  {
    id: "#CUST009",
    name: "Emily Davis",
    phone: "+1234567890",
    orders: 30,
    spend: "4,600.00",
    status: "VIP",
  },
  {
    id: "#CUST010",
    name: "Jane Smith",
    phone: "+1234567890",
    orders: 5,
    spend: "250.00",
    status: "Inactive",
  },
];

const overviewMetrics = [
  { label: "Active customers", value: "25k" },
  { label: "Repeat customers", value: "5.6k" },
  { label: "Shop visitors", value: "250k" },
  { label: "Conversion rate", value: "5.5%" },
];

const chartData = [
  { day: "Sun", value: 19000 },
  { day: "Mon", value: 22000 },
  { day: "Tue", value: 28000 },
  { day: "Wed", value: 35000 },
  { day: "Thu", value: 45000 },
  { day: "Fri", value: 32000 },
  { day: "Sat", value: 38000 },
];

const CY_START = 30;
const CH = 150;
const CX_START = 40;
const CW = 640;
const MAX_VAL = 50000;
const SVG_W = 700;
const SVG_H = 210;
const PEAK_INDEX = 4;

function getX(i: number) {
  return CX_START + (i / (chartData.length - 1)) * CW;
}
function getY(value: number) {
  return CY_START + (1 - value / MAX_VAL) * CH;
}
function buildLinePath(): string {
  const pts = chartData.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
  return pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cpX = ((prev.x + pt.x) / 2).toFixed(1);
    return `${acc} C ${cpX} ${prev.y.toFixed(1)}, ${cpX} ${pt.y.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, "");
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
  { key: "vip", label: "VIP" },
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
      { value: "VIP", label: "VIP" },
    ],
  },
];

const ITEMS_PER_PAGE = 10;

export default function CustomerManagement() {
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

  const linePath = buildLinePath();
  const peakX = getX(PEAK_INDEX);
  const peakY = getY(chartData[PEAK_INDEX].value);
  const baseY = CY_START + CH;
  const areaPath = `${linePath} L ${(CX_START + CW).toFixed(1)} ${baseY} L ${CX_START.toFixed(1)} ${baseY} Z`;

  const ttW = 88;
  const ttH = 36;
  const ttArrowH = 8;
  const ttX = peakX - ttW / 2;
  const ttY = peakY - ttH - ttArrowH;
  const yAxisLabels = ["50k", "40k", "30k", "20k", "10k", "0k"];

  let filtered = customers.filter((c) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && c.status === "Active") ||
      (activeTab === "inactive" && c.status === "Inactive") ||
      (activeTab === "vip" && c.status === "VIP");
    const q = search.toLowerCase();
    const matchesSearch =
      !q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
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

  const columns: ColumnDef<Customer>[] = [
    {
      key: "id",
      header: "Customer ID",
      headerClassName: "text-center",
      className: "text-center",
      cell: (c) => c.id,
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
      cell: (c) => `$${c.spend}`,
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
    {
      key: "action",
      header: "Action",
      headerClassName: "text-center",
      className: "text-center",
      cell: () => (
        <button
          className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
          aria-label="Message customer"
        >
          <MessageSquare size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 lg:w-[260px] lg:flex-shrink-0">
          {[
            { title: "Total customers", value: "11,040", pct: "14.4%" },
            { title: "New customers", value: "2,370", pct: "20%" },
            { title: "Visitors", value: "250k", pct: "20%" },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-white sm:rounded-lg shadow-sm p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-dash-body font-medium text-gray-700">
                  {card.title}
                </h3>
                <MoreVertical size={15} className="text-gray-400" />
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-dash-display font-bold text-[#023337]">
                  {card.value}
                </span>
                <span className="flex items-center gap-0.5 text-dash-body font-medium text-orange-500">
                  <ArrowUp size={13} />
                  {card.pct}
                </span>
              </div>
              <p className="text-dash-secondary text-gray-400">Last 7 days</p>
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
            <MoreVertical size={15} className="text-gray-400 flex-shrink-0" />
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
                  Thursday
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
                  45,000
                </text>
                {chartData.map((d, i) => (
                  <text
                    key={d.day}
                    x={getX(i)}
                    y={SVG_H - 4}
                    textAnchor="middle"
                    fontSize="11"
                    fill={i === PEAK_INDEX ? "#023337" : "#9ca3af"}
                    fontWeight={i === PEAK_INDEX ? "600" : "400"}
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
              subtitle={customer.id}
              badge={<StatusBadge status={customer.status} />}
              fields={[
                { label: "Phone", value: customer.phone },
                { label: "Orders", value: customer.orders },
                { label: "Total spend", value: `$${customer.spend}` },
              ]}
              footer={
                <button className="flex items-center gap-1.5 py-2 px-3 rounded-lg border border-gray-200 text-dash-secondary text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer">
                  <MessageSquare size={14} />
                  Message
                </button>
              }
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
