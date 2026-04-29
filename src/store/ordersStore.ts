import { create } from "zustand";
import type { Order, OrderStats, OrderStatus } from "@/types/order";

interface OrdersStore {
  orders: Order[];
  stats: OrderStats | null;
  setOrders: (orders: Order[]) => void;
  setStats: (stats: OrderStats) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
}

export const useOrdersStore = create<OrdersStore>()((set) => ({
  orders: [],
  stats: null,
  setOrders: (orders) => set({ orders }),
  setStats: (stats) => set({ stats }),
  updateOrderStatus: (id, status) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)),
    })),
}));
