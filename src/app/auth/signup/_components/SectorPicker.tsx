"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { SECTOR_TAXONOMY, SECTOR_BY_VALUE } from "@/lib/sectors";
import { cn } from "@/lib/utils";
import type { SectorPickerProps } from "@/types/sectors";

// Custom combobox from existing Popover + Input primitives rather than adding
// cmdk — ~120 leaf sectors need search/grouping, but the project has no
// command-palette dependency and the base-ui-backed component style doesn't
// use one either.
export default function SectorPicker({
  value,
  onSelect,
  error,
}: SectorPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = value ? SECTOR_BY_VALUE[value] : undefined;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTOR_TAXONOMY;
    return SECTOR_TAXONOMY.map((category) => ({
      ...category,
      sectors: category.sectors.filter((s) =>
        s.label.toLowerCase().includes(q),
      ),
    })).filter((category) => category.sectors.length > 0);
  }, [query]);

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "w-full h-11 px-3.5 flex items-center justify-between gap-2 bg-transparent border rounded-md text-sm cursor-pointer transition-colors",
            error ? "border-red-400" : "border-black/[0.3]",
            open && "border-orange-500/50 ring-1 ring-orange-500/20",
          )}
        >
          <span
            className={cn(
              "truncate text-left",
              selected ? "text-black" : "text-black/25",
            )}
          >
            {selected ? selected.label : "Select your business sector"}
          </span>
          <ChevronDown size={15} className="text-black/40 shrink-0" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[320px] sm:w-[420px] max-w-[90vw] p-0 bg-white border border-black/[0.15]"
        >
          <div className="p-2 border-b border-black/[0.08]">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/30"
              />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sectors…"
                className="h-9 pl-8 bg-transparent border-black/[0.15] text-black text-sm placeholder:text-black/30"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto py-1.5">
            {groups.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-black/40">
                No sectors match &quot;{query}&quot;
              </p>
            )}
            {groups.map((category) => (
              <div key={category.id} className="mb-1 last:mb-0">
                <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-black/35">
                  {category.label}
                </p>
                {category.sectors.map((leaf) => (
                  <button
                    key={leaf.value}
                    type="button"
                    onClick={() => {
                      onSelect(leaf);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left cursor-pointer hover:bg-orange-50",
                      value === leaf.value
                        ? "text-orange-600 font-medium"
                        : "text-black/80",
                    )}
                  >
                    {leaf.label}
                    {value === leaf.value && (
                      <Check size={14} className="text-orange-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
