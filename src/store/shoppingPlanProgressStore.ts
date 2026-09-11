import { create } from "zustand";
import { toast } from "sonner";

import type { ShoppingPlanSummary } from "@/types/search";

// Cross-route Shopping Plan progress (2026-09-10) — a plan build now runs in
// the background server-side (see /api/shopping-plan/route.ts's own rewrite
// comment), which means the buyer can navigate to Your Plans, or anywhere
// else under /chat, and the build keeps going without them watching it. This
// store is what makes that progress visible from anywhere: it lives at the
// /chat LAYOUT level (see ShoppingPlanProgressWatcher, mounted in
// chat/layout.tsx next to VendorSessionSync/ReferralCapture), so it keeps
// polling across a route change between /chat and /chat/plans, unlike any
// per-turn state that lives inside SearchHome and unmounts with it.
//
// Deliberately polls GET /api/shopping-plan/mine — the same thin summary list
// Your Plans itself renders from — rather than adding a second endpoint. One
// indexed query, cheap enough to poll continuously while any /chat page is
// open.

const FAST_POLL_MS = 3000;
const IDLE_POLL_MS = 15000;

interface ShoppingPlanProgressState {
  /** Every plan currently "building", most recently created first — empty
   *  when nothing is in flight, which is what tells the badge to render
   *  nothing rather than an idle icon. */
  buildingPlans: ShoppingPlanSummary[];
}

export const useShoppingPlanProgressStore = create<ShoppingPlanProgressState>()(
  () => ({
    buildingPlans: [],
  }),
);

// Module-level, not store state — this is bookkeeping for the poll loop
// itself, not something any component should ever read or react to directly.
//
// `toastedIds` is only a WITHIN-SESSION guard against double-toasting the
// same plan between two ticks (the acknowledgement write is in flight while
// the next tick is already running); the durable answer to "has this buyer
// already been told?" is the plan's own `notificationAcknowledgedAt`,
// server-side. Browser memory cannot answer it: a refresh clears this Set,
// and the first poll after one would re-announce every plan that finished
// while the buyer was away — forever, on every page load.
const toastedIds = new Set<string>();
let pollingStarted = false;

/** Records that this buyer has SEEN a plan's completion toast, so no later
 *  poll (or page load) announces it again. Best-effort by design: failing to
 *  record an acknowledgement is worth one duplicate toast, never a thrown
 *  error in a background loop. */
async function acknowledge(planId: string): Promise<void> {
  try {
    await fetch(`/api/shopping-plan/${planId}/acknowledge`, { method: "POST" });
  } catch {
    /* a repeat toast is a smaller problem than a broken poll loop */
  }
}

function truncate(text: string, max = 60): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

async function pollOnce(): Promise<void> {
  try {
    const res = await fetch("/api/shopping-plan/mine");
    if (!res.ok) return;
    const data = (await res.json().catch(() => null)) as {
      plans?: ShoppingPlanSummary[];
    } | null;
    const plans = data?.plans ?? [];
    const building = plans.filter((p) => p.status === "building");

    // Anything finished but not yet acknowledged is owed a toast — and that
    // is deliberately NOT limited to plans this session watched turn from
    // building to done. A buyer whose plan finished while the tab was closed
    // (the whole point of a background job) has never been told, and is owed
    // it on their next visit just the same. `notificationAcknowledgedAt` is
    // what keeps that from becoming a toast on every page load forever.
    const owed = plans.filter(
      (p) =>
        p.status !== "building" &&
        p.status !== "archived" &&
        p.notificationAcknowledgedAt == null &&
        p.itemCount > 0 &&
        !toastedIds.has(p.id),
    );

    for (const plan of owed) {
      toastedIds.add(plan.id);
      // Honest about what was actually found — "complete 🎉" over a plan
      // where one of nine items turned anything up would be a lie the buyer
      // discovers the moment they open it.
      const allFound = plan.foundCount === plan.itemCount;
      const nothingFound = plan.foundCount === 0;
      const title = nothingFound
        ? `"${truncate(plan.goalText)}" finished — but nothing turned up`
        : allFound
          ? `"${truncate(plan.goalText)}" is ready 🎉`
          : `"${truncate(plan.goalText)}" is ready`;
      const description = nothingFound
        ? "We couldn't find matches for these yet."
        : allFound
          ? `Results are in for all ${plan.itemCount} items.`
          : `Found results for ${plan.foundCount} of ${plan.itemCount} items.`;

      const show = nothingFound ? toast : toast.success;
      show(title, {
        description,
        duration: 10000,
        action: {
          label: "View plan",
          onClick: () => {
            window.location.href = `/chat/plans/${plan.id}`;
          },
        },
      });
      // Marked seen the moment it is shown, not on the click — a toast the
      // buyer dismissed was still a toast they saw.
      void acknowledge(plan.id);
    }
    useShoppingPlanProgressStore.setState({ buildingPlans: building });
  } catch {
    // A failed poll just tries again next tick — never worth surfacing to
    // the buyer, and never a reason to stop polling altogether.
  } finally {
    const next =
      useShoppingPlanProgressStore.getState().buildingPlans.length > 0
        ? FAST_POLL_MS
        : IDLE_POLL_MS;
    setTimeout(pollOnce, next);
  }
}

/** Starts the poll loop, once per page load — safe to call from every
 *  mount of the watcher component (StrictMode's double-invoke included);
 *  a second call while already running is a no-op. Never stopped: it's
 *  cheap while idle (15s cadence) and /chat's layout is mounted for as
 *  long as the buyer is anywhere under it anyway. */
export function startShoppingPlanProgressPolling(): void {
  if (pollingStarted) return;
  pollingStarted = true;
  void pollOnce();
}
