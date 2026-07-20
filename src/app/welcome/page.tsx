import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Store as StoreIcon } from "lucide-react";

// Landing screen for the installed PWA — shown after logout instead of the
// marketing homepage ("/"), since a home-screen app reopening into a full
// sales pitch reads as broken. Kept deliberately minimal: logo, one line,
// two CTAs. See Header.tsx / SettingsPage.tsx LogoutSection for the redirect.
export const metadata: Metadata = {
  title: "Velte",
  description: "Find real vendors nearby, or sign in to manage your store.",
};

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center px-6 text-center">
      <Image
        src="/velte_logo_esn5dj.png"
        alt="Velte"
        width={130}
        height={26}
        priority
        className="mb-6"
      />

      <p className="text-gray-500 text-[15px] leading-relaxed max-w-[280px] mb-9">
        Describe what you need — we connect you to real vendors nearby.
      </p>

      <div className="w-full max-w-[280px] flex flex-col gap-3">
        <Link href="/search" className="w-full">
          <Button
            size="lg"
            className="w-full bg-orange-500 hover:bg-orange-600 cursor-pointer text-white shadow-lg shadow-orange-500/20 gap-2 h-12"
          >
            Find something
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>

        <Link href="/auth/login" className="w-full">
          <Button
            size="lg"
            variant="outline"
            className="w-full text-gray-700 cursor-pointer hover:bg-white border-gray-300 gap-2 h-12"
          >
            <StoreIcon className="w-4 h-4" />
            I&apos;m a vendor
          </Button>
        </Link>
      </div>
    </div>
  );
}
