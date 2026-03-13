"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function CallToAction() {
  return (
    <section className="bg-[#050d08] py-24 lg:py-32 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[rgb(247,107,16)]/[0.08] rounded-full blur-[120px] pointer-events-none" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(247,107,16,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(247,107,16,0.6) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-5 sm:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[rgb(247,107,16)]/10 border border-[rgb(247,107,16)]/20 mb-8">
            <MessageCircle className="w-7 h-7 text-[rgb(247,107,16)]" />
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight mb-6 text-balance">
            Ready to let AI close
            <br />
            deals while you sleep?
          </h2>

          <p className="text-lg text-white/50 mb-10 max-w-xl mx-auto">
            Join hundreds of businesses using Velte to automate WhatsApp sales.
            Set up in minutes, see results on day one.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-in">
              <Button
                size="lg"
                className="bg-[rgb(247,107,16)] hover:bg-[rgb(247,107,16)]/90 text-white shadow-xl shadow-[rgba(247,107,16,0.3)] text-[15px] px-10 h-12 gap-2"
              >
                Start Your Free Trial
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="ghost"
              className="text-white/60 hover:text-white hover:bg-white/[0.06] border border-white/10 text-[15px] h-12 px-8"
            >
              Talk to Sales
            </Button>
          </div>

          <p className="text-white/30 text-sm mt-6">
            14-day free trial · No credit card required · Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
}
