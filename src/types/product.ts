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
  currentPage: number;
  itemsPerPage: number;
  onRestock: (product: CategoryProduct) => void;
  onChangePrice: (product: CategoryProduct) => void;
  onDelete: (product: CategoryProduct) => void;
}

export type AddProductTaxOption = "yes" | "no";

export type AddProductStockStatus = "In Stock" | "Out of Stock" | "Low Stock";

export interface AddProductColor {
  name: string;
  value: string;
}
