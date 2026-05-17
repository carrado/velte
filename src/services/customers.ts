import type { Customer } from "@/types/customer";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const CUSTOMERS_DATA: Customer[] = [
  {
    id: "#CUST001",
    name: "John Doe",
    phone: "+1234567890",
    orders: 25,
    spend: "3,450.00",
    status: "Active",
  },
  {
    id: "#CUST002",
    name: "John Doe",
    phone: "+1234567890",
    orders: 25,
    spend: "3,450.00",
    status: "Active",
  },
  {
    id: "#CUST003",
    name: "John Doe",
    phone: "+1234567890",
    orders: 25,
    spend: "3,450.00",
    status: "Active",
  },
  {
    id: "#CUST004",
    name: "John Doe",
    phone: "+1234567890",
    orders: 25,
    spend: "3,450.00",
    status: "Active",
  },
  {
    id: "#CUST005",
    name: "Jane Smith",
    phone: "+1234567890",
    orders: 5,
    spend: "250.00",
    status: "Inactive",
  },
  {
    id: "#CUST006",
    name: "Emily Davis",
    phone: "+1234567890",
    orders: 30,
    spend: "4,600.00",
    status: "VIP",
  },
  {
    id: "#CUST007",
    name: "Jane Smith",
    phone: "+1234567890",
    orders: 5,
    spend: "250.00",
    status: "Inactive",
  },
  {
    id: "#CUST008",
    name: "Emily Davis",
    phone: "+1234567890",
    orders: 30,
    spend: "4,600.00",
    status: "VIP",
  },
  {
    id: "#CUST009",
    name: "Michael Brown",
    phone: "+1234567890",
    orders: 12,
    spend: "1,200.00",
    status: "Active",
  },
  {
    id: "#CUST010",
    name: "Sarah Wilson",
    phone: "+1234567890",
    orders: 8,
    spend: "890.00",
    status: "Active",
  },
  {
    id: "#CUST011",
    name: "David Lee",
    phone: "+1234567890",
    orders: 3,
    spend: "150.00",
    status: "Inactive",
  },
  {
    id: "#CUST012",
    name: "Lisa Chen",
    phone: "+1234567890",
    orders: 45,
    spend: "8,200.00",
    status: "VIP",
  },
];

export async function fetchCustomers(): Promise<Customer[]> {
  await delay(350);
  return [...CUSTOMERS_DATA];
}
