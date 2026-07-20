"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { SECTOR_TAXONOMY, SECTOR_BY_VALUE } from "@/lib/sectors";
import { cn } from "@/lib/utils";

export const MAX_SECTORS = 5;

/** Grouped, capped multi-select chip picker over the sector taxonomy —
 * selection is by slug (SectorLeaf.value), display by label. Shared between
 * signup (the canonical entry point for a vendor's sectors) and the Store
 * editor (the edit surface for that same list), so they're visibly the same
 * picker. Extracted from what used to be StorePage.tsx's own bespoke chip UI.
 *
 * Shows one CATEGORY at a time (a real carousel over the categories, not
 * just a scrollable chip row within one) — "Food & Hospitality" is its own
 * slide, "Event Services" the next, etc. — with arrow buttons to page
 * between them, rather than all ~17 categories stacked on the page at once. */
export default function SectorMultiSelect({
  selected,
  onChange,
  max = MAX_SECTORS,
  className,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const category = SECTOR_TAXONOMY[index];
  const total = SECTOR_TAXONOMY.length;

  const toggle = (value: string) => {
    const has = selected.includes(value);
    if (!has && selected.length >= max) {
      toast.error(`You can pick at most ${max} sectors`);
      return;
    }
    onChange(has ? selected.filter((s) => s !== value) : [...selected, value]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Category carousel controls */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          aria-label="Previous category"
          className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-orange-600 hover:border-orange-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="text-center min-w-0">
          <p className="text-dash-caption font-semibold uppercase tracking-wide text-gray-400 truncate">
            {category.label}
          </p>
          <p className="text-[11px] text-gray-300 mt-0.5">
            {index + 1} of {total}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          disabled={index === total - 1}
          aria-label="Next category"
          className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-orange-600 hover:border-orange-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Current category's sectors — height follows however many chips
          this category has, so a 2-sector category and a 10-sector one
          just take the space they need. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={category.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18 }}
          className="flex flex-wrap gap-2 mb-4"
        >
          {category.sectors.map((leaf) => {
            const isSelected = selected.includes(leaf.value);
            return (
              <button
                key={leaf.value}
                type="button"
                onClick={() => toggle(leaf.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-dash-secondary font-medium rounded-full border transition-colors cursor-pointer shrink-0",
                  isSelected
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600",
                )}
              >
                {isSelected && <Check size={12} />}
                {leaf.label}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Picks made in an earlier (now off-screen) category stay visible and
          removable here, so paging through categories never loses track of
          what's already selected. */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-100">
          {selected.map((value) => {
            const leaf = SECTOR_BY_VALUE[value];
            if (!leaf) return null;
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggle(value)}
                className="flex items-center gap-1 pl-3 pr-2 py-1 text-dash-secondary font-medium rounded-full bg-orange-500 text-white cursor-pointer"
              >
                {leaf.label}
                <X size={12} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
