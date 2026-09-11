"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

import { WhatsAppButton } from "@/components/WhatsAppButton";
import { buildChatLink } from "@/lib/chatLink";
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  LoaderIcon,
  MapPinIcon,
  PackageIcon,
  StoreIcon,
  XCircleIcon,
} from "@/components/icons";
import { BudgetGauge } from "@/components/search/BudgetGauge";
import type {
  ShoppingPlan,
  ShoppingPlanItem,
  ShoppingPlanResult,
} from "@/types/search";

// The full-width plan DETAIL page's own rendering (2026-09-11) — a richer,
// dashboard-flavoured sibling of ShoppingPlanTemplate.tsx's compact
// `ShoppingPlanView`, which stays exactly as it was for the (currently
// unreachable, but still wired) in-chat turn card, a narrow bubble context
// this full-width page no longer shares a layout with. Kept as a SEPARATE
// component rather than a reskin of that one on purpose: touching the
// shared one to make it "wide and rich" would also change how it renders
// inside a chat bubble the moment that branch is ever revived, which is a
// change nobody asked for.
//
// Layout: a sticky summary sidebar (goal, status, budget gauge, counts,
// dates) beside the actual checklist, grouped by category into cards of
// their own, each holding a GRID of item cards rather than a single stacked
// column — the point of the extra width is more items visible at once, not
// more margin either side of the same narrow list.

function kobo(n: number): string {
  return formatNaira(n);
}

function SourceBadge({ source }: { source: ShoppingPlanItem["source"] }) {
  if (source === "velte") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        🟢 On Velte
      </span>
    );
  }
  if (source === "external") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
        🔵 External
      </span>
    );
  }
  return null;
}

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

