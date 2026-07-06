"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { walletApi } from "@/services/wallet";
import { queryKeys } from "@/lib/query-keys";
import { formatNaira, cn } from "@/lib/utils";
import DataTable from "@/components/DataTable";
import FilterPopover from "@/components/FilterPopover";
import { Pagination } from "@/components/Pagination";
import MobileCard from "@/components/MobileCard";
import type { ColumnDef, FilterField } from "@/types/common";
import type { WalletTransactionItem } from "@/types/wallet";

const DEFAULT_FILTERS = { type: "all", startDate: "", endDate: "" };

const TYPE_FILTER_FIELDS: FilterField[] = [
  {
    type: "select",
    key: "type",
    label: "Type",
    options: [
      { value: "all", label: "All" },
      { value: "topup", label: "Top-ups" },
      { value: "debit", label: "Lead charges" },
    ],
  },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
        <ArrowDownLeft size={13} />
      ) : (
        <ArrowUpRight size={13} className="text-red-500" />
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
    type: filters.type as "all" | "topup" | "debit",
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
        <FilterPopover
          values={filters}
          defaultValues={DEFAULT_FILTERS}
          fields={TYPE_FILTER_FIELDS}
          onApply={(f) => {
            setFilters({
              type: f.type ?? "all",
              startDate: f.startDate ?? "",
              endDate: f.endDate ?? "",
            });
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
