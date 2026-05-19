"use client";

import { useState, useRef, useCallback, type ChangeEvent } from "react";
import { Search, Loader2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { searchService } from "@/services/search";
import { queryKeys } from "@/lib/query-keys";
import { useNavigation } from "@/components/NavigationProgressContext";
import { SearchResultSection } from "@/components/SearchResultList";
import type { SearchEntityType } from "@/types/search";

const DEBOUNCE_MS = 400;
const MIN_QUERY_LEN = 2;
const RESULTS_LIMIT = 8;

const ENTITY_ORDER: SearchEntityType[] = [
  "order",
  "product",
  "customer",
  "transaction",
  "category",
];

export default function SearchPage() {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const { navigate } = useNavigation();

  const userId = pathname.split("/")[1];

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.length >= MIN_QUERY_LEN) {
      timerRef.current = setTimeout(() => {
        setDebouncedQuery(val.trim());
      }, DEBOUNCE_MS);
    } else {
      setDebouncedQuery("");
    }
  }, []);

  const handleClear = useCallback(() => {
    setInputValue("");
    setDebouncedQuery("");
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const hasQuery = debouncedQuery.length >= MIN_QUERY_LEN;

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.search.results(debouncedQuery),
    queryFn: () =>
      searchService.search({ q: debouncedQuery, limit: RESULTS_LIMIT }, userId),
    enabled: hasQuery,
    staleTime: 30_000,
    retry: false,
  });

  const groups = data
    ? ENTITY_ORDER.filter((type) => {
        const key = `${type}s` as keyof typeof data;
        return (data[key] as unknown[]).length > 0;
      }).map((type) => {
        const key = `${type}s` as keyof typeof data;
        return [type, data[key]] as [SearchEntityType, typeof data.orders];
      })
    : [];

  const hasResults = groups.length > 0;
  const showEmpty = hasQuery && !isFetching && !hasResults;

  return (
    <div className="flex flex-col gap-4">
      {/* Search input */}
      <div className="relative flex items-center">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          autoComplete="new-password"
          value={inputValue}
          onChange={handleChange}
          placeholder="Search orders, products, customers…"
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E5E7EB] bg-white text-dash-body text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        {inputValue ? (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        ) : isFetching ? (
          <Loader2
            size={15}
            className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-orange-400"
          />
        ) : null}
      </div>

      {/* Results container */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {!hasQuery && (
          <p className="px-4 py-8 text-dash-caption text-gray-400 text-center">
            Search across orders, products, customers, transactions and more
          </p>
        )}

        {hasQuery && isFetching && !hasResults && (
          <div className="px-4 py-8 flex items-center justify-center gap-2 text-dash-caption text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            <span>Searching…</span>
          </div>
        )}

        {showEmpty && (
          <p className="px-4 py-8 text-dash-caption text-gray-500 text-center">
            No results for &ldquo;{debouncedQuery}&rdquo;
          </p>
        )}

        {groups.map(([type, items]) => (
          <SearchResultSection
            key={type}
            type={type}
            items={items}
            onSelect={(href) => navigate(href)}
          />
        ))}
      </div>
    </div>
  );
}
