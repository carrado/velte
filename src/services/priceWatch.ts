import { api } from "@/lib/api-client";
import type { PriceWatch } from "@/types/priceWatch";

export function fetchMyWatches(): Promise<{ watches: PriceWatch[] }> {
  return api.get<{ watches: PriceWatch[] }>("/api/price-watch");
}

export function removeWatch(id: string): Promise<{ ok: boolean }> {
  return api.del<{ ok: boolean }>(`/api/price-watch/${id}`);
}
