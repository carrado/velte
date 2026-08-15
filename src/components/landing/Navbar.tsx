"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
// Icons from Phosphor (2026-08-16, swapped from lucide-react for this
// session's pages only — see MobileMenu.tsx's comment). Menu (hamburger)
// has no exact match; List is its closest Phosphor equivalent.
import { List, SquaresFour, X } from "@phosphor-icons/react";
import { Button } from "../ui/button";
import { AskVeluxButton } from "@/components/AskVeluxButton";
import { MobileMenu } from "@/components/landing/MobileMenu";
import Image from "next/image";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
              // 2026-08-14: the source file was cropped to its actual visible
              // content (was ~40% empty margin on every side) — width/height
              // here now match its real ~2.03:1 ratio so `h-auto` computes a
              // correct height instead of the old attrs (110x20, a 5.5:1
              // box) squashing it. Sized down twice the same week: once
              // 2026-08-14 (110px → 90px) once the undistorted ratio alone
              // read too large, then again 2026-08-16 (90px → 72px) once
              // it was still reading large next to the rest of the header.
              width={72}
              height={35}
              className="w-14 sm:w-[72px] h-auto"
              priority
            />
          </Link>

          {/* Rebuilt for mobile 2026-08-14 — Logo + Ask Velux + Browse +
              Sign In + Join Velte was still four items of horizontal
              competition once shrunk onto a 360-430px phone, even with
              Sign In already hidden there. Mobile shows exactly one primary
              action (Ask Velux — kept pixel-identical, avatar and all, per
              explicit instruction not to touch its design) plus a hamburger
              toggling MobileMenu.tsx. That component was itself a
              full-width three-item dropdown at first, rebuilt again
              2026-08-16 into a right-side expandable drawer (see its own
              comment) — this Navbar side didn't need to change either time,
              it just opens/closes the panel. Desktop keeps the full row —
              there's real horizontal room there and no reason to hide
              anything behind a menu tap that doesn't need to be. */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <AskVeluxButton variant="compact" label="Ask Velux" />
            {/* The site-wide entry point to the full catalog — now the ONLY
                one (the marketplace preview section's own "Browse the full
                marketplace" CTA was retired in favor of a "Post what you
                need" CTA there instead, see MarketplacePreview's own
                comment), so this links straight to /marketplace rather than
                scrolling to the homepage's 12-item teaser. Desktop only —
                see MobileMenu for the mobile equivalent. */}
            <Link href="/marketplace" className="hidden sm:block">
              <Button
                variant="outline"
                className="cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-50 text-sm px-5 gap-1.5"
              >
                <SquaresFour className="w-3.5 h-3.5" />
                Browse
              </Button>
            </Link>
            <Link href="/auth/login" className="hidden sm:block">
              <Button
                variant="ghost"
                className="text-gray-600 cursor-pointer hover:text-gray-900 hover:bg-gray-100 text-sm px-4"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/join" className="hidden sm:block">
              <Button className="bg-orange-500 cursor-pointer hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 text-sm px-5">
                Join Velte
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="sm:hidden w-10 h-10 -mr-1.5 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {menuOpen ? <X size={22} /> : <List size={22} />}
            </button>
          </div>
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </motion.header>
  );
}
