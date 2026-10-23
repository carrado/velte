"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { fetchHubHome, hubPageQueryOptions } from "@/services/hub";
import { BuyerHub } from "./BuyerHub";

export function BuyerHubScreen() {
  const {
    data: home,
    isError,
    isPending,
  } = useQuery({
    queryKey: queryKeys.hub.home("buyer"),
    queryFn: () => fetchHubHome("buyer"),
    ...hubPageQueryOptions,
  });

  if (isError) {
    return (
      <div className="bg-surface border border-gray-200 rounded-2xl p-10 text-center">
        <p className="font-semibold text-ink">Couldn&apos;t load the Hub</p>
        <p className="text-sm text-gray-500 mt-1">
          Check your connection and try again.
        </p>
      </div>
    );
  }

  if (isPending || !home) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-56 rounded-2xl bg-gray-100" />
        <div className="h-20 rounded-2xl bg-gray-100" />
        <div className="h-72 rounded-2xl bg-gray-100" />
      </div>
    );
  }

  return <BuyerHub home={home} />;
}
