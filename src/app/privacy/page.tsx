"use client";

import { motion } from "motion/react";
import Image from "next/image";
import {
  Shield,
  MessageCircle,
  Database,
  Bot,
  Share2,
  Clock,
  Lock,
  UserCheck,
  Globe,
  Baby,
  RefreshCw,
  Mail,
  CheckCircle2,
  Phone,
  Smartphone,
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

// Pillars shown in the "Privacy at a glance" strip.
const pillars: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: MessageCircle,
    title: "Coexistence-first",
    text: "Your AI works alongside the WhatsApp Business app on your phone — we only touch the business number you connect.",
  },
  {
    icon: Lock,
    title: "Encrypted & secured",
    text: "Conversations and credentials are encrypted in transit and at rest, with strict access controls.",
  },
  {
    icon: Bot,
    title: "Never sold, never spammed",
    text: "We don't sell your data and never use your customers' conversations to train third-party models without consent.",
  },
  {
    icon: UserCheck,
    title: "You stay in control",
    text: "Disconnect your number, export, or delete your data at any time — the choice is always yours.",
  },
];

const sections: Section[] = [
  {
    id: "introduction",
    icon: Shield,
    title: "1. Introduction",
    blocks: [
      {
        kind: "p",
        text: "Velte Technologies (“Velte”, “we”, “us”) builds an AI sales agent that lives on your WhatsApp Business number — answering product questions, negotiating, checking inventory, and closing sales on your behalf. Because that work happens inside private conversations, protecting your data and your customers' data is core to everything we do.",
      },
      {
        kind: "p",
        text: "This Privacy Policy explains what information we collect, how the AI agent uses it, who we share it with, and the choices you have. It applies to our website, dashboard, and the AI agent connected to your WhatsApp Business account.",
      },
    ],
  },
  {
    id: "coexistence",
    icon: Smartphone,
    title: "2. WhatsApp Business & Coexistence",
    blocks: [
      {
        kind: "p",
        text: "Velte connects to your WhatsApp Business number through the official WhatsApp Business Platform using Meta's Coexistence mode. Coexistence means you keep chatting with customers from the WhatsApp Business app on your phone exactly as you do today, while Velte's AI handles conversations in parallel on the very same number. You are never asked to migrate away from, or give up, your existing WhatsApp Business app.",
      },
      {
        kind: "list",
        items: [
          "We access only the business conversations on the number you explicitly connect — never your personal WhatsApp chats or contacts.",
          "Messages flow through Meta's secure, encrypted infrastructure. We process only the messages needed for the AI to read, understand, and reply.",
          "You can pause the AI, disconnect the number, or revoke access from Meta Business settings at any time, returning the number to you alone.",
          "We operate in line with the WhatsApp Business Messaging Policy and Meta's Platform Terms. Where required, your customers are made aware they may be chatting with an automated assistant.",
        ],
      },
    ],
  },
  {
    id: "information-we-collect",
    icon: Database,
    title: "3. Information We Collect",
    blocks: [
      {
        kind: "p",
        text: "Information you provide directly when you create an account, set up your AI, or contact us:",
      },
      {
        kind: "list",
        items: [
          "Account details — name, email address, business name, and the phone number you connect.",
          "Catalog content you upload — products, descriptions, prices, images, and inventory.",
          "Payment information, processed securely by our third-party payment providers (we do not store full card details).",
        ],
      },
      {
        kind: "p",
        text: "Information from your connected WhatsApp Business number, required to run the AI agent:",
      },
      {
        kind: "list",
        items: [
          "Customer messages and the AI's replies on the connected business number.",
          "Customer display names and phone numbers as supplied by WhatsApp.",
          "Order, negotiation, and payment-link activity generated during a conversation.",
        ],
      },
      {
        kind: "p",
        text: "Information collected automatically when you use our website and dashboard: log data (IP address, browser type, pages visited), device information, and usage data (features used, time spent, interactions).",
      },
    ],
  },
  {
    id: "ai-use",
    icon: Bot,
    title: "4. How Your AI Agent Uses Conversation Data",
    blocks: [
      {
        kind: "p",
        text: "Conversation data is used solely to operate the service you signed up for — letting your AI agent respond accurately and close sales:",
      },
      {
        kind: "list",
        items: [
          "Understanding customer questions and generating relevant, on-brand replies.",
          "Checking your catalog and inventory so quotes and availability are correct.",
          "Negotiating within the limits you set and issuing secure payment links.",
          "Producing your sales analytics, order history, and conversation summaries.",
        ],
      },
      {
        kind: "p",
        text: "We do not sell conversation data, and we do not use your customers' messages to train third-party AI models without your explicit consent. Where AI model providers process messages to generate a reply, they act as our processors under contractual confidentiality and data-protection terms.",
      },
    ],
  },
  {
    id: "how-we-use",
    icon: CheckCircle2,
    title: "5. How We Use Your Information",
    blocks: [
      {
        kind: "list",
        items: [
          "Provide, maintain, and improve the service and the quality of AI responses.",
          "Process transactions and send related confirmations and receipts.",
          "Communicate with you about updates, security notices, and support.",
          "Monitor usage to keep the platform reliable, secure, and fraud-free.",
          "Comply with legal obligations and enforce our terms.",
        ],
      },
    ],
  },
  {
    id: "sharing",
    icon: Share2,
    title: "6. Sharing of Information",
    blocks: [
      {
        kind: "p",
        text: "We do not sell your personal information. We share data only with the partners required to deliver the service, each bound by data-protection agreements:",
      },
      {
        kind: "list",
        items: [
          "Meta Platforms — to send and receive messages via the WhatsApp Business Platform.",
          "AI model providers — to generate the agent's replies, as our processors.",
          "Payment processors — to issue payment links and process transactions securely.",
          "Cloud hosting and analytics providers — to run and monitor the platform.",
          "Authorities — where required by law, regulation, or valid legal process.",
        ],
      },
    ],
  },
  {
    id: "retention",
    icon: Clock,
    title: "7. Data Retention",
    blocks: [
      {
        kind: "p",
        text: "We retain conversation and account data for as long as your account is active and the AI needs it to provide context and analytics. When you disconnect a number or close your account, we delete or anonymise the associated conversation data within a reasonable period, except where we must retain limited records to meet legal, tax, or fraud-prevention obligations.",
      },
    ],
  },
  {
    id: "security",
    icon: Lock,
    title: "8. Data Security",
    blocks: [
      {
        kind: "p",
        text: "We apply industry-standard safeguards including encryption in transit and at rest, scoped access controls, and regular security reviews. WhatsApp access tokens are stored securely and used only to operate your agent. No method of transmission over the Internet is completely secure, so while we work hard to protect your data, we cannot guarantee absolute security.",
      },
    ],
  },
  {
    id: "your-rights",
    icon: UserCheck,
    title: "9. Your Rights and Choices",
    blocks: [
      {
        kind: "p",
        text: "Depending on your location, you may have the right to access, correct, delete, or export your personal information, to object to or restrict certain processing, and to withdraw consent. You can also disconnect your WhatsApp number at any time to stop further processing.",
      },
      {
        kind: "p",
        text: "To exercise these rights, contact us at privacy@velte.ng. We will respond within the timeframe required by applicable law.",
      },
    ],
  },
  {
    id: "international",
    icon: Globe,
    title: "10. International Data Transfers",
    blocks: [
      {
        kind: "p",
        text: "Velte and its providers may process your information in countries other than your own. When we transfer data internationally, we put appropriate safeguards in place, such as standard contractual clauses, to ensure it remains protected.",
      },
    ],
  },
  {
    id: "children",
    icon: Baby,
    title: "11. Children's Privacy",
    blocks: [
      {
        kind: "p",
        text: "Our services are intended for businesses and are not directed to individuals under 18. We do not knowingly collect personal information from children. If you believe a child has provided us with information, please contact us so we can remove it.",
      },
    ],
  },
  {
    id: "changes",
    icon: RefreshCw,
    title: "12. Changes to This Policy",
    blocks: [
      {
        kind: "p",
        text: "We may update this Privacy Policy from time to time. We will post the revised version on this page and, where changes are significant, notify you by email or in the dashboard.",
      },
    ],
  },
  {
    id: "contact",
    icon: Mail,
    title: "13. Contact Us",
    blocks: [
      {
        kind: "p",
        text: "If you have questions about this Privacy Policy or how your data is handled, reach out to us:",
      },
      {
        kind: "list",
        items: [
          "Velte Technologies",
          "Plot XI, Republic Estate, Independence Layout, Enugu, Nigeria",
          "privacy@velte.ng",
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

export default function Privacy() {
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
          {/* Glows */}
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
                  <Shield className="w-3.5 h-3.5" />
                  Your data, protected
                </span>

                <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-5 text-balance">
                  Privacy Policy
                </h1>
                <p className="text-lg text-white/55 leading-relaxed max-w-lg mb-7">
                  How we protect your business and your customers&rsquo;
                  conversations when your AI agent coexists with your WhatsApp
                  Business number.
                </p>

                {/* Compliance chips */}
                <div className="flex flex-wrap gap-2.5 mb-6">
                  {[
                    "WhatsApp Business Platform",
                    "Meta Coexistence",
                    "NDPR & GDPR aligned",
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
                    src="https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=900&q=80&auto=format&fit=crop"
                    alt="Business owner managing WhatsApp sales securely with Velte"
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

        {/* ---------- Privacy at a glance ---------- */}
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

        {/* ---------- Coexistence highlight ---------- */}
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
                  <Phone className="w-3.5 h-3.5" />
                  Built for coexistence
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight">
                  Keep your number. Keep your phone. Add an AI.
                </h2>
                <p className="text-white/55 leading-relaxed mb-6">
                  With Meta Coexistence, you carry on replying from the WhatsApp
                  Business app whenever you like — your AI simply handles the
                  rest on the same number. We never read your personal chats,
                  and you can hand the number fully back to yourself in one
                  click.
                </p>
                <ul className="space-y-3">
                  {[
                    "Only the business number you connect is ever accessed.",
                    "Your personal WhatsApp chats and contacts stay private.",
                    "Pause the AI or disconnect anytime from Meta settings.",
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
                  src="https://images.unsplash.com/photo-1508243771214-6e95d137426b?w=900&q=80&auto=format&fit=crop"
                  alt="Merchant chatting with customers on WhatsApp while the AI assists"
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
