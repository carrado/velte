import { redirect } from "next/navigation";

import { HubAdvertPage } from "@/components/hub/HubAdvertPage";
import { getOptionalVendorAuth } from "@/lib/server/guards";

export default async function Page() {
  const vendor = await getOptionalVendorAuth();
  if (!vendor) redirect("/hub");
  return <HubAdvertPage userId={vendor.userId} />;
}
