import { api } from "@/lib/api-client";
import type { Customer, CustomerStats, DayPoint } from "@/types/customer";

export type { CustomerStats, DayPoint };

// Customers of the authenticated business, created/updated when their orders are
// paid (see velte-backend recordSale). Returns the full list; the customers page
// filters and sorts it client-side.
export async function fetchCustomers(): Promise<Customer[]> {
  const { customers } = await api.get<{ customers: Customer[] }>(
    "/api/customers",
  );
  return customers ?? [];
}

// New-customers-per-day for this week and last week, used by the overview chart.
export async function fetchCustomerStats(): Promise<CustomerStats> {
  const { stats } = await api.get<{ stats: CustomerStats }>(
    "/api/customers/stats",
  );
  return stats;
}
