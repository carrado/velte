import { ApiError, api } from "@/lib/api-client";
import type { HubContext, HubHome, HubVendorAdvert } from "@/types/hub";

// The page-blocking Hub reads. The nav prefetch and the pages share these
// so a click on Vendors Hub lands with the data already in cache.
//
// Same contract as the products list: the prefetch is the fetch. Arrival
// reads the cache and does not ask again.
export const hubPageQueryOptions = {
  staleTime: Infinity,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
} as const;

export async function fetchHubHome(
  scope?: "vendor" | "buyer",
): Promise<HubHome> {
  if (scope === "vendor") {
    return api.get<HubHome>("/api/hub/home?scope=vendor");
  }
  const path =
    scope === "buyer" ? "/api/hub/home?scope=buyer" : "/api/hub/home";
  const res = await fetch(path);
  if (!res.ok) throw new ApiError(res.status, "Couldn't load the Hub.");
  return (await res.json()) as HubHome;
}

export function fetchHubContext() {
  return api.get<HubContext>("/api/hub/context");
}

export async function fetchHubAdverts() {
  try {
    return await api.get<HubVendorAdvert[]>("/api/hub/adverts");
  } catch {
    return [] as HubVendorAdvert[];
  }
}
