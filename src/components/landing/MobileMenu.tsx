"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  ChevronDownIcon,
  CloseIcon,
  FileTextIcon,
  HelpCircleIcon,
  MailIcon,
  NewspaperIcon,
  RouteIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/icons";

// Rebuilt 2026-08-16 as a right-side drawer with expandable grouped
// sections, replacing the 2026-08-14 three-item full-width dropdown
// (Browse/Join Velte/Sign In) — an explicit reversal of that trim, not an
// oversight; that version's own comment explains why it cut everything
// else, this one exists because the ask this time was specifically to
// mirror a reference site's mega-menu pattern. There just isn't enough
// real content here (Velte has ~11 public pages total) to justify the
// reference's much bigger multi-column density; every row below is a
// real, working route, nothing padded in to fill space.
//
// 2026-08-17: panel background is a pale orange tint (was plain white) —
// same bg-orange-50 + orange-100 border language as InstallRow's "Get the
// Velte app" card (Settings/buyer Profile), reused here per explicit
// request. Solid orange-50, not InstallRow's own bg-orange-50/40 — this
// panel is fully opaque over the black/30 backdrop behind it, so a
// translucent fill would pick up a muddy blend instead of a clean tint the
// way InstallRow's /40 does sitting on a plain white page. Text/icons stay
// dark (same palette as before) since the tint is light, not a bold fill.
// Scoped to this one drawer, not a site-wide palette change — see
// [[feedback_app_palette]].
//
// 2026-08-18 polish pass — same content/links, but: spring physics on the
// drawer slide (was a flat duration tween — reads more like a native app
// now); Explore starts expanded, Resources/Company start collapsed (was
// all three open by default, which made the accordion toggles pure
// decoration and dumped 10 rows into the first view); rows stagger in on
// open instead of appearing all at once; tap feedback (whileTap scale) on
// every interactive element, not just hover states, since this is a touch
// surface first; and the current route highlights in the list via
// usePathname, so "Ask Velte" reads as active while actually on /chat.
//
// "Marketplace" dropped entirely (2026-08-16, not just de-emphasized) —
// the product doesn't have a separate "browse the stacked-up catalog"
// experience anymore, AI search is what surfaces everything now, so there
// was nothing honest left to send this link to. /marketplace itself is
// untouched, just no longer linked from anywhere in this menu.
// "Ask Velte" uses Velte's own avatar image (same file as the /chat page's
// assistant avatar) instead of an icon — same reasoning as HowItWorksSteps'
// "Velte understands" step: this is Velte itself, not an abstract concept.
const exploreItems: {
  icon?: typeof RouteIcon;
  image?: string;
  title: string;
  subtitle: string;
  href: string;
}[] = [
  {
    image: "/velte_ai_assistant.png",
    title: "Ask Velte",
    subtitle: "Describe it — AI finds it",
    href: "/chat",
  },
  {
    icon: RouteIcon,
    title: "How It Works",
    subtitle: "The buyer & seller flow, step by step",
    href: "/how-it-works",
  },
];

// Pricing deliberately NOT here — same call Footer.tsx already made ("not
// ready to be a footer-level link yet on its own"; still reachable from How
// It Works' vendor column) and it applies even more here: /pricing's own
// FAQ says "We're finalising exact pricing as Velte rolls out," and the
// numbers on it are vendor lead-cost info, not something the buyer majority
// of this drawer's visitors have any use for.
const resourceItems = [
  { icon: NewspaperIcon, title: "Blog", href: "/blog" },
  { icon: HelpCircleIcon, title: "FAQ", href: "/faq" },
];

// Privacy/Terms folded in here rather than a fourth accordion section for
// just two links — same "Legal" pair Footer.tsx groups separately, but this
// drawer doesn't have the vertical room to justify its own section for it.
const companyItems = [
  { icon: UserIcon, title: "About", href: "/about" },
  { icon: BriefcaseIcon, title: "Careers", href: "/careers" },
  { icon: MailIcon, title: "Contact", href: "/contact" },
  { icon: ShieldIcon, title: "Privacy", href: "/privacy" },
  { icon: FileTextIcon, title: "Terms", href: "/terms" },
];

const listStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};

const itemFadeUp = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" as const },
  },
};

