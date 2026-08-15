"use client";

import { cn } from "@/lib/utils";

export type ListingKind = "all" | "product" | "service";

const OPTIONS: { value: ListingKind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "product", label: "Products" },
  { value: "service", label: "Services" },
];

// Listings-tab only. Cheaper and more useful than the category rail this
// replaces (see MarketplaceTabs's own comment) — every listing already has
// a real `kind`, so this needed no new data and no service-hiding edge case
// to solve (category filtering had to special-case services because
// categoryId is always null for them; kind IS the service/product split,
// so there's nothing to special-case here).
export function KindToggle({
  value,
  onChange,
}: {
  value: ListingKind;
  onChange: (value: ListingKind) => void;
}) {
  return (
    <div className="inline-flex p-1 bg-gray-100 rounded-xl shrink-0">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer",
            value === opt.value
              ? "bg-white text-orange-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
