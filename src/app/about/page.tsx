"use client";
/* eslint-disable @next/next/no-img-element */

import { motion } from "motion/react";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Database, Search, Store, MapPin, ArrowRight } from "lucide-react";

const values = [
  {
    icon: Database,
    title: "Real Data Only",
    description:
      "Our AI never invents a vendor, price, or stock level — every result comes straight from the database.",
  },
  {
    icon: Search,
    title: "Buyer‑First",
    description:
      "Describe what you need in your own words or a photo — we do the matching, not you.",
  },
  {
    icon: Store,
    title: "Vendor Empowerment",
    description:
      "Any real business is discoverable, listing fee or ad budget optional.",
  },
  {
    icon: MapPin,
    title: "Proximity & Trust",
    description:
      "The nearest genuine match wins — not whoever paid for placement.",
  },
];

export default function About() {
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

          <div className="relative max-w-7xl mx-auto px-5 sm:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl lg:text-6xl font-bold text-[#023337] mb-6">
                We’re on a mission to help buyers
                <br />
                <span className="text-orange-500">
                  find who actually has it.
                </span>
              </h1>
              <p className="text-gray-500 text-lg max-w-3xl mx-auto leading-relaxed">
                Velte was built so a buyer can describe what they need — in
                words or a photo — and get matched against real, nearby vendor
                inventory by meaning, proximity, and trust. No stale listings,
                no invented data — just the nearest real match.
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
              <span className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3 block">
                Our story
              </span>
              <h2 className="text-4xl font-bold text-[#023337] mb-6">
                Finding a real vendor shouldn’t be a guessing game
              </h2>
              <p className="text-gray-500 leading-relaxed mb-4">
                Search online for almost anything and you’ll find outdated
                listings, dead links, and ads for products no one actually has
                in stock. Meanwhile, real vendors — the ones a few streets away
                with exactly what you need — stay invisible because they don’t
                have the budget or the time to compete for attention.
              </p>
              <p className="text-gray-500 leading-relaxed mb-4">
                Velte closes that gap. A buyer describes what they need — in
                plain language or a photo — and our AI matches it against real
                vendor inventory by meaning, proximity, and trust, then hands
                the conversation directly to the vendor. No ads, no bidding, no
                invented listings — the model translates, the data decides.
              </p>
              <p className="text-gray-500 leading-relaxed">
                We’re starting with one city, one category at a time — and
                growing from there.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative h-96 rounded-2xl overflow-hidden border border-gray-200"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent" />
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
            <span className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3 block">
              What we believe
            </span>
            <h2 className="text-4xl font-bold text-[#023337]">
              Our core values
            </h2>
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
                  className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-[#023337] font-semibold text-lg mb-2">
                    {value.title}
                  </h3>
                  <p className="text-gray-500 text-sm">{value.description}</p>
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
            className="bg-gradient-to-br from-orange-500/[0.08] to-transparent border border-orange-500/20 rounded-3xl p-12 text-center"
          >
            <h3 className="text-3xl font-bold text-[#023337] mb-4">
              Looking for something, or have something to sell?
            </h3>
            <p className="text-gray-500 mb-6 max-w-xl mx-auto">
              Try Velte as a buyer, or list your business so nearby buyers can
              find you.
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
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-gray-700 cursor-pointer hover:bg-gray-100 border-gray-300 h-12 w-full sm:w-auto"
                >
                  List your business
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
