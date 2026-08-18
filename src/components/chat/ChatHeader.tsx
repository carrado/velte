"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import Image from "next/image";
import { useUserStore } from "@/store/userStore";
import { getInitial } from "@/lib/initials";

// The /chat shell's top bar. No hamburger/drawer anymore (2026-08-18, the
// sidebar it used to open is gone) — just the logo and, for a signed-in
// VENDOR only, a link back to their own dashboard. Buyers are anonymous
// (phone+OTP is a one-time verification step, never an account — see
// buyerAuth.controller.js's own comment) so there's no buyer identity left
// to show a chip for here.
export function ChatHeader() {
  const userDetails = useUserStore((state) => state.user);

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-8 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 sm:py-2.5 shrink-0 bg-white border-b border-gray-100 z-10">
      <Link href="/" className="shrink-0">
        <Image
          src="/velte_logo_esn5dj.png"
          alt="Velte"
          width={72}
          height={35}
          className="w-14 h-auto"
          priority
        />
      </Link>
      {userDetails ? (
        // A vendor who wandered in from their own dashboard — send them
        // back to it (their wallet, specifically) rather than showing a
        // CTA to sign up for an account they already have.
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
        <div className="flex items-center gap-1.5 sm:gap-4 text-sm font-medium shrink-0">
          <Link
            href="/auth/login"
            className="text-gray-600 hover:text-gray-900 transition-colors px-2 py-2 sm:px-1 sm:py-0"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="flex items-center h-8 sm:h-auto px-3 sm:px-4 sm:py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold sm:font-medium transition-colors whitespace-nowrap"
          >
            Join
          </Link>
        </div>
      )}
    </header>
  );
}
