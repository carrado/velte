"use client";

import { ACTION_LABEL, CREDIT_COST, type CreditAction } from "@/lib/credits";
import { CREDIT_PACKS } from "@/lib/creditPacks";
import { cn } from "@/lib/utils";

// What credits are and what they buy (2026-08-31).
//
// Replaces the plans page's body. The pricing table it succeeds it had three
// columns of tiers to compare; this has none, because there is nothing to
// choose BETWEEN any more — one balance, published prices, top up when you
// need it. Shopping is need-driven, and a subscription charged most of its
// users in months they never opened the app.
//
// Container-agnostic, exactly as PlansContent was: it takes what it renders as
// props and draws a plain column, so the modal supplies the frame and this
// file never has to know it is in one.

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/** The order a buyer should read the price list in — cheapest first, so the
 *  eye lands on "a search is one credit" before anything else. Derived from
 *  the cost table rather than written down, so a new action can never be
 *  missing from the page that explains the prices. */
const PRICED_ACTIONS = (Object.keys(CREDIT_COST) as CreditAction[]).sort(
  (a, b) => CREDIT_COST[a] - CREDIT_COST[b],
);

export function CreditsPanel({
  balance,
  isGuest,
  onTopUp,
  busyPack,
}: {
  /** What this viewer has. For a guest this is their browser-side balance. */
  balance: number | null;
  isGuest: boolean;
  onTopUp: (packId: string) => void;
  /** The pack currently opening a checkout, if any. */
  busyPack: string | null;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 sm:px-8">
      <div className="mt-8 text-center sm:mt-12">
        <h1 className="text-3xl font-bold tracking-tight text-balance text-[#023337] sm:text-[2.4rem] sm:leading-[1.1]">
          Only pay when you&apos;re shopping
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-pretty text-gray-600 sm:text-base">
          No subscription. Credits don&apos;t expire — top up when you have
          something to buy, and they&apos;re there next time you do.
        </p>
      </div>

      {/* The gauge. One number, because that is the whole promise of this
          model — a buyer should never have to work out which of six
          allowances applies to what they are about to do. */}
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
          Your balance
        </p>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-[#023337]">
          {balance === null ? "—" : balance}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {balance === null
            ? "Checking…"
            : balance === 0
              ? "Top up to keep going"
              : `about ${balance} more searches`}
        </p>
        {isGuest && (
          <p className="mt-3 text-sm font-semibold text-orange-600">
            Create a free account and get 15 credits.
          </p>
        )}
      </div>

      {/* What things cost. Published rather than hidden behind a tier, which
          is the point: a buyer can see exactly what an action will take
          before they take it. */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-[#023337]">
          What things cost
        </h2>
        <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {PRICED_ACTIONS.map((action) => (
            <li
              key={action}
              className="flex items-baseline justify-between gap-3 px-4 py-3"
            >
              <span className="min-w-0 truncate text-sm text-gray-700 capitalize">
                {ACTION_LABEL[action]}
                {action === "watch" && (
                  <span className="text-gray-400"> · 30 days</span>
                )}
              </span>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-[#023337]">
                {CREDIT_COST[action]}
              </span>
            </li>
          ))}
          {/* Free, and worth saying so out loud — it is the thing that makes
              the fair-price check worth running. */}
          <li className="flex items-baseline justify-between gap-3 px-4 py-3">
            <span className="text-sm text-gray-700">
              &ldquo;Should I buy this?&rdquo; verdict
            </span>
            <span className="shrink-0 text-sm font-semibold text-orange-600">
              Free
            </span>
          </li>
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-[#023337]">Top up</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => onTopUp(pack.id)}
              disabled={busyPack !== null}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                pack.highlight
                  ? "border-orange-300 ring-1 ring-orange-200"
                  : "border-gray-200 hover:border-gray-300",
              )}
            >
              <span>
                <span className="block font-mono text-lg font-bold tabular-nums text-[#023337]">
                  {pack.credits}
                  <span className="ml-1 text-xs font-medium text-gray-500">
                    credits
                  </span>
                </span>
                {pack.bonus > 0 && (
                  <span className="mt-0.5 block text-xs font-semibold text-orange-600">
                    +{pack.bonus} bonus
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm font-semibold text-[#023337]">
                {busyPack === pack.id ? "Opening…" : naira(pack.priceNgn)}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Paid with any Nigerian card through Paystack. Credits never expire,
          and there is no recurring charge — nothing renews unless you buy
          again.
        </p>
      </div>
    </div>
  );
}
