"use client";

import Link from "next/link";
import Image from "next/image";
import { VelteLogo } from "@/components/VelteLogo";
import { SparklesIcon } from "@/components/icons";
import { ThemeToggleButton } from "@/components/landing/ThemeToggleButton";
import { useUserStore } from "@/store/userStore";
import { useBuyerStore } from "@/store/buyerStore";

export default function StoreNavbar() {
  const vendor = useUserStore((s) => s.user);
  const buyer = useBuyerStore((s) => s.buyer);
  const homeHref = vendor ? "/wallet" : buyer ? "/chat" : "/";

  return (
    <header className="bg-surface/85 backdrop-blur-xl border-b border-gray-200/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href={homeHref}
          className="flex items-center shrink-0 group transition-transform duration-200 active:scale-95"
          aria-label="Velte home"
        >
          <VelteLogo
            width={76}
            height={36}
            className="w-14 sm:w-[72px] h-auto transition-opacity group-hover:opacity-85"
            priority
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Ask Velte AI Button */}
          <Link
            href="/chat"
            className="group relative inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold text-white bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-xs shadow-orange-500/25 transition-all duration-200 hover:shadow-md hover:shadow-orange-500/35 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="relative shrink-0">
              <Image
                src="/velte_ai_assistant.png"
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 rounded-full object-cover ring-1 ring-white/50"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 ring-1 ring-white" />
            </div>
            <span className="tracking-tight hidden xs:inline">Ask Velte</span>
            <SparklesIcon
              size={13}
              className="opacity-80 group-hover:rotate-12 transition-transform duration-300 hidden sm:inline-block"
            />
          </Link>

          <ThemeToggleButton />

          <Link
            href="/auth/login"
            className="inline-flex items-center text-[13px] font-medium text-ink/75 hover:text-ink hover:bg-gray-100/80 dark:hover:bg-white/10 px-3.5 py-1.5 rounded-full transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}
