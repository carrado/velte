import { redirect } from "next/navigation";

import { HubBroadcastPage } from "@/components/hub/HubBroadcastPage";
import { getOptionalVendorAuth } from "@/lib/server/guards";

export default async function Page() {
  const vendor = await getOptionalVendorAuth();
  if (!vendor) redirect("/hub");
  return <HubBroadcastPage userId={vendor.userId} />;
}
