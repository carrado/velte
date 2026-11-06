"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "../ui/button";
import { MobileMenu } from "@/components/landing/MobileMenu";
import { ThemeToggleButton } from "@/components/landing/ThemeToggleButton";
import { VelteLogo } from "@/components/VelteLogo";
import { CloseIcon, ListIcon } from "@/components/icons/hero";
import { cn } from "@/lib/utils";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";

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
  hideSearch = false,
}: {
  // Careers is the one page whose hero sits on a full dark bg-[#023337]
  // panel from y=0 (see CareersContent's own comment) — this Navbar's
  // default transparent-until-scrolled state assumes light page content
  // showing through behind it, so its dark gray-600 text/dark logo went
  // near-illegible against dark content at the top of that one page.
  // Skips the transparent phase entirely there rather than teaching this
  // shared header to theme itself per-page.
  forceOpaque?: boolean;
  /** 404 and similar dead-end pages — no Ask Velte field in the chrome. */
  hideSearch?: boolean;
} = {}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const vendor = useUserStore((s) => s.user);
  const buyer = useBuyerStore((s) => s.buyer);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Quiet session hydrate on every public page that mounts this header.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "same-origin",
        });
        if (cancelled) return;
        if (res.status === 401) {
          useUserStore.getState().clearUser();
          useBuyerStore.getState().clearBuyer();
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as {
          vendor: typeof vendor;
          buyer: typeof buyer;
        };
        if (data.vendor) useUserStore.getState().setUser(data.vendor);
        if (data.buyer) useBuyerStore.getState().setBuyer(data.buyer);
      } catch {
        /* guest */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const opaque = forceOpaque || scrolled;
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
    { href: "/blog", label: "Blog" },
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        opaque ? "bg-surface/90 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Three-column grid: Logo | Nav | Actions */}
        <div className="grid grid-cols-[auto_1fr_auto] h-16 items-center gap-6">
          {/* ── Col 1: Logo ── */}
          <Link
            href="/"
            className="flex items-center shrink-0 group"
            aria-label="Velte home"
          >
            <VelteLogo
              width={72}
              height={35}
              className="w-14 sm:w-[72px] h-auto transition-opacity group-hover:opacity-80"
              priority
            />
          </Link>

          {/* ── Col 2: Centred nav links (desktop) ── */}
          <nav className="hidden sm:flex items-center justify-center gap-1">
            {navLinks.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
                    active
                      ? "text-orange-500 bg-orange-500/8"
                      : "text-ink/75 hover:text-ink hover:bg-gray-100 dark:hover:bg-white/10",
                  )}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── Col 3: Right-side actions ── */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Theme toggle */}
            <ThemeToggleButton />

            {/* Divider — desktop only */}
            <span className="hidden sm:block w-px h-5 bg-gray-200 mx-0.5" />

            {/* Ask Velte CTA pill — desktop only */}
            <Link
              href="/chat"
              className={cn(
                "hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors",
                pathname === "/chat"
                  ? "bg-orange-500 text-white"
                  : "bg-orange-50 text-orange-600 hover:bg-orange-100",
              )}
            >
              <Image
                src="/velte_ai_assistant.png"
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 rounded-full object-cover shrink-0"
              />
              Ask Velte
            </Link>

            {/* Thin separator before auth */}
            <span className="hidden sm:block w-px h-5 bg-gray-200 mx-0.5" />

            {displayName ? (
              /* Signed-in avatar chip */
              <Link
                href={accountHref}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-gray-100 max-w-[12rem] dark:hover:bg-white/10"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    width={30}
                    height={30}
                    className="h-[30px] w-[30px] rounded-full object-cover ring-2 ring-orange-500/30"
                  />
                ) : (
                  <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                    {initials}
                  </span>
                )}
                <span className="hidden truncate text-sm font-semibold text-ink sm:inline">
                  {displayName}
                </span>
              </Link>
            ) : (
              /* Guest: Sign in + Join */
              <>
                <Link href="/auth/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden sm:inline-flex cursor-pointer text-ink/80 hover:text-ink hover:bg-gray-100 text-sm font-medium px-4 dark:hover:bg-white/10"
                  >
                    Sign in
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button
                    size="sm"
                    className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 text-sm font-semibold px-4 sm:px-5 rounded-full"
                  >
                    Join
                  </Button>
                </Link>
              </>
            )}

            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="sm:hidden ml-0.5 w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:text-ink hover:bg-gray-100 transition-colors cursor-pointer dark:hover:bg-white/10"
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
