import { backendFetch } from "./backend";
import type {
  Category,
  CategoryProduct,
  ProductModifier,
  ProductAttribute,
  ProductListResult,
  CreateProductPayload,
} from "@/types/product";

/* Server data module for products & categories. Maps the backend's snake_case /
   kobo shapes into the camelCase / naira domain objects the UI consumes. */

// ── Upstream shapes ──────────────────────────────────────────────────────────

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
  sector_value?: string;
  kind?: "product" | "service";
  quote_on_request?: boolean;
  description: string | null;
  category_id: string | null;
  price: number;
  price_max: number | null;
  currency: "NGN" | "USD";
  is_featured: boolean;
  tags: string[];
  main_image_url: string | null;
  thumbnail_urls: string[];
  video_url: string | null;
  color_class: string | null;
  created_at: string;
  updated_at: string;
  manufacturing_date?: string | null;
  expiration_date?: string | null;
  attributes?: { id: string; name: string; value: string }[];
  is_currently_available?: boolean;
  daily_limit?: number | null;
  allow_pre_order?: boolean;
  modifiers?: ApiModifier[];
}

interface ApiPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** Upstream envelope. The backend wraps payloads as `{ success, data }`. */
interface Wrapped<T> {
  data: T;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

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
    sectorValue: p.sector_value,
    kind: p.kind ?? "product",
    quoteOnRequest: p.quote_on_request ?? false,
    description: p.description,
    categoryId: p.category_id ?? "",
    price: p.price / 100,
    priceMax: p.price_max !== null ? p.price_max / 100 : null,
    currency: p.currency,
    featured: p.is_featured,
    tags: p.tags,
    mainImageUrl: p.main_image_url,
    thumbnailUrls: p.thumbnail_urls,
    videoUrl: p.video_url,
    colorClass: p.color_class ?? "bg-gray-200",
    createdDate: p.created_at,
    manufacturingDate: p.manufacturing_date,
    expirationDate: p.expiration_date,
    attributes,
    isCurrentlyAvailable: p.is_currently_available,
    dailyLimit: p.daily_limit,
    allowPreOrder: p.allow_pre_order,
    modifiers,
  };
}

// ── Data functions ───────────────────────────────────────────────────────────

export async function listCategories(cookie: string): Promise<Category[]> {
  const { data } = await backendFetch<Wrapped<ApiCategory[]>>("/categories", {
    cookie,
  });
  return data.map(mapCategory);
}

export async function listProducts(
  search: URLSearchParams,
  cookie: string,
): Promise<ProductListResult> {
  const qs = search.toString();
  const { data } = await backendFetch<
    Wrapped<{ products: ApiProduct[]; pagination: ApiPagination }>
  >(`/products${qs ? `?${qs}` : ""}`, { cookie });
  return {
    products: data.products.map(mapProduct),
    pagination: data.pagination,
  };
}

export async function getProduct(
  id: string,
  cookie: string,
): Promise<CategoryProduct> {
  const { data } = await backendFetch<Wrapped<ApiProduct>>(`/products/${id}`, {
    cookie,
  });
  return mapProduct(data);
}

export async function createProduct(
  payload: CreateProductPayload,
  cookie: string,
): Promise<CategoryProduct> {
  const { data } = await backendFetch<Wrapped<ApiProduct>>("/products", {
    method: "POST",
    body: payload,
    cookie,
  });
  return mapProduct(data);
}

export async function updateProduct(
  id: string,
  payload: Partial<CreateProductPayload>,
  cookie: string,
): Promise<CategoryProduct> {
  const { data } = await backendFetch<Wrapped<ApiProduct>>(`/products/${id}`, {
    method: "PUT",
    body: payload,
    cookie,
  });
  return mapProduct(data);
}

export async function deleteProduct(id: string, cookie: string): Promise<void> {
  await backendFetch(`/products/${id}`, { method: "DELETE", cookie });
}

/** `priceNaira` from the client is converted to kobo for the backend. */
export async function changePrice(
  id: string,
  priceNaira: number,
  cookie: string,
): Promise<CategoryProduct> {
  const { data } = await backendFetch<Wrapped<ApiProduct>>(
    `/products/${id}/price`,
    { method: "PATCH", body: { price: Math.round(priceNaira * 100) }, cookie },
  );
  return mapProduct(data);
}

export async function setAvailability(
  id: string,
  isCurrentlyAvailable: boolean,
  cookie: string,
): Promise<{ id: string; is_currently_available: boolean }> {
  const { data } = await backendFetch<
    Wrapped<{ id: string; is_currently_available: boolean }>
  >(`/products/${id}/availability`, {
    method: "PATCH",
    body: { is_currently_available: isCurrentlyAvailable },
    cookie,
  });
  return data;
}
