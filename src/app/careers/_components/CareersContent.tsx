"use client";

import { motion } from "motion/react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { BriefcaseIcon, MailIcon } from "@/components/icons";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Honest, general statements only — no invented dollar figures, "equity,"
// or named-benefit claims. The previous version of this page ("$2,000/year
// for courses," "Salary, equity, and great benefits") read as unedited
// template boilerplate that never got checked against reality — the exact
// thing every other page on this site is careful never to do (see About's
// own "no fabricated numbers" comment). Four confident, true statements
// beat six generic ones padded out with a claim nobody verified.
const values = [
  {
    title: "Remote, genuinely",
    detail:
      "Work from wherever you're actually good — we care about the work, not a desk.",
  },
  {
    title: "Small team, real reach",
    detail:
      "No big org chart to get lost in — what you ship reaches real buyers and vendors within days, not quarters.",
  },
  {
    title: "Nothing invented — including here",
    detail:
      "The same rule that keeps Velte's search honest applies to how we hire: no fabricated perks, no roles that don't exist.",
  },
  {
    title: "Outcomes, not hours",
    detail:
      "We judge the work that gets shipped, not the hours logged getting there.",
  },
];

export default function CareersContent() {
  return (
    <>
      {/* forceOpaque — this page's dark bg-[#023337] hero starts at y=0,
          so Navbar's default transparent-until-scrolled state (built
          assuming light content behind it) made its own text/logo hard to
          read here before the first scroll. See Navbar's own comment. */}
      <Navbar forceOpaque />
      <main className="bg-[#023337] min-h-screen pt-28 sm:pt-32 pb-24">
        {/* Hero — the one page of the five that goes dark, on purpose:
            "building the future of sales"-style boilerplate needed a
            distinctive frame too, and a confident dark panel reads as
            "this is a real, serious company" without needing a stock
            team photo we don't have. */}
        <section className="max-w-3xl mx-auto px-5 sm:px-8 mb-20 sm:mb-28">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.span
              variants={fadeUp}
              className="inline-block text-xs font-semibold tracking-widest text-orange-400 uppercase mb-4"
            >
              Careers at Velte
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight text-balance mb-6"
            >
              We&apos;re small, honest about it, and building something real.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-white/60 text-lg leading-relaxed max-w-xl"
            >
              No open roles right now — but if the way we work below sounds like
              you, we&apos;d genuinely rather hear from you early than post a
              job later.
            </motion.p>
          </motion.div>
        </section>

        {/* Manifesto — large index numbers instead of an icon-card grid
            (About already owns that pattern for its own values section);
            this page's differentiator is confident, oversized typography. */}
        <section className="max-w-3xl mx-auto px-5 sm:px-8 mb-20 sm:mb-28">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="divide-y divide-white/10"
          >
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                variants={fadeUp}
                className="flex items-start gap-6 sm:gap-10 py-8 sm:py-10"
              >
                <span className="text-4xl sm:text-5xl font-bold text-white/15 tabular-nums shrink-0 pt-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    {value.title}
                  </h3>
                  <p className="text-white/60 leading-relaxed max-w-md">
                    {value.detail}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* No open positions */}
        <section className="max-w-2xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white/[0.04] border border-white/10 rounded-3xl p-10 sm:p-12 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-orange-500/15 flex items-center justify-center mx-auto mb-5">
              <BriefcaseIcon className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              No open positions right now
            </h3>
            <p className="text-white/60 mb-7 max-w-sm mx-auto leading-relaxed">
              But we keep every note people send us — reach out and tell us what
              you&apos;d want to work on.
            </p>
            <a
              href="mailto:hello@velte.ng?subject=Interested%20in%20working%20at%20Velte"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-full shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <MailIcon className="w-4 h-4" />
              Say hello
            </a>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
