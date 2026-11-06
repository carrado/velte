import { BuyerHubGate } from "@/components/hub/BuyerHubGate";
import { BuyerHubScreen } from "@/components/hub/BuyerHubScreen";
import { HubVendorView } from "@/components/hub/HubVendorView";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth } from "@/lib/server/guards";

// One URL for both sides of the Hub. A vendor session is the vendor's
// business page. A buyer session with no vendor session is the buyer
// directory. A guest is asked to sign up. When both cookies are present the
// vendor page wins: this is the page a vendor opens from their dashboard,
// and a linked buyer can still reach the directory by signing out of the
// vendor session.
export default async function Page() {
  const vendor = await getOptionalVendorAuth();
  if (vendor) return <HubVendorView userId={vendor.userId} />;

  const buyer = await getOptionalBuyerAuth();
  if (!buyer) return <BuyerHubGate />;
  return <BuyerHubScreen />;
}
