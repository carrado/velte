"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { blogPosts } from "@/lib/blog";
import { ArrowRightIcon, ArrowUpRightIcon } from "@/components/icons";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

// Redesigned 2026-08-17 — the only one of the five relaunched pages this
// session with an editorial, photography-led identity rather than a
// marketing-pitch one (see [[custom_icon_system]] siblings About/
// HowItWorks/FAQ/Careers for the others — deliberately none of them share
// this page's visual language: no dot-grid backdrop, no glow blobs, no
// conic-gradient CTA card). A magazine issue grid, not a card-with-icon
// pattern, because this page's job is genuinely different from the rest:
// it's the one surface on the site that isn't selling anything, just
// reading. Grid (not one giant hero + a list below) because there are only
// two posts today — a single dominant hero would make the second post feel
// like an afterthought; this scales cleanly as more posts are added later
// (grid just wraps a third card onto its own row).
export default function BlogIndexContent() {
  const sorted = [...blogPosts].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );

  return (
    <>
      <Navbar />
      <main className="bg-white min-h-screen pt-28 sm:pt-32 pb-24">
        <header className="max-w-5xl mx-auto px-5 sm:px-8 mb-14 sm:mb-16">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.span
              variants={fadeUp}
              className="text-xs font-semibold tracking-[0.2em] text-orange-500 uppercase mb-4 block"
            >
              The Velte Journal
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#023337] tracking-tight text-balance mb-5 max-w-2xl"
            >
              Guides for buying and selling, written plainly.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-gray-500 text-lg leading-relaxed max-w-lg"
            >
              Real, practical writing for buyers and small-business vendors in
              Nigeria — no filler, no recycled listicles.
            </motion.p>
          </motion.div>
        </header>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="max-w-5xl mx-auto px-5 sm:px-8 grid sm:grid-cols-2 gap-6 sm:gap-8"
        >
          {sorted.map((post, i) => (
            <motion.div key={post.slug} variants={fadeUp}>
              <Link href={`/blog/${post.slug}`} className="group block">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 mb-5">
                  {post.image && (
                    <Image
                      src={post.image.src}
                      alt={post.image.alt}
                      fill
                      sizes="(min-width: 640px) 45vw, 90vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  {post.category && (
                    <span className="absolute top-4 left-4 inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-700 shadow-sm">
                      {post.category}
                    </span>
                  )}
                  <span className="absolute top-4 right-4 text-[11px] font-bold text-white/90 tracking-widest">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <span>{fmtDate(post.publishedAt)}</span>
                  <span aria-hidden>·</span>
                  <span>{post.readingTime}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#023337] leading-snug mb-2 text-balance">
                  {post.title}
                </h2>
                <p className="text-gray-500 leading-relaxed mb-3 line-clamp-2">
                  {post.dek}
                </p>
                <span className="inline-flex items-center gap-1.5 text-orange-600 font-semibold text-sm">
                  Read the guide
                  <ArrowRightIcon className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Understated closing line, not a glossy CTA card — this page is
            for reading, so it signs off the way an article does rather than
            pitching the next click. */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto px-5 sm:px-8 mt-20 pt-10 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <p className="text-gray-500">
            Have a question we haven&apos;t written about yet?
          </p>
          <Link
            href="/faq"
            className="inline-flex items-center gap-1.5 text-[#023337] font-semibold text-sm hover:text-orange-600 transition-colors"
          >
            Browse the FAQ
            <ArrowUpRightIcon className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </main>
      <Footer />
    </>
  );
}
