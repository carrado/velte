"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "motion/react";
import { goAskVelte } from "@/lib/askVelte";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import {
  ArrowRightIcon,
  CameraIcon,
  CheckCircleIcon,
} from "@/components/icons/hero";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

// Desktop-only photo collage (2026-09-17, explicit request: "really nice
// animations with real human images... trying to search out something from
// their phones"). Two real, freely-licensed Unsplash photos (Unsplash
// License — free for commercial use, no attribution required; chosen for
// "looking at phone, engaged" body language over a posed/smiling-at-camera
// shot, since the point is "searching," not "holding a phone") float on a
// gentle, independent, infinite loop rather than a one-time entrance —
// that's the actual "animation," not just a fade-in. A third floating card
// — a small mockup of a real result, same shape a StoreResultCard/
// VendorResultCard actually renders — sits over both, tying the photos back
// to the real product instead of leaving them as generic lifestyle imagery.
//
// `hidden lg:block` — mobile keeps the exact single-column composer-first
// layout this section already had (per the 2026-09-17 "no much content,
// very short" redesign earlier the same day): three extra images and three
// looping animations are load weight and visual noise a phone screen this
// narrow has no room for anyway, not a savings made for its own sake.
function float(duration: number, delay = 0) {
  return {
    animate: { y: [0, -14, 0] },
    transition: {
      duration,
      repeat: Infinity,
      ease: "easeInOut" as const,
      delay,
    },
  };
}

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
// The box below isn't a decorative mockup — it's
// the actual composer, wired straight to /chat (see SearchHome's own
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
//
// 2026-08-15 (AI-agent pivot): dropped the "Prefer to browse first? ↓"
// scroll-to-marketplace link entirely — its target (MarketplacePreview) was
// cut from page.tsx the same day (see that file's own comment), and even
// before that, offering an escape hatch OUT of the AI conversation and back
// into "browse a grid" worked against the whole point of this page: Velte
// figures out what you need, you don't go find it yourself.
//
// 2026-08-15 (full homepage redesign): added the "Your AI shopping agent"
// eyebrow above the headline — the page now has enough sections below to
// earn a positioning line up top instead of jumping straight to the ask,
// and `go()` moved out to lib/askVelte.ts's goAskVelte so FloatingAskBar
// and FinalAskCta share the exact same /chat handoff instead of each
// re-implementing it.
export default function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Grows the textarea to fit typed content instead of scrolling internally
  // — see the hook's own comment.
  const autoResize = useAutoResizeTextarea(query);

  function go(text: string) {
    if (!goAskVelte(router, text)) autoResize.ref.current?.focus();
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
    <section className="relative overflow-hidden bg-canvas pt-24 pb-12 sm:pt-28 sm:pb-16">
      {/* Soft glows — same subtle background texture the rest of the site
          already uses (Profile/Home hero cards), not an AI-product effect
          specific to this box. */}
      <div className="absolute top-0 left-1/4 w-[420px] h-[420px] bg-orange-400/[0.08] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-orange-400/[0.06] rounded-full blur-[80px] pointer-events-none" />

      <div className="relative max-w-3xl lg:max-w-6xl mx-auto px-5 sm:px-8">
        <div className="lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="text-center lg:text-left"
          >
            <motion.p
              variants={fadeUp}
              className="text-orange-500 text-xs sm:text-sm font-bold uppercase tracking-[0.14em] mb-3"
            >
              Your AI shopping agent
            </motion.p>

            <motion.h1
              variants={fadeUp}
              className="text-[2.3rem] sm:text-5xl lg:text-[3.2rem] font-bold text-ink leading-[1.12] tracking-tight mb-4 text-balance"
            >
              Just tell Velte
              <br />
              <span className="text-orange-500">what you need.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-base sm:text-lg text-gray-500 mb-7 leading-relaxed max-w-md mx-auto lg:mx-0"
            >
              Find products, businesses and services near you — Velte figures
              out the rest.
            </motion.p>

            <motion.form
              variants={fadeUp}
              onSubmit={handleSubmit}
              className="text-left"
            >
              <div className="flex flex-col bg-surface rounded-[28px] border-2 border-gray-100 shadow-xl shadow-gray-300/30 focus-within:border-orange-300 transition-colors">
                <textarea
                  {...autoResize}
                  rows={1}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What are you looking for?"
                  className="w-full resize-none bg-transparent outline-none text-base sm:text-lg leading-6 text-gray-900 placeholder:text-gray-400 px-6 pt-5 sm:pt-6 pb-2"
                />
                <div className="flex items-center justify-between px-4 sm:px-5 pb-4 pt-1">
                  <span className="hidden sm:flex items-center gap-1.5 pl-2 text-xs text-gray-400">
                    <CameraIcon size={14} />
                    Photos work too, once you&apos;re in
                  </span>
                  <button
                    type="submit"
                    className="ml-auto shrink-0 inline-flex items-center gap-1.5 pl-4 pr-3.5 h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Ask
                    <ArrowRightIcon size={18} />
                  </button>
                </div>
              </div>
            </motion.form>

            <motion.div variants={fadeUp} className="mt-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Try
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => go(prompt)}
                    className="text-xs sm:text-[13px] font-medium text-gray-600 bg-surface border border-gray-200 rounded-full px-3.5 py-2 hover:border-orange-300 hover:text-orange-700 hover:bg-orange-50 transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Desktop-only photo collage — see this file's own top comment for
            why mobile never renders any of this. Fixed height so the two
            floating photos and the result-card mockup have real space to
            move in without the section itself resizing as they animate. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
            className="hidden lg:block relative h-[460px]"
          >
            <div className="absolute inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-orange-200/30 to-orange-400/[0.06] blur-2xl" />

            {/* Back photo — a buyer looking at her phone indoors. */}
            <motion.div
              {...float(5.5)}
              className="absolute top-0 left-2 w-64 h-80 rounded-[28px] overflow-hidden rotate-[-5deg] border-[6px] border-white shadow-2xl shadow-gray-400/40"
            >
              <Image
                src="https://images.unsplash.com/photo-1739271933163-8dcc7c8e8a3e?q=80&w=600&auto=format&fit=crop"
                alt="A shopper checking her phone for what she needs"
                fill
                // No `priority` (found live: this element is `hidden` on
                // mobile via CSS, not unmounted — Next.js's own preload tag
                // has no notion of that, so `priority` would still queue a
                // network fetch for an image a phone never actually shows).
                loading="lazy"
                sizes="(min-width: 1024px) 256px, 0px"
                className="object-cover"
              />
            </motion.div>

            {/* Front photo — a buyer reading his phone by a window. */}
            <motion.div
              {...float(4.5, 0.6)}
              className="absolute bottom-2 right-0 w-56 h-72 rounded-[28px] overflow-hidden rotate-[4deg] border-[6px] border-white shadow-2xl shadow-gray-400/40"
            >
              <Image
                src="https://images.unsplash.com/photo-1519944518895-f08a12d6dfd5?q=80&w=600&auto=format&fit=crop"
                alt="A buyer searching for a vendor on his phone"
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 224px, 0px"
                className="object-cover"
              />
            </motion.div>

            {/* A small mockup of a real match card, same shape a search result
              actually renders — floats over both photos so the imagery reads
              as "this is what happens when they search," not generic
              lifestyle stock. */}
            <motion.div
              {...float(5, 0.3)}
              className="absolute top-1/2 left-1/2 w-52 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-100 bg-surface p-3.5 shadow-xl shadow-black/10"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50">
                  <CheckCircleIcon size={16} className="text-green-500" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink">
                    Match found nearby
                  </p>
                  <p className="text-[11px] text-gray-400">
                    2.4km away · Chat now
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
