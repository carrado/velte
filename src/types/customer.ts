export type CustomerStatus = "Active" | "Inactive" | "VIP";
export type CustomerFilter = "all" | "active" | "inactive" | "vip";
export type CustomerSort =
  | "name_asc"
  | "name_desc"
  | "orders_asc"
  | "orders_desc";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  orders: number;
  spend: string;
  status: CustomerStatus;
}
