import { ChatHeader } from "@/components/chat/ChatHeader";

// The /chat shell — wraps /chat itself. No sidebar (2026-08-18, removed per
// explicit product direction — "not needed again"): buyers have no account
// to navigate a sidebar's worth of pages for, and a vendor browsing /chat
// can already get back to their own dashboard via the header's avatar link.
// Owns the full-viewport height/scroll boundary that SearchHome.tsx used to
// own on its own — ChatHeader is `shrink-0`, the content below takes the
// rest via `flex-1 min-h-0` and owns its own internal scrolling.
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-white">
      <ChatHeader />
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
