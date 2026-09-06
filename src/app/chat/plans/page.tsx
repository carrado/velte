import type { Metadata } from "next";

import { PlansPage } from "@/components/chat/PlansPage";

// Under /chat for the same reason /chat/requests is: a plan only ever
// comes out of a conversation (the composer's Shopping Plan tool), so
// reviewing it shouldn't feel like leaving one. Inherits the chat shell —
// the same header and sidebar.
export const metadata: Metadata = {
  title: "Your plans · Velte",
  description:
    "Every budgeted shopping plan you've built, and how it's tracking.",
  // One buyer's own plans — nothing here is public or indexable.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PlansPage />;
}
