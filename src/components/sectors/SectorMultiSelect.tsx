"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { SECTOR_TAXONOMY } from "@/lib/sectors";
import { cn } from "@/lib/utils";

export const MAX_SECTORS = 5;

/** Grouped, capped multi-select chip picker over the sector taxonomy —
 * selection is by slug (SectorLeaf.value), display by label. Shared between
 * signup (the canonical entry point for a vendor's sectors) and the Store
 * editor (the edit surface for that same list), so they're visibly the same
 * picker. Extracted from what used to be StorePage.tsx's own bespoke chip UI. */
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
  const toggle = (value: string) => {
    const has = selected.includes(value);
    if (!has && selected.length >= max) {
      toast.error(`You can pick at most ${max} sectors`);
      return;
    }
    onChange(has ? selected.filter((s) => s !== value) : [...selected, value]);
  };

  return (
    <div className={cn("space-y-3.5", className)}>
      {SECTOR_TAXONOMY.map((category) => (
        <div key={category.id}>
          <p className="text-dash-caption font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
            {category.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {category.sectors.map((leaf) => {
              const isSelected = selected.includes(leaf.value);
              return (
                <button
                  key={leaf.value}
                  type="button"
                  onClick={() => toggle(leaf.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-dash-secondary font-medium rounded-full border transition-colors cursor-pointer",
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
          </div>
        </div>
      ))}
    </div>
  );
}
