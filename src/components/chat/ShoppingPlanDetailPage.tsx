"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ArrowLeftIcon } from "@/components/icons";
import { useNavigation } from "@/components/chat/ChatNavigationProgressContext";
import { ShoppingPlanDetailView } from "@/components/search/ShoppingPlanDetailView";
import { fetchShoppingPlan } from "@/services/shoppingPlans";
import type { ShoppingPlan, ShoppingPlanItem } from "@/types/search";

// One plan's own management view (2026-09-06) — reached from PlansPage.tsx.
//
// REDESIGNED 2026-09-11 to a full-width, richer layout
// (ShoppingPlanDetailView — see that file's own header for why it's a
// separate component from the compact ShoppingPlanView the in-chat turn
// card still uses, rather than a reskin of it). Replace is still the only
// edit surface here — see the product plan's own v1 scoping note on why
// (comparisonTemplate.ts-style "prove the deterministic pick first"
// reasoning).
export function ShoppingPlanDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { navigate } = useNavigation();
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  // For ShoppingPlanDetailView's "started X ago" strings — read as a ticking
  // clock here (the page) rather than via Date.now() inside that component's
  // own render, which react-hooks/purity rejects.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["buyer", "shopping-plan", id],
    queryFn: () => fetchShoppingPlan(id),
    // Live progress while this ONE plan is still building (2026-09-10) —
    // same reasoning as PlansPage.tsx's own refetchInterval, just scoped to
    // the single plan this page is looking at.
    refetchInterval: (query) =>
      query.state.data?.plan.status === "building" ? 3000 : false,
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
      {/* Full width now (was `max-w-2xl mx-auto`) — capped generously on
          very wide monitors, same recipe as PlansPage.tsx's own container. */}
      <div className="mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8 lg:px-10">
        <button
          type="button"
          onClick={() => navigate("/chat/plans")}
          className="mb-5 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700"
        >
          <ArrowLeftIcon size={14} />
          Your plans
        </button>

        {isLoading && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="h-64 animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />
            <div className="h-64 animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-gray-100 bg-surface p-5 text-center">
            <p className="text-sm text-gray-500">
              Couldn&apos;t load this plan — it may not exist, or belongs to a
              different account.
            </p>
          </div>
        )}

        {plan && (
          <ShoppingPlanDetailView
            plan={plan}
            replacingItemId={replacingItemId}
            onReplaceItem={(item) => void onReplaceItem(item)}
            now={now}
          />
        )}
      </div>
    </div>
  );
}
