"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Search } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useMutation } from "@tanstack/react-query";
import { usersApi } from "@/services/users";
import { toast } from "sonner";
import { getInitial } from "@/lib/initials";
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

export default function Header({ title }: HeaderProps) {
  const userDetails = useUserStore((state) => state.user);
  const { navigate } = useNavigation();
  const pathname = usePathname();
  const hasUnread = useNotificationsStore((s) =>
    s.notifications.some((n) => !n.read),
  );
  const userId = pathname.split("/")[1];
  const isStandalone = useIsStandalone();

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

  return (
    <div className="flex items-center px-5 sm:px-0 justify-between gap-4">
      <div className="flex items-center gap-3">
        <h1 className="font-semibold text-dash-title text-[#111827] whitespace-nowrap">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {/* A vendor is also a buyer sometimes — this hands them off to the
            buyer-facing search (Velte Connect) instead of leaving no way
            back to it once they're inside their own dashboard. */}
        <Link
          href="/search"
          title="Looking to buy something yourself?"
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 h-8 sm:h-9 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors text-dash-caption sm:text-dash-body font-semibold shrink-0"
        >
          <Search size={15} className="shrink-0" />
          <span className="leading-none">Buy on Velte</span>
        </Link>

        {/* Mobile: navigate to notifications page */}
        <button
          className="relative md:hidden text-[#6B7280] hover:text-[#111827] cursor-pointer"
          onClick={() => navigate(`/${userId}/notifications`)}
          aria-label="Notifications"
        >
          <Bell size={20} />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />
          )}
        </button>

        {/* Desktop: dropdown popover */}
        <div className="hidden md:block">
          <NotificationDropdown />
        </div>

        {/* Mobile avatar — plain, no popover */}
        <div className="md:hidden w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-dash-body font-bold flex-shrink-0 overflow-hidden">
          {avatarInner}
        </div>

        {/* Desktop avatar with shadcn Popover */}
        <div className="hidden md:block">
          <Popover>
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
            <PopoverTrigger
              id="header-account-menu-trigger"
              className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-dash-body font-bold cursor-pointer flex-shrink-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1"
            >
              {avatarInner}
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={8}
              className="w-48 p-0 rounded-xl border border-gray-200 shadow-lg overflow-hidden"
            >
              <div className="px-3 py-2.5 border-b border-gray-100">
                <p className="text-dash-body font-semibold text-gray-900 truncate">
                  {userDetails?.company?.name ?? userDetails?.name}
                </p>
                <p className="text-dash-caption text-gray-400 truncate">
                  @{userDetails?.username}
                </p>
              </div>
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-dash-body text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-60"
              >
                <LogOut size={15} />
                <span>
                  {logoutMutation.isPending ? "Logging out…" : "Logout"}
                </span>
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
