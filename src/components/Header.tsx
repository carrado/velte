"use client";

/* eslint-disable @next/next/no-img-element */

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
import SearchBar from "@/components/SearchBar";
import { useNavigation } from "@/components/NavigationProgressContext";
import { usePathname } from "next/navigation";

export default function Header({ title, onMenuClick }: HeaderProps) {
  void onMenuClick;
  const userDetails = useUserStore((state) => state.user);
  const { navigate } = useNavigation();
  const pathname = usePathname();

  const userId = pathname.split("/")[1];

  const logoutMutation = useMutation({
    mutationFn: () => usersApi.logout(),
    onSuccess: () => {
      window.location.href = "/";
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

      {/* Desktop search — full-featured dropdown with backdrop */}
      <SearchBar />

      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile: tap to go to dedicated search page */}
        <button
          className="md:hidden text-[#6B7280] hover:text-[#111827] cursor-pointer"
          onClick={() => navigate(`/${userId}/search`)}
          aria-label="Search"
        >
          <Search size={20} />
        </button>

        <button className="relative text-[#6B7280] hover:text-[#111827] cursor-pointer">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />
        </button>

        {/* Mobile avatar — plain, no popover */}
        <div className="md:hidden w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-dash-body font-bold flex-shrink-0 overflow-hidden">
          {avatarInner}
        </div>

        {/* Desktop avatar with shadcn Popover */}
        <div className="hidden md:block">
          <Popover>
            <PopoverTrigger className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-dash-body font-bold cursor-pointer flex-shrink-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1">
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
