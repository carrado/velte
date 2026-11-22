import { BuyerHubGate } from "@/components/hub/BuyerHubGate";
import { BuyerSponsoredAdvertsPage } from "@/components/hub/BuyerSponsoredAdvertsPage";
import { getActorAuth } from "@/lib/server/buyerGuards";

export const metadata = {
  title: "My Sponsored Adverts | Velte Hub",
  description:
    "Track reach, buyer impressions, and storefront conversions for your sponsored vendor adverts.",
};

export default async function HubSponsoredAdvertsPageRoute() {
  const actor = await getActorAuth();
  if (!actor) return <BuyerHubGate />;
  return <BuyerSponsoredAdvertsPage />;
}
