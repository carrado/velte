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
  categoryId: string;
  price: number;
  totalQuantity: number;
  orderedQuantity: number;
  createdDate: string;
  featured: boolean;
  onSale: boolean;
  inStock: number;
  colorClass: string;
  lowStockThreshold?: number;
  manufacturingDate?: string;
  expirationDate?: string;
  attributes?: ProductAttribute[];
  tags?: string[];
  modifiers?: ProductModifier[];
  availability?: MenuAvailability;
  estimatedPrepMins?: number;
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
