"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { faqs } from "@/lib/faqs";
import FaqCard from "@/components/faq/FaqCard";
import FaqTabs, { type FaqTabKey } from "@/components/faq/FaqTabs";
import FaqCountUp from "@/components/faq/FaqCountUp";
import FaqHeroVisual from "@/components/faq/FaqHeroVisual";
import { ArrowRightIcon, SearchIcon, SearchXIcon } from "@/components/icons";

// 2026-08-17: first pass at this session's About/How It Works/Blog/FAQ/
// Careers redesign left this page's implementation untouched (it was
// already the richest of the five — word-by-word 3D hero, FaqCountUp,
// FaqHeroVisual, tabs, conic-spin CTA — so the other four changed to stop
// overlapping with it). That wasn't actually what was asked for, though —
// "redesign all five" meant this one too. Second pass: kept the hero
// headline animation, dot-grid/glow backdrop, count-up stat, and
// conic-spin CTA (still nothing else on the site uses that combination),
// but added a real new capability — live text search across all 20
// questions, not just the two category tabs — and rebuilt the two
// subcomponents that WERE quietly duplicating other pages: FaqTabs' pill
// toggle (now How It Works' signature — see that file) is an underline
// indicator here instead, and FaqHeroVisual's tilted-photo treatment (now
// About's signature) is a floating FAQ-card-stack mockup previewing this
// page's own content instead of borrowed photography.
const headline = "Questions? We've got answers.";

const wordContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.1 } },
};

const wordUp = {
  hidden: { opacity: 0, y: 26, rotateX: -40 },
  show: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

const counts: Record<FaqTabKey, number> = {
  all: faqs.length,
  buyer: faqs.filter((f) => f.category === "buyer").length,
  vendor: faqs.filter((f) => f.category === "vendor").length,
};

export default function FaqContent() {
  const [tab, setTab] = useState<FaqTabKey>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const byTab =
      tab === "all" ? faqs : faqs.filter((faq) => faq.category === tab);
    const q = query.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter(
      (faq) =>
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q),
    );
  }, [tab, query]);

  return (
    <>
      <Navbar />
      <main className="bg-[#F1F5F9] min-h-screen pt-24 pb-20">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
              maskImage:
                "radial-gradient(ellipse 70% 60% at 50% 20%, black, transparent)",
            }}
          />
          <motion.div
            animate={{ x: [0, 26, 0], y: [0, -18, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 left-1/4 w-96 h-96 bg-orange-500/[0.1] rounded-full blur-[120px] pointer-events-none"
          />
          <motion.div
            animate={{ x: [0, -22, 0], y: [0, 20, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-24 right-1/4 w-80 h-80 bg-orange-400/[0.08] rounded-full blur-[110px] pointer-events-none"
          />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pb-10 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
            <div className="text-center lg:text-left">
              <motion.h1
                initial="hidden"
                animate="show"
                variants={wordContainer}
                style={{ perspective: 800 }}
                className="text-4xl lg:text-5xl xl:text-6xl font-bold text-[#023337] mb-5 text-balance tracking-tight flex flex-wrap justify-center lg:justify-start gap-x-3"
              >
                {headline.split(" ").map((word, i) => {
                  const isLast = i === headline.split(" ").length - 1;
                  return (
                    <motion.span
                      key={`${word}-${i}`}
                      variants={wordUp}
                      className={
                        isLast
                          ? "text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500"
                          : undefined
                      }
                    >
                      {word}
                    </motion.span>
                  );
                })}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="text-gray-500 text-lg leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0"
              >
                Everything buyers and vendors ask before they get started on
                Velte.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="flex items-center justify-center lg:justify-start gap-2 text-xs text-gray-400 font-medium mb-8"
              >
                <span className="text-[#023337] font-bold">
                  <FaqCountUp value={counts.all} />
                </span>
                answers across
                <span className="text-[#023337] font-bold">2</span>
                categories
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="relative mb-5 max-w-sm mx-auto lg:mx-0"
              >
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a question…"
                  className="w-full h-11 pl-10 pr-4 rounded-full bg-white border border-gray-200 text-sm text-[#023337] placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55 }}
                className="flex justify-center lg:justify-start"
              >
                <FaqTabs active={tab} onChange={setTab} counts={counts} />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <FaqHeroVisual tab={tab} />
            </motion.div>
          </div>
        </section>

        {/* FAQ list */}
        <section className="max-w-3xl mx-auto px-5 sm:px-8 mt-4">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center py-16"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                <SearchXIcon className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-[#023337] font-semibold mb-1">
                No matches for &ldquo;{query}&rdquo;
              </p>
              <p className="text-gray-400 text-sm">
                Try a different word, or ask Velte directly below.
              </p>
            </motion.div>
          ) : (
            <motion.div layout className="grid gap-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((faq, i) => (
                  <FaqCard
                    key={`${faq.category}-${faq.question}`}
                    faq={faq}
                    index={i}
                    defaultOpen={i === 0 && !query}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 mt-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative rounded-3xl p-[1px] overflow-hidden"
          >
            <div
              className="absolute -inset-[60%] animate-spin-slow opacity-70"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0%, rgba(249,115,22,0.5) 12%, transparent 24%)",
              }}
            />
            <div className="relative bg-gradient-to-br from-orange-500/[0.08] to-[#F1F5F9] rounded-3xl p-12 text-center">
              <h3 className="text-3xl font-bold text-[#023337] mb-4 text-balance">
                Still have a question?
              </h3>
              <p className="text-gray-500 mb-6 max-w-xl mx-auto">
                Describe what you&apos;re looking for, list your business, or
                reach out directly — we&apos;re happy to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {/* Was "Browse Products" → /marketplace, and a separate
                    AskVeluxButton chip below this row pointing at the same
                    /chat destination — that path isn't promoted anywhere on
                    the site anymore (see Footer.tsx's own comment on why
                    /marketplace stopped being linked from navigation), and
                    the duplicate link was redundant once this button
                    pointed at /chat directly instead. */}
                <Link href="/chat">
                  <Button
                    size="lg"
                    className="bg-orange-500 cursor-pointer hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 gap-2 h-12 w-full sm:w-auto transition-transform hover:scale-[1.03] active:scale-[0.98]"
                  >
                    Ask Velte
                    <ArrowRightIcon className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-gray-700 cursor-pointer hover:bg-gray-100 border-gray-300 h-12 w-full sm:w-auto transition-transform hover:scale-[1.03] active:scale-[0.98]"
                  >
                    Contact us
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
