import { HubCommunityPage } from "@/components/hub/HubCommunityPage";
import { getOptionalUserId } from "@/lib/server/guards";

export default async function Page() {
  const userId = (await getOptionalUserId()) ?? "";
  return <HubCommunityPage userId={userId} />;
}
