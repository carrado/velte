"use client";

import { createNavigationProgress } from "@/lib/create-navigation-progress";
import {
  getPrefetchTasks,
  getRouteKey,
  normalizeDashboardHref,
} from "@/lib/prefetch-routes";

// The vendor dashboard's instance (/[id]/*) of the shared navigation-
// progress factory — see create-navigation-progress.tsx for the actual
// provider/state machine. This file now just supplies vendor-specific
// config (prefetch-routes.ts's userId-aware route keys/hrefs) and re-
// exports under the same names every existing call site already imports,
// so nothing else in the vendor dashboard needed to change.
const { NavigationProgressProvider, useNavigation } = createNavigationProgress({
  getRouteKey,
  getPrefetchTasks,
  normalizeHref: normalizeDashboardHref,
});

export { NavigationProgressProvider, useNavigation };