function AccordionSection({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-orange-100">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-4 text-left cursor-pointer"
      >
        <span className="text-[15px] font-bold text-[#023337]">{label}</span>
        <motion.span whileTap={{ scale: 0.85 }}>
          <ChevronDownIcon
            size={16}
            className={`text-gray-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavRow({
  href,
  onNavigate,
  active,
  children,
}: {
  href: string;
  onNavigate: () => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={itemFadeUp} whileTap={{ scale: 0.97 }}>
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 py-2.5 -mx-1 px-2 rounded-xl transition-colors",
          active
            ? "bg-white shadow-sm shadow-orange-200/60"
            : "hover:bg-white/60",
        )}
      >
        {children}
      </Link>
    </motion.div>
  );
}

export function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [exploreOpen, setExploreOpen] = useState(true);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99] bg-black/30 backdrop-blur-[2px] sm:hidden"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed inset-y-0 right-0 z-[100] w-[86%] max-w-sm sm:hidden bg-orange-50 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-orange-100 shrink-0">
              <Image
                src="/velte_logo_esn5dj.png"
                alt="Velte"
                width={64}
                height={31}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-orange-100/60 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <CloseIcon size={18} />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto px-5">
              <AccordionSection
                label="Explore"
                open={exploreOpen}
                onToggle={() => setExploreOpen((v) => !v)}
              >
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={listStagger}
                  className="space-y-1"
                >
                  {exploreItems.map(
                    ({ icon: Icon, image, title, subtitle, href }) => (
                      <NavRow
                        key={href}
                        href={href}
                        onNavigate={onClose}
                        active={pathname === href}
                      >
                        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-sm shadow-orange-200/60">
                          {image ? (
                            <Image
                              src={image}
                              alt="Velte"
                              width={36}
                              height={36}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            Icon && (
                              <Icon size={18} className="text-orange-500" />
                            )
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#023337]">
                            {title}
                          </p>
                          <p className="text-[12px] text-gray-400 truncate">
                            {subtitle}
                          </p>
                        </div>
                      </NavRow>
                    ),
                  )}
                </motion.div>
              </AccordionSection>

              <AccordionSection
                label="Resources"
                open={resourcesOpen}
                onToggle={() => setResourcesOpen((v) => !v)}
              >
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={listStagger}
                  className="space-y-1"
                >
                  {resourceItems.map(({ icon: Icon, title, href }) => (
                    <NavRow
                      key={href}
                      href={href}
                      onNavigate={onClose}
                      active={pathname === href}
                    >
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-200/60">
                        <Icon size={18} className="text-orange-500" />
                      </div>
                      <span className="text-sm font-medium text-[#023337]">
                        {title}
                      </span>
                    </NavRow>
                  ))}
                </motion.div>
              </AccordionSection>

              <AccordionSection
                label="Company"
                open={companyOpen}
                onToggle={() => setCompanyOpen((v) => !v)}
              >
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={listStagger}
                  className="space-y-1"
                >
                  {companyItems.map(({ icon: Icon, title, href }) => (
                    <NavRow
                      key={href}
                      href={href}
                      onNavigate={onClose}
                      active={pathname === href}
                    >
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-200/60">
                        <Icon size={18} className="text-orange-500" />
                      </div>
                      <span className="text-sm font-medium text-[#023337]">
                        {title}
                      </span>
                    </NavRow>
                  ))}
                </motion.div>
              </AccordionSection>
            </div>

            {/* Sign in / Join Velte — a deliberate primary/secondary CTA
                pair, not "one button + one random nav item." */}
            <div className="p-5 border-t border-orange-100 shrink-0 space-y-2.5">
              <motion.div whileTap={{ scale: 0.97 }}>
                <Link
                  href="/auth/login"
                  onClick={onClose}
                  className="h-12 flex items-center justify-center rounded-full border border-orange-200 bg-white hover:bg-orange-50 text-[#023337] text-[14px] font-semibold transition-colors"
                >
                  Sign in
                </Link>
              </motion.div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Link
                  href="/auth/signup"
                  onClick={onClose}
                  className="h-12 flex items-center justify-center gap-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-[14px] font-semibold shadow-lg shadow-orange-500/20 transition-colors"
                >
                  Join Velte
                  <ArrowRightIcon size={14} />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
