export type TransactionStatus = "Complete" | "Pending" | "Canceled";
export type TransactionTabFilter = "all" | "completed" | "pending" | "canceled";

export interface Transaction {
  id: string;
  customerId: string;
  name: string;
  date: string;
  total: string;
  method: string;
  status: TransactionStatus;
}
