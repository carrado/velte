import { api } from "@/lib/api-client";
import { useUserStore } from "@/store/userStore";
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
    // Keep the Hub's vendorStore slice in sync immediately — no refetch needed.
    const storeRecord = store as unknown as { avatar?: string | null };
    useUserStore.getState().updateVendorStore({
      ...(store.name !== undefined && { name: store.name }),
      ...(store.handle !== undefined && { handle: store.handle ?? null }),
      ...(storeRecord.avatar !== undefined && {
        avatar: storeRecord.avatar ?? null,
      }),
      ...(store.description !== undefined && {
        description: store.description ?? null,
      }),
    });
    return store;
  },

  getPublicProductBySlug: (slug: string): Promise<PublicProductDetail> =>
    api.get<PublicProductDetail>(
      `/api/store/products/by-slug/${encodeURIComponent(slug)}`,
    ),
};
