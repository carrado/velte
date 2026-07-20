"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { featuredFaqs } from "@/lib/faqs";
import FaqAccordionItem from "@/components/landing/FaqAccordionItem";
import type { FaqSectionImage } from "@/types/common";

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
          className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-14 items-center"
        >
          {/* Photo */}
          <motion.div
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-[3/4] shadow-xl shadow-gray-300/40 hidden sm:block"
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
              {featuredFaqs.map((faq, i) => (
                <motion.div key={faq.question} variants={fadeUp}>
                  <FaqAccordionItem faq={faq} defaultOpen={i === 0} />
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeUp} className="mt-8">
              <Link
                href="/faq"
                className="inline-flex items-center gap-1.5 text-orange-600 font-semibold text-sm hover:text-orange-700 transition-colors"
              >
                View all FAQs
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
