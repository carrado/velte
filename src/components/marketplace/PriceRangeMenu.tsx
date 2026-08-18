"use client";

import { useRef, useState } from "react";
import AnchoredPopover from "@/components/AnchoredPopover";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, TagIcon } from "@/components/icons";

export interface PriceRange {
  min: number | null;
  max: number | null;
}

// Listings-tab only — vendors have no price. Same compact-trigger pattern
// as SortMenu (fixed "Price" label, not the live values — two numbers
// would make this at least as wide as the "Price: Low to High" label that
// prompted SortMenu's own fix); the trigger just tints orange when a range
// is actually active, same as a filled filter icon would.
export function PriceRangeMenu({
  value,
  onChange,
}: {
  value: PriceRange;
  onChange: (value: PriceRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  // Draft state, separate from the applied `value` — typing a min/max
  // shouldn't re-filter the grid on every keystroke; only Apply commits it.
  const [minDraft, setMinDraft] = useState(value.min?.toString() ?? "");
  const [maxDraft, setMaxDraft] = useState(value.max?.toString() ?? "");
  const active = value.min != null || value.max != null;

  function apply() {
    const min = minDraft.trim() ? Number(minDraft) : null;
    const max = maxDraft.trim() ? Number(maxDraft) : null;
    onChange({ min, max });
    setOpen(false);
  }

  function clear() {
    setMinDraft("");
    setMaxDraft("");
    onChange({ min: null, max: null });
    setOpen(false);
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "shrink-0 inline-flex items-center gap-1.5 h-11 px-3.5 rounded-xl border text-sm font-semibold transition-colors cursor-pointer",
          active
            ? "border-orange-300 bg-orange-50 text-orange-700"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
        )}
      >
        <TagIcon
          size={14}
          className={active ? "text-orange-500" : "text-gray-400"}
        />
        Price
        <ChevronDownIcon
          size={12}
          className={cn(
            "transition-transform",
            active ? "text-orange-400" : "text-gray-400",
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
        <div className="w-64 bg-white rounded-xl border border-gray-200 shadow-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Price range (₦)
          </p>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={minDraft}
              onChange={(e) => setMinDraft(e.target.value)}
              placeholder="Min"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
            <span className="text-gray-300 shrink-0">–</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={maxDraft}
              onChange={(e) => setMaxDraft(e.target.value)}
              placeholder="Max"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clear}
              className="flex-1 h-9 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={apply}
              className="flex-1 h-9 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      </AnchoredPopover>
    </>
  );
}
