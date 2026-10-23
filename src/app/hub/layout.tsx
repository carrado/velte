import { IdentitySessionSync } from "@/components/chat/IdentitySessionSync";
import { HubHeader } from "@/components/hub/HubHeader";
import { CreditsModalProvider } from "@/components/credits/CreditsModal";

// Shared Hub shell. No chat sidebar and no vendor-dashboard sidebar.
// The page chooses the vendor business view or the buyer directory.
// Ask Velte is the way back to chat.
export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <CreditsModalProvider>
      <IdentitySessionSync />
      <div className="min-h-dvh bg-canvas overflow-x-clip">
        <HubHeader />
        <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 py-5">
          {children}
        </div>
      </div>
    </CreditsModalProvider>
  );
}
