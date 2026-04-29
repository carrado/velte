"use client";

import { useEffect, useState } from "react";
import { Search, Bell } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { getInitial } from "@/lib/initials";
import type { HeaderProps } from "@/types/common";

export default function Header({ title, onMenuClick }: HeaderProps) {
  const [userDetails, setUserDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    useUserStore.persist.rehydrate();
    const user = useUserStore.getState().user;
    setUserDetails(user ?? {});
  }, []);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <h1 className="font-semibold text-xl text-[#111827] whitespace-nowrap">
          {title}
        </h1>
      </div>

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

      <div className="flex items-center gap-3 md:gap-4">
        <button className="md:hidden text-[#6B7280] hover:text-[#111827] cursor-pointer">
          <Search size={20} />
        </button>

        <button className="relative text-[#6B7280] hover:text-[#111827] cursor-pointer">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />
        </button>

        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer flex-shrink-0">
          {getInitial(userDetails?.company?.name)}
        </div>
      </div>
    </div>
  );
}
