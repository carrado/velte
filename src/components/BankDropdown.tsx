"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BankOption } from "@/types/transaction";

/**
 * Searchable bank picker. Shared by the payment-link setup modal and the
 * order refund flow — both need to resolve a Nigerian bank account.
 */
export default function BankDropdown({
  banks,
  value,
  onChange,
  disabled,
}: {
  banks: BankOption[];
  value: string;
  onChange: (code: string, name: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = banks.find((b) => b.code === value);
  const filtered = banks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors",
          "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-ring ring-2 ring-ring ring-offset-2",
        )}
      >
        <span className={cn(!selected && "text-muted-foreground")}>
          {selected ? selected.name : "Select bank"}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search banks…"
                className="w-full rounded-sm border border-input bg-background pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          {/* List */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No banks found
              </p>
            ) : (
              filtered.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => {
                    onChange(bank.code, bank.name);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    value === bank.code && "bg-accent font-medium",
                  )}
                >
                  {bank.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
