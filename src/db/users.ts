// db/users.ts
import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { apiClient } from "@/lib/api"; // your API client
import { QueryClient } from "@tanstack/query-core";

const queryClient = new QueryClient();

// Create the collection
export const usersCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await apiClient("/users");
      return res;
    },
    queryClient,
    getKey: (user: any) => user,
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0] as any;
      await apiClient(`/users/${original.id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
    },
  }),
);
