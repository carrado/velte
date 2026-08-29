import type { Metadata } from "next";

import { WatchesPage } from "@/components/chat/WatchesPage";

// Under /chat rather than at the root so it inherits the chat shell — the
// same header and conversation sidebar the buyer already has open. A watch
// starts inside a search, so managing one shouldn't feel like leaving it.
export const metadata: Metadata = {
  title: "Watching · Velte",
  description:
    "Prices Velte is watching for you. We'll email you when one drops.",
  // Nothing here is public or indexable — it's one buyer's own saved items.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <WatchesPage />;
}
