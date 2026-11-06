import { api } from "@/lib/api-client";
import type {
  PublicProductDetail,
  Store,
  UpdateStorePayload,
} from "@/types/store";

/** Same contract as hub page queries: prefetch is the fetch; arrival reads cache. */
export const publicProductPageQueryOptions = {
  staleTime: Infinity,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
} as const;

export const storeApi = {
  getMyStore: async (): Promise<Store> => {
    const { store } = await api.get<{ store: Store }>("/api/store");
    return store;
  },

  updateMyStore: async (payload: UpdateStorePayload): Promise<Store> => {
    const { store } = await api.put<{ store: Store }>("/api/store", payload);
    return store;
  },

  getPublicProductBySlug: (slug: string): Promise<PublicProductDetail> =>
    api.get<PublicProductDetail>(
      `/api/store/products/by-slug/${encodeURIComponent(slug)}`,
    ),
};
