import { IdentitySessionSync } from "@/components/chat/IdentitySessionSync";
import { HubHeader } from "@/components/hub/HubHeader";
import { HubNotificationsSync } from "@/components/hub/HubNotificationsSync";
import { NavigationProgressProvider } from "@/components/hub/HubNavigationProgressContext";
import { CreditsModalProvider } from "@/components/credits/CreditsModal";

// Shared Hub shell. No chat sidebar and no vendor-dashboard sidebar.
// The page chooses the vendor business view or the buyer directory.
// Ask Velte is the way back to chat. NavigationProgressProvider prefetches
// each Hub route's data before push — same pattern as /chat and /[id].
export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <CreditsModalProvider>
      <NavigationProgressProvider>
        <IdentitySessionSync />
        <HubNotificationsSync />
        <div className="min-h-dvh bg-canvas overflow-x-clip flex flex-col">
          <HubHeader />
          <main className="w-full flex-1">{children}</main>
        </div>
      </NavigationProgressProvider>
    </CreditsModalProvider>
  );
}
