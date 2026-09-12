"use client";

import { Fragment, useState } from "react";
import { toast } from "sonner";
import { downloadShoppingListPdf } from "@/lib/shoppingListPdf";
import { TrashIcon } from "@/components/icons/hero";
import type {
  ShoppingListItemEstimate,
  ShoppingListSnapshot,
} from "@/types/search";

// Shopping Lists (2026-09-12) — the market-researched draft card, shown
// right after buildShoppingListSnapshot succeeds (route.ts). Renders inside
// the ordinary chat bubble shell, same spacing/border language as
// ComparisonTemplate's own table — this is a new CONTENT type, not a new
// layout system.
//
// "Download list" generates the PDF client-side (see shoppingListPdf.ts's
// own header for why client-side, not server) and triggers the browser's
// normal save-file flow via jsPDF's own `.save()` — no extra page, no
// round trip, per spec §7's own "don't require navigating through another
// page" instruction.
//
// EDITABLE WHILE STILL A DRAFT (2026-09-12) — a buyer can remove an item
// they don't need or add one the AI missed, right up until "Get these
// items" is tapped. Once `list.jobId` is set the list is locked: the
// backend job already exists with a fixed item set, and its credit ceiling
// was already checked against that exact count — editing after that point
// would silently disagree with what was actually paid for and searched.
// This component is CONTROLLED, not locally stateful: every edit calls
// `onListChange` with a freshly recomputed snapshot, and SearchHome writes
// that straight onto the turn (`updateTurn`) — the turn stays the single
// source of truth, never a second copy that could drift from it.

/** Rebuilds the derived fields (total, category count) after an edit —
 *  CODE arithmetic, same rule buildShoppingListSnapshot.ts's own header
 *  states: never trust a running total carried over from before the edit. */
function recompute(
  base: ShoppingListSnapshot,
  items: ShoppingListItemEstimate[],
): ShoppingListSnapshot {
  return {
    ...base,
    items,
    totalEstimateNaira: items.reduce(
      (sum, item) => sum + item.estimatedPriceNaira * item.quantity,
      0,
    ),
    categoryCount: new Set(items.map((i) => i.category)).size,
  };
}

const DEFAULT_CATEGORY = "Other";

