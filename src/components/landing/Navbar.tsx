"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import Image from "next/image";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
          ? "bg-[#050d08]/90 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/velte_ijulb7ijulb7ijul_h3d6xw.png"
              alt="Velte logo"
              width={100}
              height={20}
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-white/60 hover:text-white text-sm font-medium transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/sign-in">
              <Button
                variant="ghost"
                className="text-white/70 cursor-pointer hover:text-white hover:bg-white/8 text-sm"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                className="bg-[rgb(247,107,16)] cursor-pointer hover:bg-[rgb(247,107,16)]/90 text-white shadow-lg shadow-[rgba(247,107,16,0.25)] text-sm px-5"
              >
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-white/80 hover:text-white p-2 -mr-2 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-[#050d08]/95 backdrop-blur-xl border-t border-white/[0.06]"
          >
            <div className="px-5 pt-3 pb-5 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block py-2.5 text-white/60 hover:text-white text-sm font-medium transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 space-y-2 border-t border-white/[0.06] mt-3">
                <Link href="/sign-in" className="block" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full cursor-pointer text-white/70 hover:text-white hover:bg-white/8">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-in" className="block" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-[rgb(247,107,16)] hover:bg-[rgb(247,107,16)]/90 text-white">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}