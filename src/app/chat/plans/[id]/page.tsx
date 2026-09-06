import type { Metadata } from "next";

import { ShoppingPlanDetailPage } from "@/components/chat/ShoppingPlanDetailPage";

export const metadata: Metadata = {
  title: "Your plan · Velte",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShoppingPlanDetailPage id={id} />;
}
