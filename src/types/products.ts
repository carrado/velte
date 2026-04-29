import { CategoryProduct } from "@/services/products";

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

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (p: number) => void;
}
