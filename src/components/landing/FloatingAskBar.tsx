"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { goAskVelte } from "@/lib/askVelte";
import { ArrowRightIcon } from "@/components/icons";

// "Make the AI input persistent" — a compact composer that appears once the
// visitor scrolls past Hero's own (much bigger) one, so a conversation can
// start from anywhere on the page, not just the first screen. Same
// goAskVelte handoff Hero uses — this is a real composer, not a decorative
// shortcut back up to the hero. Hidden until scrolled past SHOW_AFTER_PX
// (roughly Hero's own height) specifically so it never doubles up with
// Hero's composer being visible at the same time — showing two "ask Velte"
// boxes on screen at once would read as a glitch, not a feature.
const SHOW_AFTER_PX = 560;

// 2026-08-19: also hidden again once Footer approaches, so it stops
// floating on top of it (RegisterCta/FAQ/Footer all have their own real
// CTAs and links underneath it — a fixed composer pinned over them for the
// rest of the scroll was actively in the way, not just redundant). First
// pass used a flat "distance from document bottom" pixel guess (480px) —
// wrong wherever Footer itself is taller than that, which it is: the bar
// stayed up for most of the time Footer was actually on screen, since
// distanceFromBottom doesn't hit 480 until you're nearly past Footer
// entirely, not as soon as it's merely visible. Replaced with an
// IntersectionObserver on the real `<footer>` element (Footer.tsx's root
// tag — queried directly, no ref plumbing needed since it's already unique
// on the page) so this tracks Footer's actual position, not a guessed
// constant. `rootMargin`'s bottom value is positive specifically to extend
// the "viewport" 200px past its real bottom edge, so the observer fires
// while Footer is still 200px below the fold — "approaching," not "already
// on screen."
const FOOTER_ROOT_MARGIN = "0px 0px 200px 0px";

export function FloatingAskBar() {
  const router = useRouter();
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [footerApproaching, setFooterApproaching] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolledPastHero(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterApproaching(entry.isIntersecting),
      { rootMargin: FOOTER_ROOT_MARGIN },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const visible = scrolledPastHero && !footerApproaching;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goAskVelte(router, query)) inputRef.current?.focus();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pointer-events-none"
        >
          <form
            onSubmit={handleSubmit}
            className="pointer-events-auto max-w-lg mx-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md rounded-full border-2 border-gray-100 shadow-2xl shadow-gray-400/20 pl-5 pr-1.5 h-12 focus-within:border-orange-300 transition-colors"
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask Velte anything…"
              className="flex-1 min-w-0 h-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400"
            />
            <button
              type="submit"
              aria-label="Ask Velte"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white transition-colors cursor-pointer"
            >
              <ArrowRightIcon size={18} />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
