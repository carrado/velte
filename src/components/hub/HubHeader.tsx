"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { AskVelteSearchBar } from "@/components/AskVelteSearchBar";
import { Avatar } from "@/components/Avatar";
import AnchoredPopover from "@/components/AnchoredPopover";
import { CartButton } from "@/components/cart/CartDrawer";
import LogoutModal from "@/components/LogOutModal";
import { HubLink } from "@/components/hub/HubLink";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import { ThemeToggleButton } from "@/components/landing/ThemeToggleButton";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { VelteLogo } from "@/components/VelteLogo";
import { BellIcon } from "@/components/icons/hero";
import {
  BarChartIcon,
  CreditCardIcon,
  CrownIcon,
  FeedIcon,
  GiftIcon,
  LogOutIcon,
  SettingsIcon,
  StoreIcon,
  UsersIcon,
} from "@/components/icons";
import {
  EnterpriseAvatarBadge,
  EnterpriseBadge,
  isEnterpriseVendor,
} from "@/components/EnterpriseBadge";
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
  const isEnterprise = isEnterpriseVendor(userDetails);

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
    "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-gray-100 dark:hover:bg-white/10";

  return (
    <>
      <header
        className={
          hideSearch
            ? "sticky top-0 z-30 flex h-16 items-center justify-between gap-4 px-3.5 sm:px-6 border-b border-gray-200 dark:border-white/10 bg-surface/95 dark:bg-surface/95 backdrop-blur-md"
            : "sticky top-0 z-30 flex flex-col border-b border-gray-200 dark:border-white/10 bg-surface/95 dark:bg-surface/95 backdrop-blur-md px-3.5 sm:px-6 md:grid md:h-16 md:grid-cols-[auto_minmax(0,34rem)_auto] md:items-center md:justify-between md:gap-4 lg:gap-8"
        }
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 w-full md:w-auto md:contents">
          <div className="flex shrink-0 items-center">
            <HubLink
              href={userDetails ? "/wallet" : buyer ? "/chat" : "/"}
              className="shrink-0"
            >
              <VelteLogo
                width={72}
                height={35}
                className="w-14 sm:w-[72px] h-auto"
                priority
              />
            </HubLink>
          </div>
          {!hideSearch && (
            <div className="hidden min-w-0 md:block max-w-xl w-full">
              <AskVelteSearchBar className="w-full" />
            </div>
          )}
          <div
            className={cn(
              "flex items-center",
              account
                ? "flex-1 justify-between ml-6 sm:ml-0 sm:flex-initial sm:justify-end sm:gap-2.5"
                : "shrink-0 justify-end gap-1.5 sm:gap-2.5",
            )}
          >
            {account ? (
              <>
                <HubLink
                  href="/store"
                  className="inline-flex shrink-0 items-center justify-center gap-2 h-9 w-9 md:w-auto md:px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-ink/80 transition-colors whitespace-nowrap active:scale-95"
                  aria-label="My Store"
                  title="My Store"
                >
                  <StoreIcon size={18} className="shrink-0" />
                  <span className="hidden md:inline text-sm font-semibold whitespace-nowrap text-gray-800 dark:text-ink">
                    My Store
                  </span>
                </HubLink>
                <HubLink
                  href="/hub"
                  className="inline-flex shrink-0 items-center justify-center gap-2 h-9 w-9 md:w-auto md:px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-ink/80 transition-colors whitespace-nowrap active:scale-95"
                  aria-label="Vendor's Hub"
                  title="Vendor's Hub"
                >
                  <FeedIcon size={18} className="shrink-0" />
                  <span className="hidden md:inline text-sm font-semibold whitespace-nowrap text-gray-800 dark:text-ink">
                    Vendor&apos;s Hub
                  </span>
                </HubLink>
                <CartButton />
                <button
                  type="button"
                  className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-700 dark:text-ink/80 hover:bg-gray-100 dark:hover:bg-white/10 md:hidden transition-colors active:scale-95 cursor-pointer"
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
              </>
            ) : (
              <ThemeToggleButton className="focus-visible:ring-offset-surface" />
            )}
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
                  className="flex h-9 w-9 sm:w-auto cursor-pointer items-center justify-center gap-2 min-w-0 p-0 sm:pl-1.5 sm:pr-3 rounded-full border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0 active:scale-95"
                >
                  <div className="relative flex shrink-0 items-center justify-center">
                    <Avatar
                      src={account.avatar}
                      alt="avatar"
                      label={getInitial(account.name || "?")}
                      className="w-[28px] h-[28px] shrink-0"
                    />
                    {isEnterprise && <EnterpriseAvatarBadge size="sm" />}
                  </div>
                  <span className="hidden sm:block max-w-[140px] truncate text-xs font-semibold text-gray-800 dark:text-ink">
                    {account.name}
                  </span>
                </button>
                <AnchoredPopover
                  open={menuOpen}
                  onClose={() => setMenuOpen(false)}
                  anchorRef={chipRef}
                  align="right"
                  className="w-56 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-surface py-1 shadow-lg dark:shadow-black/50"
                >
                  {isEnterprise && (
                    <div className="px-3 py-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-b border-amber-500/20 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                        <CrownIcon
                          size={12}
                          weight="fill"
                          className="text-amber-500"
                        />
                        Enterprise Plan
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Active
                      </span>
                    </div>
                  )}
                  {userDetails ? (
                    <>
                      <HubLink
                        href="/store"
                        onClick={() => setMenuOpen(false)}
                        className={cn(menuItemClass, "md:hidden")}
                      >
                        <StoreIcon
                          size={17}
                          className="shrink-0 text-gray-400"
                        />
                        <span>My Store</span>
                      </HubLink>
                      <HubLink
                        href="/pricing"
                        onClick={() => setMenuOpen(false)}
                        className={cn(menuItemClass, "md:hidden")}
                      >
                        <CreditCardIcon
                          size={17}
                          className="shrink-0 text-gray-400"
                        />
                        <span>Billing</span>
                      </HubLink>
                      <HubLink
                        href="/referrals"
                        onClick={() => setMenuOpen(false)}
                        className={cn(menuItemClass, "md:hidden")}
                      >
                        <GiftIcon
                          size={17}
                          className="shrink-0 text-gray-400"
                        />
                        <span>Referrals</span>
                      </HubLink>
                      <HubLink
                        href="/hub/community"
                        onClick={() => setMenuOpen(false)}
                        className={menuItemClass}
                      >
                        <UsersIcon
                          size={17}
                          className="shrink-0 text-gray-400"
                        />
                        <span>Community Hub</span>
                      </HubLink>
                      <HubLink
                        href="/reports"
                        onClick={() => setMenuOpen(false)}
                        className={menuItemClass}
                      >
                        <BarChartIcon
                          size={17}
                          className="shrink-0 text-gray-400"
                        />
                        <span>Reports</span>
                      </HubLink>
                      <HubLink
                        href="/settings"
                        onClick={() => setMenuOpen(false)}
                        className={menuItemClass}
                      >
                        <SettingsIcon
                          size={17}
                          className="shrink-0 text-gray-400"
                        />
                        <span>Settings</span>
                      </HubLink>
                      <HubLink
                        href="/hub/community"
                        onClick={() => setMenuOpen(false)}
                        className={menuItemClass}
                      >
                        <UsersIcon
                          size={17}
                          className="shrink-0 text-gray-400"
                        />
                        <span>Community Hub</span>
                      </HubLink>
                    </>
                  ) : buyer ? (
                    <>
                      <HubLink
                        href="/pricing"
                        onClick={() => setMenuOpen(false)}
                        className={cn(menuItemClass, "md:hidden")}
                      >
                        <CreditCardIcon
                          size={17}
                          className="shrink-0 text-gray-400"
                        />
                        <span>Billing</span>
                      </HubLink>
                      <HubLink
                        href="/referrals"
                        onClick={() => setMenuOpen(false)}
                        className={cn(menuItemClass, "md:hidden")}
                      >
                        <GiftIcon
                          size={17}
                          className="shrink-0 text-gray-400"
                        />
                        <span>Referrals</span>
                      </HubLink>
                      <HubLink
                        href="/hub/community"
                        onClick={() => setMenuOpen(false)}
                        className={menuItemClass}
                      >
                        <UsersIcon
                          size={17}
                          className="shrink-0 text-gray-400"
                        />
                        <span>Community Hub</span>
                      </HubLink>
                    </>
                  ) : vendorDashboardId ? (
                    <HubLink
                      href="/auth/login"
                      onClick={() => setMenuOpen(false)}
                      className={menuItemClass}
                    >
                      <StoreIcon
                        size={17}
                        className="shrink-0 text-orange-500"
                      />
                      <span>Sign in to Vendor account</span>
                    </HubLink>
                  ) : (
                    <HubLink
                      href="/join"
                      onClick={() => setMenuOpen(false)}
                      className={menuItemClass}
                    >
                      <StoreIcon
                        size={17}
                        className="shrink-0 text-orange-500"
                      />
                      <span>Sell on Velte</span>
                    </HubLink>
                  )}
                  <div className="my-1 border-t border-gray-100 dark:border-white/10" />
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-ink/80">
                      Theme
                    </span>
                    <ThemeToggleButton />
                  </div>
                  <div className="my-1 border-t border-gray-100 dark:border-white/10" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmingLogout(true);
                    }}
                    className={cn(
                      menuItemClass,
                      "cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10",
                    )}
                  >
                    <LogOutIcon
                      size={17}
                      className="shrink-0 text-red-500 dark:text-red-400"
                    />
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
      <LogoutModal
        isOpen={confirmingLogout}
        onClose={() => setConfirmingLogout(false)}
        onConfirm={signOut}
        disabled={signingOut}
      />
    </>
  );
}
