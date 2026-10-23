"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { AskVeluxButton } from "@/components/AskVeluxButton";
import { Avatar } from "@/components/Avatar";
import AnchoredPopover from "@/components/AnchoredPopover";
import { LogoutConfirmModal } from "@/components/chat/LogoutConfirmModal";
import { ThemeToggleButton } from "@/components/landing/ThemeToggleButton";
import { VelteLogo } from "@/components/VelteLogo";
import { LogOut, Store } from "lucide-react";
import { useAccountSignOut } from "@/hooks/useAccountSignOut";
import { getInitial } from "@/lib/initials";
import { cn } from "@/lib/utils";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";

// Hub header. Logo, the homepage light/dark switch, Ask Velte, then the
// same account chip /chat uses: avatar, name, and the account menu.
export function HubHeader() {
  const userDetails = useUserStore((state) => state.user);
  const buyer = useBuyerStore((state) => state.buyer);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  const { signOut, busy: signingOut } = useAccountSignOut();

  const vendorDashboardId = userDetails?.id ?? buyer?.linkedVendorId ?? null;
  const dashboardNeedsSignIn = !userDetails && Boolean(buyer?.linkedVendorId);
  const account = userDetails
    ? {
        avatar: userDetails.avatar,
        name: userDetails.company?.name ?? userDetails.name,
      }
    : buyer
      ? {
          avatar: buyer.avatar,
          name: buyer.name ?? buyer.email ?? "",
        }
      : null;

  const menuItemClass =
    "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-gray-50";

  return (
    <>
      <header className="sticky top-0 z-30 h-16 flex items-center justify-between gap-3 px-4 sm:px-6 border-b border-gray-200 bg-surface">
        <Link href={buyer && !userDetails ? "/chat" : "/"} className="shrink-0">
          <VelteLogo
            width={72}
            height={35}
            className="w-14 sm:w-[72px] h-auto"
            priority
          />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggleButton />
          <AskVeluxButton
            variant="compact"
            label="Ask Velte"
            className="hidden sm:flex"
          />
          {account && (
            <>
              <button
                ref={chipRef}
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Your account"
                title={buyer?.email ?? undefined}
                className="flex cursor-pointer items-center gap-2 min-w-0 pl-1 pr-2 sm:pr-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Avatar
                  src={account.avatar}
                  alt="avatar"
                  label={getInitial(account.name || "?")}
                  className="w-7 h-7"
                />
                <span className="hidden sm:block max-w-[160px] truncate text-sm font-medium text-gray-800">
                  {account.name}
                </span>
              </button>
              <AnchoredPopover
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                anchorRef={chipRef}
                align="right"
                className="w-56 overflow-hidden rounded-xl border border-gray-200 bg-surface py-1 shadow-lg"
              >
                {vendorDashboardId ? (
                  <Link
                    href={`/${vendorDashboardId}/wallet`}
                    onClick={() => setMenuOpen(false)}
                    className={menuItemClass}
                  >
                    <Store size={17} className="shrink-0 text-orange-500" />
                    <span className="min-w-0">
                      <span className="block">Vendor dashboard</span>
                      {dashboardNeedsSignIn && (
                        <span className="block text-xs font-normal text-gray-500">
                          Sign in to continue
                        </span>
                      )}
                    </span>
                  </Link>
                ) : (
                  <Link
                    href="/join"
                    onClick={() => setMenuOpen(false)}
                    className={menuItemClass}
                  >
                    <Store size={17} className="shrink-0 text-orange-500" />
                    <span>Sell on Velte</span>
                  </Link>
                )}
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmingLogout(true);
                  }}
                  className={cn(menuItemClass, "cursor-pointer text-gray-600")}
                >
                  <LogOut size={17} className="shrink-0 text-gray-400" />
                  <span>Log out</span>
                </button>
              </AnchoredPopover>
            </>
          )}
        </div>
      </header>
      {confirmingLogout && (
        <LogoutConfirmModal
          busy={signingOut}
          onClose={() => setConfirmingLogout(false)}
          onConfirm={signOut}
        />
      )}
    </>
  );
}
