import Link from "next/link";
import { VelteLogo } from "@/components/VelteLogo";

export default function StoreNavbar() {
  return (
    <header className="bg-surface border-b border-gray-200 sticky top-0 z-40 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <VelteLogo
            width={120}
            height={59}
            className="w-20 sm:w-[110px] h-auto"
            priority
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/auth/login"
            className="inline-flex items-center h-9 sm:h-auto px-4 sm:py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors whitespace-nowrap"
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}
