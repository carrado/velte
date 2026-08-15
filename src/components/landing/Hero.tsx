"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
// Icons from Phosphor (2026-08-16, swapped from lucide-react for this
// session's pages only — see MobileMenu.tsx's comment on the trade-off).
// LayoutGrid has no exact Phosphor match; SquaresFour is its closest
// equivalent (four-square grid glyph, same "browse a grid" meaning).
import { ArrowRight, Camera, SquaresFour } from "@phosphor-icons/react";
import { scrollToMarketplace } from "@/lib/scrollToMarketplace";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

// Real examples, not filler copy — "Ushering service for an event in Awka"
// specifically because that's a real category with a real matched vendor on
// Velte today (see the 2026-08-13 buyer-request matching fix), not a made-up
// showcase phrase.
const EXAMPLE_PROMPTS = [
  "Fast charger for a Tecno phone near Enugu",
  "Someone to fix my generator this week",
  "Ushering service for an event in Awka",
];

// Redesigned 2026-08-13, trimmed further 2026-08-15 — replaces the old
// "Real vendors. Real listings." headline + parallax photo/mockup pair.
// That version's job (show real catalog items) now belongs entirely to
// MarketplacePreview right below it; duplicating a mockup of that section
// here just to fill hero space read as noise once this box could do
// something real instead. The box below isn't a decorative mockup — it's
// the actual composer, wired straight to /velux (see SearchHome's own
// `?q=`/`auto=1` handoff) — so typing here and hitting enter is a real
// search, not a fake preview of one. Deliberately plain: no gradient panel,
// no "Powered by X" badge, no glow around the input itself — the AI here is
// meant to feel like a normal text box that happens to understand you, not
// a chatbot product being sold on its own.
//
// 2026-08-15: cut the explanatory paragraph down to one line and made the
// composer itself the visually dominant element (was competing with the
// surrounding copy for attention) — the first screen's only job is "I tell
// Velte what I need," not an explanation of how the matching pipeline
// works.
export default function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function go(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      textareaRef.current?.focus();
      return;
    }
    router.push(`/velux?q=${encodeURIComponent(trimmed)}&auto=1`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    go(query);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      go(query);
    }
  }

  return (
    <section className="relative overflow-hidden bg-[#F1F5F9] pt-24 pb-12 sm:pt-28 sm:pb-16">
      {/* Soft glows — same subtle background texture the rest of the site
          already uses (Profile/Home hero cards), not an AI-product effect
          specific to this box. */}
      <div className="absolute top-0 left-1/4 w-[420px] h-[420px] bg-orange-400/[0.08] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-orange-400/[0.06] rounded-full blur-[80px] pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.h1
            variants={fadeUp}
            className="text-[2.3rem] sm:text-5xl lg:text-[3.2rem] font-bold text-[#023337] leading-[1.12] tracking-tight mb-4 text-balance"
          >
            Need something?
            <br />
            <span className="text-orange-500">Tell Velte.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg text-gray-500 mb-7 leading-relaxed max-w-md mx-auto"
          >
            Find products, businesses or services near you — or let vendors come
            to you.
          </motion.p>

          <motion.form
            variants={fadeUp}
            onSubmit={handleSubmit}
            className="text-left"
          >
            <div className="flex flex-col bg-white rounded-[28px] border-2 border-gray-100 shadow-xl shadow-gray-300/30 focus-within:border-orange-300 transition-colors">
              <textarea
                ref={textareaRef}
                rows={1}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What are you looking for?"
                className="w-full resize-none bg-transparent outline-none text-base sm:text-lg leading-6 text-gray-900 placeholder:text-gray-400 px-6 pt-5 sm:pt-6 pb-2"
              />
              <div className="flex items-center justify-between px-4 sm:px-5 pb-4 pt-1">
                <span className="hidden sm:flex items-center gap-1.5 pl-2 text-xs text-gray-400">
                  <Camera size={14} />
                  Photos work too, once you&apos;re in
                </span>
                <button
                  type="submit"
                  className="ml-auto shrink-0 inline-flex items-center gap-1.5 pl-4 pr-3.5 h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Ask
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </motion.form>

          <motion.div variants={fadeUp} className="mt-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Try
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => go(prompt)}
                  className="text-xs sm:text-[13px] font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-3.5 py-2 hover:border-orange-300 hover:text-orange-700 hover:bg-orange-50 transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-6">
            <Link
              href="/"
              onClick={scrollToMarketplace}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <SquaresFour className="w-3.5 h-3.5" />
              Prefer to browse first? ↓
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
