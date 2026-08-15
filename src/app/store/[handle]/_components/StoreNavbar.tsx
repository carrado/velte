import Image from "next/image";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";

export default function StoreNavbar() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <Image
            src="/velte_logo_esn5dj.png"
            alt="Velte"
            width={120}
            height={59}
            className="w-20 sm:w-[110px] h-auto"
            priority
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Takes a buyer off this one storefront and into the full
              catalog — the /marketplace browse page, not the "/" homepage's
              capped teaser section. */}
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 h-9 sm:h-auto px-3 sm:py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <LayoutGrid size={15} className="text-orange-500" />
            Marketplace
          </Link>

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
