"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "../ui/button";
import Image from "next/image";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Reviews", href: "/#reviews" },
  { label: "Pricing", href: "/#pricing" },
];

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
          ? "bg-[#050d08]/90 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
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

          {/* CTAs — always visible */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link href="/auth/login">
              <Button
                variant="ghost"
                className="text-white/70 cursor-pointer hover:text-white hover:bg-white/8 text-xs sm:text-sm px-2.5 sm:px-4"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-[rgb(247,107,16)] cursor-pointer hover:bg-[rgb(247,107,16)]/90 text-white shadow-lg shadow-[rgba(247,107,16,0.25)] text-xs sm:text-sm px-3 sm:px-5">
                Get Started
                <span className="hidden sm:inline">&nbsp;Free</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
