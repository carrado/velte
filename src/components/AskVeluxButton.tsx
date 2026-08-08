"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AskVeluxButtonProps {
  /** "compact" — an inline pill (avatar + always-visible short label,
   *  including on mobile — not hidden below sm like it used to be), for
   *  tight spaces like Navbar. "full" — a bigger two-line chip (avatar +
   *  label + a descriptive subtext), for section-ending CTAs. */
  variant?: "compact" | "full";
  label?: string;
  subtext?: string;
  className?: string;
}

// The site-wide "go talk to Velux" CTA — one component instead of a
// one-off styled link per page, so the AI path reads as the same real,
// designed feature everywhere it shows up (Navbar, Hero, the marketplace/
// vendor section endings, About/FAQ) rather than a bare text link some
// places and a full button elsewhere. Uses Velux's own avatar rather than a
// generic search icon, on purpose — this is "go talk to Velux specifically",
// not "here's a search feature."
//
// Deliberately never the PRIMARY action anywhere it's placed (that's
// Browse, per the 2026-08-05 marketplace pivot) — but "secondary" here
// still means a real, photo-bearing chip, not a muted gray afterthought
// link, since AI genuinely is a built, working differentiator and
// shouldn't read as one.
export function AskVeluxButton({
  variant = "full",
  label = "Ask Velux",
  subtext,
  className,
}: AskVeluxButtonProps) {
  const avatarSize = variant === "compact" ? 24 : 36;
  const avatar = (
    <Image
      src="/velte_ai_assistant.png"
      alt=""
      width={avatarSize}
      height={avatarSize}
      className={cn(
        "rounded-full object-cover shrink-0 ring-2 ring-white",
        variant === "compact" ? "w-5 h-5 sm:w-6 sm:h-6" : "w-9 h-9",
      )}
    />
  );

  if (variant === "compact") {
    return (
      <Link
        href="/velux"
        title="Ask Velux — search with AI"
        className={cn(
          "flex items-center gap-1.5 h-8 sm:h-9 pl-1 pr-2.5 sm:pr-3.5 rounded-full border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors shrink-0",
          className,
        )}
      >
        {avatar}
        <span className="text-xs sm:text-sm font-semibold text-orange-700 whitespace-nowrap">
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/velux"
      className={cn(
        "inline-flex items-center gap-3 pl-2 pr-5 sm:pr-6 py-2 rounded-full bg-white border border-orange-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all",
        className,
      )}
    >
      {avatar}
      <span className="flex flex-col items-start leading-tight text-left">
        <span className="text-[14px] sm:text-[15px] font-semibold text-[#023337]">
          {label}
        </span>
        {subtext && (
          <span className="text-[11px] sm:text-xs text-gray-400">
            {subtext}
          </span>
        )}
      </span>
      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
    </Link>
  );
}
