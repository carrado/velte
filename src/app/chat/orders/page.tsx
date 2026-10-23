import type { Metadata } from "next";

import { OrdersPage } from "@/components/chat/OrdersPage";

export const metadata: Metadata = {
  title: "Your orders · Velte",
  description: "When you check out from your cart, the order lands here.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OrdersPage />;
}
