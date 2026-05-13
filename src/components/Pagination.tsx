"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import type { PaginationProps } from "@/types/common";

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const getPageNumbers = () => {
    if (totalPages <= 1) return [];

    if (!isDesktop) {
      if (totalPages <= 3) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }
      if (currentPage === totalPages) {
        return [currentPage];
      }
      return [currentPage, "...", totalPages];
    }

    const maxVisible = 6;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = startPage + maxVisible - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    const visiblePages: (number | string)[] = [];
    for (let i = startPage; i <= endPage; i++) {
      visiblePages.push(i);
    }

    if (startPage > 1) {
      if (startPage > 2) visiblePages.unshift("...");
      visiblePages.unshift(1);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) visiblePages.push("...");
      visiblePages.push(totalPages);
    }

    return visiblePages;
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1) return null;

  return (
    <div
      className={cn(
        // Full width, no wrap, horizontal scroll if needed
        "flex items-center justify-between px-2 sm:px-4 py-4 gap-1 sm:gap-2 border-t border-gray-100 overflow-x-auto",
        "flex-nowrap",
        className,
      )}
    >
      {/* Previous button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 bg-white rounded-lg border border-gray-200 text-dash-body text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">Previous</span>
        <span className="sm:hidden">Prev</span>
      </button>

      {/* Page numbers section – also flex-nowrap */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap flex-shrink-0">
        {pageNumbers.map((page, idx) =>
          page === "..." ? (
            <span
              key={`dots-${idx}`}
              className="w-6 sm:w-8 h-8 flex items-center justify-center text-dash-body font-medium text-[#023337]"
            >
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={cn(
                "w-6 sm:w-8 h-8 flex items-center justify-center rounded text-dash-body transition-colors cursor-pointer",
                currentPage === page
                  ? "bg-orange-200 text-[#023337] font-medium"
                  : "border border-gray-200 text-[#023337] hover:bg-gray-50",
              )}
            >
              {page}
            </button>
          ),
        )}
      </div>

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 bg-white rounded-lg border border-gray-200 text-dash-body text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
      >
        <span className="hidden sm:inline">Next</span>
        <span className="sm:hidden">Next</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
