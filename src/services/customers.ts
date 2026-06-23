import { apiClient } from "@/lib/api";
import type { Customer } from "@/types/customer";

interface FetchCustomersResponse {
  success: boolean;
  data: Customer[];
}

// Customers of the authenticated business, created/updated when their orders are
// paid (see velte-backend recordSale). Returns the full list; the customers page
// filters and sorts it client-side.
export async function fetchCustomers(): Promise<Customer[]> {
  const res = await apiClient<FetchCustomersResponse>("/customers");
  return res.data ?? [];
}

export interface DayPoint {
  day: string;
  value: number;
}

export interface CustomerStats {
  thisWeek: DayPoint[];
  lastWeek: DayPoint[];
}

interface FetchCustomerStatsResponse {
  success: boolean;
  data: CustomerStats;
}

// New-customers-per-day for this week and last week, used by the overview chart.
export async function fetchCustomerStats(): Promise<CustomerStats> {
  const res = await apiClient<FetchCustomerStatsResponse>("/customers/stats");
  return res.data;
}
