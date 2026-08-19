"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "../ui/button";
import { MobileMenu } from "@/components/landing/MobileMenu";
import Image from "next/image";
import { CloseIcon, ListIcon } from "@/components/icons";

// Simplified 2026-08-15 (full homepage redesign) to Logo … How it works |
// Businesses | Sign in — down from Logo | Ask Velux | Sign In | Join Velte.
// Two things made the old row redundant rather than just crowded:
// FloatingAskBar now gives the whole page a persistent "ask Velte"
// composer (so the Navbar doesn't need to carry its own shortcut to one
// anymore), and hiding a registration CTA from the primary buyer-facing
// chrome matches the progressive-identity principle established earlier —
// a buyer is never shown a registration CTA before they've actually asked
// for something.
//
// Regrouped same day: "How it works" moved from its own left-side <nav>
// into the right-hand cluster, and "Businesses" (the one audience that DOES
// still need a direct signup path from here, a vendor deciding whether to
// list) relabeled "Join" and turned into a real filled CTA button rather
// than a plain text link. Order is How it works | Sign in | Join — Join sits
// last, as the row's own final/strongest action, not competing with Sign in
// for the "primary CTA" slot ahead of it. "Log in" → "Sign in" (2026-08-16,
// matching MobileMenu's drawer, which already said "Sign in" the whole
// time — see that file's own comment). Points straight at /auth/signup,
// not /join — /join is just a redirect shim now (kept alive for any old
// external links/bookmarks), so every internal link that used to route
// through it was changed to hit /auth/signup directly instead, here and
// elsewhere (AboutContent, HowItWorksContent, MobileMenu, RegisterCta) —
// same destination, one less hop. AskVeluxButton and the old "Join Velte"
// button aren't deleted — just no longer rendered in this one row;
// AskVeluxButton is still used in the buyer/vendor dashboard chrome, and
// MobileMenu's drawer still carries its own Sign in / Join Velte links for
// anyone who opens it.
export default function Navbar({
  forceOpaque = false,
}: {
  // Careers is the one page whose hero sits on a full dark bg-[#023337]
  // panel from y=0 (see CareersContent's own comment) — this Navbar's
  // default transparent-until-scrolled state assumes light page content
  // showing through behind it, so its dark gray-600 text/dark logo went
  // near-illegible against dark content at the top of that one page.
  // Skips the transparent phase entirely there rather than teaching this
  // shared header to theme itself per-page.
  forceOpaque?: boolean;
} = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const opaque = forceOpaque || scrolled;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        opaque
          ? "bg-white/90 backdrop-blur-xl border-b border-gray-200"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center h-16 gap-6">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <Image
              src="/velte_logo_esn5dj.png"
              alt="Velte"
              width={72}
              height={35}
              className="w-14 sm:w-[72px] h-auto"
              priority
            />
          </Link>

          {/* Mobile: logo + Sign in + hamburger — no Ask Velux/Join Velte
              competing for the same 360-430px row (see this file's own top
              comment). Sign in moved back into this row 2026-08-19 (was
              "hidden sm:block" like the rest, MobileMenu.tsx carried its own
              copy at the drawer's bottom) per explicit request to surface it
              before the hamburger rather than behind it — the drawer's own
              Sign in row was dropped in the same move so there's exactly one
              place to tap it, not two. Join Velte stays hamburger-only:
              still the drawer's primary CTA, not this row's job. */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/how-it-works"
              className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              How it works
            </Link>
            <Link href="/auth/login">
              <Button
                variant="ghost"
                className="text-gray-600 cursor-pointer hover:text-gray-900 hover:bg-gray-100 text-sm px-3 sm:px-4"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/auth/signup" className="hidden sm:block">
              <Button className="bg-orange-500 cursor-pointer hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 text-sm px-5">
                Join
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="sm:hidden w-10 h-10 -mr-1.5 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {menuOpen ? <CloseIcon size={22} /> : <ListIcon size={22} />}
            </button>
          </div>
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </motion.header>
  );
}
