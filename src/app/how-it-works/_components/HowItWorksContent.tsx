"use client";

import Link from "next/link";
import { motion } from "motion/react";
// Icons from Phosphor (2026-08-16, swapped from lucide-react for this
// session's pages only — see MobileMenu.tsx's comment). MessageCircle and
// Sparkles have no exact match; ChatCircle and Sparkle are their closest
// Phosphor equivalents.
import {
  ArrowRight,
  Camera,
  ChatCircle,
  Package,
  ShieldCheck,
  Sparkle,
  Users,
  Wallet,
} from "@phosphor-icons/react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Buyer steps mirror Hero.tsx's composer + VeluxShowcase's photo-search
// example — nothing claimed here that isn't already live product behavior.
const buyerSteps = [
  {
    icon: Camera,
    title: "Describe what you need",
    detail:
      "Type it in your own words, or snap a photo — Velux takes either one, same as the search box on the homepage.",
  },
  {
    icon: Sparkle,
    title: "Velux matches you to real vendors",
    detail:
      "Ranked by meaning, proximity and trust — never invented. If nothing real matches nearby, you're told that too.",
  },
  {
    icon: ChatCircle,
    title: "Chat directly, no middleman",
    detail:
      "You're handed straight to the vendor's chat to work out price and pickup yourselves — Velte doesn't sit in between.",
  },
];

// Vendor steps mirror RegisterCta's seller keeps and the pay-per-lead model
// described on /pricing — "free to list, pay only for a matched lead" is a
// real, current claim, not aspirational copy.
const vendorSteps = [
  {
    icon: Package,
    title: "List your products, free",
    detail:
      "No subscription, no listing fee to appear in buyer searches — see /pricing for the full breakdown.",
  },
  {
    icon: Users,
    title: "Get matched to real buyer requests",
    detail:
      "Velux sends you buyers already looking for what you sell nearby, plus requests posted directly to your store.",
  },
  {
    icon: Wallet,
    title: "Chat and close — pay only for real leads",
    detail:
      "Respond straight in WhatsApp. You're only charged when we send a genuine, matched lead, from your wallet.",
  },
];

function StepList({
  steps,
}: {
  steps: { icon: React.ElementType; title: string; detail: string }[];
}) {
  return (
    <div className="space-y-5">
      {steps.map(({ icon: Icon, title, detail }, i) => (
        <motion.div
          key={title}
          variants={fadeUp}
          className="flex gap-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >
          <div className="shrink-0">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-1.5">
              <Icon className="w-4.5 h-4.5 text-orange-500" />
            </div>
            <p className="text-[11px] font-bold text-gray-300 text-center">
              {String(i + 1).padStart(2, "0")}
            </p>
          </div>
          <div className="pt-0.5">
            <p className="text-[15px] font-bold text-[#023337] mb-1">{title}</p>
            <p className="text-sm text-gray-500 leading-relaxed">{detail}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function HowItWorksContent() {
  return (
    <>
      <Navbar />
      <main className="bg-[#F1F5F9] min-h-screen pt-24 sm:pt-28 pb-20">
        <section className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center mb-14 sm:mb-16">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.span
              variants={fadeUp}
              className="inline-block text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3"
            >
              How it works
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#023337] tracking-tight text-balance mb-4"
            >
              Two sides. Same rule: nothing invented.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-gray-500 leading-relaxed max-w-xl mx-auto"
            >
              Whether you&apos;re finding something or selling it, every step
              below is what actually happens on Velte today — not a roadmap.
            </motion.p>
          </motion.div>
        </section>

        <section className="max-w-5xl mx-auto px-5 sm:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid lg:grid-cols-2 gap-10 lg:gap-14"
          >
            <div>
              <motion.h2
                variants={fadeUp}
                className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4"
              >
                For buyers
              </motion.h2>
              <StepList steps={buyerSteps} />
              <motion.div variants={fadeUp} className="mt-5">
                <Link
                  href="/velux"
                  className="inline-flex items-center gap-1.5 text-orange-600 font-semibold text-sm hover:text-orange-700 transition-colors"
                >
                  Try Velux yourself
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            </div>

            <div>
              <motion.h2
                variants={fadeUp}
                className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4"
              >
                For businesses
              </motion.h2>
              <StepList steps={vendorSteps} />
            </div>
          </motion.div>
        </section>

        <section className="max-w-3xl mx-auto px-5 sm:px-8 mt-16 sm:mt-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-[#023337] text-xs font-medium px-3 py-1.5 rounded-full shadow-sm mb-5">
              <ShieldCheck className="w-3 h-3 text-orange-500" />
              Every match comes straight from the database — never invented
            </div>
            <div>
              <Link
                href="/join"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-[15px] font-semibold shadow-lg shadow-orange-500/20 transition-colors"
              >
                Join Velte
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
