"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUp } from "lucide-react";

interface NewPostsIndicatorProps {
  count: number;
  onClick: () => void;
  label?: string;
  className?: string;
}

/**
 * X.com (Twitter)-style floating new updates indicator pill.
 * Floats at the top of the feed and indicates when real-time updates arrive.
 * Clicking triggers scroll-to-top and merges newest items first.
 */
export function NewPostsIndicator({
  count,
  onClick,
  label,
  className = "",
}: NewPostsIndicatorProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`sticky top-20 z-30 flex justify-center py-2 pointer-events-none ${className}`}
        >
          <button
            type="button"
            onClick={onClick}
            aria-label={`${count} new updates available. Click to view newest.`}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-xl shadow-orange-500/25 border border-white/25 backdrop-blur-sm transition-all transform active:scale-95 cursor-pointer"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25">
              <ArrowUp size={14} className="stroke-[3]" />
            </span>
            <span>
              {label || `${count} new update${count === 1 ? "" : "s"}`}
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
