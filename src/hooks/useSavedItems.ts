"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";

import { buyerApi } from "@/lib/buyer-api-client";
import { ApiError } from "@/lib/api-client";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import type { MarketplaceBrowseItem, VendorPreviewItem } from "@/types/store";

export type SavedKind = "product" | "vendor";

interface SavedResponse {
  products: MarketplaceBrowseItem[];
  vendors: VendorPreviewItem[];
}

interface SaveIntent {
  kind: SavedKind;
  targetId: string;
}

// Same draft-preserving 401 pattern as requests/new/page.tsx's own
// createMutation.onError — a tap that hits "not verified yet" shouldn't be
// thrown away, it should replay the moment the buyer verifies. sessionStorage,
// not the query cache: it has to survive the full navigation to /buyer/auth
// and back.
const SAVE_INTENT_KEY = "velte-pending-save-intent";

function stashIntent(intent: SaveIntent) {
  sessionStorage.setItem(SAVE_INTENT_KEY, JSON.stringify(intent));
}

function readAndClearIntent(): SaveIntent | null {
  const raw = sessionStorage.getItem(SAVE_INTENT_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(SAVE_INTENT_KEY);
  try {
    return JSON.parse(raw) as SaveIntent;
  } catch {
    return null;
  }
}

/* Centralizes Saved/Follow state for the whole buyer app — one shared query
 * (["buyer-saved", "my"]) so a heart tapped on one page is instantly
 * reflected everywhere else a SaveButton for that same item renders, one
 * toggle mutation every SaveButton shares, and the registration-gate
 * replay: an unauthenticated tap stashes {kind, targetId}, redirects to
 * verify, and THIS hook auto-applies it the moment a buyer session exists
 * again — on whichever page happens to mount next, not just the one the
 * tap originated on (the buyer lands back wherever `redirect` sent them,
 * which may not be the same page). */
export function useSavedItems() {
  const router = useRouter();
  const pathname = usePathname();
  const { buyer } = useBuyerSession();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-saved", "my"],
    queryFn: () => buyerApi.get<SavedResponse>("/api/buyer-saved/my"),
    enabled: !!buyer,
    retry: false,
  });

  const products = data?.products ?? [];
  const vendors = data?.vendors ?? [];
  const savedProductIds = new Set(products.map((p) => p.id));
  const savedVendorIds = new Set(vendors.map((v) => v.vendorId));

  function isSaved(kind: SavedKind, targetId: string): boolean {
    return kind === "product"
      ? savedProductIds.has(targetId)
      : savedVendorIds.has(targetId);
  }

  const toggleMutation = useMutation({
    mutationFn: (intent: SaveIntent) =>
      buyerApi.post<{ saved: boolean }>("/api/buyer-saved/toggle", intent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-saved", "my"] });
    },
    onError: (error: unknown, intent) => {
      if (error instanceof ApiError && error.status === 401) {
        stashIntent(intent);
        router.push(
          `/buyer/auth?redirect=${encodeURIComponent(pathname)}&reason=save`,
        );
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : "Couldn't save that. Try again.";
      toast.error(message);
    },
  });

  function toggle(kind: SavedKind, targetId: string) {
    toggleMutation.mutate({ kind, targetId });
  }

  // Runs once per hook instance; sessionStorage being cleared on read makes
  // several SaveButtons/consumers mounting at once harmless — whichever
  // effect fires first wins the read, the rest find nothing.
  const replayedRef = useRef(false);
  useEffect(() => {
    if (!buyer || replayedRef.current) return;
    const intent = readAndClearIntent();
    if (!intent) return;
    replayedRef.current = true;
    toggleMutation.mutate(intent);
    toast.success(intent.kind === "vendor" ? "Vendor followed." : "Saved.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyer]);

  return {
    products,
    vendors,
    isLoading: isLoading && !!buyer,
    isSaved,
    toggle,
    isToggling: toggleMutation.isPending,
  };
}
