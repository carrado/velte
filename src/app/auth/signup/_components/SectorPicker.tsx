"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SECTOR_TAXONOMY, SECTOR_BY_VALUE } from "@/lib/sectors";
import { cn } from "@/lib/utils";
import type { SectorPickerProps } from "@/types/sectors";

// Plain grouped dropdown (same primitive as the State field in
// Step1BusinessAccount.tsx) — a prior searchable-combobox version (custom
// Popover + search input) was more UI than this needs; a native-feeling
// select with category groups is enough to get through ~120 leaf sectors.
export default function SectorPicker({
  value,
  onSelect,
  error,
}: SectorPickerProps) {
  return (
    <div>
      <Select
        value={value || undefined}
        onValueChange={(v) => {
          const leaf = v ? SECTOR_BY_VALUE[v] : undefined;
          if (leaf) onSelect(leaf);
        }}
      >
        <SelectTrigger
          className={cn(
            "bg-transparent w-full text-black h-11 focus:border-orange-500/50 focus:ring-orange-500/20",
            error ? "border-red-400" : "border-black/[0.3]",
          )}
        >
          <SelectValue placeholder="Select your business sector" />
        </SelectTrigger>
        <SelectContent className="bg-white border-black/[0.15] z-50 text-black max-h-72">
          {SECTOR_TAXONOMY.map((category) => (
            <SelectGroup key={category.id}>
              <SelectLabel className="text-[11px] font-semibold uppercase tracking-wide text-black/35">
                {category.label}
              </SelectLabel>
              {category.sectors.map((leaf) => (
                <SelectItem key={leaf.value} value={leaf.value}>
                  {leaf.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
