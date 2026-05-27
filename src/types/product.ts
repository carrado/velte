export interface Category {
  id: string;
  name: string;
  emoji: string;
  bgColor: string;
  description?: string;
}

export type ProductTab = "all" | "featured" | "on-sale" | "out-of-stock";

export interface CategoryProduct {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  price: number;
  currency?: "NGN" | "USD";
  discountedPrice?: number | null;
  taxIncluded?: boolean;
  taxType?: "percentage" | "fixed" | null;
  taxValue?: number | null;
  isNegotiable?: boolean;
  minimumPrice?: number | null;
  totalQuantity: number;
  orderedQuantity: number;
  createdDate: string;
  featured: boolean;
  onSale: boolean;
  inStock: number;
  colorClass: string;
  mainImageUrl?: string | null;
  thumbnailUrls?: string[];
  videoUrl?: string | null;
  lowStockThreshold?: number | null;
  manufacturingDate?: string | null;
  expirationDate?: string | null;
  attributes?: ProductAttribute[];
  tags?: string[];
  modifiers?: ProductModifier[];
  estimatedPrepMins?: number | null;
  isCurrentlyAvailable?: boolean;
  dailyLimit?: number | null;
  allowPreOrder?: boolean;
  // legacy fields kept for compat
  availability?: MenuAvailability;
  isVeg?: boolean;
  isSpicy?: boolean;
}

export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
}

export interface ModifierOption {
  id: string;
  name: string;
  additionalPrice: number;
}

export interface ProductModifier {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  options: ModifierOption[];
}

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface MenuAvailability {
  days: DayOfWeek[];
  startTime: string;
  endTime: string;
}

// ── API request/response types ───────────────────────────────────────────────

export interface ProductListParams {
  page?: number;
  limit?: number;
  category_id?: string;
  tab?: ProductTab;
  search?: string;
  sort_by?: "created_at" | "price";
  sort_order?: "asc" | "desc";
  stock_status?: "in-stock" | "out-of-stock";
}

export interface ProductListResult {
  products: CategoryProduct[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface CreateProductBasePayload {
  name: string;
  description?: string | null;
  category_id: string;
  price: number;
  currency?: "NGN" | "USD";
  discounted_price?: number | null;
  tax_included?: boolean;
  tax_type?: "percentage" | "fixed" | null;
  tax_value?: number | null;
  is_negotiable?: boolean;
  minimum_price?: number | null;
  is_featured?: boolean;
  tags?: string[];
  main_image_url?: string | null;
  thumbnail_urls?: string[];
  video_url?: string | null;
}

export interface RetailProductPayload extends CreateProductBasePayload {
  stock_quantity: number;
  low_stock_threshold?: number | null;
  manufacturing_date?: string | null;
  expiration_date?: string | null;
  attributes?: { name: string; value: string }[];
}

export interface FoodProductPayload extends CreateProductBasePayload {
  estimated_prep_mins: number;
  is_currently_available?: boolean;
  daily_limit?: number | null;
  allow_pre_order?: boolean;
  modifiers?: {
    id?: string;
    name: string;
    required: boolean;
    multi_select: boolean;
    options: { id?: string; name: string; additional_price: number }[];
  }[];
}

export type CreateProductPayload = RetailProductPayload | FoodProductPayload;

// ── Component prop types ─────────────────────────────────────────────────────

export interface CategoryCardProps {
  category: Category;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export interface CategoryModalProps {
  open: boolean;
  editing: Category | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    emoji: string;
    bgColor: string;
  }) => void;
}

export interface RestockModalProps {
  open: boolean;
  product: CategoryProduct | null;
  onClose: () => void;
  onConfirm: (productId: string, quantity: number) => void;
}

export interface PriceModalProps {
  open: boolean;
  product: CategoryProduct | null;
  onClose: () => void;
  onConfirm: (productId: string, newPrice: number) => void;
}

export interface DeleteProductModalProps {
  open: boolean;
  product: CategoryProduct | null;
  onClose: () => void;
  onConfirm: (productId: string) => void;
}

export interface ProductActionsPopoverProps {
  product: CategoryProduct;
  isFood?: boolean;
  onRestock: () => void;
  onChangePrice: () => void;
  onDelete: () => void;
}

export interface ProductsTableProps {
  products: CategoryProduct[];
  rowOffset?: number;
  onRestock: (product: CategoryProduct) => void;
  onChangePrice: (product: CategoryProduct) => void;
  onDelete: (product: CategoryProduct) => void;
  isFood?: boolean;
}

export type AddProductTaxOption = "yes" | "no";

export type AddProductStockStatus = "In Stock" | "Out of Stock" | "Low Stock";

export interface AddProductColor {
  name: string;
  value: string;
}
