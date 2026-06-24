"use client";

import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import AnchoredPopover from "./AnchoredPopover";

interface SortMenuProps<T extends string = string> {
  currentSort: T;
  onSort: (option: T) => void;
  options: { value: T; label: string }[];
}

export default function SortMenu<T extends string = string>({
  currentSort,
  onSort,
  options,
}: SortMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="p-2 border border-[#d1d5db] rounded bg-white hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer"
      >
        <ArrowUpDown size={18} className="text-[#6a717f]" />
      </button>
      <AnchoredPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        align="right"
        className="w-48 bg-white rounded-lg shadow-lg border border-[#e5e7eb] py-1"
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              onSort(opt.value);
              setOpen(false);
            }}
            className={cn(
              "w-full text-left px-4 py-2 text-dash-body hover:bg-orange-50 transition-colors cursor-pointer",
              currentSort === opt.value
                ? "bg-orange-100 text-orange-600"
                : "text-[#111827]",
            )}
          >
            {opt.label}
          </button>
        ))}
      </AnchoredPopover>
    </>
  );
}