function ItemCard({
  item,
  onReplace,
  replacing,
}: {
  item: ShoppingPlanItem;
  onReplace: (item: ShoppingPlanItem) => void;
  replacing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const alternatives = item.results.length > 1 ? item.results.slice(1) : [];
  const chatHref =
    item.source === "velte" && item.vendorId
      ? buildChatLink({
          vendorId: item.vendorId,
          productId: item.productId ?? undefined,
          source: "search",
          message: `Hi! I'm interested in your "${item.name}" — I found you through my Velte shopping plan.`,
        })
      : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-surface transition-shadow hover:shadow-sm">
      <div className="flex h-32 items-center justify-center overflow-hidden bg-gray-50">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name ?? item.label}
            className="h-full w-full object-cover"
          />
        ) : item.status === "pending" ? (
          <LoaderIcon size={22} className="animate-spin text-gray-300" />
        ) : (
          <StoreIcon size={26} className="text-gray-300" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
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
          <p className="text-xs text-amber-700">
            Search failed for this item — try again.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-base font-bold text-ink">
              {item.priceKobo != null ? kobo(item.priceKobo) : "—"}
            </span>
            <SourceBadge source={item.source} />
          </div>
        )}
        {item.status === "found" && item.merchant && (
          <p className="truncate text-xs text-gray-400">{item.merchant}</p>
        )}

        {item.status === "found" && item.results.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            disabled={!alternatives.length}
            className="self-start text-[11px] font-semibold text-orange-600 transition-colors hover:text-orange-700 disabled:cursor-default disabled:text-gray-400"
          >
            {item.results.length === 1
              ? "1 result found"
              : expanded
                ? `Hide ${alternatives.length} other option${alternatives.length === 1 ? "" : "s"}`
                : `${item.results.length} results found — see all`}
          </button>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {item.status === "found" && item.source === "velte" && chatHref ? (
            <WhatsAppButton
              href={chatHref}
              label="Chat"
              className="!px-3 !py-1.5 !text-xs"
            />
          ) : item.status === "found" &&
            item.source === "external" &&
            item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              View
              <ExternalLinkIcon size={12} />
            </a>
          ) : (
            <span />
          )}
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

        {expanded && alternatives.length > 0 && (
          <div className="mt-1 space-y-1.5 border-t border-gray-100 pt-2">
            {alternatives.map((r) => (
              <PlanResultRow key={r.id} result={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// A small stat in the summary sidebar — a count and what it means, reused
// four times (found/no match/failed/pending) rather than four hand-styled
// blocks.
function CountStat({
  icon,
  value,
  label,
  tone = "default",
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600"
      : tone === "bad"
        ? "text-red-600"
        : tone === "warn"
          ? "text-amber-600"
          : "text-gray-500";
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-100 px-2.5 py-2">
      <span className={toneClass}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight text-ink">{value}</p>
        <p className="truncate text-[10px] text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export function ShoppingPlanDetailView({
  plan,
  onReplaceItem,
  replacingItemId,
  now,
}: {
  plan: ShoppingPlan;
  onReplaceItem: (item: ShoppingPlanItem) => void;
  replacingItemId: string | null;
  /** For the "started X ago" strings below — read once by the PAGE (a
   *  ticking clock) rather than here, so this stays a pure render of its
   *  props instead of calling Date.now() during render (react-hooks/purity). */
  now: number;
}) {
  const spentKobo = plan.items.reduce(
    (sum, it) => sum + (it.priceKobo ?? 0),
    0,
  );
  const overBudget = spentKobo > plan.totalBudgetKobo;
  const foundCount = plan.items.filter((it) => it.status === "found").length;
  const noMatchCount = plan.items.filter(
    (it) => it.status === "no_match",
  ).length;
  const failedCount = plan.items.filter((it) => it.status === "failed").length;
  const pendingCount = plan.items.filter(
    (it) => it.status === "pending",
  ).length;
  const allFound = foundCount === plan.items.length;
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      {/* ── Checklist, grouped by category ─────────────────────────────── */}
      <div className="order-2 space-y-5 lg:order-1">
        {plan.categories.map((cat) => {
          const items = byCategory.get(cat.label) ?? [];
          if (!items.length) return null;
          const catFound = items.filter((it) => it.priceKobo != null).length;
          return (
            <section
              key={cat.label}
              className="rounded-2xl border border-gray-100 bg-surface p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">{cat.label}</h3>
                <span className="shrink-0 text-xs text-gray-400">
                  {catFound}/{items.length} found
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((it) => (
                  <ItemCard
                    key={it.id}
                    item={it}
                    onReplace={onReplaceItem}
                    replacing={replacingItemId === it.id}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Summary sidebar ─────────────────────────────────────────────── */}
      <aside className="order-1 space-y-4 lg:sticky lg:top-4 lg:order-2">
        <div className="rounded-2xl border border-gray-100 bg-surface p-5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-bold leading-snug text-ink">
              {plan.goalText}
            </h2>
            {building && (
              <span className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                Searching…
              </span>
            )}
          </div>

          {plan.location?.area || plan.location?.state ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
              <MapPinIcon size={12} />
              {[plan.location.area, plan.location.state]
                .filter(Boolean)
                .join(", ")}
            </p>
          ) : null}

          <div
            className={cn(
              "mt-3 rounded-xl border px-3 py-2.5 text-xs font-medium leading-relaxed",
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
              ? `${resolvedCount} of ${plan.items.length} items checked so far. You can leave this page — we'll text you and flag it here when it's done.`
              : overBudget
                ? `You're currently ${kobo(spentKobo - plan.totalBudgetKobo)} over budget.`
                : allFound
                  ? `🎉 Results for all ${plan.items.length} items, ${kobo(plan.totalBudgetKobo - spentKobo)} under budget.`
                  : foundCount === 0
                    ? failedCount === plan.items.length
                      ? "The search failed for every item — try Retry below, or check back shortly."
                      : "Couldn't find a match for any of these yet — try Replace below, or check back later."
                    : `Found results for ${foundCount} of ${plan.items.length} items.${
                        failedCount
                          ? ` ${failedCount} search${failedCount === 1 ? "" : "es"} failed and can be retried.`
                          : ""
                      }`}
          </div>

          {building && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-orange-500 transition-[width] duration-500 ease-out"
                style={{
                  width: `${plan.items.length > 0 ? Math.round((resolvedCount / plan.items.length) * 100) : 0}%`,
                }}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-surface p-5">
          <BudgetGauge
            spentKobo={spentKobo}
            totalBudgetKobo={plan.totalBudgetKobo}
          />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-surface p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Item breakdown
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <CountStat
              icon={<CheckCircleIcon size={16} />}
              value={foundCount}
              label="Found"
              tone="good"
            />
            <CountStat
              icon={<XCircleIcon size={16} />}
              value={noMatchCount}
              label="No match"
              tone="default"
            />
            <CountStat
              icon={<PackageIcon size={16} />}
              value={failedCount}
              label="Failed"
              tone={failedCount > 0 ? "bad" : "default"}
            />
            <CountStat
              icon={<LoaderIcon size={16} />}
              value={pendingCount}
              label="Pending"
              tone={pendingCount > 0 ? "warn" : "default"}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-surface p-5 text-xs text-gray-500">
          <p className="flex items-center gap-1.5">
            <CalendarIcon size={13} />
            Started {timeAgo(plan.createdAt, now)}
          </p>
          {plan.completedAt && (
            <p className="mt-1.5 flex items-center gap-1.5">
              <ClockIcon size={13} />
              Completed {timeAgo(plan.completedAt, now)}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
