"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import { getInitial } from "@/lib/initials";
import { useChatNavItems } from "@/components/chat/useChatNavItems";
import { InstallRow } from "@/components/InstallRow";

// Mobile counterpart to ChatSidebar — same mechanics as the marketing
// site's MobileMenu.tsx (portal, dimmed overlay, motion slide panel), just
// sliding in from the LEFT instead of MobileMenu's right, per the brief for
// this shell specifically. Content is the exact same identity-aware nav set
// ChatSidebar renders on desktop (useChatNavItems), not a separate list to
// keep in sync by hand.
export function ChatMobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const userDetails = useUserStore((state) => state.user);
  const { buyer } = useBuyerSession();
  const items = useChatNavItems();

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

  if (typeof document === "undefined" || !items) return null;

  const accountLabel = userDetails
    ? (userDetails.company?.name ?? userDetails.name)
    : (buyer?.name ?? "Guest");
  const accountAvatar = userDetails?.avatar;
  const accountHref = userDetails
    ? `/${userDetails.id}/wallet`
    : "/chat/profile";

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99] bg-black/30 lg:hidden"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-y-0 left-0 z-[100] w-[80%] max-w-xs lg:hidden bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100 shrink-0 pt-[env(safe-area-inset-top)]">
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

            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
              {items.map(({ label, icon: Icon, href }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={label}
                    href={href}
                    onClick={onClose}
                    className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm cursor-pointer transition-colors ${
                      active
                        ? "bg-orange-500 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon
                      size={17}
                      className={active ? "text-white" : "text-gray-500"}
                    />
                    <span>{label}</span>
                  </Link>
                );
              })}

              {/* Fills what would otherwise be dead space below a short nav
                  list with a real CTA instead of padding — same card as
                  /chat/profile and vendor Settings, self-hides once already
                  installed. */}
              <div className="pt-4 mt-3 border-t border-gray-100">
                <InstallRow />
              </div>
            </nav>

            <div className="px-3 py-4 border-t border-gray-200 shrink-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <Link
                href={accountHref}
                onClick={onClose}
                className="w-full flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                  {accountAvatar ? (
                    <img
                      src={accountAvatar}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitial(accountLabel)
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                    {accountLabel}
                  </p>
                  {userDetails?.username && (
                    <p className="text-xs text-gray-400 truncate">
                      @{userDetails.username}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
