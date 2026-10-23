"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";

// Timeline shortcuts rail. Vendors get manage + create destinations (anchors
// into their own Hub sections, then the real editors); buyers get browse
// anchors. Anchor-first on purpose: the Hub is one scrolling page, so
// jumping beats routing.
function SideLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-ink transition-colors"
    >
      {label}
    </Link>
  );
}

export function HubSideNav({ audience }: { audience: "vendor" | "buyer" }) {
  const pathname = usePathname();
  // Dashboard pages scope their sidebar hrefs to the vendor id segment;
  // derive it the same way Sidebar does.
  const userId = audience === "vendor" ? (pathname.split("/")[1] ?? "") : "";

  return (
    <nav aria-label="Hub shortcuts" className="space-y-0.5">
      <p
        className={cn(
          "px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400",
        )}
      >
        Hub
      </p>
      <SideLink href="#hub-feed" label="Timeline" />
      {audience === "vendor" ? (
        <>
          <SideLink href="#hub-pins" label="My pins" />
          <SideLink href="#hub-drafts" label="Broadcast drafts" />
          <SideLink href="#hub-insights" label="Insights" />
          <div className="mx-3 my-2 border-t border-gray-200/70" />
          <SideLink href={`/${userId}/products/add`} label="Add a listing" />
          <SideLink href={`/${userId}/store`} label="Edit contact card" />
        </>
      ) : (
        <>
          <SideLink href="#hub-promoted" label="Promoted" />
          <SideLink href="#hub-businesses" label="Businesses" />
          <div className="mx-3 my-2 border-t border-gray-200/70" />
          <SideLink href="/marketplace" label="Full marketplace" />
          <SideLink href="/chat" label="Ask Velte" />
        </>
      )}
    </nav>
  );
}
