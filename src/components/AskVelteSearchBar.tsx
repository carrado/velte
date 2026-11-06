"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { SearchIcon } from "@/components/icons";
import { goAskVelte } from "@/lib/askVelte";
import { cn } from "@/lib/utils";

/**
 * Site-wide Ask Velte search field for headers. Submits via goAskVelte →
 * `/chat?q=…&auto=1` (or an in-chat event when already on /chat).
 */
export function AskVelteSearchBar({
  className,
  placeholder = "Ask Velte anything…",
  size = "md",
}: {
  className?: string;
  placeholder?: string;
  /** `sm` for dense chrome (vendor Header); `md` for Hub / Navbar / chat. */
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goAskVelte(router, query)) {
      inputRef.current?.focus();
      return;
    }
    setQuery("");
  }

  const tall = size === "md";

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 focus-within:border-orange-300 focus-within:bg-surface focus-within:ring-2 focus-within:ring-orange-500/15 transition-colors",
        tall ? "h-10 pl-2 pr-1.5" : "h-9 pl-1.5 pr-1",
        className,
      )}
    >
      <Image
        src="/velte_ai_assistant.png"
        alt=""
        width={tall ? 28 : 24}
        height={tall ? 28 : 24}
        className={cn(
          "shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-gray-200",
          tall ? "h-7 w-7" : "h-6 w-6",
        )}
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        className={cn(
          "min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-gray-400",
          tall ? "text-sm" : "text-xs sm:text-sm",
        )}
        aria-label="Ask Velte"
      />
      <button
        type="submit"
        aria-label="Search with Ask Velte"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50",
          tall ? "h-8 w-8" : "h-7 w-7",
        )}
        disabled={!query.trim()}
      >
        <SearchIcon size={tall ? 16 : 14} />
      </button>
    </form>
  );
}
