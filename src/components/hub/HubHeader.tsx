"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { AskVelteSearchBar } from "@/components/AskVelteSearchBar";
import { Avatar } from "@/components/Avatar";
import AnchoredPopover from "@/components/AnchoredPopover";
import { CartButton } from "@/components/cart/CartDrawer";
import { LogoutConfirmModal } from "@/components/chat/LogoutConfirmModal";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import { ThemeToggleButton } from "@/components/landing/ThemeToggleButton";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { VelteLogo } from "@/components/VelteLogo";
import { BellIcon } from "@/components/icons/hero";
import { LogOutIcon, SettingsIcon, StoreIcon } from "@/components/icons";
import { useAccountSignOut } from "@/hooks/useAccountSignOut";
import { getInitial } from "@/lib/initials";
import { cn } from "@/lib/utils";
import { useBuyerStore } from "@/store/buyerStore";
import { useNotificationsStore } from "@/store/notificationsStore";
import { useUserStore } from "@/store/userStore";

// Hub header. Logo, Ask Velte search (→ /chat), theme, cart, account chip.
export function HubHeader({
  hideSearch = false,
}: { hideSearch?: boolean } = {}) {
  const { navigate } = useNavigation();
  const userDetails = useUserStore((state) => state.user);
  const buyer = useBuyerStore((state) => state.buyer);
  const hasUnread = useNotificationsStore((s) =>
    s.notifications.some((n) => !n.read),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  const { signOut, busy: signingOut } = useAccountSignOut();

  const vendorDashboardId = userDetails?.id ?? buyer?.linkedVendorId ?? null;
  const dashboardNeedsSignIn = !userDetails && Boolean(buyer?.linkedVendorId);
  const notificationsHref = userDetails?.id
    ? "/notifications"
    : "/chat/notifications";
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
      <header
        className={
          hideSearch
            ? "sticky top-0 z-30 flex h-16 items-center justify-between gap-4 px-4 sm:px-6 border-b border-gray-200 bg-surface"
            : "sticky top-0 z-30 flex flex-col border-b border-gray-200 bg-surface px-4 sm:px-6 md:grid md:h-16 md:grid-cols-[auto_minmax(0,40rem)_1fr] md:items-center md:gap-16 lg:gap-32"
        }
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 md:contents">
          <div className="flex min-w-0 items-center">
            <Link
              href={buyer && !userDetails ? "/chat" : "/"}
              className="shrink-0"
            >
              <VelteLogo
                width={72}
                height={35}
                className="w-14 sm:w-[72px] h-auto"
                priority
              />
            </Link>
          </div>
          {!hideSearch && (
            <div className="hidden min-w-0 md:block">
              <AskVelteSearchBar className="w-full" />
            </div>
          )}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <ThemeToggleButton className="focus-visible:ring-offset-surface" />
            {account && (
              <>
                {buyer && <CartButton />}
                <button
                  type="button"
                  className="relative inline-flex items-center justify-center rounded-xl p-2 text-gray-600 hover:bg-gray-50 md:hidden"
                  onClick={() => navigate(notificationsHref)}
                  aria-label="Notifications"
                >
                  <BellIcon size={18} />
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-orange-500" />
                  )}
                </button>
                <div className="hidden md:block">
                  <NotificationDropdown />
                </div>
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
                    <>
                      <Link
                        href="/"
                        onClick={() => setMenuOpen(false)}
                        className={menuItemClass}
                      >
                        <StoreIcon
                          size={17}
                          className="shrink-0 text-orange-500"
                        />
                        <span className="min-w-0">
                          <span className="block">Vendor dashboard</span>
                          {dashboardNeedsSignIn && (
                            <span className="block text-xs font-normal text-gray-500">
                              Sign in to continue
                            </span>
                          )}
                        </span>
                      </Link>
                      {userDetails && (
                        <>
                          <Link
                            href="/store"
                            onClick={() => setMenuOpen(false)}
                            className={menuItemClass}
                          >
                            <StoreIcon
                              size={17}
                              className="shrink-0 text-gray-400"
                            />
                            <span>My store</span>
                          </Link>
                          <Link
                            href="/settings"
                            onClick={() => setMenuOpen(false)}
                            className={menuItemClass}
                          >
                            <SettingsIcon
                              size={17}
                              className="shrink-0 text-gray-400"
                            />
                            <span>Settings</span>
                          </Link>
                        </>
                      )}
                    </>
                  ) : (
                    <Link
                      href="/join"
                      onClick={() => setMenuOpen(false)}
                      className={menuItemClass}
                    >
                      <StoreIcon
                        size={17}
                        className="shrink-0 text-orange-500"
                      />
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
                    className={cn(
                      menuItemClass,
                      "cursor-pointer text-gray-600",
                    )}
                  >
                    <LogOutIcon size={17} className="shrink-0 text-gray-400" />
                    <span>Log out</span>
                  </button>
                </AnchoredPopover>
              </>
            )}
          </div>
        </div>

        {!hideSearch && (
          <div className="w-full pb-3 md:hidden">
            <AskVelteSearchBar className="w-full" />
          </div>
        )}
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
