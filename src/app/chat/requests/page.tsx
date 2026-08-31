import type { Metadata } from "next";

import { RequestsPage } from "@/components/chat/RequestsPage";

// Under /chat for the same reason /chat/watches is: a request only ever comes
// out of a conversation, so reading how it went shouldn't feel like leaving
// one. Inherits the chat shell — the same header and sidebar.
export const metadata: Metadata = {
  title: "Your requests · Velte",
  description:
    "Requests Velte sent to businesses on your behalf, and who accepted.",
  // One buyer's own requests — nothing here is public or indexable.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <RequestsPage />;
}
