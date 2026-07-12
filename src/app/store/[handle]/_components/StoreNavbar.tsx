"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { usersApi } from "@/services/users";
import { getInitial } from "@/lib/initials";

// Mirrors SearchHome.tsx's own auth-aware header exactly (same links, same
// avatar/truncated-name treatment) — getMeSilent (not getMe/api.get) because
// this is a public page that must render fine for a logged-out visitor,
// never force-redirecting them to /auth/login just for checking.
export default function StoreNavbar() {
  const userDetails = useUserStore((state) => state.user);

  useEffect(() => {
    if (!useUserStore.getState().user) {
      usersApi.getMeSilent();
    }
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <Image
            src="/velte_logo_esn5dj.png"
            alt="Velte"
            width={120}
            height={18}
            className="w-20 sm:w-[110px] h-auto"
            priority
          />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/search"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors px-2 py-2 sm:px-1 sm:py-0"
          >
            <Sparkles size={15} className="text-orange-500" />
            <span className="hidden sm:inline">AI Search</span>
          </Link>

          {userDetails ? (
            <Link
              href={`/${userDetails.id}/wallet`}
              className="flex items-center gap-2 min-w-0 pl-1 pr-2 sm:pr-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                {userDetails.avatar ? (
                  <img
                    src={userDetails.avatar}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {getInitial(userDetails.company?.name ?? userDetails.name)}
                  </span>
                )}
              </div>
              <span className="max-w-[100px] sm:max-w-[160px] truncate text-xs sm:text-sm font-medium text-gray-800">
                {userDetails.company?.name ?? userDetails.name}
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <Link
                href="/auth/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-2 py-2 sm:px-1 sm:py-0"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="flex items-center h-8 sm:h-auto px-3 sm:px-4 sm:py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <span className="sm:hidden">List business</span>
                <span className="hidden sm:inline">List your business</span>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
