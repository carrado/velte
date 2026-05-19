/**
 * Search schema — defines all searchable entities and the API contract.
 *
 * Backend endpoint: GET /search?q=<query>&limit=<n>
 *
 * Searchable fields per entity:
 *
 * ORDERS
 *   orderId       text    e.g. "#ORD0001" — display reference
 *   productName   text    name of the main product in the order
 *   status        enum    "Delivered" | "Pending" | "Shipped" | "Cancelled"
 *   payment       enum    "Paid" | "Unpaid"
 *   date          date    ISO string — enable range filtering
 *   price         number  — enable range filtering
 *
 * PRODUCTS
 *   name          text
 *   categoryName  text    name of the parent category
 *   tags          text[]  free-form product tags
 *   status        derived "In Stock" | "Out of Stock" | "Low Stock" (from inStock value)
 *   featured      boolean
 *   onSale        boolean
 *   price         number  — enable range filtering
 *
 * CUSTOMERS
 *   name          text
 *   phone         text    partial match (last 4+ digits)
 *   status        enum    "Active" | "Inactive" | "VIP"
 *
 * TRANSACTIONS
 *   name          text    customer name on the transaction
 *   total         text    formatted amount e.g. "₦5,000"
 *   status        enum    "Complete" | "Pending" | "Canceled"
 *   method        enum    "CC" | "PayPal" | "Bank"
 *   date          date    ISO string
 *
 * CATEGORIES
 *   name          text
 */

export type SearchEntityType =
  | "order"
  | "product"
  | "customer"
  | "transaction"
  | "category";

// ---------------------------------------------------------------------------
// Raw hit shapes returned by the backend
// ---------------------------------------------------------------------------

export interface OrderSearchHit {
  id: string;
  orderId: string;
  productName: string;
  status: "Delivered" | "Pending" | "Shipped" | "Cancelled";
  payment: "Paid" | "Unpaid";
  price: number;
  date: string;
}

export interface ProductSearchHit {
  id: string;
  name: string;
  categoryName: string;
  price: number;
  inStock: number;
  featured: boolean;
  onSale: boolean;
}

export interface CustomerSearchHit {
  id: string;
  name: string;
  phone: string;
  status: "Active" | "Inactive" | "VIP";
  orders: number;
  spend: string;
}

export interface TransactionSearchHit {
  id: string;
  name: string;
  total: string;
  status: "Complete" | "Pending" | "Canceled";
  method: "CC" | "PayPal" | "Bank";
  date: string;
}

export interface CategorySearchHit {
  id: string;
  name: string;
  productCount?: number;
}

// ---------------------------------------------------------------------------
// Backend response
// ---------------------------------------------------------------------------

export interface RawSearchResponse {
  success: boolean;
  data: {
    orders: OrderSearchHit[];
    products: ProductSearchHit[];
    customers: CustomerSearchHit[];
    transactions: TransactionSearchHit[];
    categories: CategorySearchHit[];
  };
  query: string;
  totalCount: number;
}

// ---------------------------------------------------------------------------
// Frontend-ready result item (adapted by the service layer)
// ---------------------------------------------------------------------------

export type SearchBadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "purple";

export interface SearchResultItem {
  type: SearchEntityType;
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: SearchBadgeVariant;
  href: string;
}

export type SearchResultsByType = {
  orders: SearchResultItem[];
  products: SearchResultItem[];
  customers: SearchResultItem[];
  transactions: SearchResultItem[];
  categories: SearchResultItem[];
};

export interface SearchParams {
  q: string;
  limit?: number;
}
