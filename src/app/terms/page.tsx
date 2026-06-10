"use client";

import { motion } from "motion/react";
import Image from "next/image";
import {
  FileCheck,
  Bot,
  UserCheck,
  Smartphone,
  CreditCard,
  ShieldAlert,
  Copyright,
  Plug,
  Ban,
  AlertTriangle,
  Scale,
  Landmark,
  RefreshCw,
  Mail,
  CheckCircle2,
  ScrollText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const ORANGE = "rgb(247,107,16)";

type Block = { kind: "p"; text: string } | { kind: "list"; items: string[] };

interface Section {
  id: string;
  icon: LucideIcon;
  title: string;
  blocks: Block[];
}

const lastUpdated = "June 10, 2026";

// Pillars shown in the "Terms at a glance" strip.
const pillars: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Bot,
    title: "What Velte does",
    text: "An AI sales agent on your WhatsApp Business number that answers, negotiates, and closes sales for you.",
  },
  {
    icon: Smartphone,
    title: "You own your number",
    text: "You connect a number you control and remain responsible for how it's used under WhatsApp's policies.",
  },
  {
    icon: CreditCard,
    title: "Transparent billing",
    text: "Plans are billed in advance, monthly or annually, with clear pricing and no hidden charges.",
  },
  {
    icon: UserCheck,
    title: "Cancel anytime",
    text: "Cancel from your dashboard whenever you like — your access runs to the end of the paid period.",
  },
];

