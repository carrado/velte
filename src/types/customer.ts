export type CustomerStatus = "Active" | "Inactive" | "VIP";
export type CustomerFilter = "all" | "active" | "inactive" | "vip";
export type CustomerSort =
  | "name_asc"
  | "name_desc"
  | "orders_asc"
  | "orders_desc";

export interface Customer {
  /** Database id — used as the stable React key / lookups, not shown in the UI. */
  id: string;
  /** Human-friendly display code derived server-side, e.g. "CUST-A3F9D2". */
  code: string;
  name: string;
  phone: string;
  orders: number;
  /** Total spend in Naira, pre-formatted (e.g. "12,500.00"). */
  spend: string;
  status: CustomerStatus;
}

export interface DayPoint {
  day: string;
  value: number;
}

/** New-customers-per-day for this week and last week (overview chart). */
export interface CustomerStats {
  thisWeek: DayPoint[];
  lastWeek: DayPoint[];
}
