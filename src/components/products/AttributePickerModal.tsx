"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Search, Check, Plus } from "lucide-react";
import type { AttributePickerModalProps } from "@/types/product";

/* Scrollable "fill what applies" picker: every preset renders as a row with a
   value input seeded by a realistic example. No selection step — anything the
   vendor typed a value into gets added. Fastest path from blank catalog entry
   to a rich, matchable one. */

export default function AttributePickerModal({
  open,
  title,
  subtitle,
  groups,
  existingNames,
  onClose,
  onAdd,
}: AttributePickerModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  // Vendor-authored details that aren't in the preset library.
  const [customs, setCustoms] = useState<{ name: string; value: string }[]>([]);
  const [customName, setCustomName] = useState("");
  const [customValue, setCustomValue] = useState("");

  // Reset per open (render-phase adjust, no effect).
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues({});
      setSearch("");
      setCustoms([]);
      setCustomName("");
      setCustomValue("");
    }
  }

  if (!open) return null;

  const existing = new Set(existingNames.map((n) => n.toLowerCase()));
  const q = search.trim().toLowerCase();

  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: q
        ? g.items.filter(
            (i) =>
              i.name.toLowerCase().includes(q) ||
              g.group.toLowerCase().includes(q),
          )
        : g.items,
    }))
    .filter((g) => g.items.length > 0);

  const filled = Object.entries(values).filter(([, v]) => v.trim() !== "");
  const totalReady = filled.length + customs.length;

  const addCustom = () => {
    const name = customName.trim();
    const value = customValue.trim();
    if (!name || !value) return;
    const taken =
      existing.has(name.toLowerCase()) ||
      customs.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!taken) setCustoms((c) => [...c, { name, value }]);
    setCustomName("");
    setCustomValue("");
  };

  const handleAdd = () => {
    onAdd([
      ...customs,
      ...filled.map(([name, value]) => ({ name, value: value.trim() })),
    ]);
    onClose();
  };

  // Portaled to document.body — rendered inline this backdrop only ever
  // covered its scrollable ancestor's box, not the real viewport (same
  // clipping bug already fixed for dropdowns via AnchoredPopover).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 z-10 flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-dash-heading font-semibold text-gray-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          {subtitle && (
            <p className="text-dash-secondary text-gray-400 mt-0.5">
              {subtitle}
            </p>
          )}
          <div className="relative mt-3">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suggestions…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-dash-body focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {visibleGroups.length === 0 && (
            <p className="text-dash-secondary text-gray-400 text-center py-8">
              Nothing matches &quot;{search}&quot;.
            </p>
          )}
          {visibleGroups.map((group) => (
            <div key={group.group}>
              <p className="text-dash-micro font-semibold uppercase text-gray-400 tracking-wider mb-2">
                {group.group}
              </p>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const alreadyAdded = existing.has(item.name.toLowerCase());
                  return (
                    <div
                      key={`${group.group}-${item.name}`}
                      className="flex items-center gap-3"
                    >
                      <span className="w-36 shrink-0 text-dash-body text-gray-700">
                        {item.name}
                      </span>
                      {alreadyAdded ? (
                        <span className="flex items-center gap-1.5 text-dash-caption text-green-600">
                          <Check size={13} />
                          Added
                        </span>
                      ) : (
                        <input
                          value={values[item.name] ?? ""}
                          onChange={(e) =>
                            setValues((v) => ({
                              ...v,
                              [item.name]: e.target.value,
                            }))
                          }
                          placeholder={item.example}
                          className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 rounded-lg text-dash-body focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Vendor's own detail — pinned so it's reachable without scrolling */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/60">
          <p className="text-dash-caption font-semibold uppercase text-gray-400 tracking-wider mb-2">
            Add your own
          </p>
          {customs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {customs.map((c) => (
                <span
                  key={c.name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-lg text-dash-caption font-medium"
                >
                  {c.name}: {c.value}
                  <button
                    onClick={() =>
                      setCustoms((list) =>
                        list.filter((x) => x.name !== c.name),
                      )
                    }
                    className="hover:text-red-600 cursor-pointer"
                    aria-label={`Remove ${c.name}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Name (e.g. Installation)"
              className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 rounded-lg text-dash-body bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <input
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder="Value (e.g. free within Ikeja)"
              className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 rounded-lg text-dash-body bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!customName.trim() || !customValue.trim()}
              aria-label="Add custom detail"
              className="w-9 h-9 shrink-0 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-dash-secondary text-gray-400">
            Fill only what applies — empty ones are skipped.
          </p>
          <button
            onClick={handleAdd}
            disabled={totalReady === 0}
            className="px-5 py-2 text-dash-body font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            Add {totalReady > 0 ? totalReady : ""} detail
            {totalReady === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
