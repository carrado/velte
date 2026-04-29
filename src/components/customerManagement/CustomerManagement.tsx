"use client";

import { useState } from "react";
import {
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ArrowUp,
} from "lucide-react";
import { Pagination } from "../Pagination";

type CustomerStatus = "Active" | "Inactive" | "VIP";

interface Customer {
  id: string;
  name: string;
  phone: string;
  orders: number;
  spend: string;
  status: CustomerStatus;
}

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
      <span className={`text-sm ${text}`}>{status}</span>
    </span>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <div className="p-4 border-b border-gray-100 last:border-b-0">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-medium text-gray-900 text-sm">{customer.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{customer.id}</p>
        </div>
        <StatusBadge status={customer.status} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-400">Phone</p>
          <p className="text-sm font-medium text-gray-800 mt-0.5">
            {customer.phone}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Orders</p>
          <p className="text-sm font-medium text-gray-800 mt-0.5">
            {customer.orders}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Total spend</p>
          <p className="text-sm font-medium text-gray-800 mt-0.5">
            ${customer.spend}
          </p>
        </div>
      </div>
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer">
          <MessageSquare size={14} />
          Message
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer">
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
}

export default function CustomerManagement() {
  const [activeMetric, setActiveMetric] = useState(0);
  const [weekFilter, setWeekFilter] = useState<"this" | "last">("this");
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 24;

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

  return (
    <div className="space-y-4">
      {/* ── Top row ── */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 lg:w-[260px] lg:flex-shrink-0">
          {[
            { title: "Total customers", value: "11,040", pct: "14.4%" },
            { title: "New customers", value: "2,370", pct: "20%" },
            { title: "Visitors", value: "250k", pct: "20%" },
          ].map((card) => (
            <div key={card.title} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">
                  {card.title}
                </h3>
                <MoreVertical size={15} className="text-gray-400" />
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-[#023337]">
                  {card.value}
                </span>
                <span className="flex items-center gap-0.5 text-sm font-medium text-orange-500">
                  <ArrowUp size={13} />
                  {card.pct}
                </span>
              </div>
              <p className="text-xs text-gray-400">Last 7 days</p>
            </div>
          ))}
        </div>

        {/* Customer overview chart */}
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-5 pt-5">
            <h3 className="flex-1 text-sm font-medium text-gray-800">
              Customer overview
            </h3>
            <div className="flex items-center bg-orange-50 rounded-xl p-1 flex-shrink-0">
              {(["this", "last"] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setWeekFilter(w)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
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

          {/* Metric tabs */}
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
                <span className="text-lg font-bold text-gray-800">
                  {m.value}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {m.label}
                </span>
              </button>
            ))}
          </div>

          {/* SVG Chart */}
          <div className="px-4 pb-4 pt-2 overflow-x-auto">
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

                {/* Y-axis labels */}
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

                {/* Grid lines */}
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

                {/* Area fill */}
                <path d={areaPath} fill="url(#areaGrad)" />

                {/* Line */}
                <path
                  d={linePath}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Vertical dashed line at peak */}
                <line
                  x1={peakX}
                  y1={peakY + 6}
                  x2={peakX}
                  y2={baseY}
                  stroke="#f97316"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />

                {/* Peak dot */}
                <circle
                  cx={peakX}
                  cy={peakY}
                  r="4"
                  fill="white"
                  stroke="#f97316"
                  strokeWidth="2"
                />

                {/* Tooltip */}
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

                {/* X-axis labels */}
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

      {/* ── Customer list ── */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Desktop table — hidden on mobile */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-orange-50">
                {[
                  "Customer ID",
                  "Name",
                  "Phone",
                  "Orders",
                  "Total spend",
                  "Status",
                  "Action",
                ].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-xs font-medium text-[#023337] text-center whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, idx) => (
                <tr
                  key={customer.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    idx < customers.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-gray-700 text-center">
                    {customer.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center">
                    {customer.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center">
                    {customer.phone}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center">
                    {customer.orders}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center">
                    ${customer.spend}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex justify-center">
                      <StatusBadge status={customer.status} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                        aria-label="Message customer"
                      >
                        <MessageSquare size={16} />
                      </button>
                      <button
                        className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        aria-label="Delete customer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards — hidden on sm+ */}
        <div className="sm:hidden divide-y divide-gray-100">
          {customers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
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
