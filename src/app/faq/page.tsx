"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import FaqAccordionItem from "@/components/landing/FaqAccordionItem";
import { Button } from "@/components/ui/button";
import { faqs } from "@/lib/faqs";

const buyerFaqs = faqs.filter((faq) => faq.category === "buyer");
const vendorFaqs = faqs.filter((faq) => faq.category === "vendor");

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function FaqGroup({ label, items }: { label: string; items: typeof faqs }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={stagger}
    >
      <motion.span
        variants={fadeUp}
        className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-4 block"
      >
        {label}
      </motion.span>
      <div className="space-y-3">
        {items.map((faq) => (
          <motion.div key={faq.question} variants={fadeUp}>
            <FaqAccordionItem faq={faq} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default function FaqPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#F1F5F9] min-h-screen pt-24 pb-20">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
            }}
          />
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-orange-500/[0.07] rounded-full blur-[120px] pointer-events-none" />

          <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center pb-14">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl lg:text-5xl font-bold text-[#023337] mb-5 text-balance">
                Frequently asked questions
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed">
                Everything buyers and vendors ask before they get started on
                Velte.
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQ groups */}
        <section className="max-w-3xl mx-auto px-5 sm:px-8 space-y-14">
          <FaqGroup label="For buyers" items={buyerFaqs} />
          <FaqGroup label="For vendors" items={vendorFaqs} />
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 mt-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-orange-500/[0.08] to-transparent border border-orange-500/20 rounded-3xl p-12 text-center"
          >
            <h3 className="text-3xl font-bold text-[#023337] mb-4 text-balance">
              Still have a question?
            </h3>
            <p className="text-gray-500 mb-6 max-w-xl mx-auto">
              Try Velte as a buyer, list your business, or reach out directly —
              we&apos;re happy to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/search">
                <Button
                  size="lg"
                  className="bg-orange-500 cursor-pointer hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 gap-2 h-12 w-full sm:w-auto"
                >
                  AI Search
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-gray-700 cursor-pointer hover:bg-gray-100 border-gray-300 h-12 w-full sm:w-auto"
                >
                  Contact us
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
