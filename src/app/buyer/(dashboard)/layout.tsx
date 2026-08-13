import type { ReactNode } from "react";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import BuyerBottomNav from "@/components/buyer/BuyerBottomNav";
import { BuyerNavigationProgressProvider } from "@/components/buyer/BuyerNavigationProgressContext";

// Route group — wraps Home/Requests/Saved/Profile only. /buyer/auth sits
// OUTSIDE this group deliberately (see that page) so it keeps its own
// full-screen layout instead of inheriting the header/bottom nav.
// BuyerNavigationProgressProvider is this tree's own instance of the same
// top-progress-bar navigation the vendor dashboard uses (/[id]/layout.tsx's
// NavigationProgressProvider) — see BuyerNavigationProgressContext's own
// comment for how the two share their implementation.
export default function BuyerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <BuyerNavigationProgressProvider>
      <div className="min-h-screen bg-[#F1F5F9] pb-24">
        <BuyerHeader />
        {children}
        <BuyerBottomNav />
      </div>
    </BuyerNavigationProgressProvider>
  );
}
