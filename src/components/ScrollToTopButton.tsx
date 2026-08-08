"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp } from "lucide-react";

// Vendor dashboard routes are "/<mongo-objectid>/..." (see CLAUDE.md's own
// "src/app/[id]/ — protected dashboard scoped to a user ID" note) — there's
// no other static prefix to match against, since the id itself is dynamic.
// A 24-hex-char first segment is specific enough that nothing buyer-facing
// (/velux, /marketplace, /store/:handle, /about, /auth/..., etc.) could
// ever collide with it.
const DASHBOARD_PATH_RE = /^\/[0-9a-f]{24}(\/|$)/i;

const SHOW_AFTER_PX = 400;

// Mounted once in the root layout (see layout.tsx) — one instance covers
// every buyer-facing page for free instead of adding it page by page. Self-
// excludes on vendor dashboard routes, which already have their own
// Sidebar/Header chrome and scroll behavior (see the [id] layout) that this
// isn't meant to interfere with.
export function ScrollToTopButton() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (DASHBOARD_PATH_RE.test(pathname)) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          key="scroll-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#023337] shadow-lg ring-1 ring-black/5 hover:bg-gray-50 transition-colors"
          style={{
            right: "max(1.25rem, env(safe-area-inset-right))",
            bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)",
          }}
        >
          <ArrowUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
