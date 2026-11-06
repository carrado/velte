"use client";

/* eslint-disable @next/next/no-img-element */

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { AskVelteSearchBar } from "@/components/AskVelteSearchBar";
import { useUserStore } from "@/store/userStore";
import { useMutation } from "@tanstack/react-query";
import { usersApi } from "@/services/users";
import { toast } from "sonner";
import { getInitial } from "@/lib/initials";
import { CartButton } from "@/components/cart/CartDrawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { HeaderProps } from "@/types/common";
import { useNavigation } from "@/components/NavigationProgressContext";
import { useNotificationsStore } from "@/store/notificationsStore";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { useIsStandalone } from "@/hooks/useIsStandalone";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  BellIcon,
  LogOutIcon,
  SettingsIcon,
  StoreIcon,
} from "@/components/icons/hero";
import { CreditCardIcon, FeedIcon, GiftIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  EnterpriseAvatarBadge,
  EnterpriseBadge,
  isEnterpriseVendor,
} from "@/components/EnterpriseBadge";

export default function Header({
  title,
  hideSearch = false,
}: HeaderProps & { hideSearch?: boolean }) {
  const userDetails = useUserStore((state) => state.user);
  const isEnterprise = isEnterpriseVendor(userDetails);
  const { navigate } = useNavigation();
  const pathname = usePathname();
  const hasUnread = useNotificationsStore((s) =>
    s.notifications.some((n) => !n.read),
  );
  const userId = pathname.split("/")[1];
  const isStandalone = useIsStandalone();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const onboarding = userDetails?.onboarding === true;
  // Phone onboarding keeps this open from the first step so the tour can
  // spotlight My store / Settings (those rows only exist while the menu
  // is open). Closes once `user.onboarding` flips false.
  const forceMenuOpen = onboarding && isMobile;
  const [menuOpen, setMenuOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: () => usersApi.logout(),
    onSuccess: () => {
      // Installed PWA: land on the app welcome screen, not the marketing
      // homepage. .replace(), not .href= — a plain assignment pushes a new
      // history entry, leaving the just-logged-out authenticated page one
      // back-press away (and vulnerable to the browser's bfcache serving it
      // without ever hitting the server/middleware again). replace() drops
      // that entry from history entirely.
      window.location.replace(isStandalone ? "/welcome" : "/");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Logout failed";
      toast.error(message);
    },
  });

  const avatarInner = userDetails?.avatar ? (
    <img
      src={userDetails.avatar}
      alt="avatar"
      className="w-full h-full object-cover"
    />
  ) : (
    <span>{getInitial(userDetails?.company?.name ?? "")}</span>
  );

  const go = (segment: string) => navigate(`/${userId}/${segment}`);

  return (
    <div
      className={
        hideSearch
          ? "flex items-center justify-between gap-4 px-5 sm:px-0"
          : "flex flex-col gap-3 px-5 sm:px-0 md:grid md:grid-cols-[auto_minmax(0,34rem)_auto] md:items-center md:justify-between md:gap-4 lg:gap-8"
      }
    >
      <div className="flex items-center justify-between gap-2 md:contents">
        <div className="flex min-w-0 max-w-[10rem] sm:max-w-[14rem] items-center">
          <h1 className="font-semibold text-dash-title text-ink truncate">
            {title}
          </h1>
        </div>

        {!hideSearch && (
          <div className="hidden min-w-0 md:block max-w-xl w-full">
            <AskVelteSearchBar
              size="sm"
              className="w-full"
              placeholder="Ask Velte…"
            />
          </div>
        )}

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2.5">
          <Link
            href="/hub"
            className="inline-flex shrink-0 items-center justify-center gap-2 h-9 w-9 md:w-auto md:px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-ink/80 transition-colors whitespace-nowrap"
            aria-label="Vendor's Hub"
            title="Vendor's Hub"
          >
            <FeedIcon size={18} className="text-orange-500 shrink-0" />
            <span className="hidden md:inline text-sm font-semibold whitespace-nowrap text-gray-800 dark:text-ink">
              Vendor&apos;s Hub
            </span>
          </Link>

          <CartButton />

          {/* Mobile: navigate to notifications page */}
          <button
            className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-50 md:hidden transition-colors"
            onClick={() => navigate(`/${userId}/notifications`)}
            aria-label="Notifications"
          >
            <BellIcon size={18} />
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-orange-500" />
            )}
          </button>

          {/* Desktop: dropdown popover */}
          <div className="hidden md:block">
            <NotificationDropdown />
          </div>

          <Popover
            open={forceMenuOpen || menuOpen}
            triggerId="header-account-menu-trigger"
            onOpenChange={(next) => {
              if (forceMenuOpen && !next) return;
              setMenuOpen(next);
            }}
          >
            {/* Explicit id — Base UI's own auto-generated id (useId()-based)
              is positional, counted across every useId() call earlier in
              the tree. A count that differs by even one call between the
              server render and the client's hydration pass (e.g. from any
              client-only conditional elsewhere in the layout) produces a
              permanent hydration mismatch warning on this id — even though
              nothing about THIS component actually differs. A hardcoded id
              sidesteps that counting entirely: useBaseUiId() uses it
              verbatim instead of generating one, so it's identical on both
              passes by construction. See NotificationDropdown's matching
              fix for the other Header popover that hit the same warning. */}
            <div className="relative shrink-0">
              <PopoverTrigger
                id="header-account-menu-trigger"
                className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-dash-body font-bold cursor-pointer flex-shrink-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1"
              >
                {avatarInner}
              </PopoverTrigger>
              {isEnterprise && <EnterpriseAvatarBadge size="sm" />}
            </div>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={8}
              initialFocus={!forceMenuOpen}
              className="w-48 p-0 gap-0 rounded-xl border border-gray-200 shadow-lg overflow-hidden"
            >
              <div className="px-3 py-2.5 border-b border-gray-100">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-dash-body font-semibold text-gray-900 truncate">
                    {userDetails?.company?.name ?? userDetails?.name}
                  </p>
                  {isEnterprise && <EnterpriseBadge size="sm" />}
                </div>
                <p className="text-dash-caption text-gray-400 truncate">
                  @{userDetails?.username}
                </p>
              </div>
              {/* Phone only — desktop already has Store and Settings in the
                sidebar. Same ids the onboarding tour aims at. */}
              <div className="md:hidden border-b border-gray-100">
                <button
                  id="store-mobile"
                  type="button"
                  onClick={() => go("store")}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-dash-body text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <StoreIcon size={15} className="text-gray-500" />
                  <span>My Store</span>
                </button>
                <button
                  id="billing-mobile"
                  type="button"
                  onClick={() => navigate("/pricing")}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-dash-body text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <CreditCardIcon size={15} className="text-gray-500" />
                  <span>Billing</span>
                </button>
                <button
                  id="referrals-mobile"
                  type="button"
                  onClick={() => go("referrals")}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-dash-body text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <GiftIcon size={15} className="text-gray-500" />
                  <span>Referrals</span>
                </button>
                <button
                  id="settings-mobile"
                  type="button"
                  onClick={() => go("settings")}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-dash-body text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <SettingsIcon size={15} className="text-gray-500" />
                  <span>Settings</span>
                </button>
              </div>
              {/* Same control /chat's own account column carries, and the
                same placement logic: an appearance switch belongs beside
                the other account-scoped actions here, not three clicks
                into Settings only (2026-09-18). `iconOnly`, not `compact`:
                see Sidebar's own comment — this popover is only 192px
                wide, even tighter than the sidebar rail that overflowed
                with full labels showing. Desktop only: the phone menu
                is Store / Settings / Logout. */}
              <div className="hidden md:block px-3 py-2.5 border-b border-gray-100">
                <ThemeToggle iconOnly fullWidth className="justify-center" />
              </div>
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-dash-body text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-60"
              >
                <LogOutIcon size={15} />
                <span>
                  {logoutMutation.isPending ? "Logging out…" : "Logout"}
                </span>
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {!hideSearch && (
        <div className="w-full md:hidden">
          <AskVelteSearchBar
            size="sm"
            className="w-full"
            placeholder="Ask Velte…"
          />
        </div>
      )}
    </div>
  );
}
