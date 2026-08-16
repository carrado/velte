"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
// Icons from Phosphor (2026-08-16, swapped from lucide-react for this
// session's pages only — see MobileMenu.tsx's comment). SignalHigh/Wifi's
// closest Phosphor equivalents are CellSignalFull/WifiHigh.
import {
  ArrowRight,
  BatteryFull,
  Camera,
  CellSignalFull,
  ShieldCheck,
  WifiHigh,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// A real iPhone 14 Pro Max screen recording of Velte in use — 2026-08-15.
// Uploaded to Cloudinary as .mkv (per the source file); Cloudinary
// transcodes on delivery when the URL's own extension differs from the
// upload's — `.mp4` here is that delivery format, not the original, and
// `f_auto,q_auto` (same trick optimizedImageUrl already uses for every
// image on the site) lets Cloudinary pick the best actual codec/quality per
// requesting browser on top of that. Hosted on Cloudinary rather than Mux
// deliberately — Mux is this codebase's pipeline for vendor-UPLOADED
// product videos, built around adaptive HLS streaming for unpredictable
// length/quality; this is one small (~5MB), fixed, silent, controls-less
// loop, which just needs a plain <video> tag, not a player library.
//
// `c_crop,w_704,h_1408,x_0,y_120` crops out the top 120px of the SOURCE
// 704×1528 recording — that's the site's own real Navbar (logo/Log in/List
// business) as it looked when this was captured, baked into the footage
// itself. Redundant here: the phone mockup already sits inside a page that
// has its own real Navbar above it, so a second one inside the recording
// read as a duplicate rather than "authentic." Exact pixel values, found by
// pulling a frame with ffprobe/ffmpeg and checking where the header's own
// bottom divider actually falls, not a guessed/rounded percentage — see
// this component's own scratch verification before this line was set.
// object-cover on the <video> below absorbs the resulting aspect-ratio
// change against the phone frame's own `aspect-[9/18.5]`, same as it
// already would for any source/container mismatch.
const DEMO_VIDEO_URL =
  "https://res.cloudinary.com/campnet/video/upload/c_crop,w_704,h_1408,x_0,y_120,f_auto,q_auto/v1786834423/iPhone-14-PRO-MAX-velte.ng-79xj1yg1dz_5fk_cllhnx.mp4";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// The one interaction a text search box can't demonstrate on its own: not
// knowing the name of what you want. A photo upload turning into "I found
// N similar options" is the actual differentiator — 2026-08-15 rewrite
// leads with this instead of a second text-query example (Hero's own
// composer + "Try" chips already cover that case).
const EXAMPLE_RESULTS = [
  {
    name: "Structured leather satchel",
    store: "LeatherHouse Enugu",
    price: "₦22,000",
  },
  {
    name: "Classic leather handbag",
    store: "Bella's Bag Corner",
    price: "₦18,500",
  },
];

// Deliberately plain — no chat-bubble glow, no "Powered by Gemini" badge, no
// looping typing animation. One static example, framed literally as a phone
// screenshot (2026-08-14, replaces the flat chat-bubble card — see the
// device-mockup pattern on competitor landing pages) rather than a live
// chatbot demo, per the brief's "useful and invisible" direction.
//
// Restructured 2026-08-16, MOBILE ONLY — desktop keeps the original
// two-column layout (copy left incl. its own CTA, phone right) unchanged,
// same two-grid-item structure it always had (a single copy `<div>` as one
// grid cell, the phone as the other) — an explicit-row-placement version of
// this (h2/p/CTA each pinned to their own grid row) shipped briefly the
// same day and got reverted: `lg:gap-14` sets row-gap AND column-gap, and
// with 3 stacked rows in one column that meant 3 lots of 56px row-gap
// stacking on top of the elements' own margins, blowing the vertical
// spacing out. Back to one wrapping `<div>` avoids the problem entirely —
// gap-14 only ever has one row to apply to, so it's pure column-gap again.
// Below `lg`, the phone now sits between the copy and a second, larger,
// centered CTA instead of the CTA living inline under the paragraph — the
// phone (the actual demonstration) leads on a narrow screen instead of the
// text doing so. Achieved with two separate CTA links, each hidden at the
// other breakpoint (`hidden lg:block` / `lg:hidden`) — the desktop version
// stays inside the copy `<div>` (so it's part of that single grid cell),
// the mobile version sits after the phone in source order, so on mobile
// (no `lg:grid`, plain block flow) the visible order is h2 → p → phone →
// mobile CTA. The TRY_PROMPTS text-query chips that used to sit here were
// dropped entirely (both breakpoints) — this section's whole job is the
// photo-search case specifically (see the comment below); a second set of
// text-query examples duplicated Hero's own "Try" chips without adding
// anything new.
export function VeluxShowcase() {
  // Lazy-loaded on scroll, not on page load — this section sits well below
  // the fold (after Hero and HowItWorksSteps), so a visitor who never
  // scrolls this far never fetches the ~5MB clip at all, and one who does
  // only starts the fetch once the phone mockup is actually about to enter
  // view, never during initial page load/LCP. `showVideo` gates whether the
  // <video> element (and its `src`) exists in the DOM at all — mounting it
  // conditionally, not just toggling `autoPlay`, is what keeps `preload`
  // from having anything to eagerly buffer before then.
  const frameRef = useRef<HTMLDivElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    // A visitor with this OS-level preference never gets the autoplaying
    // recording at all — the illustrated mockup underneath stays the
    // permanent, static, non-motion visual for them instead (see the
    // conditional render below: the mockup is never removed, the video is
    // layered ON TOP of it once ready).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const el = frameRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative bg-white border-t border-gray-100 py-14 sm:py-16">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center lg:text-left lg:grid lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:items-center"
        >
          {/* Copy — one grid cell on desktop (h2 + p + its own CTA, same as
              before this session ever touched this file); on mobile the
              desktop CTA below is hidden, so this contributes just the
              headline + paragraph to the stack. */}
          <div>
            <motion.h2
              variants={fadeUp}
              className="text-2xl sm:text-3xl font-bold text-[#023337] tracking-tight mb-2 text-balance"
            >
              You don&apos;t need to know what to search for
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-gray-500 leading-relaxed mb-6 max-w-md mx-auto lg:mx-0"
            >
              Snap a photo of what you want — Velte identifies it and checks
              real vendor stock nearby. Nothing here is invented.
            </motion.p>

            {/* Desktop-only CTA — same position/size/markup as before this
                change, inline under the paragraph in the copy column. */}
            <motion.div variants={fadeUp} className="hidden lg:block">
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 border border-orange-200 bg-orange-50 hover:border-orange-300 hover:bg-orange-100 text-orange-600 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
              >
                Try Velte yourself
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          </div>

          {/* Example turn — photo in, matched results out. Framed as an
              actual phone screenshot (device chrome, not a Velte surface —
              the dark bezel is a physical-device convention, same as any
              App Store mockup, not a break from the light-surface rule)
              rather than a flat card, so it reads as "here's the real
              product" instead of an abstract illustration of a chat. */}
          <motion.div
            variants={fadeUp}
            className="relative mx-auto w-full max-w-[290px] mb-8 lg:mb-0"
          >
            <div className="absolute -inset-x-6 top-10 bottom-0 bg-orange-400/[0.08] blur-[60px] rounded-full pointer-events-none" />

            <Link
              href="/chat"
              className="group relative block rounded-[2.75rem] bg-gray-900 p-2.5 shadow-2xl shadow-gray-900/20 ring-1 ring-black/5 hover:-translate-y-1 transition-transform"
            >
              {/* Side buttons — pure device chrome, decorative only */}
              <div className="absolute -left-[3px] top-24 w-[3px] h-8 bg-gray-800 rounded-l-sm" />
              <div className="absolute -left-[3px] top-36 w-[3px] h-12 bg-gray-800 rounded-l-sm" />
              <div className="absolute -right-[3px] top-32 w-[3px] h-16 bg-gray-800 rounded-r-sm" />

              <div
                ref={frameRef}
                className="relative bg-[#F1F5F9] rounded-[2.15rem] overflow-hidden aspect-[9/18.5]"
              >
                {/* Dynamic island */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[76px] h-[22px] bg-gray-900 rounded-full z-10" />

                {/* Status bar */}
                <div className="flex items-center justify-between px-6 pt-3.5 pb-1 text-[11px] font-semibold text-[#023337]">
                  <span>9:41</span>
                  <div className="flex items-center gap-1 text-[#023337]">
                    <CellSignalFull size={12} />
                    <WifiHigh size={12} />
                    <BatteryFull size={14} />
                  </div>
                </div>

                {/* App mini-header */}
                <div className="flex items-center gap-1.5 px-4 pt-2 pb-2.5 border-b border-gray-200/80">
                  <Image
                    src="/velte_ai_assistant.png"
                    alt="Velte"
                    width={20}
                    height={20}
                    className="rounded-full object-cover shrink-0"
                  />
                  <span className="text-[12px] font-bold text-[#023337]">
                    Velte
                  </span>
                  <span className="ml-auto text-[9px] font-medium text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                    velte.ng
                  </span>
                </div>

                {/* Conversation */}
                <div className="px-3 pt-3 pb-6">
                  <div className="flex justify-end mb-3">
                    <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-2xl rounded-br-md px-2.5 py-1.5">
                      <div className="w-7 h-7 rounded-lg bg-orange-200/50 flex items-center justify-center shrink-0">
                        <Camera size={12} className="text-orange-600" />
                      </div>
                      <p className="text-[10.5px] text-[#023337] font-medium">
                        [photo attached]
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <Image
                      src="/velte_ai_assistant.png"
                      alt=""
                      width={20}
                      height={20}
                      className="rounded-full object-cover shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0 bg-white rounded-2xl rounded-tl-md border border-gray-100 p-2.5 shadow-sm">
                      <p className="text-[10.5px] text-gray-600 leading-relaxed mb-2.5">
                        This looks like a structured leather bag — I found 2
                        similar options nearby.
                      </p>
                      <div className="space-y-1.5">
                        {EXAMPLE_RESULTS.map((r) => (
                          <div
                            key={r.name}
                            className="flex items-center justify-between gap-2 bg-[#F1F5F9] rounded-lg px-2 py-1.5"
                          >
                            <div className="min-w-0">
                              <p className="text-[9.5px] font-semibold text-gray-800 truncate">
                                {r.name}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] text-gray-400 truncate">
                                  {r.store}
                                </span>
                                <ShieldCheck
                                  size={8}
                                  className="text-orange-500 shrink-0"
                                />
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-[#023337] shrink-0">
                              {r.price}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* The real recording, layered directly on top of the
                    illustrated mockup above — it already IS a real iPhone
                    screen (dynamic island, status bar and all baked into
                    the footage itself), so it fully covers the illustrated
                    one once visible rather than needing to replace it in
                    the DOM. Starts transparent and fades in on
                    `onCanPlay` (not just "mounted") so there's never a
                    flash of a black/blank video frame — the mockup stays
                    the visible content underneath for the entire time the
                    clip is still fetching. */}
                {showVideo && (
                  <video
                    src={DEMO_VIDEO_URL}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="none"
                    onCanPlay={() => setVideoReady(true)}
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
                      videoReady ? "opacity-100" : "opacity-0",
                    )}
                  />
                )}
              </div>
            </Link>
          </motion.div>

          {/* Mobile-only CTA — larger and centered since it's this
              section's one visible CTA below `lg` (the desktop-only one
              above is `hidden` here). Started matched to the desktop
              version's smaller `text-sm/px-5` size, sized up the same day
              once it was standing alone below the phone instead of sitting
              inline next to copy. */}
          <motion.div variants={fadeUp} className="lg:hidden">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 border border-orange-200 bg-orange-50 hover:border-orange-300 hover:bg-orange-100 text-orange-600 font-semibold text-base px-7 py-3.5 rounded-lg transition-colors"
            >
              Try Velte yourself
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
