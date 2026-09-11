"use client";

import { createNavigationProgress } from "@/lib/create-navigation-progress";
import {
  getChatPrefetchTasks,
  getChatRouteKey,
  normalizeChatHref,
} from "@/lib/prefetch-routes-chat";

// The /chat tree's instance of the shared navigation-progress factory
// (2026-09-11, per explicit request: "I want the chat to work like the
// vendor dashboard" — before routing to a new /chat page, prefetch that
// page's own data with a real top progress bar, and only push once it's
// resolved, so the destination renders instantly instead of showing its own
// loading state). See create-navigation-progress.tsx for the actual
// provider/state machine (shared with the vendor dashboard's own instance,
// NavigationProgressContext.tsx) — this file only supplies /chat-specific
// config.
const { NavigationProgressProvider, useNavigation } = createNavigationProgress({
  getRouteKey: getChatRouteKey,
  getPrefetchTasks: getChatPrefetchTasks,
  normalizeHref: normalizeChatHref,
});

export { NavigationProgressProvider, useNavigation };
