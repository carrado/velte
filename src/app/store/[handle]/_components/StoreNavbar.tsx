import Image from "next/image";
import Link from "next/link";

export default function StoreNavbar() {
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

        <Link
          href="/auth/login"
          className="inline-flex items-center h-9 sm:h-auto px-4 sm:py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors whitespace-nowrap"
        >
          Sign In
        </Link>
      </div>
    </header>
  );
}
