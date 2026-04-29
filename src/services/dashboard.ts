import type {
  DashboardStats,
  WeeklyReportPoint,
  UsersActivity,
  MonthlySale,
  Transaction,
  TopProduct,
  BestSellingProduct,
  DashboardCategory,
  AddableProduct,
} from "@/types/dashboard";

export type {
  DashboardStats,
  WeeklyReportPoint,
  UsersActivity,
  MonthlySale,
  Transaction,
  TopProduct,
  BestSellingProduct,
  DashboardCategory,
  AddableProduct,
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchDashboardStats(): Promise<DashboardStats> {
  await delay(300);
  return {
    totalSales: { value: 350000, growth: 10.4, previous: 235 },
    totalOrders: { value: 10700, growth: 14.4, previous: 7600 },
    pending: { orders: 509, users: 204 },
    canceled: { value: 94, growth: -14.4 },
  };
}

export async function fetchWeeklyReport(
  period: "this_week" | "last_week",
): Promise<WeeklyReportPoint[]> {
  await delay(300);
  if (period === "this_week") {
    return [
      { day: "Sun", value: 18000 },
      { day: "Mon", value: 22000 },
      { day: "Tue", value: 19000 },
      { day: "Wed", value: 14000 },
      { day: "Thu", value: 26000 },
      { day: "Fri", value: 21000 },
      { day: "Sat", value: 30000 },
    ];
  }
  return [
    { day: "Sun", value: 12000 },
    { day: "Mon", value: 17000 },
    { day: "Tue", value: 15000 },
    { day: "Wed", value: 20000 },
    { day: "Thu", value: 18000 },
    { day: "Fri", value: 23000 },
    { day: "Sat", value: 25000 },
  ];
}

export async function fetchUsersActivity(): Promise<UsersActivity> {
  await delay(300);
  return {
    total: 21500,
    perMinute: [
      15, 20, 25, 18, 30, 22, 28, 35, 20, 25, 30, 18, 22, 28, 35, 20, 25, 30,
      22, 28,
    ],
  };
}

export async function fetchSalesByMonths(): Promise<MonthlySale[]> {
  await delay(300);
  return [
    { month: "February", sales: 30000, change: 25.8, positive: true },
    { month: "March", sales: 30000, change: -15.8, positive: false },
    { month: "April", sales: 25000, change: 35.8, positive: true },
  ];
}

export async function fetchTransactions(): Promise<Transaction[]> {
  await delay(300);
  return [
    {
      id: "#6545",
      customerId: "C-001",
      date: "01 Oct | 11:29 am",
      status: "Paid",
      amount: 64,
    },
    {
      id: "#5412",
      customerId: "C-002",
      date: "01 Oct | 11:29 am",
      status: "Pending",
      amount: 557,
    },
    {
      id: "#6622",
      customerId: "C-003",
      date: "01 Oct | 11:29 am",
      status: "Paid",
      amount: 156,
    },
    {
      id: "#6462",
      customerId: "C-004",
      date: "01 Oct | 11:29 am",
      status: "Paid",
      amount: 265,
    },
    {
      id: "#6462",
      customerId: "C-005",
      date: "01 Oct | 11:29 am",
      status: "Paid",
      amount: 265,
    },
  ];
}

export async function fetchTopProducts(): Promise<TopProduct[]> {
  await delay(300);
  return [
    {
      id: "p-001",
      name: "Apple iPhone 13",
      sku: "#FXZ-4567",
      price: 999.0,
      image: "",
    },
    {
      id: "p-002",
      name: "Nike Air Jordan",
      sku: "#FXZ-4568",
      price: 72.4,
      image: "",
    },
    { id: "p-003", name: "T-shirt", sku: "#FXZ-4569", price: 35.4, image: "" },
    {
      id: "p-004",
      name: "Assorted Cross Bag",
      sku: "#FXZ-4570",
      price: 80.0,
      image: "",
    },
  ];
}

export async function fetchBestSelling(): Promise<BestSellingProduct[]> {
  await delay(300);
  return [
    {
      id: "b-001",
      name: "Apple iPhone 13",
      totalOrder: 104,
      status: "Stock",
      price: 999,
      image: "",
    },
    {
      id: "b-002",
      name: "Nike Air Jordan",
      totalOrder: 56,
      status: "Stock out",
      price: 999,
      image: "",
    },
    {
      id: "b-003",
      name: "T-shirt",
      totalOrder: 266,
      status: "Stock",
      price: 999,
      image: "",
    },
    {
      id: "b-004",
      name: "Assorted Cross Bag",
      totalOrder: 506,
      status: "Stock",
      price: 999,
      image: "",
    },
  ];
}

export async function fetchAddableProducts(): Promise<AddableProduct[]> {
  await delay(300);
  return [
    { id: "a-001", name: "Smart Fitness Tracker", price: 39.99, image: "" },
    { id: "a-002", name: "Leather Wallet", price: 19.99, image: "" },
    { id: "a-003", name: "Electric Hair Trimmer", price: 34.99, image: "" },
    { id: "b-004", name: "Assorted Cross Bag", price: 999, image: "" },
    { id: "b-001", name: "Apple iPhone 13", price: 999, image: "" },
  ];
}