function AddItemRow({
  onAdd,
  onCancel,
}: {
  onAdd: (item: ShoppingListItemEstimate) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState(1);

  function submit() {
    const trimmed = label.trim();
    if (!trimmed) return;
    onAdd({
      label: trimmed,
      category: category.trim() || DEFAULT_CATEGORY,
      quantity: Math.max(1, Math.round(quantity) || 1),
      // Never fabricated — a buyer-added item has no AI market estimate
      // behind it, so this stays honestly at zero. Not shown on this card
      // at all (no price column here), but still feeds the underlying
      // total/budget math and the "My Shopping Lists" summary later.
      estimatedPriceNaira: 0,
      fairPriceMinNaira: 0,
      fairPriceMaxNaira: 0,
      notes: null,
    });
    setLabel("");
    setCategory("");
    setQuantity(1);
  }

  return (
    <tr className="border-t border-gray-100 bg-gray-50/40">
      <td className="py-2 pl-3 pr-2">
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Item name"
          className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-ink outline-none focus:border-orange-300"
        />
      </td>
      <td className="py-2 pr-2">
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-14 rounded border border-gray-200 px-2 py-1 text-sm text-ink outline-none focus:border-orange-300"
        />
      </td>
      <td className="py-2 pr-2 text-gray-400">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={`Category (default "${DEFAULT_CATEGORY}")`}
          className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-ink outline-none focus:border-orange-300"
        />
      </td>
      <td className="py-2 pr-3 whitespace-nowrap text-right">
        <button
          type="button"
          onClick={submit}
          className="rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600 cursor-pointer"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="ml-1 rounded-full px-2 py-1 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          Cancel
        </button>
      </td>
    </tr>
  );
}

export function ShoppingListCard({
  list,
  onGetItems,
  onListChange,
}: {
  list: ShoppingListSnapshot;
  onGetItems: () => void | Promise<void>;
  onListChange: (list: ShoppingListSnapshot) => void;
}) {
  const [starting, setStarting] = useState(false);
  const [adding, setAdding] = useState(false);
  const started = list.jobId != null;

  const grouped = new Map<string, typeof list.items>();
  for (const item of list.items) {
    const bucket = grouped.get(item.category) ?? [];
    bucket.push(item);
    grouped.set(item.category, bucket);
  }

  async function handleGetItems() {
    if (starting || started) return;
    setStarting(true);
    try {
      await onGetItems();
    } finally {
      setStarting(false);
    }
  }

  function removeItem(target: ShoppingListItemEstimate) {
    onListChange(
      recompute(
        list,
        list.items.filter((i) => i !== target),
      ),
    );
  }

  function changeQuantity(target: ShoppingListItemEstimate, quantity: number) {
    const safe = Math.max(1, Math.round(quantity) || 1);
    onListChange(
      recompute(
        list,
        list.items.map((i) => (i === target ? { ...i, quantity: safe } : i)),
      ),
    );
  }

  function addItem(item: ShoppingListItemEstimate) {
    onListChange(recompute(list, [...list.items, item]));
    setAdding(false);
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-100 p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-ink">{list.goalText}</h2>
        <p className="text-xs text-gray-400">
          {list.items.length} item{list.items.length === 1 ? "" : "s"} ·{" "}
          {list.categoryCount} categor{list.categoryCount === 1 ? "y" : "ies"}
        </p>
      </div>

      <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-gray-100">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="py-2 pl-3 pr-3 font-medium">Item</th>
              <th className="py-2 pr-3 font-medium">Qty</th>
              <th className="py-2 pr-3 font-medium">Notes</th>
              {!started && <th className="py-2 pr-3" />}
            </tr>
          </thead>
          <tbody className="align-top">
            {[...grouped.entries()].map(([category, items]) => (
              <Fragment key={category}>
                <tr className="border-t border-gray-100 bg-gray-50/60">
                  <td
                    colSpan={started ? 3 : 4}
                    className="py-1.5 pl-3 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
                  >
                    {category}
                  </td>
                </tr>
                {items.map((item, itemIndex) => (
                  <tr
                    key={`${category}-${itemIndex}`}
                    className="border-t border-gray-100"
                  >
                    <td className="py-2 pl-3 pr-3 font-medium text-ink">
                      {item.label}
                    </td>
                    <td className="py-2 pr-3 text-gray-500">
                      {started ? (
                        item.quantity
                      ) : (
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            changeQuantity(item, Number(e.target.value))
                          }
                          className="w-12 rounded border border-gray-200 px-1.5 py-0.5 text-sm outline-none focus:border-orange-300"
                        />
                      )}
                    </td>
                    <td className="py-2 pr-3 text-gray-500">
                      {item.notes ?? "—"}
                    </td>
                    {!started && (
                      <td className="py-2 pr-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item)}
                          title="Remove item"
                          className="text-gray-400 hover:text-red-500 cursor-pointer"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </Fragment>
            ))}
            {adding && (
              <AddItemRow onAdd={addItem} onCancel={() => setAdding(false)} />
            )}
          </tbody>
        </table>
      </div>

      {!started && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-sm font-medium text-orange-600 hover:text-orange-700 cursor-pointer"
        >
          + Add item
        </button>
      )}

      {/* No price is shown anywhere on this card (2026-09-12, explicit
          request) — buildShoppingListSnapshot.ts still generates one
          internally for budget math and the "My Shopping Lists" summary
          later, but this draft never displays it, so this line just sets
          the right expectation about the table itself: a plan to review
          and edit, not a set of confirmed listings. */}
      <p className="text-xs text-gray-400">
        This is a draft based on your project — real listings are found once you
        tap Get these items.
      </p>

      {/* Once `started` — searching or long since finished, same flag either
          way (see this component's own header comment) — the CTA that
          kicked the job off is gone, not just disabled. It already did its
          one job; leaving it on-screen (even greyed out) reads as
          re-offerable and invites a second click on a list that's locked. */}
      {started && (
        <p className="text-xs font-medium text-gray-500">
          Looking for your items… check My Shopping Lists for progress.
        </p>
      )}

      {/* Both CTAs gone once `started`, not just "Get these items" — a
          buyer who has already committed to a real search has no more use
          for a draft-only PDF either (it represents the pre-search
          ESTIMATE, per shoppingListPdf.ts's own header, which is stale the
          moment real results exist); the "Looking for your items…" line
          above already tells them where to go instead. */}
      {!started && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={handleGetItems}
            disabled={starting || list.items.length === 0}
            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {starting ? "Starting…" : "Get these items"}
          </button>
          <button
            type="button"
            onClick={() =>
              downloadShoppingListPdf(list).catch(() =>
                toast.error("Couldn't generate the PDF — try again."),
              )
            }
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-orange-300 hover:text-orange-600 cursor-pointer"
          >
            Download list
          </button>
        </div>
      )}
    </div>
  );
}
