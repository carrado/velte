"use client";

import { motion } from "motion/react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Briefcase, Mail } from "lucide-react";

export default function Careers() {
  return (
    <>
      <Navbar />
      <main className="bg-[#050d08] min-h-screen pt-24 pb-20">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(247,107,16,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(247,107,16,0.3) 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
            }}
          />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[rgb(247,107,16)]/[0.07] rounded-full blur-[120px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-5 sm:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6">
                Join the team
                <br />
                <span className="text-[rgb(247,107,16)]">
                  building the future of sales
                </span>
              </h1>
              <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
                We’re a remote‑first, passionate group of engineers, designers,
                and sales enthusiasts. Even if we don’t have a role that fits
                you right now, we’d love to hear from you.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Why join us */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-xs font-semibold tracking-widest text-[rgb(247,107,16)] uppercase mb-3 block">
              Why Velte
            </span>
            <h2 className="text-4xl font-bold text-white">
              A place where you can grow
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Remote‑First",
                desc: "Work from anywhere in the world.",
              },
              {
                title: "Competitive Compensation",
                desc: "Salary, equity, and great benefits.",
              },
              {
                title: "Impact from Day One",
                desc: "Your work reaches thousands of businesses.",
              },
              {
                title: "Learning Budget",
                desc: "$2,000/year for courses, conferences, books.",
              },
              {
                title: "Flexible Hours",
                desc: "Focus on outcomes, not hours.",
              },
              {
                title: "Inclusive Culture",
                desc: "We celebrate diverse perspectives.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-white font-semibold text-lg mb-2">
                  {item.title}
                </h3>
                <p className="text-white/50 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* No open positions */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[rgb(247,107,16)]/10 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-[rgb(247,107,16)]" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-3">
              No open positions right now
            </h3>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              But we’re always on the lookout for talented people. Drop us your
              resume and we’ll keep you in mind for future opportunities.
            </p>
            <a
              href="mailto:careers@velte.ai"
              className="inline-flex items-center gap-2 bg-[rgb(247,107,16)] hover:bg-[rgb(247,107,16)]/90 text-white font-semibold px-6 py-3 rounded-lg shadow-lg shadow-[rgba(247,107,16,0.25)] transition-colors"
            >
              <Mail className="w-4 h-4" />
              Send your resume
            </a>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
