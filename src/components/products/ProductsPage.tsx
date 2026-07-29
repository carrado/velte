"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  useQuery,
  useQueryClient,
  useMutation,
  keepPreviousData,
} from "@tanstack/react-query";
import { DollarSign, Plus, Search, X } from "lucide-react";
import { categoriesApi } from "@/services/products";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/error-message";
import { toast } from "sonner";
import type {
  CategoryProduct,
  PriceModalProps,
  ProductListParams,
} from "@/types/product";
import { useVendorSectorCapabilities } from "@/hooks/useBusinessType";
import DeleteProductModal from "./DeleteProductModal";
import ProductsTable from "./ProductsTable";
import { Pagination } from "../Pagination";
import { useNavigation } from "../NavigationProgressContext";
import { Input } from "../ui/input";

// ── Constants ─────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

// ── Price modal ───────────────────────────────────────────────────────────────

function PriceModal({ open, product, onClose, onConfirm }: PriceModalProps) {
  const [price, setPrice] = useState("");
  useEffect(() => {
    // Quote-on-request has no real price behind it (stored 0) — start blank
    // instead of prefilling a misleading "0".
    if (product)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrice(product.quoteOnRequest ? "" : product.price.toString());
  }, [product, open]);
  if (!open || !product) return null;
  const isQuote = product.quoteOnRequest === true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(price) > 0) {
      onConfirm(product.id, Number(price));
      onClose();
    }
  };

  // Portaled to document.body — rendered inline this backdrop only ever
  // covered its scrollable ancestor's box, not the real viewport (same
  // clipping bug already fixed for dropdowns via AnchoredPopover).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <DollarSign size={16} className="text-orange-600" />
            </div>
            <h2 className="text-dash-heading font-semibold text-[#023337]">
              {isQuote ? "Set Price" : "Change Price"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-dash-body text-gray-600">
            {product.kind === "service" ? "Service" : "Product"}:{" "}
            <span className="font-medium text-gray-900">{product.name}</span>
          </p>
          {isQuote && (
            <p className="text-dash-caption text-gray-500">
              This listing is currently &ldquo;Contact for quote&rdquo; —
              setting a price switches it to a fixed price buyers see upfront.
            </p>
          )}
          <div>
            <label className="block text-dash-body font-medium text-gray-700 mb-1">
              {isQuote ? "Price (₦)" : "New Price (₦)"}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 text-dash-body border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 text-dash-body font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors cursor-pointer"
          >
            {isQuote ? "Set Price" : "Update Price"}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const pathSegments = pathname.split("/").filter(Boolean);
  const userId = pathSegments[0];
  const isProductsListPage = pathSegments.at(-1) === "products";
  const { hasFood: isFood } = useVendorSectorCapabilities();

  // Search / pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [priceModal, setPriceModal] = useState<{
    open: boolean;
    product: CategoryProduct | null;
  }>({ open: false, product: null });
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    product: CategoryProduct | null;
  }>({ open: false, product: null });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset to page 1 when the search changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [debouncedSearch]);

  // ── Build query params ─────────────────────────────────────────────────────

  const queryParams = useMemo<ProductListParams>(() => {
    const params: ProductListParams = {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      sort_by: "created_at",
      sort_order: "desc",
    };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    return params;
  }, [currentPage, debouncedSearch]);

  // ── Data queries ───────────────────────────────────────────────────────────

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.products.list(queryParams),
    queryFn: () => categoriesApi.getProducts(queryParams),
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: isProductsListPage,
  });

  const products = productsData?.products ?? [];
  const totalPages = productsData?.pagination.total_pages ?? 1;
  const totalInView = productsData?.pagination.total ?? 0;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["products", "list"] });
  };

  const priceMutation = useMutation({
    mutationFn: ({ productId, price }: { productId: string; price: number }) =>
      categoriesApi.changePrice(productId, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      toast.success("Price updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // Fixed-price service → back to "Contact for quote". The stored price is
  // zeroed (and any range cleared), same as a quote listing created fresh —
  // a hidden stale price behind a quote listing is exactly what the reverse
  // direction (Set Price) exists to prevent.
  const switchToQuoteMutation = useMutation({
    mutationFn: (productId: string) =>
      categoriesApi.updateProduct(productId, {
        quote_on_request: true,
        price: 0,
        price_max: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      toast.success('Listing switched to "Contact for quote"');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => categoriesApi.deleteProduct(productId),
    onSuccess: () => {
      invalidateAll();
      setDeleteModal({ open: false, product: null });
      toast.success("Listing deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Delete failed")),
  });

  // ── Product action handlers ────────────────────────────────────────────────

  const handlePriceChange = (productId: string, newPrice: number) => {
    priceMutation.mutate({ productId, price: newPrice });
  };

  const handleDeleteProduct = (productId: string) => {
    deleteMutation.mutate(productId);
  };

  const { navigate } = useNavigation();

  return (
    <div className="w-full space-y-5">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start px-5 sm:px-0 justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-dash-title font-black text-[#023337]">
              My Listings
            </h2>
            {totalInView > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-dash-caption font-semibold bg-orange-50 text-orange-600">
                {totalInView} {totalInView === 1 ? "listing" : "listings"}
              </span>
            )}
          </div>
          <p className="text-dash-body text-gray-400 mt-0.5">
            Manage and track your products and services
          </p>
        </div>
        <button
          id="add-product-button"
          onClick={() => navigate(`/${userId}/products/add`)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
        >
          <Plus size={16} />
          Add Listing
        </button>
      </div>

      {/* ── Products panel ───────────────────────────────────────────────── */}
      <div className="bg-white sm:rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar — search is the only tool here now. */}
        <div className="px-4 pt-4 pb-4 sm:px-5 border-b border-gray-100">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your listings by name…"
              className="pl-10 pr-3 h-11 text-dash-body bg-gray-50 border border-gray-200 rounded-xl w-full focus-visible:ring-2 focus-visible:ring-orange-500/30"
            />
          </div>
        </div>

        {/* Product list */}
        {productsLoading ? (
          <>
            {/* Mobile: row skeletons, matching ProductRow's shape. */}
            <div className="sm:hidden divide-y divide-gray-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 animate-pulse"
                >
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded w-3/5" />
                    <div className="h-3.5 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet/desktop: card skeletons, matching ProductCard's shape. */}
            <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse"
                >
                  <div className="w-full aspect-square bg-gray-100" />
                  <div className="p-3.5 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded w-4/5" />
                    <div className="h-3.5 bg-gray-100 rounded w-2/5" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <ProductsTable
            products={products}
            onChangePrice={(p) => setPriceModal({ open: true, product: p })}
            onSwitchToQuote={(p) => switchToQuoteMutation.mutate(p.id)}
            onDelete={(p) => setDeleteModal({ open: true, product: p })}
            isFood={isFood}
            hasActiveSearch={debouncedSearch.trim().length > 0}
            onAddListing={() => navigate(`/${userId}/products/add`)}
          />
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <PriceModal
        open={priceModal.open}
        product={priceModal.product}
        onClose={() => setPriceModal({ open: false, product: null })}
        onConfirm={handlePriceChange}
      />

      <DeleteProductModal
        open={deleteModal.open}
        product={deleteModal.product}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeleteModal({ open: false, product: null })}
        onConfirm={handleDeleteProduct}
      />
    </div>
  );
}
