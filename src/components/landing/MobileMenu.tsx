"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
// Icons from Phosphor (2026-08-16, swapped from lucide-react for this
// session's pages only — see the comment just below). Chevron/HelpCircle/
// Mail/Route/Sparkles have no exact match; CaretDown/CaretRight/Question/
// EnvelopeSimple/Path/Sparkle are their closest Phosphor equivalents.
import {
  ArrowRight,
  Briefcase,
  CaretDown,
  CaretRight,
  EnvelopeSimple,
  Info,
  Newspaper,
  Path,
  Question,
  Sparkle,
  SquaresFour,
  X,
} from "@phosphor-icons/react";

// Rebuilt 2026-08-16 as a right-side drawer with expandable grouped
// sections, replacing the 2026-08-14 three-item full-width dropdown
// (Browse/Join Velte/Sign In) — an explicit reversal of that trim, not an
// oversight; that version's own comment explains why it cut everything
// else, this one exists because the ask this time was specifically to
// mirror a reference site's mega-menu pattern. Kept Velte's actual look
// though: light surfaces + a single orange accent throughout, not the
// reference's dark-green panel or its multi-color icon chips — see
// [[feedback_app_palette]], and there just isn't enough real content here
// (Velte has ~11 public pages total) to justify the reference's much
// bigger multi-column density; every row below is a real, working route,
// nothing padded in to fill space.
const exploreItems = [
  {
    icon: SquaresFour,
    title: "Marketplace",
    subtitle: "Browse real listings nearby",
    href: "/marketplace",
  },
  {
    icon: Sparkle,
    title: "Ask Velux",
    subtitle: "Describe it — AI finds it",
    href: "/velux",
  },
  {
    icon: Path,
    title: "How It Works",
    subtitle: "The buyer & seller flow, step by step",
    href: "/how-it-works",
  },
];

const resourceItems = [
  { icon: Newspaper, title: "Blog", href: "/blog" },
  { icon: Question, title: "FAQ", href: "/faq" },
];

const companyItems = [
  { icon: Info, title: "About", href: "/about" },
  { icon: Briefcase, title: "Careers", href: "/careers" },
  { icon: EnvelopeSimple, title: "Contact", href: "/contact" },
];

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
    <div className="border-b border-gray-100">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-4 text-left cursor-pointer"
      >
        <span className="text-[15px] font-bold text-[#023337]">{label}</span>
        <CaretDown
          size={16}
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [exploreOpen, setExploreOpen] = useState(true);
  const [resourcesOpen, setResourcesOpen] = useState(true);
  const [companyOpen, setCompanyOpen] = useState(true);

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
            className="fixed inset-0 z-[99] bg-black/30 sm:hidden"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-y-0 right-0 z-[100] w-[86%] max-w-sm sm:hidden bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 shrink-0">
              <Image
                src="/velte_logo_esn5dj.png"
                alt="Velte"
                width={64}
                height={31}
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5">
              <AccordionSection
                label="Explore"
                open={exploreOpen}
                onToggle={() => setExploreOpen((v) => !v)}
              >
                <div className="space-y-1">
                  {exploreItems.map(({ icon: Icon, title, subtitle, href }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className="flex items-center gap-3 py-2 -mx-1 px-1 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-orange-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#023337]">
                          {title}
                        </p>
                        <p className="text-[12px] text-gray-400 truncate">
                          {subtitle}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </AccordionSection>

              <AccordionSection
                label="Resources"
                open={resourcesOpen}
                onToggle={() => setResourcesOpen((v) => !v)}
              >
                <div className="space-y-1">
                  {resourceItems.map(({ icon: Icon, title, href }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className="flex items-center gap-3 py-2 -mx-1 px-1 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-orange-500" />
                      </div>
                      <span className="text-sm font-semibold text-[#023337]">
                        {title}
                      </span>
                    </Link>
                  ))}
                </div>
              </AccordionSection>

              <AccordionSection
                label="Company"
                open={companyOpen}
                onToggle={() => setCompanyOpen((v) => !v)}
              >
                <div className="space-y-1">
                  {companyItems.map(({ icon: Icon, title, href }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className="flex items-center gap-3 py-2 -mx-1 px-1 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-orange-500" />
                      </div>
                      <span className="text-sm font-semibold text-[#023337]">
                        {title}
                      </span>
                    </Link>
                  ))}
                </div>
              </AccordionSection>

              <Link
                href="/auth/login"
                onClick={onClose}
                className="flex items-center justify-between py-4"
              >
                <span className="text-[15px] font-bold text-[#023337]">
                  Sign in
                </span>
                <CaretRight size={16} className="text-gray-400" />
              </Link>
            </div>

            <div className="p-5 border-t border-gray-100 shrink-0">
              <Link
                href="/join"
                onClick={onClose}
                className="h-12 flex items-center justify-center gap-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-[14px] font-semibold shadow-lg shadow-orange-500/20 transition-colors"
              >
                Join Velte
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
