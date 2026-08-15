"use client";

import Image from "next/image";
import { UserRound } from "lucide-react";
import { AskVeluxButton } from "@/components/AskVeluxButton";
import { BuyerNotificationBell } from "@/components/buyer/BuyerNotificationBell";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import { useBuyerNavigation } from "@/components/buyer/BuyerNavigationProgressContext";
import { getInitial } from "@/lib/initials";

// The buyer dashboard's own top bar — gives the shell the same chrome
// weight as the vendor dashboard's Header (Ask Velux + notifications +
// account avatar right) instead of pages just starting cold at the
// viewport top. Still NOT a full vendor Header clone: no account popover —
// the avatar is a plain link straight to Profile (which already owns
// logout) rather than duplicating that popover here. Reuses the site-wide
// AskVeluxButton (same component the public Navbar/marketplace and vendor
// Header use) so the "go talk to Velux" affordance stays visually identical
// everywhere it shows up. The bell IS its own thing though — see
// BuyerNotificationBell's own comment on why it's a simpler build than the
// vendor Header's, not a copy of it.
//
// The logo below is `lg:hidden` (2026-08-16, once BuyerSidebar shipped) —
// this bar used to show it at every width, back when there was no sidebar
// to carry it instead (see BuyerSidebar's own comment on that change).
// Showing it in both places at once on desktop would just be duplicated
// chrome, same reasoning as why the vendor Header carries no logo at all —
// Sidebar already owns it there. The row's own `max-w-2xl` (a mobile-width
// cap) is dropped at `lg` too, and `justify-between` becomes `justify-end`
// — with the logo gone, a single left child would otherwise get pushed to
// the row's start by `justify-between`'s default two-item assumption, and
// the mobile-width cap would center the row instead of letting it reach
// the actual right edge of the (much wider) desktop content column.
//
// Buyer.model.js has no avatar/image field yet, so this is initials-only
// for now (falling back further to a bare person icon pre-verification) —
// same visual weight as the vendor Header's own avatar circle, ready to
// swap in a real photo the moment that field ships.
//
// Logo and avatar both use navigate() (BuyerNavigationProgressContext),
// not next/link — same "real button, top progress bar" convention the
// vendor Sidebar/Header use for their own in-shell navigation, not a
// plain <Link>.
export default function BuyerHeader() {
  const { buyer } = useBuyerSession();
  const { navigate } = useBuyerNavigation();

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-100 pt-[env(safe-area-inset-top)]">
      <div className="max-w-2xl mx-auto lg:max-w-none lg:mx-0 px-4 h-14 flex items-center justify-between lg:justify-end gap-3">
        <button
          onClick={() => navigate("/buyer")}
          className="shrink-0 cursor-pointer lg:hidden"
          aria-label="Home"
        >
          <Image
            src="/velte_logo_esn5dj.png"
            alt="Velte"
            width={80}
            height={39}
            className="w-[68px] sm:w-[80px] h-auto"
            priority
          />
        </button>
        <div className="flex items-center gap-2.5">
          <AskVeluxButton variant="compact" label="Ask Velux" />
          <BuyerNotificationBell />
          <button
            onClick={() => navigate("/buyer/profile")}
            aria-label="Your profile"
            className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-dash-body font-bold shrink-0 overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1"
          >
            {buyer?.name ? (
              <span>{getInitial(buyer.name)}</span>
            ) : (
              <UserRound size={15} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
