"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ArrowLeftIcon } from "@/components/icons";
import { ShoppingPlanView } from "@/components/search/ShoppingPlanTemplate";
import { fetchShoppingPlan } from "@/services/shoppingPlans";
import type { ShoppingPlan, ShoppingPlanItem } from "@/types/search";

// One plan's own management view (2026-09-06) — reached from PlansPage.tsx,
// reusing the exact same ShoppingPlanView the composer's own "just built
// this" turn renders inline, so a plan looks identical whether the buyer is
// looking at it moments after building it or a week later from this page.
// Replace is the only edit surface here too — see the product plan's own
// v1 scoping note on why (comparisonTemplate.ts-style "prove the
// deterministic pick first" reasoning).
export function ShoppingPlanDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["buyer", "shopping-plan", id],
    queryFn: () => fetchShoppingPlan(id),
  });
  const plan = data?.plan;

  async function onReplaceItem(item: ShoppingPlanItem) {
    if (!plan || replacingItemId) return;
    setReplacingItemId(item.id);
    try {
      const res = await fetch(
        `/api/shopping-plan/${plan.id}/items/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: item.label,
            targetBudgetKobo: item.targetBudgetKobo,
            excludeProductId: item.productId,
            excludeExternalOfferId: item.externalOfferId,
            location: plan.location,
          }),
        },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Couldn't replace that item.");
        return;
      }
      queryClient.setQueryData<{ plan: ShoppingPlan }>(
        ["buyer", "shopping-plan", id],
        { plan: body.plan },
      );
    } catch {
      toast.error("Couldn't replace that item.");
    } finally {
      setReplacingItemId(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/chat/plans"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700"
        >
          <ArrowLeftIcon size={14} />
          Your plans
        </Link>

        {isLoading && (
          <div className="h-64 animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />
        )}

        {isError && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
            <p className="text-sm text-gray-500">
              Couldn&apos;t load this plan — it may not exist, or belongs to a
              different account.
            </p>
          </div>
        )}

        {plan && (
          <ShoppingPlanView
            plan={plan}
            replacingItemId={replacingItemId}
            onReplaceItem={(item) => void onReplaceItem(item)}
          />
        )}
      </div>
    </div>
  );
}
