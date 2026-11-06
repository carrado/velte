import { BuyerHubGate } from "@/components/hub/BuyerHubGate";
import { VendorDirectoryScreen } from "@/components/hub/VendorDirectory";
import { getActorAuth } from "@/lib/server/buyerGuards";

export const metadata = {
  title: "Verified Vendors",
  description:
    "Find trusted businesses and services from verified vendors near you on Velte.",
};

export default async function HubVendorsPage() {
  const actor = await getActorAuth();
  if (!actor) return <BuyerHubGate />;
  return <VendorDirectoryScreen />;
}
