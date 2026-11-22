import { BuyerHubGate } from "@/components/hub/BuyerHubGate";
import { BuyerGigsPage } from "@/components/hub/BuyerGigsPage";
import { getActorAuth } from "@/lib/server/buyerGuards";

export const metadata = {
  title: "Gigs & Vendor Bounties | Velte Hub",
  description:
    "Win vendor tasks, storefront audits, cataloging, and earn cash rewards via Velte escrow.",
};

export default async function HubGigsPageRoute() {
  const actor = await getActorAuth();
  if (!actor) return <BuyerHubGate />;
  return <BuyerGigsPage />;
}
