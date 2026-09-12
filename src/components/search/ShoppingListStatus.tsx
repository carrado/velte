import { cn } from "@/lib/utils";
import type { ShoppingListJobStatus } from "@/types/shoppingList";

// Shared status-pill language for every Shopping List surface — the index
// list (ShoppingListsIndexPage) and the per-job inner page
// (ShoppingListResultsView) both need the exact same tone/label logic, and
// having it live in one place is what keeps a status reading identically
// wherever a buyer sees it, rather than two copies quietly drifting apart.

export type ShoppingListTone =
  | "searching"
  | "complete"
  | "partial"
  | "selected"
  | "failed";

const STATUS_LABEL: Record<ShoppingListJobStatus, string> = {
  queued: "Searching",
  running: "Searching",
  completed: "Complete",
  completed_partial: "Partially complete",
  failed: "Failed",
};

const TONE_STYLES: Record<ShoppingListTone, string> = {
  searching: "border-amber-200 bg-amber-50 text-amber-700",
  complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
  partial: "border-orange-200 bg-orange-50 text-orange-700",
  selected: "border-violet-200 bg-violet-50 text-violet-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

const TONE_DOT: Record<ShoppingListTone, string> = {
  searching: "bg-amber-500",
  complete: "bg-emerald-500",
  partial: "bg-orange-500",
  selected: "bg-violet-500",
  failed: "bg-red-500",
};

/** "Selected" (spec §22) isn't its own job-level status — it's derived from
 *  whether a completed job has any picked items, since selection is a
 *  stateless one-shot action, not a persisted phase of the job itself. */
export function toneForShoppingList(
  status: ShoppingListJobStatus,
  selectedCount: number,
): ShoppingListTone {
  if (
    (status === "completed" || status === "completed_partial") &&
    selectedCount > 0
  ) {
    return "selected";
  }
  if (status === "queued" || status === "running") return "searching";
  if (status === "completed_partial") return "partial";
  if (status === "failed") return "failed";
  return "complete";
}

export function shoppingListStatusLabel(
  status: ShoppingListJobStatus,
  tone: ShoppingListTone,
  selectedCount: number,
): string {
  if (tone === "selected") {
    return selectedCount === 1
      ? "1 item selected"
      : `${selectedCount} items selected`;
  }
  return STATUS_LABEL[status];
}

export function ShoppingListStatusPill({
  status,
  selectedCount,
}: {
  status: ShoppingListJobStatus;
  selectedCount: number;
}) {
  const tone = toneForShoppingList(status, selectedCount);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        TONE_STYLES[tone],
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          TONE_DOT[tone],
          tone === "searching" && "animate-pulse",
        )}
      />
      {shoppingListStatusLabel(status, tone, selectedCount)}
    </span>
  );
}
