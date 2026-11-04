"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { notFound, useRouter } from "next/navigation";

import { PublicProductDetailView } from "@/components/products/PublicProductDetailView";
import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { publicProductPageQueryOptions, storeApi } from "@/services/store";

/**
 * Client product page — shares query key with Hub (and other) nav prefetch
 * so a Hub listing click lands from cache under the progress bar, same as
 * every other prefetch-routed screen.
 */
export function PublicProductPageClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.store.productBySlug(slug),
    queryFn: () => storeApi.getPublicProductBySlug(slug),
    ...publicProductPageQueryOptions,
  });

  useEffect(() => {
    if (!data) return;
    const canonical = data.product.slug || data.product.id;
    if (canonical && canonical !== slug) {
      router.replace(`/${canonical}`);
    }
  }, [data, slug, router]);

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm font-semibold text-ink">
          Couldn&apos;t load this product
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {error instanceof Error ? error.message : "Try again in a moment."}
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
          <div className="space-y-4">
            <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />
            <div className="aspect-[4/3] animate-pulse rounded-2xl bg-gray-100 sm:aspect-[5/4]" />
          </div>
          <div className="space-y-3 pt-2">
            <div className="h-8 w-3/4 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-5 w-1/3 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-10 w-1/2 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  return <PublicProductDetailView data={data} />;
}
