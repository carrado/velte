import { fetchMyRequests } from "@/services/buyerRequests";
import { fetchNotifications } from "@/services/notifications";
import {
  fetchShoppingListJob,
  fetchShoppingListJobs,
} from "@/services/shoppingList";
import { useBuyerStore } from "@/store/buyerStore";
import type { PrefetchTask } from "@/lib/prefetch-routes";

// The /chat tree's own instance of the vendor dashboard's "prefetch the next
// page's data before pushing" pattern (2026-09-11, per explicit request:
// "I want the chat to work like the vendor dashboard"). Kept as its own
// file rather than folded into prefetch-routes.ts — that file's route keys,
// hrefs and userId-prefixing are all specific to the vendor tree, and this
// one answers to a differently-shaped shell (no userId segment, and every
// gated page here also has to behave for a signed-out GUEST, which the
// vendor dashboard never has to consider — see the buyer check below).

export function getChatRouteKey(href: string): string {
  // "/chat/requests" → "requests", "/chat" → "". Mirrors prefetch-routes.ts's
  // own getRouteKey, just stripping the "chat" segment (this tree's shell
  // root) instead of a userId.
  const segments = href.split("/").filter(Boolean);
  return segments.slice(1).join("/");
}

// Every route below is buyer-only — a signed-out visitor gets an empty task
// list (never a wasted, guaranteed-401 request), and lands on the
// destination page instantly, where that page's own existing "sign in to
// see this" state renders exactly as it does today. Checked once, here,
// rather than in each case, since the answer is the same everywhere.
export function getChatPrefetchTasks(routeKey: string): PrefetchTask[] {
  const buyer = useBuyerStore.getState().buyer;
  if (!buyer) return [];

  // Dynamic route first, same rule prefetch-routes.ts follows for its own
  // listing detail match — the static switch below can't match a jobId.
  const jobMatch = routeKey.match(/^shopping-list\/([^/]+)$/);
  if (jobMatch) {
    const jobId = jobMatch[1];
    return [
      {
        queryKey: ["shopping-list", jobId],
        queryFn: () => fetchShoppingListJob(jobId),
      },
    ];
  }

  switch (routeKey) {
    case "requests":
      return [
        {
          queryKey: ["buyer", "requests"],
          queryFn: fetchMyRequests,
        },
      ];
    case "notifications":
      return [
        {
          queryKey: ["notifications"],
          queryFn: fetchNotifications,
        },
      ];
    case "shopping-list":
      return [
        {
          queryKey: ["shopping-list", "mine"],
          queryFn: fetchShoppingListJobs,
        },
      ];
    // "" (bare /chat) and anything else this tree doesn't recognise — no
    // page-blocking data to prefetch, same as the vendor config's default.
    default:
      return [];
  }
}

/** Every href in this tree is already an absolute in-app path
 *  ("/chat/requests", "/chat/requests/<id>", …) — nothing to prefix, unlike
 *  the vendor dashboard's userId-aware normalizeDashboardHref. */
export function normalizeChatHref(href: string): string {
  return href;
}
