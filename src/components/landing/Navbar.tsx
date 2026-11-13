"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";
import { MobileMenu } from "@/components/landing/MobileMenu";
import { ThemeToggleButton } from "@/components/landing/ThemeToggleButton";
import { VelteLogo } from "@/components/VelteLogo";
import { CloseIcon, ListIcon, SparklesIcon } from "@/components/icons";
import { EnterpriseAvatarBadge } from "@/components/EnterpriseBadge";
import { isEnterpriseVendor } from "@/lib/enterprise";
import { cn } from "@/lib/utils";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { isSessionSettled, syncSession } from "@/lib/sessionSync";

export default function Navbar({
  forceOpaque = false,
  hideSearch = false,
}: {
  forceOpaque?: boolean;
  hideSearch?: boolean;
} = {}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const vendor = useUserStore((s) => s.user);
  const buyer = useBuyerStore((s) => s.buyer);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Quiet session hydrate on every public page: skips if session already loaded/settled
  useEffect(() => {
    if (isSessionSettled()) return;
    void syncSession();
  }, []);

  const opaque = forceOpaque || scrolled;
  const isEnterprise = isEnterpriseVendor(vendor);

  // For vendor accounts, display store/business name first (company.name is canonical in Velte).
  const vendorStoreName =
    vendor?.company?.name?.trim() ||
    (vendor as unknown as { store?: { name?: string } })?.store?.name?.trim() ||
    (vendor as unknown as { storeName?: string })?.storeName?.trim() ||
    vendor?.businessName?.trim();

  const displayName = vendor
    ? vendorStoreName || vendor.name?.trim() || vendor.email?.trim() || null
    : buyer
      ? buyer.name?.trim() || buyer.email?.trim() || null
      : null;
  const avatarUrl = vendor?.avatar || buyer?.avatar || null;
  const accountHref = vendor ? "/wallet" : "/chat";
  const initials = (displayName || "V")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const navLinks = [
    { href: "/how-it-works", label: "How it works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
    { href: "/faq", label: "FAQ" },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        opaque
          ? "bg-surface/85 backdrop-blur-xl border-b border-gray-200/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]"
          : "bg-surface/65 backdrop-blur-md border-b border-gray-200/40 dark:border-white/[0.08]",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* ── Brand Logo ── */}
          <Link
            href={vendor ? "/wallet" : buyer ? "/chat" : "/"}
            className="flex items-center shrink-0 group transition-transform duration-200 active:scale-95"
            aria-label="Velte home"
          >
            <VelteLogo
              width={76}
              height={36}
              className="w-14 sm:w-[72px] h-auto transition-opacity group-hover:opacity-85"
              priority
            />
          </Link>

          {/* ── Desktop Segmented Pill Nav ── */}
          <nav className="hidden md:flex items-center gap-1 bg-gray-100/80 dark:bg-white/[0.05] p-1 rounded-full border border-gray-200/60 dark:border-white/10 backdrop-blur-md shadow-2xs">
            {navLinks.map(({ href, label }) => {
              const active =
                pathname === href ||
                (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200",
                    active
                      ? "text-orange-600 dark:text-orange-400 bg-surface dark:bg-white/10 shadow-xs font-semibold"
                      : "text-ink/75 hover:text-ink hover:bg-surface/60 dark:hover:bg-white/[0.06]",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* ── Right-Side Cluster ── */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* "Ask Velte" AI Button */}
            {!hideSearch && (
              <Link
                href="/chat"
                className={cn(
                  "group relative inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold text-white shadow-xs shadow-orange-500/25 transition-all duration-200 hover:shadow-md hover:shadow-orange-500/35 hover:scale-[1.02] active:scale-[0.98]",
                  pathname === "/chat"
                    ? "bg-orange-600 ring-2 ring-orange-400/40"
                    : "bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600",
                )}
              >
                <div className="relative shrink-0">
                  <Image
                    src="/velte_ai_assistant.png"
                    alt=""
                    width={22}
                    height={22}
                    className="h-[22px] w-[22px] rounded-full object-cover ring-1 ring-white/50"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-white" />
                </div>
                <span className="tracking-tight">Ask Velte</span>
                <SparklesIcon
                  size={14}
                  className="opacity-80 group-hover:rotate-12 transition-transform duration-300 hidden sm:inline-block"
                />
              </Link>
            )}

            {/* Theme Toggle */}
            <ThemeToggleButton />

            {/* Divider (desktop) */}
            <span className="hidden sm:block w-px h-5 bg-gray-200/80 dark:bg-white/15 mx-0.5" />

            {/* User State */}
            {displayName ? (
              <Link
                href={accountHref}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-all hover:bg-gray-100/80 dark:hover:bg-white/10 border border-transparent hover:border-gray-200/60 dark:hover:border-white/15 max-w-[13rem] group"
              >
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      width={30}
                      height={30}
                      className="h-[30px] w-[30px] rounded-full object-cover ring-2 ring-orange-500/30 group-hover:ring-orange-500/60 transition-all"
                    />
                  ) : (
                    <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-xs font-bold text-white shadow-xs">
                      {initials}
                    </span>
                  )}
                  {isEnterprise && <EnterpriseAvatarBadge size="sm" />}
                </div>
                <span className="hidden sm:inline truncate text-[13px] font-semibold text-ink group-hover:text-orange-600 transition-colors">
                  {displayName}
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link href="/auth/login">
                  <button
                    type="button"
                    className="hidden sm:inline-flex items-center cursor-pointer text-ink/75 hover:text-ink hover:bg-gray-100/80 dark:hover:bg-white/10 text-[13px] font-medium px-3.5 py-1.5 rounded-full transition-all"
                  >
                    Sign in
                  </button>
                </Link>
                <Link href="/auth/signup">
                  <button
                    type="button"
                    className="inline-flex items-center cursor-pointer text-[13px] font-semibold text-orange-600 dark:text-orange-300 bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/25 px-4 py-1.5 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Join
                  </button>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="md:hidden ml-0.5 w-9 h-9 flex items-center justify-center rounded-full text-ink/70 hover:text-ink hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {menuOpen ? <CloseIcon size={20} /> : <ListIcon size={20} />}
            </button>
          </div>
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </motion.header>
  );
}
