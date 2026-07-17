"use client";

import SectorMultiSelect, {
  MAX_SECTORS,
} from "@/components/sectors/SectorMultiSelect";
import type { SectorPickerProps } from "@/types/sectors";

// Multi-select, capped at MAX_SECTORS — signup is the canonical entry point
// for a vendor's sectors (up to 5), edited later from the Store editor via
// the same SectorMultiSelect.
export default function SectorPicker({
  value,
  onChange,
  error,
}: SectorPickerProps) {
  return (
    <div>
      <SectorMultiSelect
        selected={value}
        onChange={onChange}
        max={MAX_SECTORS}
        className={error ? "rounded-md ring-1 ring-red-400 p-2" : undefined}
      />
    </div>
  );
}
