"use client";

import { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterField } from "@/types/common";

interface FilterPopoverProps {
  values: Record<string, string>;
  defaultValues: Record<string, string>;
  showDateRange?: boolean;
  fields?: FilterField[];
  onApply: (values: Record<string, string>) => void;
  onReset: () => void;
}

export default function FilterPopover({
  values,
  defaultValues,
  showDateRange = true,
  fields = [],
  onApply,
  onReset,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<Record<string, string>>(values);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setLocal(values);
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 border border-[#d1d5db] rounded bg-white hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer"
      >
        <Filter size={18} className="text-[#6a717f]" />
      </button>
      {open && (
        <div className="absolute -right-10 top-10 z-40 sm:w-80 w-[340px] bg-white rounded-lg shadow-lg border border-[#e5e7eb] p-4 text-sm">
          <div className="space-y-4">
            {showDateRange && (
              <div>
                <label className="block text-xs font-semibold text-[#023337] mb-1">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={local["startDate"] ?? ""}
                    onChange={(e) =>
                      setLocal({ ...local, startDate: e.target.value })
                    }
                    className="flex-1 px-2 py-1.5 border border-[#e5e7eb] rounded text-sm"
                  />
                  <input
                    type="date"
                    value={local["endDate"] ?? ""}
                    onChange={(e) =>
                      setLocal({ ...local, endDate: e.target.value })
                    }
                    className="flex-1 px-2 py-1.5 border border-[#e5e7eb] rounded text-sm"
                  />
                </div>
              </div>
            )}
            {fields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-[#023337] mb-1">
                  {field.label}
                </label>
                <Select
                  value={local[field.key] ?? "all"}
                  onValueChange={(v) =>
                    setLocal((prev) => ({
                      ...prev,
                      [field.key]: v ?? "all",
                    }))
                  }
                >
                  <SelectTrigger className="w-full text-sm h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setLocal(defaultValues);
                  onReset();
                  setOpen(false);
                }}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  onApply(local);
                  setOpen(false);
                }}
                className="flex-1 px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
