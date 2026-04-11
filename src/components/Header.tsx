"use client";

import { useEffect, useState } from "react";
import { Search, Bell, Menu } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { getInitial } from "@/lib/initials";

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const [notificationsOn, setNotificationsOn] = useState(true);

  const [userDetails, setUserDetails] = useState<any>({});

  useEffect(() => {
    useUserStore.persist.rehydrate();
    const userDetails: any = useUserStore.getState().user;
    setUserDetails(userDetails);
  }, []);

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Left: Hamburger (mobile) + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-600 hover:text-gray-800 cursor-pointer flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <h1 className="font-semibold text-xl text-[#111827] whitespace-nowrap">
          {title}
        </h1>
      </div>

      {/* Center: Search — hidden on small screens */}
      <div className="relative w-96 hidden md:block flex-shrink-0">
        <input
          type="text"
          placeholder="Search data, users, or reports"
          className="w-full pl-6 pr-4 py-2 rounded-full border border-[#E5E7EB] bg-white text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <Search
          size={15}
          className="absolute right-5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
        />
      </div>

      {/* Right: Bell + Toggle + Avatar */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile search icon */}
        <button className="md:hidden text-[#6B7280] hover:text-[#111827] cursor-pointer">
          <Search size={20} />
        </button>

        {/* Bell with badge */}
        <button className="relative text-[#6B7280] hover:text-[#111827] cursor-pointer">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />
        </button>

        {/* Toggle switch — hidden on small screens */}
        {/* <button
          onClick={() => setNotificationsOn((v) => !v)}
          className={`hidden sm:inline-flex relative h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
            notificationsOn ? 'bg-orange-500' : 'bg-gray-300'
          }`}
          aria-label="Toggle notifications"
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              notificationsOn ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button> */}

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer flex-shrink-0">
          {getInitial(userDetails?.company?.name)}
        </div>
      </div>
    </div>
  );
}
