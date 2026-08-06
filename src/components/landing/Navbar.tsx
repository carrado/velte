"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { Button } from "../ui/button";
import { AskVeluxButton } from "@/components/AskVeluxButton";
import { scrollToMarketplace } from "@/lib/scrollToMarketplace";
import Image from "next/image";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-gray-200"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <Image
              src="/velte_logo_esn5dj.png"
              alt="Velte"
              width={110}
              height={20}
              className="w-20 sm:w-[110px] h-auto"
              priority
            />
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link href="/auth/login">
              <Button
                variant="ghost"
                className="text-gray-600 cursor-pointer hover:text-gray-900 hover:bg-gray-100 text-xs sm:text-sm px-2.5 sm:px-4"
              >
                Sign In
              </Button>
            </Link>
            {/* Ask Velux's label is always shown now (not just from sm: up)
                — sits alongside Browse on every screen size, including
                mobile. */}
            <AskVeluxButton variant="compact" label="Ask Velux" />
            {/* Full path + hash, not a bare "#marketplace" — Navbar is
                shared across every marketing page (About/FAQ/Terms/
                Privacy), not just "/", so a bare hash would silently do
                nothing on any page besides the homepage itself. onClick
                handles the OTHER real bug: Link's hash-scroll doesn't fire
                when already on "/" since the pathname isn't changing — see
                scrollToMarketplace's own comment. */}
            <Link href="/" onClick={scrollToMarketplace}>
              <Button className="bg-orange-500 cursor-pointer hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 text-xs sm:text-sm px-3 sm:px-5 gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5" />
                Browse
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
