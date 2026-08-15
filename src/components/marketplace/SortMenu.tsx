"use client";

import { useRef, useState } from "react";
import { ArrowsDownUp, CaretDown, Check } from "@phosphor-icons/react";
import AnchoredPopover from "@/components/AnchoredPopover";
import { cn } from "@/lib/utils";

export type SortOrder = "relevance" | "price-asc" | "price-desc";

const OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

// Listings-tab only — vendors have no price to sort by. Uses AnchoredPopover
// (portals to document.body) rather than a plain absolute panel — this menu
// sits inside the toolbar row, which itself sits above a card grid; a bare
// absolutely-positioned panel would get clipped the moment any ancestor
// picks up an overflow rule, same reasoning as every other dropdown in the
// app (see AnchoredPopover's own comment).
//
// Trigger shows a fixed "Sort" label + icon (2026-08-16), not the live
// selected value — it used to show "Price: Low to High" etc. inline, which
// made the toolbar row visibly lopsided once anything but the short default
// ("Relevance") was picked, especially next to the search box on a narrower
// screen. The active option still shows a checkmark inside the open panel,
// so nothing about the current sort is actually hidden, just not spelled
// out on the closed trigger.
export function SortMenu({
  value,
  onChange,
}: {
  value: SortOrder;
  onChange: (value: SortOrder) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="shrink-0 inline-flex items-center gap-1.5 h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-gray-300 transition-colors cursor-pointer"
      >
        <ArrowsDownUp size={14} className="text-gray-400" />
        Sort
        <CaretDown
          size={12}
          className={cn(
            "text-gray-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <AnchoredPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="right"
      >
        <div className="w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm text-left text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors cursor-pointer"
            >
              {opt.label}
              {opt.value === value && (
                <Check size={14} className="text-orange-600 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </AnchoredPopover>
    </>
  );
}
