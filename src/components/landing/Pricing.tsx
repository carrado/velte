import { motion } from "motion/react";
import { CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import Link from "next/link";

type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
};

const plans: Plan[] = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    description: "Perfect for small businesses testing AI-powered sales.",
    features: [
      "1 WhatsApp Business number",
      "Up to 500 conversations/month",
      "100-product catalog",
      "Basic price negotiation",
      "Standard analytics",
      "Email support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Growth",
    price: "$149",
    period: "/month",
    description: "For growing teams that need more volume and control.",
    features: [
      "3 WhatsApp Business numbers",
      "Up to 2,000 conversations/month",
      "Unlimited product catalog",
      "Advanced negotiation rules",
      "Payment link generation",
      "Full analytics dashboard",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For high-volume operations needing custom solutions.",
    features: [
      "Unlimited WhatsApp numbers",
      "Unlimited conversations",
      "Custom AI training",
      "CRM & ERP integrations",
      "White-label options",
      "99.9% SLA uptime",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-white py-24 lg:py-32">
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
            Transparent pricing
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-950 tracking-tight mb-5 text-balance">
            Plans that grow with you
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Start free for 14 days. No credit card required. Cancel anytime.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-2xl p-8 ${
                plan.popular
                  ? "bg-[#050d08] text-white shadow-2xl shadow-emerald-900/30 ring-1 ring-emerald-500/40"
                  : "bg-gray-50 border border-gray-100"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/30">
                    <Zap className="w-3 h-3 fill-white" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p
                  className={`text-sm font-semibold mb-1 ${
                    plan.popular ? "text-emerald-400" : "text-emerald-600"
                  }`}
                >
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-0.5 mb-3">
                  <span
                    className={`text-4xl font-bold tracking-tight ${
                      plan.popular ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span
                      className={`text-sm ${plan.popular ? "text-white/50" : "text-gray-400"}`}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className={`text-sm ${plan.popular ? "text-white/55" : "text-gray-500"}`}>
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        plan.popular ? "text-emerald-400" : "text-emerald-500"
                      }`}
                    />
                    <span
                      className={`text-sm ${plan.popular ? "text-white/75" : "text-gray-600"}`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href="/sign-in">
                <Button
                  className={`w-full h-11 font-semibold ${
                    plan.popular
                      ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25"
                      : "bg-gray-900 hover:bg-gray-800 text-white"
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
