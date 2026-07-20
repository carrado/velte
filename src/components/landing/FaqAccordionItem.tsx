"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
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
        "border rounded-2xl bg-white overflow-hidden transition-shadow duration-200",
        open
          ? "border-orange-200 shadow-md shadow-orange-500/[0.06]"
          : "border-gray-200 hover:border-gray-300",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 cursor-pointer"
      >
        <span className="text-[#023337] font-semibold text-[15px]">
          {faq.question}
        </span>
        <Plus
          className={cn(
            "w-4 h-4 text-orange-500 shrink-0 transition-transform duration-200",
            open && "rotate-45",
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
            <p className="px-5 pb-4 text-gray-500 text-sm leading-relaxed">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
