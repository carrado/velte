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
        <div className="min-h-dvh bg-canvas overflow-x-clip">
          <HubHeader />
          <div className="w-full max-w-[1240px] mx-auto px-0 lg:px-6 pt-0 pb-5 lg:py-5">
            {children}
          </div>
        </div>
      </NavigationProgressProvider>
    </CreditsModalProvider>
  );
}
