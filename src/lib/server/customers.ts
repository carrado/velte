import { backendData } from "./backend";
import type { Customer, CustomerStats, CustomerStatus } from "@/types/customer";

/* Server data module for customers. Adds a human-friendly display `code` so the
   UI never shows the raw database id. */

interface RawCustomer {
  id: string;
  name: string;
  phone: string;
  orders: number;
  spend: string;
  status: CustomerStatus;
}

/** Stable, readable code derived from the id (not sequential — that needs
    backend support — but stable per customer and clearly not the raw id).
    Shared with the transactions table so the same customer shows the same code. */
export function customerCode(id: string): string {
  const tail = id
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-6)
    .toUpperCase();
  return `CUST-${tail || "000000"}`;
}

export async function listCustomers(cookie: string): Promise<Customer[]> {
  const raw = await backendData<RawCustomer[]>("/customers", { cookie });
  return (raw ?? []).map((c) => ({ ...c, code: customerCode(c.id) }));
}

export async function getCustomerStats(cookie: string): Promise<CustomerStats> {
  return backendData<CustomerStats>("/customers/stats", { cookie });
}
