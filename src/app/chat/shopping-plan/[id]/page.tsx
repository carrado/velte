import type { Metadata } from "next";

import { ShoppingPlanDetailPage } from "@/components/search/ShoppingPlanDetailPage";

// Reached from the Shopping Plans index, or from a daily digest
// notification's own link (velte-backend's shoppingPlan.job.js).
export const metadata: Metadata = {
  title: "Shopping plan · Velte",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShoppingPlanDetailPage planId={id} />;
}
