import { useState } from "react";

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
import {
  PlanProgressBar,
  ShoppingPlanProgressIcon,
} from "@/components/search/ShoppingPlanProgress";
import type {
  ShoppingPlan,
  ShoppingPlanDraft,
  ShoppingPlanItem,
  ShoppingPlanResult,
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
        <h2 className="text-[15px] sm:text-base font-semibold text-ink">
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
              <h3 className="text-sm font-semibold text-ink">{cat.label}</h3>
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
                          : "border-orange-100 bg-surface text-gray-800 hover:border-orange-200",
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

// One alternative listing, inside an expanded item's result list — smaller
// and quieter than the item row itself, because the item's own pick is still
// the recommendation and this is the "or these" underneath it.
function PlanResultRow({ result }: { result: ShoppingPlanResult }) {
  const chatHref =
    result.source === "velte" && result.vendorId
      ? buildChatLink({
          vendorId: result.vendorId,
          productId: result.productId ?? undefined,
          source: "search",
          message: `Hi! I'm interested in your "${result.name}" — I found you through my Velte shopping plan.`,
        })
      : null;

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50/60 p-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface">
        {result.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.imageUrl}
            alt={result.name ?? ""}
            className="h-full w-full object-cover"
          />
        ) : (
          <StoreIcon size={14} className="text-gray-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-ink">
          {result.name ?? "Listing"}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-700">
            {result.priceKobo != null ? kobo(result.priceKobo) : "—"}
          </span>
          <SourceBadge source={result.source} />
          {result.merchant && (
            <span className="truncate text-[10px] text-gray-400">
              {result.merchant}
            </span>
          )}
        </div>
      </div>
      {chatHref ? (
        <WhatsAppButton
          href={chatHref}
          label="Chat"
          className="!px-2.5 !py-1 !text-[11px]"
        />
      ) : (
        result.url && (
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-surface px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            View
            <ExternalLinkIcon size={10} />
          </a>
        )
      )}
    </div>
  );
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
  // The alternatives this item's own search also found, hidden until asked
  // for — the pick is the answer, and opening every item's full list by
  // default would bury a 9-item plan under 80 rows.
  const [expanded, setExpanded] = useState(false);
  const alternatives = item.results.length > 1 ? item.results.slice(1) : [];
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
    <div className="space-y-1.5">
      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-surface p-3">
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
          <p className="truncate text-sm font-semibold text-ink">
            {item.name ?? item.label}
          </p>
          {item.status === "pending" ? (
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <LoaderIcon size={12} className="animate-spin" />
              Searching…
            </p>
          ) : item.status === "no_match" ? (
            <p className="text-xs text-gray-500">
              Couldn&apos;t find a suitable option
              {item.targetBudgetKobo
                ? ` within ${kobo(item.targetBudgetKobo)}`
                : ""}{" "}
              right now.
            </p>
          ) : item.status === "failed" ? (
            // Deliberately different wording from no_match: the search BROKE
            // rather than honestly coming up empty, and this is the one of the
            // two that's worth trying again. The `error` code itself is never
            // shown — it's for logs, not for a buyer.
            <p className="text-xs text-amber-700">
              Search failed for this item — try again.
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
          {/* The honest count, and the way into the rest of it. Only ever
            rendered from results actually stored for this item — never a
            figure implied by anything else. */}
          {item.status === "found" && item.results.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              disabled={!alternatives.length}
              className="text-[11px] font-semibold text-orange-600 transition-colors hover:text-orange-700 disabled:cursor-default disabled:text-gray-400"
            >
              {item.results.length === 1
                ? "1 result found"
                : expanded
                  ? `Hide ${alternatives.length} other option${alternatives.length === 1 ? "" : "s"}`
                  : `${item.results.length} results found — see all`}
            </button>
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
          {item.status === "found" &&
            item.source === "external" &&
            item.url && (
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
          {/* Nothing to replace yet while the background build hasn't even
            attempted this item once — the button reappears the instant it
            resolves either way (found or no_match). */}
          {item.status !== "pending" && (
            <button
              type="button"
              onClick={() => onReplace(item)}
              disabled={replacing}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 disabled:text-gray-300"
            >
              {replacing
                ? "Searching…"
                : item.status === "failed"
                  ? "Retry"
                  : "Replace"}
            </button>
          )}
        </div>
      </div>

      {/* The other real listings this item's search found. Indented under
          their item so it stays obvious which one they belong to in a plan
          with several expanded at once. */}
      {expanded && alternatives.length > 0 && (
        <div className="space-y-1.5 pl-3 sm:pl-6">
          {alternatives.map((r) => (
            <PlanResultRow key={r.id} result={r} />
          ))}
        </div>
      )}
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
  // A "found" item is the only kind that actually contributed to spentKobo
  // above — 2026-09-10, found live: a plan where most items came back
  // no_match still showed the full unspent budget as "🎉 under budget",
  // which reads as good news when the honest story is "we couldn't find
  // most of what you asked for." The banner below now leads with THAT
  // whenever it's true, and only celebrates being under budget once every
  // item actually has a real price behind it.
  // Counted from the items in hand rather than read off the plan's own
  // server-computed `foundCount` — they agree, but this component also
  // renders mid-edit (a Replace just swapped an item locally), where the
  // items are a step ahead of the numbers that came with them.
  const foundCount = plan.items.filter((it) => it.status === "found").length;
  const failedCount = plan.items.filter((it) => it.status === "failed").length;
  const allFound = foundCount === plan.items.length;
  // The plan is still being built server-side (2026-09-10 — see
  // /api/shopping-plan/route.ts's own rewrite comment): items arrive
  // "pending" and fill in live. `resolvedCount` is "attempted at least
  // once" (found, no_match or failed), same definition ShoppingPlanSummary's
  // own field uses for the Your Plans list, so the two never disagree.
  const building = plan.status === "building";
  const resolvedCount = plan.items.filter(
    (it) => it.status !== "pending",
  ).length;

  const byCategory = new Map<string, ShoppingPlanItem[]>();
  for (const it of plan.items) {
    const list = byCategory.get(it.category) ?? [];
    list.push(it);
    byCategory.set(it.category, list);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 flex-1 text-[15px] sm:text-base font-semibold text-ink">
            {plan.goalText}
          </h2>
          {/* Opposite the title, not buried in the banner below — this is
              the thing a buyer glances at first, whether they're reading
              the goal text or not. */}
          {building && (
            <ShoppingPlanProgressIcon
              resolvedCount={resolvedCount}
              itemCount={plan.items.length}
              size={20}
              className="mt-0.5 shrink-0"
            />
          )}
        </div>
        <p className="text-sm text-gray-600">
          Budget:{" "}
          <span className="font-semibold text-gray-800">
            {kobo(plan.totalBudgetKobo)}
          </span>
          {" · "}
          Estimated total:{" "}
          <span className="font-semibold text-gray-800">{kobo(spentKobo)}</span>
        </p>
        {/* A real ratio of items actually checked — never a timed fake that
            creeps forward on its own while nothing is happening. */}
        {building && (
          <PlanProgressBar
            resolvedCount={resolvedCount}
            itemCount={plan.items.length}
          />
        )}
      </div>

      <div
        className={cn(
          "rounded-xl border px-3 py-2.5 text-sm font-medium",
          building
            ? "border-sky-100 bg-sky-50 text-sky-700"
            : overBudget
              ? "border-red-100 bg-red-50 text-red-700"
              : allFound
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-amber-100 bg-amber-50 text-amber-700",
        )}
      >
        {building
          ? `Searching in the background — ${resolvedCount} of ${plan.items.length} items checked so far. You can leave this page; we'll text you and flag it here when it's done.`
          : overBudget
            ? `You're currently ${kobo(Math.abs(remaining))} over budget.`
            : allFound
              ? `🎉 Your plan is ready — results for all ${plan.items.length} items, ${kobo(remaining)} under budget.`
              : foundCount === 0
                ? failedCount === plan.items.length
                  ? "The search failed for every item on this list — try Retry on one, or check back shortly."
                  : "Couldn't find a match for any of these yet — try Replace on an item below, or check back later."
                : // The number that actually matters, said plainly — never
                  // "all done!" when a third of the list found nothing.
                  `Your plan is ready — found results for ${foundCount} of ${plan.items.length} items.${
                    failedCount
                      ? ` ${failedCount} search${failedCount === 1 ? "" : "es"} failed and can be retried.`
                      : ""
                  }`}
      </div>

      <div className="space-y-4">
        {plan.categories.map((cat) => {
          const items = byCategory.get(cat.label) ?? [];
          if (!items.length) return null;
          return (
            <div key={cat.label} className="space-y-1.5">
              <h3 className="text-sm font-semibold text-ink">{cat.label}</h3>
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
                        className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-surface text-gray-400 shadow-sm ring-1 ring-gray-200 hover:text-red-500 group-hover:flex"
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