const sections: Section[] = [
  {
    id: "acceptance",
    icon: FileCheck,
    title: "1. Acceptance of Terms",
    blocks: [
      {
        kind: "p",
        text: "These Terms and Conditions (“Terms”) govern your access to and use of the Velte platform, dashboard, and AI agent (collectively, the “Service”), provided by Velte Technologies (“Velte”, “we”, “us”). By creating an account or using the Service, you agree to be bound by these Terms.",
      },
      {
        kind: "p",
        text: "If you are using the Service on behalf of a business, you confirm that you are authorised to bind that business to these Terms. If you do not agree, you may not use the Service. We may update these Terms from time to time, and continued use after changes take effect constitutes acceptance.",
      },
    ],
  },
  {
    id: "service",
    icon: Bot,
    title: "2. Description of Service",
    blocks: [
      {
        kind: "p",
        text: "Velte provides an AI-powered sales automation tool for WhatsApp Business. The AI agent connects to your WhatsApp Business number and can answer product questions, check inventory, negotiate within limits you set, generate payment links, and capture orders.",
      },
      {
        kind: "p",
        text: "The Service relies on the official WhatsApp Business Platform and other third-party providers. We continuously improve the Service and may add, modify, or discontinue features. We will give reasonable notice of material changes that significantly reduce core functionality.",
      },
    ],
  },
  {
    id: "accounts",
    icon: UserCheck,
    title: "3. Eligibility & Accounts",
    blocks: [
      {
        kind: "p",
        text: "You must be at least 18 years old and operating a legitimate business to use the Service. You are responsible for providing accurate registration information and for keeping it up to date.",
      },
      {
        kind: "list",
        items: [
          "You are responsible for safeguarding your login credentials.",
          "You are responsible for all activity that occurs under your account.",
          "Notify us promptly of any unauthorised access or security breach.",
        ],
      },
    ],
  },
  {
    id: "whatsapp",
    icon: Smartphone,
    title: "4. WhatsApp & Coexistence Responsibilities",
    blocks: [
      {
        kind: "p",
        text: "Velte operates on your WhatsApp Business number using Meta's Coexistence mode, so you can keep messaging from the WhatsApp Business app on your phone while the AI handles conversations on the same number. By connecting a number, you confirm and agree that:",
      },
      {
        kind: "list",
        items: [
          "You own or are authorised to operate the WhatsApp Business number you connect.",
          "Your use complies with the WhatsApp Business Messaging Policy and Meta's Platform Terms.",
          "You will obtain any consent required to message your customers and to use an automated assistant where applicable.",
          "You will not use the Service to send unsolicited spam, deceptive, or prohibited content.",
        ],
      },
      {
        kind: "p",
        text: "Meta may suspend or restrict access to the WhatsApp Business Platform independently of Velte. We are not responsible for actions taken by Meta against your number or account where they result from policy violations or decisions outside our control.",
      },
    ],
  },
  {
    id: "fees",
    icon: CreditCard,
    title: "5. Fees, Trials & Billing",
    blocks: [
      {
        kind: "p",
        text: "Where offered, free trials give you temporary access to the Service. Once a trial ends, access is locked until you subscribe to a paid plan.",
      },
      {
        kind: "list",
        items: [
          "Subscription fees are billed in advance on the monthly or annual cycle you select.",
          "Fees are non-refundable except where required by law.",
          "We may change pricing with at least 30 days' notice before your next billing cycle.",
          "If a subscription expires and is not renewed, your account is locked until you renew from the billing page.",
        ],
      },
      {
        kind: "p",
        text: "Payments are processed by third-party payment providers. We do not store your full card details.",
      },
    ],
  },
  {
    id: "acceptable-use",
    icon: ShieldAlert,
    title: "6. Acceptable Use",
    blocks: [
      {
        kind: "p",
        text: "You agree not to misuse the Service. In particular, you will not:",
      },
      {
        kind: "list",
        items: [
          "Use the Service for any unlawful, fraudulent, or deceptive purpose.",
          "Send spam, harass, or message people without a lawful basis or consent.",
          "Transmit malware or interfere with the integrity or performance of the Service.",
          "Reverse-engineer, copy, or create derivative works from the software.",
          "Resell or provide access to the Service without our written permission.",
        ],
      },
    ],
  },
  {
    id: "ip",
    icon: Copyright,
    title: "7. Intellectual Property",
    blocks: [
      {
        kind: "p",
        text: "Velte owns all rights, title, and interest in the Service, including the software, trademarks, logos, and content we provide. You retain ownership of the content you upload, such as your catalog, and you grant us a limited licence to host and process it solely to operate the Service for you.",
      },
    ],
  },
  {
    id: "third-party",
    icon: Plug,
    title: "8. Third-Party Services",
    blocks: [
      {
        kind: "p",
        text: "The Service integrates with third-party providers such as Meta's WhatsApp Business Platform, AI model providers, and payment processors. Your use of those services is subject to their respective terms, and we are not responsible for their availability, accuracy, or actions.",
      },
    ],
  },
  {
    id: "termination",
    icon: Ban,
    title: "9. Termination",
    blocks: [
      {
        kind: "p",
        text: "You may cancel your account at any time from the dashboard. We may suspend or terminate your access if you breach these Terms, if required by law, or to protect the Service or other users. On termination, your right to use the Service ends, and we will handle your data in line with our Privacy Policy.",
      },
    ],
  },
  {
    id: "warranties",
    icon: AlertTriangle,
    title: "10. Disclaimer of Warranties",
    blocks: [
      {
        kind: "p",
        text: "THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT AI-GENERATED RESPONSES WILL ALWAYS BE ACCURATE. YOU ARE RESPONSIBLE FOR REVIEWING THE LIMITS AND SETTINGS YOU CONFIGURE FOR YOUR AI AGENT.",
      },
    ],
  },
  {
    id: "liability",
    icon: Scale,
    title: "11. Limitation of Liability",
    blocks: [
      {
        kind: "p",
        text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, VELTE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, OR DATA, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNTS YOU PAID TO US IN THE THREE MONTHS PRECEDING THE CLAIM.",
      },
    ],
  },
  {
    id: "governing-law",
    icon: Landmark,
    title: "12. Governing Law",
    blocks: [
      {
        kind: "p",
        text: "These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to conflict of law principles. Any disputes arising from or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the competent courts of Enugu State, Nigeria.",
      },
    ],
  },
  {
    id: "changes",
    icon: RefreshCw,
    title: "13. Changes to These Terms",
    blocks: [
      {
        kind: "p",
        text: "We may revise these Terms from time to time. When we make material changes, we will post the updated version on this page and, where appropriate, notify you by email or in the dashboard. Your continued use of the Service after changes take effect constitutes acceptance of the revised Terms.",
      },
    ],
  },
  {
    id: "contact",
    icon: Mail,
    title: "14. Contact Information",
    blocks: [
      {
        kind: "p",
        text: "If you have any questions about these Terms, please contact us:",
      },
      {
        kind: "list",
        items: [
          "Velte Technologies",
          "Plot XI, Republic Estate, Independence Layout, Enugu, Nigeria",
          "legal@velte.ng",
          "+234 (0) 816 327 6826",
        ],
      },
    ],
  },
];

function SectionBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) =>
        block.kind === "p" ? (
          <p key={i} className="text-white/60 leading-relaxed">
            {block.text}
          </p>
        ) : (
          <ul key={i} className="space-y-2.5">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-3 text-white/60 leading-relaxed">
                <CheckCircle2
                  className="w-4 h-4 mt-1 shrink-0"
                  style={{ color: ORANGE }}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

export default function Terms() {
  return (
    <>
      <Navbar />
      <main className="bg-[#050d08] min-h-screen">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden pt-32 pb-20">
          {/* Grid background */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: `linear-gradient(${ORANGE} 1px, transparent 1px), linear-gradient(90deg, ${ORANGE} 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
            }}
          />
          {/* Glow */}
          <div
            className="absolute top-0 left-1/4 w-[480px] h-[480px] rounded-full blur-[110px] pointer-events-none"
            style={{ background: "rgba(247,107,16,0.12)" }}
          />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span
                  className="inline-flex items-center gap-2 border text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6 tracking-wide"
                  style={{
                    background: "rgba(247,107,16,0.1)",
                    borderColor: "rgba(247,107,16,0.2)",
                    color: ORANGE,
                  }}
                >
                  <ScrollText className="w-3.5 h-3.5" />
                  The agreement between us
                </span>

                <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-5 text-balance">
                  Terms &amp; Conditions
                </h1>
                <p className="text-lg text-white/55 leading-relaxed max-w-lg mb-7">
                  The terms that govern your use of Velte&rsquo;s AI sales agent
                  on WhatsApp Business &mdash; written to be clear, fair, and
                  easy to follow.
                </p>

                {/* Quick chips */}
                <div className="flex flex-wrap gap-2.5 mb-6">
                  {[
                    "Plain-language terms",
                    "Official WhatsApp API",
                    "Governed by Nigerian law",
                  ].map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 bg-white/[0.04] border border-white/10 rounded-full px-3 py-1.5"
                    >
                      <CheckCircle2
                        className="w-3.5 h-3.5"
                        style={{ color: ORANGE }}
                      />
                      {chip}
                    </span>
                  ))}
                </div>

                <p className="text-white/35 text-sm">
                  Last updated: {lastUpdated}
                </p>
              </motion.div>

              {/* Hero image */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="relative"
              >
                <div
                  className="absolute -inset-6 rounded-[2.5rem] blur-3xl"
                  style={{ background: "rgba(247,107,16,0.1)" }}
                />
                <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
                  <Image
                    src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=900&q=80&auto=format&fit=crop"
                    alt="Business partners agreeing on terms with a handshake"
                    fill
                    priority
                    sizes="(max-width: 1024px) 90vw, 520px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050d08] via-transparent to-transparent" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ---------- Terms at a glance ---------- */}
        <section className="relative max-w-6xl mx-auto px-5 sm:px-8 pb-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(247,107,16,0.12)" }}
                >
                  <pillar.icon className="w-5 h-5" style={{ color: ORANGE }} />
                </div>
                <h3 className="text-white font-semibold mb-1.5">
                  {pillar.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {pillar.text}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ---------- Responsibilities highlight ---------- */}
        <section className="relative max-w-6xl mx-auto px-5 sm:px-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent"
          >
            <div className="grid lg:grid-cols-2 gap-0 items-stretch">
              {/* Text */}
              <div className="p-8 sm:p-10">
                <span
                  className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
                  style={{
                    background: "rgba(247,107,16,0.1)",
                    color: ORANGE,
                  }}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Using Velte responsibly
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight">
                  A simple deal: we power the AI, you message responsibly.
                </h2>
                <p className="text-white/55 leading-relaxed mb-6">
                  Velte runs on the official WhatsApp Business Platform, so the
                  way you message customers matters. Keeping to WhatsApp&rsquo;s
                  policies protects your number, your customers, and your
                  business.
                </p>
                <ul className="space-y-3">
                  {[
                    "Connect only a number you own or are authorised to use.",
                    "Message customers with consent and a lawful basis.",
                    "No spam, deception, or prohibited content.",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-white/70 text-sm leading-relaxed"
                    >
                      <CheckCircle2
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: ORANGE }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image */}
              <div className="relative min-h-[260px] lg:min-h-full">
                <Image
                  src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=900&q=80&auto=format&fit=crop"
                  alt="Business owner managing customer messages professionally"
                  fill
                  sizes="(max-width: 1024px) 100vw, 520px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050d08] via-[#050d08]/30 to-transparent lg:bg-gradient-to-l" />
              </div>
            </div>
          </motion.div>
        </section>

        {/* ---------- Content + TOC ---------- */}
        <section className="relative max-w-6xl mx-auto px-5 sm:px-8 pb-24">
          <div className="grid lg:grid-cols-[230px_1fr] gap-10 lg:gap-14">
            {/* Table of contents */}
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">
                  On this page
                </p>
                <nav className="space-y-1">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="block text-sm text-white/45 hover:text-white border-l border-white/10 hover:border-[rgb(247,107,16)] pl-3 py-1.5 transition-colors"
                    >
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Sections */}
            <div className="min-w-0 space-y-12">
              {sections.map((section, i) => (
                <motion.section
                  key={section.id}
                  id={section.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.2) }}
                  className="scroll-mt-28"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(247,107,16,0.12)" }}
                    >
                      <section.icon
                        className="w-5 h-5"
                        style={{ color: ORANGE }}
                      />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-white">
                      {section.title}
                    </h2>
                  </div>
                  <SectionBlocks blocks={section.blocks} />
                </motion.section>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
