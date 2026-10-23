"use client";

"use client";

import { HubDashboard } from "./HubDashboard";

/** The vendor's own Hub, rendered inside the shared /hub shell. */
export function HubVendorView({ userId }: { userId: string }) {
  return <HubDashboard scope="vendor" userId={userId} />;
}
