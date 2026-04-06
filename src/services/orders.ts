const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export async function fetchOrderStats(): Promise<OrderStats> {
  await delay(400);
  return {
    totalOrders: { value: 1240, growth: 14.4 },
    newOrders: { value: 240, growth: 20 },
    completedOrders: { value: 960, percentage: 85 },
    canceledOrders: { value: 87, growth: -5 },
  };
}

const BASE_ORDERS: Order[] = [
  {
    id: "1",
    orderId: "#ORD0001",
    product: {
      name: "Wireless Bluetooth Headphones",
      initials: "WB",
      color: "bg-blue-100 text-blue-600",
    },
    date: "01-01-2025",
    price: 49.99,
    payment: "Paid",
    status: "Delivered",
  },
  {
    id: "2",
    orderId: "#ORD0002",
    product: {
      name: "Men's T-Shirt",
      initials: "MT",
      color: "bg-purple-100 text-purple-600",
    },
    date: "01-01-2025",
    price: 14.99,
    payment: "Unpaid",
    status: "Pending",
  },
  {
    id: "3",
    orderId: "#ORD0003",
    product: {
      name: "Men's Leather Wallet",
      initials: "ML",
      color: "bg-amber-100 text-amber-700",
    },
    date: "01-01-2025",
    price: 49.99,
    payment: "Paid",
    status: "Delivered",
  },
  {
    id: "4",
    orderId: "#ORD0004",
    product: {
      name: "Memory Foam Pillow",
      initials: "MF",
      color: "bg-gray-100 text-gray-600",
    },
    date: "01-01-2025",
    price: 39.99,
    payment: "Paid",
    status: "Shipped",
  },
  {
    id: "5",
    orderId: "#ORD0005",
    product: {
      name: "Adjustable Dumbbells",
      initials: "AD",
      color: "bg-slate-100 text-slate-600",
    },
    date: "01-01-2025",
    price: 14.99,
    payment: "Unpaid",
    status: "Pending",
  },
  {
    id: "6",
    orderId: "#ORD0006",
    product: {
      name: "Coffee Maker",
      initials: "CM",
      color: "bg-red-100 text-red-600",
    },
    date: "01-01-2025",
    price: 79.99,
    payment: "Unpaid",
    status: "Cancelled",
  },
  {
    id: "7",
    orderId: "#ORD0007",
    product: {
      name: "Casual Baseball Cap",
      initials: "CB",
      color: "bg-green-100 text-green-600",
    },
    date: "01-01-2025",
    price: 49.99,
    payment: "Paid",
    status: "Delivered",
  },
  {
    id: "8",
    orderId: "#ORD0008",
    product: {
      name: "Full HD Webcam",
      initials: "FW",
      color: "bg-indigo-100 text-indigo-600",
    },
    date: "01-01-2025",
    price: 39.99,
    payment: "Paid",
    status: "Delivered",
  },
  {
    id: "9",
    orderId: "#ORD0009",
    product: {
      name: "Smart LED Color Bulb",
      initials: "SL",
      color: "bg-yellow-100 text-yellow-600",
    },
    date: "01-01-2025",
    price: 79.99,
    payment: "Unpaid",
    status: "Delivered",
  },
  {
    id: "10",
    orderId: "#ORD0010",
    product: {
      name: "Men's T-Shirt",
      initials: "MT",
      color: "bg-purple-100 text-purple-600",
    },
    date: "05-01-2025",
    price: 14.99,
    payment: "Unpaid",
    status: "Delivered",
  },
];

// Mutable copy used for simulated in-memory updates
let ordersData: Order[] = BASE_ORDERS.map((o) => ({ ...o }));

export async function fetchOrders(
  filter: OrderFilter = "all",
): Promise<Order[]> {
  await delay(500);
  if (filter === "completed")
    return ordersData.filter(
      (o) => o.status === "Delivered" || o.status === "Shipped",
    );
  if (filter === "pending")
    return ordersData.filter((o) => o.status === "Pending");
  if (filter === "cancelled")
    return ordersData.filter((o) => o.status === "Cancelled");
  return [...ordersData];
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<void> {
  await delay(300);
  const order = ordersData.find((o) => o.id === id);
  if (order) order.status = status;
}
