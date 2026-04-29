export interface DashboardStats {
  totalSales: {
    value: number;
    growth: number;
    previous: number;
  };
  totalOrders: {
    value: number;
    growth: number;
    previous: number;
  };
  pending: {
    orders: number;
    users: number;
  };
  canceled: {
    value: number;
    growth: number;
  };
}

export interface WeeklyReportPoint {
  day: string;
  value: number;
}

export interface UsersActivity {
  total: number;
  perMinute: number[];
}

export interface MonthlySale {
  month: string;
  sales: number;
  change: number;
  positive: boolean;
}

export interface Transaction {
  id: string;
  customerId: string;
  date: string;
  status: "Paid" | "Pending";
  amount: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  image: string;
}

export interface BestSellingProduct {
  id: string;
  name: string;
  totalOrder: number;
  status: "Stock" | "Stock out";
  price: number;
  image: string;
}

export interface DashboardCategory {
  id: string;
  name: string;
  icon: string;
}

export interface AddableProduct {
  id: string;
  name: string;
  price: number;
  image: string;
}
