"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/types/common";
import { cn } from "@/lib/utils";

export default function FaqAccordionItem({
  faq,
  defaultOpen = false,
}: {
  faq: FaqItem;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface overflow-hidden transition-all duration-200",
        open
          ? "border-orange-300 shadow-sm shadow-orange-500/[0.06] dark:border-orange-500/40"
          : "border-gray-200 hover:border-gray-300",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left select-none"
      >
        <span className="text-[15px] font-semibold text-ink">
          {faq.question}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-orange-500 transition-transform duration-200 ease-out",
            open && "rotate-180",
          )}
        />
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
            <p className="px-5 pb-4 text-sm leading-relaxed text-ink/80">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
