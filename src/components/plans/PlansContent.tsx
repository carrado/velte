"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

import { CheckIcon, ChevronLeftIcon } from "@/components/icons";
import { useCurrentPlan } from "@/hooks/useCurrentPlan";
import { cn } from "@/lib/utils";
import type { PlanCard } from "@/types/plan";

// The buyer plans page. A conventional three-column pricing layout on
// purpose — monthly/yearly toggle, one highlighted tier, a feature list per
// card, then a comparison table and a short FAQ. This is a page people
// arrive at ready to be sold to and needing to compare; inventing a novel
// layout here costs comprehension and buys nothing.

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/** "Unlimited" for -1, otherwise the number. Used for the allowances where
 *  -1 is the sentinel (saved lists, history). */
function limitLabel(value: number, unit: string): string {
  if (value === -1) return "Unlimited";
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

function historyLabel(days: number): string {
  if (days === -1) return "Kept forever";
  if (days === 0) return "Not kept";
  return `Kept ${days} days`;
}

/** The bullets under each card. Built from the same numbers the gate
 *  enforces, so a tier can never advertise an allowance it doesn't get. */
function featuresFor(plan: PlanCard): string[] {
  const items = [
    `${plan.textSearches} searches a month`,
    plan.photoSearches > 0
      ? `${plan.photoSearches} photo searches a month`
      : "No photo search",
    plan.priceWatches > 0
      ? `Watch up to ${plan.priceWatches} prices`
      : "No price watching",
    limitLabel(plan.savedLists, "saved list"),
    historyLabel(plan.historyDays),
  ];
  return items;
}

export function PlansContent({ plans }: { plans: PlanCard[] }) {
  const [yearly, setYearly] = useState(false);
  const { data: current } = useCurrentPlan();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(
    async (planId: string) => {
      if (busyPlan) return;
      setBusyPlan(planId);
      setError(null);
      try {
        const res = await fetch("/api/buyer-billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId,
            cycle: yearly ? "yearly" : "monthly",
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          authorizationUrl?: string;
          error?: string;
        } | null;
        if (res.status === 401) {
          throw new Error("Sign in on Velte first, then come back to upgrade.");
        }
        if (!res.ok || !data?.authorizationUrl) {
          throw new Error(data?.error ?? "Couldn't start the upgrade.");
        }
        // Full-page redirect, not a popup — popups are unreliable for buyers
        // on mobile, same reasoning as the pay page.
        window.location.href = data.authorizationUrl;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Couldn't start the upgrade.",
        );
        setBusyPlan(null);
      }
    },
    [busyPlan, yearly],
  );

  const isVendor = current?.ownerType === "vendor";
  // Signed out. Deliberately NOT treated the same as a vendor: a guest is
  // one sign-in away from subscribing, so their buttons stay live and the
  // checkout's own 401 message points them at it.
  const isGuest = current?.ownerType === "guest";

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-20">
      <div className="mx-auto max-w-5xl px-5 pt-6 sm:px-8">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800"
        >
          <ChevronLeftIcon size={15} />
          Back to Velte
        </Link>

        <header className="mt-8 text-center">
          <h1 className="text-2xl font-bold text-[#023337] sm:text-3xl">
            Let Velte do the shopping work
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Compare options, track prices and get told when something you want
            gets cheaper. Start free — upgrade when Velte is saving you money.
          </p>
        </header>

        {/* Both notices exist for the same reason: a buyer subscription is
            bought with a BUYER account, and saying so up front beats letting
            someone pick a tier, click, and hit a 401. */}
        {isVendor && (
          <p className="mx-auto mt-6 max-w-xl rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm text-gray-600">
            You&apos;re signed in as a vendor. Velte Plus is a buyer plan — sign
            in with a buyer account to subscribe.
          </p>
        )}
        {isGuest && (
          <p className="mx-auto mt-6 max-w-xl rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm text-gray-600">
            Browse freely — you&apos;ll need to{" "}
            <Link
              href="/chat"
              className="font-semibold text-orange-600 hover:text-orange-700"
            >
              sign in on Velte
            </Link>{" "}
            before you can subscribe.
          </p>
        )}

        {/* Billing toggle. Yearly is the default OFF: the smaller commitment
            should be the one someone sees first, and the saving is stated
            rather than assumed. */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              yearly ? "text-gray-400" : "text-[#023337]",
            )}
          >
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            aria-label="Bill yearly"
            onClick={() => setYearly((v) => !v)}
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors",
              yearly ? "bg-orange-500" : "bg-gray-300",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                yearly ? "translate-x-[22px]" : "translate-x-0.5",
              )}
            />
          </button>
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              yearly ? "text-[#023337]" : "text-gray-400",
            )}
          >
            Yearly
          </span>
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
            2 months free
          </span>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = current?.plan === plan.id;
            const isFree = plan.priceNgnMonthly === 0;
            // Plus is the one most buyers should take, so it carries the
            // emphasis. Not "most popular" — nobody has bought one yet, and
            // saying so would be a straightforward lie.
            const featured = plan.id === "plus";

            const price =
              yearly && plan.priceNgnYearly != null
                ? plan.priceNgnYearly
                : plan.priceNgnMonthly;
            const period = isFree ? "" : yearly ? "/year" : "/month";

            return (
              <div
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-2xl border bg-white p-6",
                  featured
                    ? "border-orange-300 shadow-lg shadow-orange-100/60 md:-my-2 md:py-8"
                    : "border-gray-200",
                )}
              >
                {featured && (
                  <span className="mb-3 self-start rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    Recommended
                  </span>
                )}
                <h2 className="text-base font-bold text-[#023337]">
                  {plan.name}
                </h2>
                <p className="mt-3">
                  <span className="text-3xl font-extrabold text-[#023337]">
                    {isFree ? "Free" : naira(price)}
                  </span>
                  {period && (
                    <span className="ml-1 text-sm text-gray-500">{period}</span>
                  )}
                </p>
                {!isFree && yearly && plan.priceNgnYearly != null && (
                  <p className="mt-1 text-xs text-gray-500">
                    {naira(Math.round(plan.priceNgnYearly / 12))}/month, billed
                    yearly
                  </p>
                )}

                <ul className="mt-5 flex-1 space-y-2.5">
                  {featuresFor(plan).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckIcon
                        size={14}
                        className="mt-0.5 shrink-0 text-orange-500"
                      />
                      <span className="text-sm leading-relaxed text-gray-600">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {isCurrent ? (
                    <span className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-semibold text-gray-400">
                      Your plan
                    </span>
                  ) : isFree ? (
                    <Link
                      href="/chat"
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-semibold text-[#023337] transition-colors hover:bg-gray-50"
                    >
                      Start searching
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startCheckout(plan.id)}
                      disabled={busyPlan !== null || isVendor}
                      className={cn(
                        "w-full rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors disabled:opacity-60",
                        featured
                          ? "bg-orange-500 text-white hover:bg-orange-600"
                          : "border border-orange-200 text-orange-600 hover:bg-orange-50",
                      )}
                    >
                      {busyPlan === plan.id
                        ? "Opening checkout…"
                        : `Get ${plan.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-5 text-center text-sm text-red-600">{error}</p>
        )}

        {/* The comparison table. Redundant with the cards by design — someone
            deciding between two tiers wants them side by side on one axis,
            not to hold three bullet lists in their head. */}
        <div className="mt-14">
          <h2 className="text-center text-lg font-bold text-[#023337]">
            Compare plans
          </h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-2/5 py-3 text-left font-medium text-gray-500">
                    &nbsp;
                  </th>
                  {plans.map((p) => (
                    <th
                      key={p.id}
                      className="py-3 text-center font-bold text-[#023337]"
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Searches a month", (p: PlanCard) => `${p.textSearches}`],
                    [
                      "Photo searches a month",
                      (p: PlanCard) =>
                        p.photoSearches > 0 ? `${p.photoSearches}` : "—",
                    ],
                    [
                      "Price watches",
                      (p: PlanCard) =>
                        p.priceWatches > 0 ? `${p.priceWatches}` : "—",
                    ],
                    [
                      "Saved lists",
                      (p: PlanCard) =>
                        p.savedLists === -1
                          ? "Unlimited"
                          : p.savedLists === 0
                            ? "—"
                            : `${p.savedLists}`,
                    ],
                    [
                      "Search history",
                      (p: PlanCard) =>
                        p.historyDays === -1
                          ? "Forever"
                          : p.historyDays === 0
                            ? "—"
                            : `${p.historyDays} days`,
                    ],
                  ] as [string, (p: PlanCard) => string][]
                ).map(([label, get]) => (
                  <tr key={label} className="border-t border-gray-200">
                    <td className="py-3 pr-4 text-left text-gray-600">
                      {label}
                    </td>
                    {plans.map((p) => (
                      <td
                        key={p.id}
                        className="py-3 text-center font-medium text-[#023337]"
                      >
                        {get(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-14 space-y-5">
          <h2 className="text-center text-lg font-bold text-[#023337]">
            Questions
          </h2>
          {[
            {
              q: "What is a price watch?",
              a: "Tell Velte to keep an eye on something and we re-check the price for you. When it drops, you get an email and a text — with what it cost when you saved it, and what it costs now.",
            },
            {
              q: "What happens when I run out of searches?",
              a: "Nothing breaks. You're told you've reached the month's limit, and it resets on the 1st. You can upgrade at any point if you'd rather not wait.",
            },
            {
              q: "Can I cancel?",
              a: "There's nothing to cancel. A plan buys a fixed window — a month or a year — and simply ends unless you buy another. No recurring charge sits on your card.",
            },
            {
              q: "How do I pay?",
              a: "Through Paystack, with any Nigerian card. Prices are in naira and don't change with the exchange rate.",
            },
          ].map(({ q, a }) => (
            <div
              key={q}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <p className="text-sm font-semibold text-[#023337]">{q}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                {a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
