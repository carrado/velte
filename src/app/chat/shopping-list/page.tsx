import type { Metadata } from "next";

import { ShoppingListsIndexPage } from "@/components/search/ShoppingListsIndexPage";

export const metadata: Metadata = {
  title: "My shopping lists · Velte",
  description: "Every shopping project you've started with Velte.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ShoppingListsIndexPage />;
}
