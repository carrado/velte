export type OrderStatus = "Delivered" | "Pending" | "Shipped" | "Cancelled";
export type PaymentStatus = "Paid" | "Unpaid";
export type OrderFilter = "all" | "completed" | "pending" | "cancelled";

export interface Order {
  id: string;
  orderId: string;
  product: { name: string; initials: string; color: string };
  date: string;
  price: number;
  payment: PaymentStatus;
  status: OrderStatus;
}

export interface OrderStats {
  totalOrders: { value: number; growth: number };
  newOrders: { value: number; growth: number };
  completedOrders: { value: number; percentage: number };
  canceledOrders: { value: number; growth: number };
}

export interface FilterState {
  startDate: string;
  endDate: string;
  paymentStatus: "all" | "Paid" | "Unpaid";
  orderStatus: OrderFilter;
}

export type SortOption = "newest" | "oldest" | "price_asc" | "price_desc";

export interface SettingsData {
  minDurationDays: number;
  maxDurationDays: number;
  deliveryType: "bulk" | "single";
  paymentMethod: string;
}
