import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { buyerApi } from "@/lib/buyer-api-client";
import { useBuyerStore } from "@/store/buyerStore";
import type { Buyer } from "@/types/buyer";

/* Hydrates the buyer from a live session cookie if the in-memory store is
 * empty — lets a returning, already-verified phone skip straight past the
 * OTP form on a fresh page load instead of asking again. */
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
