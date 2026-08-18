"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { homepageFaqs } from "@/lib/faqs";
import FaqAccordionItem from "@/components/landing/FaqAccordionItem";
import type { FaqSectionImage } from "@/types/common";
import { ArrowRightIcon } from "@/components/icons";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Photo credit: Michael Umoh / Unsplash (unsplash.com/photos/s8KvpUV65sY) —
// a woman browsing a clothing shop, Lagos. Unsplash's license doesn't
// require attribution, but it's kept here for maintainability.
const image: FaqSectionImage = {
  src: "https://images.unsplash.com/photo-1751276651319-d311a9d0b8af",
  alt: "Woman browsing a clothing store in Lagos, Nigeria",
  credit: "Michael Umoh",
};

export default function FAQ() {
  return (
    <section className="relative bg-[#F1F5F9] border-t border-gray-200 py-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-14 items-start"
        >
          {/* Photo — `hidden lg:block` (was `sm:block`, mismatched against
              the grid's own `lg:grid-cols-...`): between sm and lg the
              photo used to show at full width, stacked above the questions
              in a single column, since the grid hadn't gone two-column yet
              — a visibly different, un-intended layout in that range.
              Matching both to the same breakpoint means the photo is either
              hidden (mobile) or correctly side-by-side (lg+), never
              stacked full-width on its own. `items-start` on the parent
              grid (was `items-center`) keeps this pinned to the top of the
              row — with items-center, it visibly drifted up/down as the
              questions column's own height changed (a real FAQ item is
              open by default, and each one is a genuine height animation,
              not a fixed truncation — see FaqAccordionItem.tsx). */}
          <motion.div
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-[3/4] shadow-xl shadow-gray-300/40 hidden lg:block"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(min-width: 1024px) 480px, 600px"
              quality={90}
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-white text-sm font-semibold">
                Real vendors, real stores
              </p>
              <p className="text-white/70 text-xs mt-0.5">
                Every result on Velte comes from an actual business nearby
              </p>
            </div>
          </motion.div>

          {/* Questions */}
          <div>
            <motion.div variants={fadeUp} className="mb-8">
              <span className="inline-block text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3">
                Questions
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#023337] tracking-tight text-balance">
                Frequently asked
              </h2>
            </motion.div>

            <div className="space-y-3">
              {homepageFaqs.map((faq, i) => (
                <motion.div key={faq.question} variants={fadeUp}>
                  <FaqAccordionItem faq={faq} defaultOpen={i === 0} />
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeUp} className="mt-8">
              {/* Bumped from a bare text+arrow link to a bordered button
                  (2026-08-16) — same treatment as VeluxShowcase's "Try
                  Velte yourself" (see that file's own comment): started
                  matched to MarketplacePreview/VendorsPreview's `border-2
                  border-orange-500`, then toned down to a lighter 1px
                  border the same day since 2px orange-500 read too bold
                  for a secondary link at this size. */}
              <Link
                href="/faq"
                className="inline-flex items-center gap-1.5 border border-orange-200 bg-orange-50 hover:border-orange-300 hover:bg-orange-100 text-orange-600 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
              >
                View all FAQs
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
