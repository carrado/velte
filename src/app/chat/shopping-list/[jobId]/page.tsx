import type { Metadata } from "next";

import { ShoppingListResultsPage } from "@/components/search/ShoppingListResultsView";

// Reached from the "View" CTA on the completion toast/notification (spec
// §13-14) — see ShoppingListResultsView.tsx's own header for why results
// land on a dedicated route rather than back inside the original
// conversation.
export const metadata: Metadata = {
  title: "Shopping list · Velte",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <ShoppingListResultsPage jobId={jobId} />;
}
