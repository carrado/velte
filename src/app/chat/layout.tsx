"use client";

import { useState } from "react";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMobileDrawer } from "@/components/chat/ChatMobileDrawer";

// The /chat shell (2026-08-17, buyer-dashboard removal) — wraps /chat
// itself plus /chat/requests, /chat/requests/[id], /chat/profile. Owns the
// full-viewport height/scroll boundary that SearchHome.tsx used to own on
// its own (that page is no longer the WHOLE screen, just the content column
// beside the sidebar) — ChatHeader is `shrink-0`, the row below it
// (sidebar + page content) takes the rest via `flex-1 min-h-0`, and each
// child owns its own internal scrolling from there.
//
// `drawerOpen` lives here, not inside ChatHeader/ChatMobileDrawer
// individually — the hamburger button and the drawer it opens are two
// different components (header vs. portal-rendered drawer), so the state
// toggling between them has to live at their shared parent.
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-white">
      <ChatHeader onOpenMenu={() => setDrawerOpen(true)} />
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <ChatSidebar />
        <div className="flex-1 min-w-0 overflow-hidden">{children}</div>
      </div>
      <ChatMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
