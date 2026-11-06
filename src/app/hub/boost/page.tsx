import { redirect } from "next/navigation";

import { HubBoostPage } from "@/components/hub/HubBoostPage";
import { getOptionalVendorAuth } from "@/lib/server/guards";

export default async function Page() {
  const vendor = await getOptionalVendorAuth();
  if (!vendor) redirect("/hub");
  return <HubBoostPage userId={vendor.userId} />;
}
