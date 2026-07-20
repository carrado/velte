"use client";

import SectorMultiSelect, {
  MAX_SECTORS,
} from "@/components/sectors/SectorMultiSelect";
import type { SectorPickerProps } from "@/types/sectors";

// Multi-select, capped at MAX_SECTORS — signup is the canonical entry point
// for a vendor's sectors (up to 5), edited later from the Store editor via
// the same SectorMultiSelect. A validation error still shows via the
// FieldError message the caller renders below this — no extra ring/border
// styling on the picker itself.
export default function SectorPicker({ value, onChange }: SectorPickerProps) {
  return (
    <SectorMultiSelect selected={value} onChange={onChange} max={MAX_SECTORS} />
  );
}
