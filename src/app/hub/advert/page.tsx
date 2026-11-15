import { redirect } from "next/navigation";

import { HubAdvertPage } from "@/components/hub/HubAdvertPage";
import { BuyerAdvertPage } from "@/components/hub/BuyerAdvertPage";
import { getOptionalVendorAuth } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";

export default async function Page() {
  const vendor = await getOptionalVendorAuth();
  if (vendor) {
    return <HubAdvertPage userId={vendor.userId} />;
  }
  const buyer = await getOptionalBuyerAuth();
  if (!buyer) redirect("/hub");
  return <BuyerAdvertPage buyerId={buyer.buyerId} />;
}
