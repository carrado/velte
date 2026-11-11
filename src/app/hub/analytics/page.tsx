import { redirect } from "next/navigation";

import { HubAnalyticsPage } from "@/components/hub/HubAnalyticsPage";
import { getOptionalVendorAuth } from "@/lib/server/guards";

export default async function Page() {
  const vendor = await getOptionalVendorAuth();
  if (!vendor) redirect("/hub");
  return <HubAnalyticsPage userId={vendor.userId} />;
}
