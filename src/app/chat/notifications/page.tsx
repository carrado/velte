import type { Metadata } from "next";

import { NotificationsPage } from "@/components/chat/NotificationsPage";

// Under /chat rather than at the root so it inherits the chat shell — the
// same header and sidebar the buyer already has open. A notification is about
// something that happened inside a search, so reading one shouldn't feel like
// leaving it.
//
// Distinct from the vendor dashboard's own /[id]/notifications, which serves
// the same feed to the same person in their other role. Both read the one
// owner-keyed API; neither is a copy of the other's UI.
export const metadata: Metadata = {
  title: "Notifications · Velte",
  description: "Answers to your requests, and anything else worth knowing.",
  // One account's own feed — never public, never indexable.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <NotificationsPage />;
}
