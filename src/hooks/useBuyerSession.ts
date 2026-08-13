import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { buyerApi } from "@/lib/buyer-api-client";
import { useBuyerStore } from "@/store/buyerStore";
import type { Buyer } from "@/types/buyer";

/* Shared "hydrate the buyer from a live session cookie if the in-memory
 * store is empty" logic — was duplicated verbatim across the Profile page
 * and the Home hero (and now the header's avatar needs the exact same
 * thing), so it's a hook instead of a third copy. A returning, already-
 * verified buyer gets their real name/username back on a fresh page load
 * this way, not a generic/empty state until they happen to visit a page
 * that already fetches it.
 */
export function useBuyerSession() {
  const buyer = useBuyerStore((s) => s.buyer);
  const setBuyer = useBuyerStore((s) => s.setBuyer);

  const { data, isLoading } = useQuery({
    queryKey: ["buyer", "me"],
    queryFn: () => buyerApi.get<{ buyer: Buyer }>("/api/buyer-auth/me"),
    enabled: !buyer,
    retry: false,
  });

  useEffect(() => {
    if (data?.buyer) setBuyer(data.buyer);
  }, [data, setBuyer]);

  return {
    buyer: buyer ?? data?.buyer ?? null,
    isLoading: isLoading && !buyer,
  };
}
