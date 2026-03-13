"use client";

import { motion } from "motion/react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Target, Heart, Users, Globe } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Customer‑First",
    description: "Every feature we build starts with a real customer need.",
  },
  {
    icon: Heart,
    title: "Transparency",
    description: "We’re open about our roadmap, pricing, and challenges.",
  },
  {
    icon: Users,
    title: "Empowerment",
    description: "We give businesses the tools to compete with enterprises.",
  },
  {
    icon: Globe,
    title: "Global Mindset",
    description: "Serving businesses in over 30 languages from day one.",
  },
];

export default function About() {
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
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[rgb(247,107,16)]/[0.07] rounded-full blur-[120px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-5 sm:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6">
                We’re on a mission to
                <br />
                <span className="text-[rgb(247,107,16)]">
                  automate sales, not relationships.
                </span>
              </h1>
              <p className="text-white/60 text-lg max-w-3xl mx-auto leading-relaxed">
                Velte was founded to free up human sales teams from repetitive
                questions, so they can focus on building genuine connections and
                closing complex deals.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Our Story */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-24">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-xs font-semibold tracking-widest text-[rgb(247,107,16)] uppercase mb-3 block">
                Our story
              </span>
              <h2 className="text-4xl font-bold text-white mb-6">
                A simple insight that changed everything
              </h2>
              <p className="text-white/60 leading-relaxed mb-4">
                Every day, sales teams around the world spend hours answering
                the same product questions on WhatsApp. Stock checks, price
                inquiries, follow‑ups. It’s repetitive, draining, and steals
                time from building real customer relationships.
              </p>
              <p className="text-white/60 leading-relaxed mb-4">
                One evening, a small team of developers built a prototype: a bot
                that could instantly check inventory and reply to customers. The
                next morning, the sales team had saved five hours. Within a
                week, fifteen.
              </p>
              <p className="text-white/60 leading-relaxed mb-4">
                That prototype became Velte. We are on a mission to serve
                hundreds and millions of businesses across the world —
                automating millions of conversations and freeing teams to focus
                on what really matters.
              </p>
              <p className="text-white/60 leading-relaxed">
                And we’re just getting started.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative h-96 rounded-2xl overflow-hidden border border-white/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(247,107,16)]/20 to-transparent" />
              <img
                src="/kobu-agency-7okkFhxrxNw-unsplash.jpg" // Replace with actual image
                alt="Velte team working"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </section>

        {/* Values */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-xs font-semibold tracking-widest text-[rgb(247,107,16)] uppercase mb-3 block">
              What we believe
            </span>
            <h2 className="text-4xl font-bold text-white">Our core values</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-[rgb(247,107,16)]/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-[rgb(247,107,16)]" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {value.title}
                  </h3>
                  <p className="text-white/50 text-sm">{value.description}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-[rgb(247,107,16)]/[0.08] to-transparent border border-[rgb(247,107,16)]/20 rounded-3xl p-12 text-center"
          >
            <h3 className="text-3xl font-bold text-white mb-4">
              Ready to automate your WhatsApp sales?
            </h3>
            <p className="text-white/60 mb-6 max-w-xl mx-auto">
              Join hundreds of businesses that have already transformed their
              sales process.
            </p>
            <a
              href="/sign-in"
              className="inline-block bg-[rgb(247,107,16)] hover:bg-[rgb(247,107,16)]/90 text-white font-semibold px-8 py-3 rounded-lg shadow-lg shadow-[rgba(247,107,16,0.25)] transition-colors"
            >
              Start Free Trial
            </a>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
