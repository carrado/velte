import type { ReactNode } from "react";

export type RetailOrderStatus =
  | "Delivered"
  | "Pending"
  | "Shipped"
  | "Cancelled";
export type FoodOrderStatus =
  | "Pending"
  | "Preparing"
  | "Ready"
  | "OnTheWay"
  | "Delivered"
  | "Cancelled";
export type OrderStatus = RetailOrderStatus | FoodOrderStatus;
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

export interface OrderRowMenuAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  highlight?: boolean;
}

export interface SettingsData {
  minDurationDays: number;
  maxDurationDays: number;
  deliveryType: "bulk" | "single";
  paymentMethod: string;
}
