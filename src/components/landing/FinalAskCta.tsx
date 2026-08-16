"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";
import { goAskVelte } from "@/lib/askVelte";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// The closing composer — a visitor who's scrolled this far has already seen
// the pitch made three different ways (steps, live demo, no-match fallback,
// the comparison); this is just a second, unmissable chance to actually act
// on it right where they are, same goAskVelte handoff as Hero and
// FloatingAskBar.
export function FinalAskCta() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goAskVelte(router, query)) inputRef.current?.focus();
  }

  return (
    <section className="relative bg-white border-t border-gray-100 py-14 sm:py-16">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={fadeUp}
        className="max-w-lg mx-auto px-5 sm:px-8 text-center"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-[#023337] tracking-tight mb-6 text-balance">
          Just ask Velte.
        </h2>
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-1.5 bg-[#F1F5F9] rounded-full border-2 border-transparent focus-within:border-orange-300 focus-within:bg-white transition-colors pl-5 pr-1.5 h-14"
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you looking for?"
            className="flex-1 min-w-0 h-full outline-none bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400"
          />
          <button
            type="submit"
            className="shrink-0 inline-flex items-center gap-1.5 pl-4 pr-3.5 h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Ask
            <ArrowRight size={15} />
          </button>
        </form>
      </motion.div>
    </section>
  );
}
