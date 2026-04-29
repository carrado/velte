export type CustomerStatus = "Active" | "Inactive" | "VIP";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  orders: number;
  spend: string;
  status: CustomerStatus;
}
