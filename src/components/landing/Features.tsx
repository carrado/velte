"use client";

import { motion } from "motion/react";
import {
  Bot,
  TrendingDown,
  Package,
  CreditCard,
  Globe,
  BarChart3,
} from "lucide-react";

type Feature = {
  icon: React.ElementType;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: Bot,
    title: "Intelligent Sales Conversations",
    description:
      "AI that understands context, remembers customer preferences, and guides buyers through the entire journey as naturally as a human rep.",
  },
  {
    icon: TrendingDown,
    title: "Smart Price Negotiation",
    description:
      "Define negotiation rules and minimum margins — let the AI handle pricing discussions and close deals within your boundaries.",
  },
  {
    icon: Package,
    title: "Real-Time Inventory Sync",
    description:
      "Always checks live stock before confirming availability, preventing overselling and customer disappointment.",
  },
  {
    icon: CreditCard,
    title: "Instant Payment Links",
    description:
      "Generate and send secure, personalized payment links directly in the chat to capture revenue while intent is high.",
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description:
      "Serve customers in their native language. Velte supports 30+ languages automatically — no extra configuration needed.",
  },
  {
    icon: BarChart3,
    title: "Sales Analytics Dashboard",
    description:
      "Track conversations, conversion rates, revenue, and AI performance with real-time reports you can act on.",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-white py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest text-[rgb(247,107,16)] uppercase mb-4">
            Everything you need
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-950 tracking-tight mb-5 text-balance">
            A complete AI sales engine
            <br />
            built for WhatsApp
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Velte handles the full sales cycle — from first message to closed
            deal — so your team can focus on what humans do best.
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="group bg-gray-50 hover:bg-white border border-gray-100 hover:border-[rgb(247,107,16)]/30 hover:shadow-lg hover:shadow-[rgba(247,107,16,0.1)] rounded-2xl p-7 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-[rgb(247,107,16)]/10 border border-[rgb(247,107,16)]/20 flex items-center justify-center mb-5 group-hover:bg-[rgb(247,107,16)] group-hover:border-[rgb(247,107,16)] transition-colors duration-300">
                  <Icon className="w-5 h-5 text-[rgb(247,107,16)] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-semibold text-gray-900 text-[17px] mb-2.5">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
