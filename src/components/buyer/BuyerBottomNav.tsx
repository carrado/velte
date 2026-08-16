"use client";

import { usePathname } from "next/navigation";
import {
  MessageCircle,
  Compass,
  ClipboardList,
  Heart,
  User,
} from "lucide-react";
import { useBuyerNavigation } from "@/components/buyer/BuyerNavigationProgressContext";

/* Chat / Discover / Requests / Saved / Profile. "Post a Request" is
   deliberately NOT a nav tab, it's something the AI itself offers mid-
   conversation instead (see createBuyerRequestTool.ts) — never a button to
   tap. "Home" relabeled "Chat" (2026-08-15, AI-agent pivot — "chat should
   dominate the interface") and its icon swapped from a house to a chat
   bubble; the destination is UNCHANGED (still /buyer) since that page
   already leads with the Ask Velte composer, Recent conversations, and
   active requests — it already functions as the chat-first launchpad the
   label now actually says, this was a naming/icon catch-up, not a routing
   change. NOT /marketplace — that used to send a buyer OUT of the whole
   dashboard shell (header/bottom nav gone, back to the marketing Navbar/
   Footer), which is the wrong "home" for someone who already has a buyer
   account.

   Discover is its own tab (added per the buyer-redesign brief's §18 nav
   restructure) rather than folded into Home — Home used to carry the full
   browse catalog directly, which made it read as a second Discover with a
   hero glued on top. Splitting them out matches the brief's core
   principle: "Browse when you know what you want [Discover], Ask Velte
   when you don't [Home's own search-first CTA]." Ask Velte itself stays
   off this bar on purpose — a secondary, consistently-labeled CTA
   reachable from Home/the header, never a tab competing with real
   destinations (see AskVeluxButton's own doc comment — component name
   kept as an internal identifier post-rebrand, see that file's own
   comment).

   Uses BuyerNavigationProgressContext's own navigate() — the buyer
   dashboard's instance of the same top-progress-bar navigation the vendor
   dashboard's Sidebar/BottomNav use, not a plain router.push. */
export default function BuyerBottomNav() {
  const pathname = usePathname();
  const { navigate } = useBuyerNavigation();

  const items = [
    {
      label: "Chat",
      icon: <MessageCircle size={20} />,
      href: "/buyer",
      active: pathname === "/buyer",
    },
    {
      label: "Discover",
      icon: <Compass size={20} />,
      href: "/buyer/discover",
      active: pathname.startsWith("/buyer/discover"),
    },
    {
      label: "Requests",
      icon: <ClipboardList size={20} />,
      href: "/buyer/requests",
      active: pathname.startsWith("/buyer/requests"),
    },
    {
      label: "Saved",
      icon: <Heart size={20} />,
      href: "/buyer/saved",
      active: pathname.startsWith("/buyer/saved"),
    },
    {
      label: "Profile",
      icon: <User size={20} />,
      href: "/buyer/profile",
      active: pathname.startsWith("/buyer/profile"),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10 lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center px-2 py-2">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.href)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg cursor-pointer transition-colors ${
              item.active ? "text-orange-500" : "text-gray-500"
            }`}
          >
            {item.icon}
            <span className="text-dash-caption font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
