import type { ReactNode } from "react";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import BuyerSidebar from "@/components/buyer/BuyerSidebar";
import BuyerBottomNav from "@/components/buyer/BuyerBottomNav";
import { BuyerNavigationProgressProvider } from "@/components/buyer/BuyerNavigationProgressContext";

// Route group — wraps Home/Requests/Saved/Profile only. /buyer/auth sits
// OUTSIDE this group deliberately (see that page) so it keeps its own
// full-screen layout instead of inheriting the header/bottom nav.
// BuyerNavigationProgressProvider is this tree's own instance of the same
// top-progress-bar navigation the vendor dashboard uses (/[id]/layout.tsx's
// NavigationProgressProvider) — see BuyerNavigationProgressContext's own
// comment for how the two share their implementation.
//
// `lg:flex` added 2026-08-16 alongside BuyerSidebar — below `lg` this is
// unchanged from before (plain block stacking: header, then children, then
// the fixed bottom nav; BuyerSidebar renders nothing there, `hidden
// lg:flex`). At `lg` it becomes a row: the sidebar (self-positioned
// sticky/full-height) beside a content column carrying the header + page
// body, same natural-document-scroll model as before — no shell-level
// `overflow-hidden`/inner-scroll-container the way the vendor dashboard
// uses, deliberately, so mobile's existing scroll behavior didn't need to
// change to get the desktop sidebar.
export default function BuyerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <BuyerNavigationProgressProvider>
      <div className="lg:flex bg-[#F1F5F9] min-h-screen">
        <BuyerSidebar />
        <div className="flex-1 min-w-0 pb-24 lg:pb-0">
          <BuyerHeader />
          {children}
        </div>
        <BuyerBottomNav />
      </div>
    </BuyerNavigationProgressProvider>
  );
}
