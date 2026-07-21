"use client";

import { motion } from "motion/react";
import Image from "next/image";
import {
  FileCheck,
  Bot,
  UserCheck,
  MessageCircle,
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
  Search,
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

const lastUpdated = "July 5, 2026";

// Pillars shown in the "Terms at a glance" strip.
const pillars: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Search,
    title: "What Velte does",
    text: "An AI discovery engine that matches what buyers describe to real, nearby vendor listings — then connects them directly.",
  },
  {
    icon: UserCheck,
    title: "Free to search, free to list",
    text: "Buyers search without an account; vendors list their business at no cost.",
  },
  {
    icon: CreditCard,
    title: "You control your sale",
    text: "Velte isn't a party to the transaction — buyers and vendors deal directly, with Paystack handling any in-app payments.",
  },
  {
    icon: Landmark,
    title: "Governed by Nigerian law",
    text: "These Terms are governed by the laws of the Federal Republic of Nigeria.",
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
        text: "These Terms and Conditions (“Terms”) govern your access to and use of Velte — the buyer-facing AI search experience and the vendor dashboard (collectively, the “Service”) — provided by Velte Technologies (“Velte”, “we”, “us”). By searching, creating an account, or otherwise using the Service, you agree to be bound by these Terms.",
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
        text: "Velte is an AI-powered discovery engine. A buyer describes what they need — in text, a photo, or both — and our AI matches it against real vendor and product records already in our database, ranked by meaning, proximity, and vendor trust, then connects the buyer directly to the vendor.",
      },
      {
        kind: "p",
        text: "Vendors use the Velte dashboard to list and manage their store and products, and to receive buyer inquiries. Search results reflect vendor-submitted data as-is — we do not verify or guarantee that listed prices, stock, or availability remain accurate after a vendor updates them, and Velte is not a party to any resulting sale.",
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
        text: "Buyers do not need an account to search Velte. Vendors must be at least 18 years old and operating a legitimate business to create a dashboard account. You are responsible for providing accurate registration information and keeping it up to date.",
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
    id: "buyer-vendor-communication",
    icon: MessageCircle,
    title: "4. Buyer–Vendor Communication",
    blocks: [
      {
        kind: "p",
        text: "When a buyer chooses to chat with a vendor, Velte opens a direct WhatsApp conversation between the buyer and the vendor's own WhatsApp number. Velte is not a party to, and does not read, store, or mediate, that conversation.",
      },
      {
        kind: "list",
        items: [
          "Vendors are responsible for how they represent their products and conduct themselves in that conversation.",
          "Vendors must comply with WhatsApp's own policies for the number they use.",
          "Neither party may use this channel to send unsolicited spam, deceptive, or prohibited content.",
        ],
      },
    ],
  },
  {
    id: "fees",
    icon: CreditCard,
    title: "5. Fees & Payments",
    blocks: [
      {
        kind: "p",
        text: "Searching Velte as a buyer is free, and listing a business as a vendor is free. Some optional features — such as paid placement or lead-based billing — may be introduced in the future and will always be disclosed clearly before they apply to you; nothing is charged for simply being discoverable to buyers.",
      },
      {
        kind: "list",
        items: [
          "Vendors may fund an in-app wallet to access optional paid features, when available.",
          "Vendors may also use Velte's payment tools (payment links or manual bank transfer verification) to receive payment directly from their own customers, processed by our payment partner, Paystack.",
          "Velte is not a party to the underlying sale between a vendor and their customer — that payment relationship is between them, with Paystack processing the transaction.",
        ],
      },
      {
        kind: "p",
        text: "We do not store your full card details. Any future pricing changes to paid features will be communicated with reasonable notice before they take effect.",
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
          "As a vendor, submit fraudulent, counterfeit, prohibited, or intentionally misleading listings.",
          "Misrepresent your identity, your business, or a product's availability.",
          "Use text or image search to harass, spam, or probe the Service.",
          "Transmit malware or interfere with the integrity or performance of the Service.",
          "Reverse-engineer, scrape, or create derivative works from the software.",
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
        text: "Velte owns all rights, title, and interest in the Service, including the software, trademarks, logos, and content we provide. You retain ownership of the content you upload, such as your store's products and images, and you grant us a limited licence to host and process it solely to operate the Service for you.",
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
        text: "The Service integrates with third-party providers such as AI model providers (to understand buyer search), Google (to suggest real nearby businesses when no Velte vendor matches), and Paystack (for payments). Your use of features involving those providers is subject to their respective terms, and we are not responsible for their availability, accuracy, or actions.",
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
        text: "Vendors may cancel their account at any time from the dashboard. We may suspend or terminate access if you breach these Terms, if required by law, or to protect the Service or other users. On termination, your right to use the Service ends, and we will handle your data in line with our Privacy Policy.",
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
        text: "THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT A LISTING'S PRICE, STOCK, OR AVAILABILITY REMAINS ACCURATE AFTER A VENDOR UPDATES IT. VELTE FACILITATES THE INTRODUCTION BETWEEN BUYER AND VENDOR AND IS NOT A PARTY TO, AND MAKES NO WARRANTY REGARDING, ANY RESULTING TRANSACTION.",
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
        text: "We may revise these Terms from time to time. When we make material changes, we will post the updated version on this page and, where appropriate, notify vendors by email or in the dashboard. Your continued use of the Service after changes take effect constitutes acceptance of the revised Terms.",
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
          <p key={i} className="text-gray-500 leading-relaxed">
            {block.text}
          </p>
        ) : (
          <ul key={i} className="space-y-2.5">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-3 text-gray-500 leading-relaxed">
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
      <main className="bg-[#F1F5F9] min-h-screen">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden pt-32 pb-20">
          {/* Grid background */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
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

                <h1 className="text-4xl sm:text-5xl font-bold text-[#023337] leading-[1.1] tracking-tight mb-5 text-balance">
                  Terms &amp; Conditions
                </h1>
                <p className="text-lg text-gray-500 leading-relaxed max-w-lg mb-7">
                  The terms that govern buyer search and vendor listings on
                  Velte — written to be clear, fair, and easy to follow.
                </p>

                {/* Quick chips */}
                <div className="flex flex-wrap gap-2.5 mb-6">
                  {[
                    "Plain-language terms",
                    "Free to list, free to search",
                    "Governed by Nigerian law",
                  ].map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 shadow-sm rounded-full px-3 py-1.5"
                    >
                      <CheckCircle2
                        className="w-3.5 h-3.5"
                        style={{ color: ORANGE }}
                      />
                      {chip}
                    </span>
                  ))}
                </div>

                <p className="text-gray-400 text-sm">
                  Last updated: {lastUpdated}
                </p>
              </motion.div>

              {/* Hero image, with floating trust badges instead of a plain overlay */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="relative w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
              >
                <div
                  className="absolute -inset-6 rounded-[2.5rem] blur-3xl"
                  style={{ background: "rgba(247,107,16,0.1)" }}
                />
                <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-gray-200 shadow-2xl shadow-gray-300/50">
                  <Image
                    src="https://res.cloudinary.com/campnet/image/upload/v1784631782/ChatGPT_Image_Jul_21_2026_11_54_52_AM_edeudw.png"
                    alt="A Nigerian shop vendor behind the counter of his store"
                    fill
                    priority
                    sizes="(max-width: 1024px) 90vw, 480px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                </div>

                {/* Floating badges */}
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                  className="absolute -right-3 top-6 hidden sm:flex items-center gap-2 bg-white border border-orange-200 rounded-xl px-3 py-2 shadow-lg"
                >
                  <ScrollText className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-[#023337] text-[11px] font-medium whitespace-nowrap">
                    Plain-language terms
                  </span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1.3 }}
                  className="absolute -left-3 bottom-8 hidden sm:flex items-center gap-2 bg-white border border-orange-200 rounded-xl px-3 py-2 shadow-lg"
                >
                  <Landmark className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-[#023337] text-[11px] font-medium whitespace-nowrap">
                    Governed by Nigerian law
                  </span>
                </motion.div>
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
                className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 hover:border-gray-300 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(247,107,16,0.12)" }}
                >
                  <pillar.icon className="w-5 h-5" style={{ color: ORANGE }} />
                </div>
                <h3 className="text-[#023337] font-semibold mb-1.5">
                  {pillar.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
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
            className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
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
                <h2 className="text-2xl sm:text-3xl font-bold text-[#023337] mb-4 leading-tight">
                  A simple deal: we match honestly, you list honestly.
                </h2>
                <p className="text-gray-500 leading-relaxed mb-6">
                  Our AI never invents a vendor, price, or stock level — it only
                  ever surfaces what&rsquo;s really in the database. That only
                  works if what vendors put in the database is accurate. Keeping
                  listings honest and current protects buyers, other vendors,
                  and your own reputation on Velte.
                </p>
                <ul className="space-y-3">
                  {[
                    "List only products or services you can actually fulfil.",
                    "Keep prices and stock reasonably up to date.",
                    "Buyers and vendors transact directly — Velte facilitates the introduction, not the sale.",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-gray-600 text-sm leading-relaxed"
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
                  src="https://res.cloudinary.com/campnet/image/upload/v1784631957/ChatGPT_Image_Jul_21_2026_12_05_41_PM_z7jmzw.png"
                  alt="A Nigerian shop vendor standing behind his counter, supporting local vendors"
                  fill
                  sizes="(max-width: 1024px) 100vw, 520px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#F1F5F9] via-[#F1F5F9]/30 to-transparent lg:bg-gradient-to-l" />
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
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">
                  On this page
                </p>
                <nav className="space-y-1">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="block text-sm text-gray-400 hover:text-[#023337] border-l border-gray-200 hover:border-orange-500 pl-3 py-1.5 transition-colors"
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
                    <h2 className="text-xl sm:text-2xl font-semibold text-[#023337]">
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
