import { api } from "@/lib/api-client";
import type {
  Category,
  CategoryProduct,
  ProductListParams,
  ProductListResult,
  CreateProductPayload,
} from "@/types/product";

export type { Category, CategoryProduct };
export type { ProductTab, CategoryCardProps } from "@/types/product";
export type { ProductListParams, ProductListResult, CreateProductPayload };

// ── Utility ──────────────────────────────────────────────────────────────────

export const getAvailableStock = (product: CategoryProduct) =>
  product.totalQuantity - product.orderedQuantity;

function buildQuery(params?: ProductListParams): string {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.category_id) qs.set("category_id", params.category_id);
  if (params?.tab && params.tab !== "all") qs.set("tab", params.tab);
  if (params?.search?.trim()) qs.set("search", params.search.trim());
  if (params?.sort_by) qs.set("sort_by", params.sort_by);
  if (params?.sort_order) qs.set("sort_order", params.sort_order);
  if (params?.stock_status) qs.set("stock_status", params.stock_status);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const categoriesApi = {
  // ── Categories ─────────────────────────────────────────────────────────────

  getCategories: async (): Promise<Category[]> => {
    const { categories } = await api.get<{ categories: Category[] }>(
      "/api/categories",
    );
    return categories;
  },

  // Retail category CRUD is UI-only (not persisted to backend)
  createCategory: async (data: Omit<Category, "id">): Promise<Category> => ({
    ...data,
    id: `cat-${Date.now()}`,
  }),
  updateCategory: async (
    id: string,
    data: Partial<Category>,
  ): Promise<Category> => ({ id, ...data }) as Category,
  deleteCategory: async (): Promise<void> => {},

  // ── Products ───────────────────────────────────────────────────────────────

  getProducts: async (
    params?: ProductListParams,
  ): Promise<ProductListResult> => {
    return api.get<ProductListResult>(`/api/products${buildQuery(params)}`);
  },

  getProduct: async (id: string): Promise<CategoryProduct> => {
    const { product } = await api.get<{ product: CategoryProduct }>(
      `/api/products/${id}`,
    );
    return product;
  },

  createProduct: async (
    payload: CreateProductPayload,
  ): Promise<CategoryProduct> => {
    const { product } = await api.post<{ product: CategoryProduct }>(
      "/api/products",
      payload,
    );
    return product;
  },

  updateProduct: async (
    id: string,
    payload: Partial<CreateProductPayload>,
  ): Promise<CategoryProduct> => {
    const { product } = await api.put<{ product: CategoryProduct }>(
      `/api/products/${id}`,
      payload,
    );
    return product;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await api.del(`/api/products/${id}`);
  },

  // ── Retail actions ─────────────────────────────────────────────────────────

  restockProduct: async (
    id: string,
    quantity: number,
  ): Promise<CategoryProduct> => {
    const { product } = await api.post<{ product: CategoryProduct }>(
      `/api/products/${id}/restock`,
      { quantity },
    );
    return product;
  },

  changePrice: async (
    id: string,
    priceNaira: number,
  ): Promise<CategoryProduct> => {
    const { product } = await api.patch<{ product: CategoryProduct }>(
      `/api/products/${id}/price`,
      { price: priceNaira },
    );
    return product;
  },

  // ── Food actions ───────────────────────────────────────────────────────────

  toggleAvailability: async (
    id: string,
    is_currently_available: boolean,
  ): Promise<{ id: string; is_currently_available: boolean }> => {
    return api.patch<{ id: string; is_currently_available: boolean }>(
      `/api/products/${id}/availability`,
      { is_currently_available },
    );
  },
};
