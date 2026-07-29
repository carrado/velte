import { api } from "@/lib/api-client";
import type { Store, UpdateStorePayload } from "@/types/store";

export const storeApi = {
  getMyStore: async (): Promise<Store> => {
    const { store } = await api.get<{ store: Store }>("/api/store");
    return store;
  },

  updateMyStore: async (payload: UpdateStorePayload): Promise<Store> => {
    const { store } = await api.put<{ store: Store }>("/api/store", payload);
    return store;
  },
};
