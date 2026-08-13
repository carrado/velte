"use client";

import { createNavigationProgress } from "@/lib/create-navigation-progress";
import {
  getBuyerPrefetchTasks,
  getBuyerRouteKey,
  normalizeBuyerHref,
} from "@/lib/buyer-prefetch-routes";

// The buyer dashboard's instance (/buyer/*) of the same navigation-progress
// factory the vendor dashboard's NavigationProgressContext uses — same top
// orange progress bar, same "prefetch the next page's data before pushing"
// behavior, just pointed at buyer routes/query keys via
// buyer-prefetch-routes.ts. See create-navigation-progress.tsx for the
// actual provider/state machine both instances share.
export const {
  NavigationProgressProvider: BuyerNavigationProgressProvider,
  useNavigation: useBuyerNavigation,
} = createNavigationProgress({
  getRouteKey: getBuyerRouteKey,
  getPrefetchTasks: getBuyerPrefetchTasks,
  normalizeHref: normalizeBuyerHref,
});
