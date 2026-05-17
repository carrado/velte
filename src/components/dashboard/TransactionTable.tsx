"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTransactions, type Transaction } from "@/services/dashboard";

function StatusBadge({ status }: { status: Transaction["status"] }) {
  if (status === "Paid") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] inline-block" />
        <span className="text-dash-caption text-[#22C55E] font-medium">
          Paid
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] inline-block" />
      <span className="text-dash-caption text-[#F59E0B] font-medium">
        Pending
      </span>
    </div>
  );
}

export default function TransactionTable() {
  const { data, isLoading } = useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
  });

  return (
    <div className="bg-white sm:rounded-2xl shadow-sm sm:p-5 py-5 px-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-dash-heading font-semibold text-[#111827]">
          Transaction
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-dash-caption">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              <th className="text-left pb-3 text-[#9CA3AF] font-medium">No</th>
              <th className="text-left pb-3 text-[#9CA3AF] font-medium">Id</th>
              <th className="text-left pb-3 text-[#9CA3AF] font-medium">
                Order Date
              </th>
              <th className="text-left pb-3 text-[#9CA3AF] font-medium">
                Status
              </th>
              <th className="text-right pb-3 text-[#9CA3AF] font-medium">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#E5E7EB] animate-pulse"
                  >
                    <td className="py-3">
                      <div className="h-3 bg-gray-200 rounded w-4" />
                    </td>
                    <td className="py-3">
                      <div className="h-3 bg-gray-200 rounded w-16" />
                    </td>
                    <td className="py-3">
                      <div className="h-3 bg-gray-200 rounded w-28" />
                    </td>
                    <td className="py-3">
                      <div className="h-3 bg-gray-200 rounded w-12" />
                    </td>
                    <td className="py-3 text-right">
                      <div className="h-3 bg-gray-200 rounded w-10 ml-auto" />
                    </td>
                  </tr>
                ))
              : (data ?? []).map((tx, index) => (
                  <tr
                    key={`${tx.id}-${index}`}
                    className="border-b border-[#E5E7EB] last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 text-[#6B7280]">{index + 1}</td>
                    <td className="py-3 font-medium text-[#111827] underline">
                      {tx.id}
                    </td>
                    <td className="py-3 text-[#6B7280]">{tx.date}</td>
                    <td className="py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="py-3 text-right font-semibold text-[#111827]">
                      ${tx.amount}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
