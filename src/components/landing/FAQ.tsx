"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { featuredFaqs } from "@/lib/faqs";
import FaqAccordionItem from "@/components/landing/FaqAccordionItem";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function FAQ() {
  return (
    <section className="relative bg-[#F1F5F9] border-t border-gray-200 py-20">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-10"
        >
          <motion.span
            variants={fadeUp}
            className="inline-block text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3"
          >
            Questions
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold text-[#023337] tracking-tight text-balance"
          >
            Frequently asked
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="space-y-3"
        >
          {featuredFaqs.map((faq, i) => (
            <motion.div key={faq.question} variants={fadeUp}>
              <FaqAccordionItem faq={faq} defaultOpen={i === 0} />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="text-center mt-8"
        >
          <Link
            href="/faq"
            className="inline-flex items-center gap-1.5 text-orange-600 font-semibold text-sm hover:text-orange-700 transition-colors"
          >
            View all FAQs
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
