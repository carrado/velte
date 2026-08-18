"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { walletApi } from "@/services/wallet";
import { queryKeys } from "@/lib/query-keys";
import { formatNaira, cn } from "@/lib/utils";
import DataTable from "@/components/DataTable";
import AnchoredPopover from "@/components/AnchoredPopover";
import { Pagination } from "@/components/Pagination";
import MobileCard from "@/components/MobileCard";
import type { ColumnDef } from "@/types/common";
import type { WalletTransactionItem } from "@/types/wallet";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CalendarIcon,
} from "@/components/icons";

type SpendFilters = { startDate: string; endDate: string };

const DEFAULT_FILTERS: SpendFilters = {
  startDate: "",
  endDate: "",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Short form for the trigger button's own label — "9 Jan" rather than the
// table's "9 Jan 2026", since the year is rarely needed to tell two ends of
// a filter range apart at a glance.
function fmtFilterDate(isoDateOnly: string) {
  return new Date(isoDateOnly).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

// Replaces the generic funnel-icon FilterPopover — a bare "Filter" icon gave
// no hint that date filtering was even available underneath it. This is a
// purpose-built date-range control (calendar icon + the selected range
// spelled out, e.g. "9 Jan – 15 Jan", or "All time" when unset) so the
// affordance actually reads as what it is.
function DateRangeFilter({
  value,
  onApply,
  onReset,
}: {
  value: SpendFilters;
  onApply: (next: SpendFilters) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<SpendFilters>(value);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const label =
    value.startDate && value.endDate
      ? `${fmtFilterDate(value.startDate)} – ${fmtFilterDate(value.endDate)}`
      : value.startDate
        ? `From ${fmtFilterDate(value.startDate)}`
        : value.endDate
          ? `Until ${fmtFilterDate(value.endDate)}`
          : "All time";

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => {
          setOpen((prev) => {
            const next = !prev;
            if (next) setLocal(value);
            return next;
          });
        }}
        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer text-dash-caption font-medium text-gray-600"
      >
        <CalendarIcon size={14} className="text-gray-400" />
        {label}
      </button>
      <AnchoredPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        align="right"
        className="sm:w-72 w-[300px] bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-dash-body"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-dash-secondary font-semibold text-[#023337] mb-1">
              Date Range
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={local.startDate}
                onChange={(e) =>
                  setLocal({ ...local, startDate: e.target.value })
                }
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-dash-body"
              />
              <input
                type="date"
                value={local.endDate}
                onChange={(e) =>
                  setLocal({ ...local, endDate: e.target.value })
                }
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-dash-body"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                setLocal(DEFAULT_FILTERS);
                onReset();
                setOpen(false);
              }}
              className="flex-1 px-3 py-1.5 text-dash-body border border-gray-300 rounded hover:bg-gray-50"
            >
              Reset
            </button>
            <button
              onClick={() => {
                onApply(local);
                setOpen(false);
              }}
              className="flex-1 px-3 py-1.5 text-dash-body bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Apply
            </button>
          </div>
        </div>
      </AnchoredPopover>
    </>
  );
}

function AmountCell({ item }: { item: WalletTransactionItem }) {
  const isCredit = item.type === "topup";
  return (
    <span
      className={cn(
        "flex items-center gap-1 font-semibold",
        isCredit ? "text-green-600" : "text-gray-700",
      )}
    >
      {isCredit ? (
        <ArrowDownLeftIcon size={13} />
      ) : (
        <ArrowUpRightIcon size={13} className="text-red-500" />
      )}
      {isCredit ? "+" : "-"}
      {formatNaira(item.amountKobo)}
    </span>
  );
}

export default function SpendHistoryTable() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const params = {
    page,
    limit: 15,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.wallet.transactions(params),
    queryFn: () => walletApi.getTransactions(params),
    staleTime: 30_000,
  });

  const items = data?.items ?? [];

  const columns: ColumnDef<WalletTransactionItem>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <span className="text-gray-500">{fmtDate(row.createdAt)}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => (
        <span className="text-gray-800">
          {row.description ?? (row.type === "topup" ? "Top-up" : "Lead charge")}
        </span>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      cell: (row) => (
        <span className="text-gray-500 capitalize">
          {row.channel?.replace("_", " ") ?? "—"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (row) => <AmountCell item={row} />,
    },
    {
      key: "balance",
      header: "Balance After",
      cell: (row) => (
        <span className="text-gray-500">
          {formatNaira(row.balanceAfterKobo)}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-none sm:rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-dash-heading font-semibold text-gray-900">
          Spend History
        </h2>
        <DateRangeFilter
          value={filters}
          onApply={(next) => {
            setFilters(next);
            setPage(1);
          }}
          onReset={() => {
            setFilters(DEFAULT_FILTERS);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No wallet activity yet."
        mobileCard={(row) => (
          <MobileCard
            title={
              row.description ??
              (row.type === "topup" ? "Top-up" : "Lead charge")
            }
            subtitle={fmtDate(row.createdAt)}
            badge={<AmountCell item={row} />}
            fields={[
              {
                label: "Channel",
                value: row.channel?.replace("_", " ") ?? "—",
              },
              {
                label: "Balance After",
                value: formatNaira(row.balanceAfterKobo),
              },
            ]}
          />
        )}
      />

      {data && data.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
