"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Check, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BillingPeriod } from "@/types/pricing";
import { annualMonthly, annualTotal, naira, plans } from "@/lib/plans";

function BillingToggle({
  billing,
  onChange,
  theme,
}: {
  billing: BillingPeriod;
  onChange: (b: BillingPeriod) => void;
  theme: "light" | "dark";
}) {
  const dark = theme === "dark";
  return (
    <div className="flex justify-center mb-10">
      <div
        className={`relative inline-flex items-center rounded-full border p-1 ${
          dark ? "border-white/15 bg-[#0a140d]" : "border-gray-200 bg-gray-100"
        }`}
      >
        {(["monthly", "annual"] as const).map((period) => {
          const active = billing === period;
          const inactiveText = dark
            ? "text-white/55 hover:text-white/80"
            : "text-gray-500 hover:text-gray-800";
          return (
            <button
              key={period}
              type="button"
              onClick={() => onChange(period)}
              className={`relative z-10 flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                active ? "text-white" : inactiveText
              }`}
            >
              {active && (
                <motion.span
                  layoutId="billing-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 -z-10 rounded-full bg-[rgb(247,107,16)]"
                />
              )}
              {period === "monthly" ? "Monthly" : "Annual"}
              {period === "annual" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[rgb(247,107,16)]/15 text-[rgb(247,107,16)]"
                  }`}
                >
                  Save 20%
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PricingCards({
  className = "",
  theme = "dark",
}: {
  className?: string;
  theme?: "light" | "dark";
}) {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  return (
    <div className={className}>
      <BillingToggle billing={billing} onChange={setBilling} theme={theme} />

      <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
        {plans.map((plan, i) => {
          const isAnnual = billing === "annual";
          const annual = annualTotal(plan.monthlyPrice);
          const displayPrice = isAnnual
            ? naira(annual)
            : naira(plan.monthlyPrice);
          const period = isAnnual ? "/year" : "/month";

          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-2xl p-8 ${
                plan.popular
                  ? "bg-[#0a140d] ring-2 ring-[rgb(247,107,16)] shadow-2xl shadow-[rgba(247,107,16,0.25)]"
                  : "bg-white border border-gray-200 shadow-sm"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-[rgb(247,107,16)] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg shadow-[rgba(247,107,16,0.3)] whitespace-nowrap">
                    <Zap className="w-3 h-3 fill-white" />
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-1.5 mb-1.5">
                  {plan.popular && (
                    <Sparkles className="w-4 h-4 text-[rgb(247,107,16)]" />
                  )}
                  <p className="text-sm font-semibold text-[rgb(247,107,16)]">
                    {plan.name}
                  </p>
                </div>
                <div className="flex items-baseline gap-1 mb-1.5">
                  <span
                    className={`text-4xl font-bold tracking-tight ${
                      plan.popular ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {displayPrice}
                  </span>
                  <span
                    className={`text-sm ${
                      plan.popular ? "text-white/50" : "text-gray-400"
                    }`}
                  >
                    {period}
                  </span>
                </div>
                {/* Annual savings note keeps card height stable */}
                <p
                  className={`text-xs mb-3 h-4 ${
                    plan.popular
                      ? "text-[rgb(255,160,80)]"
                      : "text-[rgb(247,107,16)]"
                  }`}
                >
                  {isAnnual
                    ? `${naira(annualMonthly(plan.monthlyPrice))}/mo billed annually`
                    : ""}
                </p>
                <p
                  className={`text-sm leading-relaxed ${
                    plan.popular ? "text-white/60" : "text-gray-500"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => {
                  const isAdFeature = plan.popular && /\bad\b/i.test(feature);
                  return (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          plan.popular
                            ? "bg-[rgb(247,107,16)]"
                            : "bg-[rgb(247,107,16)]/10"
                        }`}
                      >
                        <Check
                          className={`h-3 w-3 ${
                            plan.popular
                              ? "text-white"
                              : "text-[rgb(247,107,16)]"
                          }`}
                        />
                      </span>
                      <span
                        className={`text-sm ${
                          plan.popular ? "text-white/80" : "text-gray-600"
                        } ${isAdFeature ? "font-semibold text-white" : ""}`}
                      >
                        {feature}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <Link href={plan.href} className="mt-auto">
                <Button
                  className={`w-full h-11 font-semibold ${
                    plan.popular
                      ? "bg-[rgb(247,107,16)] hover:bg-[rgb(247,107,16)]/90 text-white shadow-lg shadow-[rgba(247,107,16,0.25)]"
                      : "bg-gray-900 hover:bg-gray-800 text-white"
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
