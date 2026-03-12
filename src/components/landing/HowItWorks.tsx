"use client"

import { motion } from "motion/react";
import { PhoneCall, Upload, Zap } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: PhoneCall,
    title: "Connect Your WhatsApp Number",
    description:
      "Link your existing WhatsApp Business number to Velte in under 5 minutes. No technical knowledge required — just scan a QR code.",
    note: "Works with any WhatsApp Business account",
  },
  {
    number: "02",
    icon: Upload,
    title: "Upload Your Product Catalog",
    description:
      "Import your products, pricing, stock levels, and negotiation rules. Velte learns your catalog and brand voice instantly.",
    note: "CSV, Excel, or Shopify sync supported",
  },
  {
    number: "03",
    icon: Zap,
    title: "Go Live and Start Closing",
    description:
      "Your AI agent is live 24/7 — handling inquiries, negotiating deals, checking inventory, and sending payment links automatically.",
    note: "Real-time dashboard from day one",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#f7fbf8] py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 uppercase mb-4">
            Simple setup
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-950 tracking-tight mb-5 text-balance">
            Up and selling in 15 minutes
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            No developers, no complex integrations. Three steps and your AI agent is live.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-14 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent" />

          <div className="grid lg:grid-cols-3 gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="relative text-center lg:text-left"
                >
                  {/* Icon circle */}
                  <div className="relative inline-flex mb-7 lg:block">
                    <div className="w-[56px] h-[56px] rounded-2xl bg-white border-2 border-emerald-100 shadow-md shadow-emerald-50 flex items-center justify-center mx-auto lg:mx-0">
                      <Icon className="w-6 h-6 text-emerald-500" />
                    </div>
                    <span className="absolute -top-2 -right-2 lg:right-auto lg:-right-2 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>

                  <div className="text-[11px] font-bold text-emerald-500 tracking-widest uppercase mb-2">
                    Step {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-500 text-[15px] leading-relaxed mb-4">
                    {step.description}
                  </p>
                  <span className="inline-block bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full">
                    {step.note}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
