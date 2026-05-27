import { apiClient } from "@/lib/api";
import type {
  Category,
  CategoryProduct,
  ProductModifier,
  ProductAttribute,
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

// ── API response shapes ───────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ApiCategory {
  id: string;
  name: string;
  emoji: string;
}

interface ApiModifierOption {
  id: string;
  name: string;
  additional_price: number;
}

interface ApiModifier {
  id: string;
  name: string;
  required: boolean;
  multi_select: boolean;
  options: ApiModifierOption[];
}

interface ApiProduct {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  price: number;
  currency: "NGN" | "USD";
  discounted_price: number | null;
  tax_included: boolean;
  tax_type: "percentage" | "fixed" | null;
  tax_value: number | null;
  is_negotiable: boolean;
  minimum_price: number | null;
  is_featured: boolean;
  on_sale: boolean;
  tags: string[];
  main_image_url: string | null;
  thumbnail_urls: string[];
  video_url: string | null;
  color_class: string | null;
  created_at: string;
  updated_at: string;
  // retail
  stock_quantity?: number;
  ordered_quantity?: number;
  low_stock_threshold?: number | null;
  manufacturing_date?: string | null;
  expiration_date?: string | null;
  attributes?: { id: string; name: string; value: string }[];
  // food
  estimated_prep_mins?: number;
  is_currently_available?: boolean;
  daily_limit?: number | null;
  allow_pre_order?: boolean;
  modifiers?: ApiModifier[];
}

// ── Mappers ───────────────────────────────────────────────────────────────────

const CATEGORY_BG: Record<string, string> = {
  electronics: "bg-blue-100",
  fashion: "bg-pink-100",
  accessories: "bg-amber-100",
  "home-kitchen": "bg-teal-100",
  sports: "bg-green-100",
  toys: "bg-purple-100",
  health: "bg-red-100",
  books: "bg-yellow-100",
};

function mapCategory(c: ApiCategory): Category {
  return {
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    bgColor: CATEGORY_BG[c.id] ?? "bg-gray-100",
  };
}

function mapProduct(p: ApiProduct): CategoryProduct {
  const isFood =
    p.is_currently_available !== undefined ||
    p.estimated_prep_mins !== undefined;

  let totalQuantity: number;
  let orderedQuantity: number;
  let inStock: number;

  if (isFood) {
    const avail = p.is_currently_available ?? true;
    totalQuantity = avail ? 1 : 0;
    orderedQuantity = 0;
    inStock = avail ? 1 : 0;
  } else {
    totalQuantity = p.stock_quantity ?? 0;
    orderedQuantity = p.ordered_quantity ?? 0;
    inStock = totalQuantity - orderedQuantity;
  }

  const modifiers: ProductModifier[] = (p.modifiers ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    required: m.required,
    multiSelect: m.multi_select,
    options: m.options.map((o) => ({
      id: o.id,
      name: o.name,
      additionalPrice: o.additional_price / 100,
    })),
  }));

  const attributes: ProductAttribute[] = (p.attributes ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    value: a.value,
  }));

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    categoryId: p.category_id,
    price: p.price / 100,
    currency: p.currency,
    discountedPrice:
      p.discounted_price !== null ? p.discounted_price / 100 : null,
    taxIncluded: p.tax_included,
    taxType: p.tax_type,
    taxValue: p.tax_value,
    isNegotiable: p.is_negotiable,
    minimumPrice: p.minimum_price !== null ? p.minimum_price / 100 : null,
    featured: p.is_featured,
    onSale: p.on_sale,
    tags: p.tags,
    mainImageUrl: p.main_image_url,
    thumbnailUrls: p.thumbnail_urls,
    videoUrl: p.video_url,
    colorClass: p.color_class ?? "bg-gray-200",
    createdDate: p.created_at,
    totalQuantity,
    orderedQuantity,
    inStock,
    lowStockThreshold: p.low_stock_threshold,
    manufacturingDate: p.manufacturing_date,
    expirationDate: p.expiration_date,
    attributes,
    estimatedPrepMins: p.estimated_prep_mins,
    isCurrentlyAvailable: p.is_currently_available,
    dailyLimit: p.daily_limit,
    allowPreOrder: p.allow_pre_order,
    modifiers,
  };
}

// ── API functions ─────────────────────────────────────────────────────────────

export const categoriesApi = {
  // ── Categories ─────────────────────────────────────────────────────────────

  getCategories: async (): Promise<Category[]> => {
    const res = await apiClient<ApiResponse<ApiCategory[]>>("/categories");
    return res.data.map(mapCategory);
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
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.category_id) qs.set("category_id", params.category_id);
    if (params?.tab && params.tab !== "all") qs.set("tab", params.tab);
    if (params?.search?.trim()) qs.set("search", params.search.trim());
    if (params?.sort_by) qs.set("sort_by", params.sort_by);
    if (params?.sort_order) qs.set("sort_order", params.sort_order);
    if (params?.stock_status) qs.set("stock_status", params.stock_status);

    const query = qs.toString() ? `?${qs}` : "";
    const res = await apiClient<
      ApiResponse<{
        products: ApiProduct[];
        pagination: ProductListResult["pagination"];
      }>
    >(`/products${query}`);

    return {
      products: res.data.products.map(mapProduct),
      pagination: res.data.pagination,
    };
  },

  getProduct: async (id: string): Promise<CategoryProduct> => {
    const res = await apiClient<ApiResponse<ApiProduct>>(`/products/${id}`);
    return mapProduct(res.data);
  },

  createProduct: async (
    payload: CreateProductPayload,
  ): Promise<CategoryProduct> => {
    const res = await apiClient<ApiResponse<ApiProduct>>("/products", {
      method: "POST",
      data: payload,
    });
    return mapProduct(res.data);
  },

  updateProduct: async (
    id: string,
    payload: Partial<CreateProductPayload>,
  ): Promise<CategoryProduct> => {
    const res = await apiClient<ApiResponse<ApiProduct>>(`/products/${id}`, {
      method: "PUT",
      data: payload,
    });
    return mapProduct(res.data);
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiClient(`/products/${id}`, { method: "DELETE" });
  },

  // ── Retail actions ─────────────────────────────────────────────────────────

  restockProduct: async (
    id: string,
    quantity: number,
  ): Promise<CategoryProduct> => {
    const res = await apiClient<ApiResponse<ApiProduct>>(
      `/products/${id}/restock`,
      { method: "POST", data: { quantity } },
    );
    return mapProduct(res.data);
  },

  changePrice: async (
    id: string,
    priceNaira: number,
  ): Promise<CategoryProduct> => {
    const res = await apiClient<ApiResponse<ApiProduct>>(
      `/products/${id}/price`,
      { method: "PATCH", data: { price: Math.round(priceNaira * 100) } },
    );
    return mapProduct(res.data);
  },

  // ── Food actions ───────────────────────────────────────────────────────────

  toggleAvailability: async (
    id: string,
    is_currently_available: boolean,
  ): Promise<{ id: string; is_currently_available: boolean }> => {
    const res = await apiClient<
      ApiResponse<{ id: string; is_currently_available: boolean }>
    >(`/products/${id}/availability`, {
      method: "PATCH",
      data: { is_currently_available },
    });
    return res.data;
  },
};
