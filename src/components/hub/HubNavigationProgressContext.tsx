"use client";

import { createNavigationProgress } from "@/lib/create-navigation-progress";
import {
  getHubPrefetchTasks,
  getHubRouteKey,
  normalizeHubHref,
} from "@/lib/prefetch-routes-hub";

// The /hub tree's instance of the shared navigation-progress factory —
// prefetch page-blocking Hub data before push, with the top progress bar.
const { NavigationProgressProvider, useNavigation } = createNavigationProgress({
  getRouteKey: getHubRouteKey,
  getPrefetchTasks: getHubPrefetchTasks,
  normalizeHref: normalizeHubHref,
});

export { NavigationProgressProvider, useNavigation };
