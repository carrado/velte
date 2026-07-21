"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import type { FaqItem } from "@/types/common";
import { cn } from "@/lib/utils";

export default function FaqCard({
  faq,
  index,
  defaultOpen = false,
}: {
  faq: FaqItem;
  index: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative rounded-2xl bg-white overflow-hidden transition-colors duration-200 border",
        open
          ? "border-orange-300 shadow-xl shadow-orange-500/[0.08]"
          : "border-gray-200 hover:border-orange-200 shadow-sm",
      )}
    >
      {/* Animated left accent bar */}
      <motion.span
        initial={false}
        animate={{ scaleY: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{ transformOrigin: "top" }}
        className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-orange-400 to-orange-600"
      />

      {/* Ghost index number */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-2 -top-4 text-6xl font-black tracking-tighter transition-colors duration-300 select-none",
          open ? "text-orange-500/[0.09]" : "text-gray-900/[0.04]",
        )}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative w-full flex items-center justify-between gap-4 text-left pl-6 pr-5 py-5 cursor-pointer"
      >
        <span
          className={cn(
            "font-semibold text-[15px] sm:text-base transition-colors duration-200",
            open ? "text-orange-600" : "text-[#023337]",
          )}
        >
          {faq.question}
        </span>
        <motion.span
          animate={{
            rotate: open ? 135 : 0,
            backgroundColor: open ? "#f97316" : "#fff7ed",
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="grid place-items-center w-7 h-7 rounded-full shrink-0"
        >
          <Plus
            className={cn(
              "w-4 h-4 transition-colors duration-200",
              open ? "text-white" : "text-orange-500",
            )}
          />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="relative pl-6 pr-8 pb-5 text-gray-500 text-sm leading-relaxed">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
