"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@/types/common";

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  skeletonRows?: number;
  emptyMessage?: string;
  mobileCard: (row: T) => React.ReactNode;
  className?: string;
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  skeletonRows = 6,
  emptyMessage = "No data found.",
  mobileCard,
  className,
}: DataTableProps<T>) {
  return (
    <>
      {/* Desktop Table */}
      <div className={cn("hidden md:block p-4 overflow-x-auto", className)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-orange-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "text-left px-3 py-3 text-xs font-medium text-[#023337] whitespace-nowrap",
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="border-b border-[#e5e7eb] animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="py-3 px-3">
                      <div className="h-4 bg-gray-100 rounded w-full max-w-[100px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-sm text-[#6a717f]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={keyExtractor(row)}
                  className="border-b border-[#e5e7eb] last:border-0 hover:bg-gray-50 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-3 py-3 text-sm", col.className)}
                    >
                      {col.cell(row, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-4 animate-pulse h-32 bg-gray-50 border-b border-gray-100"
            />
          ))
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            {emptyMessage}
          </div>
        ) : (
          data.map((row) => (
            <React.Fragment key={keyExtractor(row)}>
              {mobileCard(row)}
            </React.Fragment>
          ))
        )}
      </div>
    </>
  );
}
