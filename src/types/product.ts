export interface Category {
  id: string;
  name: string;
  emoji: string;
  bgColor: string;
  description?: string;
}

export type ProductTab = "all" | "featured";

export type OfferingKind = "product" | "service";

export interface CategoryProduct {
  id: string;
  name: string;
  /** Which of the vendor's own sectors this listing was posted under —
   * drives shape (see SectorLeaf.classification) and per-sector wizard
   * tailoring in edit mode. */
  sectorValue?: string;
  /** Offering identity — a physical good or a service. */
  kind?: OfferingKind;
  /** Service priced per job — no upfront price; buyers see "Contact for quote". */
  quoteOnRequest?: boolean;
  description?: string | null;
  categoryId: string;
  /** The single price, or the low end of a range when `priceMax` is set. */
  price: number;
  /** High end of a price range; null = single price. */
  priceMax?: number | null;
  currency?: "NGN" | "USD";
  createdDate: string;
  featured: boolean;
  colorClass: string;
  mainImageUrl?: string | null;
  thumbnailUrls?: string[];
  videoUrl?: string | null;
  manufacturingDate?: string | null;
  expirationDate?: string | null;
  attributes?: ProductAttribute[];
  tags?: string[];
  modifiers?: ProductModifier[];
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

/** A suggested attribute / service detail: the name is fixed, the example
 * seeds the value input's placeholder. `important` flags the handful of
 * fields per group that most affect AI match quality (e.g. Brand, Shoe
 * Size) — surfaced to vendors so they know which blanks actually cost them
 * matches, not a hard requirement. */
export interface AttributePreset {
  name: string;
  example: string;
  important?: boolean;
}

export interface AttributePresetGroup {
  group: string;
  items: AttributePreset[];
}

export interface AttributePickerModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  groups: AttributePresetGroup[];
  /** Names already on the offering — shown as added, not re-addable. */
  existingNames: string[];
  onClose: () => void;
  onAdd: (details: { name: string; value: string }[]) => void;
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
  /** Which of the vendor's own sectors this listing is posted under — drives
   * shape (food/retail/service tooling) and wizard tailoring per-listing. */
  sector_value: string;
  /** Null for services — they carry no category. */
  category_id: string | null;
  price: number;
  /** High end of a price range; null/omitted = single price. */
  price_max?: number | null;
  currency?: "NGN" | "USD";
  is_featured?: boolean;
  tags?: string[];
  main_image_url?: string | null;
  thumbnail_urls?: string[];
  video_url?: string | null;
}

export interface RetailProductPayload extends CreateProductBasePayload {
  kind?: OfferingKind;
  quote_on_request?: boolean;
  manufacturing_date?: string | null;
  expiration_date?: string | null;
  attributes?: { name: string; value: string }[];
}

export interface FoodProductPayload extends CreateProductBasePayload {
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
  onChangePrice: () => void;
  /** Fixed-price service → back to "Contact for quote". Services only. */
  onSwitchToQuote: () => void;
  onDelete: () => void;
}

export interface ProductsTableProps {
  products: CategoryProduct[];
  onChangePrice: (product: CategoryProduct) => void;
  onSwitchToQuote: (product: CategoryProduct) => void;
  onDelete: (product: CategoryProduct) => void;
  isFood?: boolean;
}

export type AddProductTaxOption = "yes" | "no";

export interface AddProductColor {
  name: string;
  value: string;
}
