"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Play,
  CheckCircle2,
  CreditCard,
  Search,
} from "lucide-react";
import Link from "next/link";

const chatMessages = [
  { from: "customer" as const, text: "Hi! Do you have Air Jordan 1 in size 42?" },
  {
    from: "agent" as const,
    text: "Hey! Yes, available in Chicago Red & White and Black/White 🎉\n\nCurrently $189. Want more details?",
  },
  { from: "customer" as const, text: "Can you do $160?" },
  {
    from: "agent" as const,
    text: "I can go $168 with free express shipping — our best offer today! 🚀\n\nWant me to send a payment link?",
  },
  { from: "customer" as const, text: "Deal! Yes please 👍" },
  {
    from: "agent" as const,
    text: "Awesome! Secure payment link ready 👇\n\npay.velte.ai/order-7291\n\nValid for 24 hours ✅",
  },
];

function ChatMockup() {
  return (
    <div className="relative w-full max-w-[340px] mx-auto lg:mx-0">
      {/* Glow behind phone */}
      <div className="absolute inset-0 bg-[rgb(247,107,16)]/10 rounded-3xl blur-2xl scale-110" />

      {/* Phone */}
      <div className="relative bg-[#0d1b12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #128C7E, #0a6d60)" }}
        >
          <div className="w-9 h-9 rounded-full bg-emerald-200 flex items-center justify-center text-[#128C7E] font-bold text-xs shrink-0">
            AI
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-none">
              Velte Sales Agent
            </p>
            <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Online now
            </p>
          </div>
        </div>

        {/* Messages */}
        <div
          className="px-3 py-4 space-y-2.5 h-[320px] overflow-hidden"
          style={{ background: "#0b1710" }}
        >
          {chatMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.6 + i * 0.18 }}
              className={`flex ${
                msg.from === "customer" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[82%] px-3 py-2 text-[11px] leading-relaxed ${
                  msg.from === "customer"
                    ? "bg-[#005c4b] text-white rounded-2xl rounded-tr-sm"
                    : "bg-[#1c2e1f] text-white/85 rounded-2xl rounded-tl-sm border border-white/[0.05]"
                }`}
              >
                {msg.text.split("\n").map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < msg.text.split("\n").length - 1 && <br />}
                  </span>
                ))}
                <div className="flex justify-end mt-0.5">
                  <span className="text-white/25 text-[9px]">
                    {msg.from === "agent" ? "Velte AI  " : ""}✓✓
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input bar */}
        <div className="bg-[#0d1b12] border-t border-white/[0.06] px-3 py-2.5 flex items-center gap-2">
          <div className="flex-1 bg-[#1c2e1f] rounded-full px-4 py-1.5 text-[11px] text-white/30">
            Type a message...
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 1.4 }}
        className="absolute -left-4 top-[28%] hidden sm:flex items-center gap-2 bg-[#0d2018] border border-[rgb(247,107,16)]/25 rounded-xl px-3 py-2 shadow-xl"
      >
        <Search className="w-3.5 h-3.5 text-[rgb(247,107,16)] shrink-0" />
        <span className="text-white text-[11px] font-medium whitespace-nowrap">
          Inventory checked ✓
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 1.8 }}
        className="absolute -right-4 bottom-[22%] hidden sm:flex items-center gap-2 bg-[#0d2018] border border-[rgb(247,107,16)]/25 rounded-xl px-3 py-2 shadow-xl"
      >
        <CreditCard className="w-3.5 h-3.5 text-[rgb(247,107,16)] shrink-0" />
        <span className="text-white text-[11px] font-medium whitespace-nowrap">
          Sale closed 🎉
        </span>
      </motion.div>
    </div>
  );
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#050d08]">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(rgba(247,107,16,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(247,107,16,0.6) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Gradient glows */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[rgb(247,107,16)]/[0.12] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[320px] h-[320px] bg-[rgb(247,107,16)]/[0.08] rounded-full blur-[80px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-28 pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Left */}
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 bg-[rgb(247,107,16)]/[0.1] border border-[rgb(247,107,16)]/[0.2] text-[rgb(247,107,16)] text-xs font-semibold px-3.5 py-1.5 rounded-full mb-7 tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-[rgb(247,107,16)] animate-pulse" />
                AI-Powered WhatsApp Sales Automation
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[2.8rem] lg:text-[3.4rem] font-bold text-white leading-[1.1] tracking-tight mb-6 text-balance"
            >
              Turn WhatsApp Into Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[rgb(247,107,16)] via-[rgb(255,140,50)] to-[rgb(255,180,90)]">
                Smartest Sales Rep
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg text-white/55 mb-8 leading-relaxed max-w-lg"
            >
              Deploy an intelligent AI agent on your WhatsApp Business number that
              answers product questions, negotiates prices, checks inventory, and
              closes sales — 24 hours a day, 7 days a week.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-3 mb-10"
            >
              <Link href="/sign-in">
                <Button
                  size="lg"
                  className="bg-[rgb(247,107,16)] cursor-pointer hover:bg-[rgb(247,107,16)]/90 text-white shadow-xl shadow-[rgb(247,107,16)]/25 text-[15px] px-8 gap-2 h-12 w-full sm:w-auto"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="ghost"
                className="text-white/70 cursor-pointer hover:text-white hover:bg-white/[0.08] text-[15px] gap-2.5 h-12 border border-white/10"
              >
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                  <Play className="w-3 h-3 fill-white" />
                </div>
                Watch Demo
              </Button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/40"
            >
              {["No credit card required", "5-minute setup", "Cancel anytime"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[rgb(247,107,16)]" />
                    {item}
                  </span>
                )
              )}
            </motion.div>
          </motion.div>

          {/* Right — chat mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
            className="flex justify-center lg:justify-end pr-0 lg:pr-6"
          >
            <ChatMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}