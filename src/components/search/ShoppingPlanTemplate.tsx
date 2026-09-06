import { WhatsAppButton } from "@/components/WhatsAppButton";
import { buildChatLink } from "@/lib/chatLink";
import { formatNaira } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  ExternalLinkIcon,
  LoaderIcon,
  StoreIcon,
  TrashIcon,
} from "@/components/icons";
import type {
  ShoppingPlan,
  ShoppingPlanDraft,
  ShoppingPlanItem,
} from "@/types/search";

// Shopping Plan's own rendering (2026-09-06) — two modes, one file, same
// split ComparisonTemplate uses between its own variants: DRAFT is the
// unconfirmed checklist the buyer reviews before a single search runs (the
// product spec's own explicit "ask before assuming" point); BUILT is the
// real, priced, editable result. Every string here that isn't a
// name/price/category came from the buyer's own words or a deterministic
// computation — nothing here is model prose.

function kobo(n: number): string {
  return formatNaira(n);
}

// ── Draft (pre-confirmation checklist) ──────────────────────────────────────

export function ShoppingPlanDraftCard({
  draft,
  busy = false,
  removedKeys,
  onToggleItem,
  onConfirm,
}: {
  draft: ShoppingPlanDraft;
  busy?: boolean;
  /** `category|label` keys the buyer has unchecked — kept in the parent so
   *  this stays a pure render of whatever's still included. */
  removedKeys: Set<string>;
  onToggleItem: (category: string, label: string) => void;
  onConfirm: () => void;
}) {
  const byCategory = new Map<string, ShoppingPlanDraft["items"]>();
  for (const it of draft.items) {
    const list = byCategory.get(it.category) ?? [];
    list.push(it);
    byCategory.set(it.category, list);
  }

  const includedCount = draft.items.filter(
    (it) => !removedKeys.has(`${it.category}|${it.label}`),
  ).length;

  return (
    <div className="space-y-4 rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
      <div className="space-y-1">
        <h2 className="text-[15px] sm:text-base font-semibold text-[#023337]">
          Here&apos;s a starting checklist
        </h2>
        <p className="text-sm text-gray-600">
          Total budget:{" "}
          <span className="font-semibold text-gray-800">
            {kobo(draft.totalBudgetKobo)}
          </span>
          {" — "}uncheck anything you don&apos;t need, then build the plan.
        </p>
      </div>

      <div className="space-y-3">
        {draft.categories.map((cat) => {
          const items = byCategory.get(cat.label) ?? [];
          if (!items.length) return null;
          return (
            <div key={cat.label} className="space-y-1.5">
              <h3 className="text-sm font-semibold text-[#023337]">
                {cat.label}
              </h3>
              <div className="space-y-1">
                {items.map((it) => {
                  const key = `${it.category}|${it.label}`;
                  const removed = removedKeys.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onToggleItem(it.category, it.label)}
                      disabled={busy}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        removed
                          ? "border-gray-100 bg-gray-50 text-gray-400"
                          : "border-orange-100 bg-white text-gray-800 hover:border-orange-200",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          removed
                            ? "border-gray-300"
                            : "border-orange-400 bg-orange-400 text-white",
                        )}
                      >
                        {!removed && <CheckIcon size={11} />}
                      </span>
                      <span className={cn("flex-1", removed && "line-through")}>
                        {it.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={busy || includedCount === 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
      >
        {busy && <LoaderIcon size={15} className="animate-spin" />}
        {busy
          ? "Searching Velte and beyond…"
          : `Build my plan (${includedCount} item${includedCount === 1 ? "" : "s"})`}
      </button>
    </div>
  );
}

// ── Built plan ───────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: ShoppingPlanItem["source"] }) {
  if (source === "velte") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        🟢 Available on Velte
      </span>
    );
  }
  if (source === "external") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
        🔵 External listing
      </span>
    );
  }
  return null;
}

function PlanItemRow({
  item,
  onReplace,
  replacing,
}: {
  item: ShoppingPlanItem;
  onReplace: (item: ShoppingPlanItem) => void;
  replacing: boolean;
}) {
  // Never a Velte relationship for an external find — same disclosure rule
  // ExternalOfferCard/ExternalBusinessCard already hold to: tapping the
  // listing takes the buyer to the source's OWN page, not a Velte chat.
  const chatHref =
    item.source === "velte" && item.vendorId
      ? buildChatLink({
          vendorId: item.vendorId,
          productId: item.productId ?? undefined,
          // Reuses the ordinary search lead source (2026-09-06, v1
          // simplification) — a plan-sourced contact is billed and tracked
          // exactly like any other search-originated one; a dedicated
          // "shopping_plan" source would need velte-backend's own
          // LEAD_SOURCES list widened too, which nothing here needs yet.
          source: "search",
          message: `Hi! I'm interested in your "${item.name}" — I found you through my Velte shopping plan.`,
        })
      : null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name ?? item.label}
            className="h-full w-full object-cover"
          />
        ) : (
          <StoreIcon size={18} className="text-gray-300" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-semibold text-[#023337]">
          {item.name ?? item.label}
        </p>
        {item.status === "no_match" ? (
          <p className="text-xs text-gray-500">
            Couldn&apos;t find a suitable option
            {item.targetBudgetKobo
              ? ` within ${kobo(item.targetBudgetKobo)}`
              : ""}{" "}
            right now.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-800">
              {item.priceKobo != null ? kobo(item.priceKobo) : "—"}
            </span>
            <SourceBadge source={item.source} />
            {item.merchant && (
              <span className="text-xs text-gray-400">{item.merchant}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {item.status === "found" && item.source === "velte" && chatHref && (
          <WhatsAppButton
            href={chatHref}
            label="Chat"
            className="!px-3 !py-1.5 !text-xs"
          />
        )}
        {item.status === "found" && item.source === "external" && item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            View listing
            <ExternalLinkIcon size={12} />
          </a>
        )}
        <button
          type="button"
          onClick={() => onReplace(item)}
          disabled={replacing}
          className="text-xs font-semibold text-orange-600 hover:text-orange-700 disabled:text-gray-300"
        >
          {replacing ? "Searching…" : "Replace"}
        </button>
      </div>
    </div>
  );
}

export function ShoppingPlanView({
  plan,
  onReplaceItem,
  onRemoveItem,
  replacingItemId,
}: {
  plan: ShoppingPlan;
  onReplaceItem: (item: ShoppingPlanItem) => void;
  /** Drops an item from the plan entirely (v1's other edit besides
   *  Replace) — deferring an item the buyer decided not to buy after all. */
  onRemoveItem?: (item: ShoppingPlanItem) => void;
  replacingItemId: string | null;
}) {
  const spentKobo = plan.items.reduce(
    (sum, it) => sum + (it.priceKobo ?? 0),
    0,
  );
  const remaining = plan.totalBudgetKobo - spentKobo;
  const overBudget = remaining < 0;

  const byCategory = new Map<string, ShoppingPlanItem[]>();
  for (const it of plan.items) {
    const list = byCategory.get(it.category) ?? [];
    list.push(it);
    byCategory.set(it.category, list);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-[15px] sm:text-base font-semibold text-[#023337]">
          {plan.goalText}
        </h2>
        <p className="text-sm text-gray-600">
          Budget:{" "}
          <span className="font-semibold text-gray-800">
            {kobo(plan.totalBudgetKobo)}
          </span>
          {" · "}
          Estimated total:{" "}
          <span className="font-semibold text-gray-800">{kobo(spentKobo)}</span>
        </p>
      </div>

      <div
        className={cn(
          "rounded-xl border px-3 py-2.5 text-sm font-medium",
          overBudget
            ? "border-red-100 bg-red-50 text-red-700"
            : "border-emerald-100 bg-emerald-50 text-emerald-700",
        )}
      >
        {overBudget
          ? `You're currently ${kobo(Math.abs(remaining))} over budget.`
          : `🎉 Your plan is currently ${kobo(remaining)} under budget.`}
      </div>

      <div className="space-y-4">
        {plan.categories.map((cat) => {
          const items = byCategory.get(cat.label) ?? [];
          if (!items.length) return null;
          return (
            <div key={cat.label} className="space-y-1.5">
              <h3 className="text-sm font-semibold text-[#023337]">
                {cat.label}
              </h3>
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="group relative">
                    <PlanItemRow
                      item={it}
                      onReplace={onReplaceItem}
                      replacing={replacingItemId === it.id}
                    />
                    {onRemoveItem && (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(it)}
                        title="Remove from plan"
                        className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 hover:text-red-500 group-hover:flex"
                      >
                        <TrashIcon size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
