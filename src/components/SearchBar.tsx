"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
} from "react";
import { createPortal } from "react-dom";
import { Search, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { searchService } from "@/services/search";
import { queryKeys } from "@/lib/query-keys";
import { useNavigation } from "@/components/NavigationProgressContext";
import { SearchResultSection } from "@/components/SearchResultList";
import type { SearchEntityType } from "@/types/search";

const DEBOUNCE_MS = 400;
const MIN_QUERY_LEN = 2;
const RESULTS_LIMIT = 5;

const ENTITY_ORDER: SearchEntityType[] = [
  "order",
  "product",
  "customer",
  "transaction",
  "category",
];

export default function SearchBar() {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  // readOnly=true on mount prevents browsers from autofilling saved searches.
  // Switched to false only when the user explicitly focuses the field.
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const { navigate } = useNavigation();

  const userId = pathname.split("/")[1];

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsReadOnly(true);
    setInputValue("");
    setDebouncedQuery("");
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Close and reset on route change
  useEffect(() => {
    handleClose();
  }, [pathname, handleClose]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  const handleFocus = useCallback(() => {
    setIsReadOnly(false);
    setIsOpen(true);
  }, []);

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

  const handleSelect = useCallback(
    (href: string) => {
      handleClose();
      navigate(href);
    },
    [handleClose, navigate],
  );

  // Gate on both isOpen and a meaningful query to prevent any stray API calls
  const hasQuery = isOpen && debouncedQuery.length >= MIN_QUERY_LEN;

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
    // z-50 when open → creates stacking context above sidebar (z-30) and sidebar overlay (z-20)
    <div
      className={`relative w-96 hidden md:flex items-center flex-shrink-0 ${
        isOpen ? "z-50" : ""
      }`}
    >
      <input
        type="text"
        readOnly={isReadOnly}
        autoComplete="new-password"
        name="noSearch"
        value={inputValue}
        onFocus={handleFocus}
        onChange={handleChange}
        placeholder="Search data, users, or reports"
        className="w-full pl-6 pr-10 py-2 rounded-full border border-[#E5E7EB] bg-white text-dash-body text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {isFetching ? (
          <Loader2 size={14} className="animate-spin text-orange-400" />
        ) : inputValue ? (
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        ) : (
          <Search size={15} className="text-[#9CA3AF]" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden max-h-[480px] overflow-y-auto">
          {!hasQuery && (
            <p className="px-4 py-5 text-dash-caption text-gray-400 text-center">
              Search orders, products, customers, transactions and more
            </p>
          )}

          {hasQuery && isFetching && !hasResults && (
            <div className="px-4 py-5 flex items-center justify-center gap-2 text-dash-caption text-gray-400">
              <Loader2 size={14} className="animate-spin" />
              <span>Searching…</span>
            </div>
          )}

          {showEmpty && (
            <p className="px-4 py-5 text-dash-caption text-gray-500 text-center">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}

          {groups.map(([type, items]) => (
            <SearchResultSection
              key={type}
              type={type}
              items={items}
              onSelect={handleSelect}
            />
          ))}

          {hasResults && (
            <div className="px-4 py-2.5 border-t border-gray-50 mt-1">
              <p className="text-[10px] text-gray-400 text-center">
                Press{" "}
                <kbd className="bg-gray-100 px-1 rounded text-[10px]">Esc</kbd>{" "}
                to dismiss
              </p>
            </div>
          )}
        </div>
      )}

      {/* Backdrop — portalled to body so it sits at z-40 in root stacking context,
          below the z-50 wrapper but above all other page content */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={handleClose}
          />,
          document.body,
        )}
    </div>
  );
}
