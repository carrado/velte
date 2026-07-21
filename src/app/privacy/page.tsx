"use client";

import { motion } from "motion/react";
import Image from "next/image";
import {
  Shield,
  Database,
  Share2,
  Clock,
  Lock,
  UserCheck,
  Globe,
  Baby,
  RefreshCw,
  Mail,
  CheckCircle2,
  Search,
  EyeOff,
  MapPin,
  ShieldCheck,
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

// Pillars shown in the "Privacy at a glance" strip.
const pillars: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: EyeOff,
    title: "Anonymous by design",
    text: "Searching doesn't require an account — we don't build a profile or history tied to who you are.",
  },
  {
    icon: Database,
    title: "Real data only",
    text: "Our AI never invents a vendor, price, or stock level — every result comes straight from the database.",
  },
  {
    icon: MapPin,
    title: "Location used only for matching",
    text: "Your approximate location is used only to find nearby vendors — never sold or used for ads.",
  },
  {
    icon: UserCheck,
    title: "Vendors stay in control",
    text: "Edit, unpublish, or delete your store and products at any time from your dashboard.",
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
        text: "Velte Technologies (“Velte”, “we”, “us”) operates Velte — an AI-powered discovery engine that helps buyers describe what they need and find real, nearby vendors who actually have it, plus the dashboard vendors use to list and manage their business.",
      },
      {
        kind: "p",
        text: "This Privacy Policy explains what information we collect, how our AI uses it, who we share it with, and the choices you have. It applies to our website, the buyer-facing search experience, and the vendor dashboard.",
      },
    ],
  },
  {
    id: "how-search-works",
    icon: Search,
    title: "2. How Buyer Search Works",
    blocks: [
      {
        kind: "p",
        text: "Searching on Velte doesn't require an account. When you search, we may use:",
      },
      {
        kind: "list",
        items: [
          "Your approximate location (with your permission) — used only to rank vendors by proximity, never stored against a persistent profile.",
          "The text you type describing what you need.",
          "A photo you choose to upload instead of, or alongside, text — used only to identify what you're looking for.",
        ],
      },
      {
        kind: "p",
        text: "Because there's no buyer account, we don't build a search history or profile tied to who you are. Each search is treated as its own, independent request.",
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
        text: "From buyers, only what's described above — no name, email, or account is required to search.",
      },
      {
        kind: "p",
        text: "From vendors, when you create an account and list your business:",
      },
      {
        kind: "list",
        items: [
          "Account details — name, phone/WhatsApp number, email address, and business location.",
          "Store and product information you add — descriptions, sectors, prices, images, and stock.",
          "Wallet and payment records processed by our payment partner, Paystack (we do not store full card details).",
        ],
      },
      {
        kind: "p",
        text: "Automatically, from anyone using our website or dashboard: basic log data (IP address, browser type, pages visited) and device information.",
      },
    ],
  },
  {
    id: "how-we-use",
    icon: CheckCircle2,
    title: "4. How We Use Your Information",
    blocks: [
      {
        kind: "list",
        items: [
          "Operate and improve search matching and result quality.",
          "Process vendor transactions and send related confirmations.",
          "Communicate with vendors about updates, security notices, and support.",
          "Monitor usage to keep the platform reliable, secure, and fraud-free.",
          "Comply with legal obligations and enforce our terms.",
        ],
      },
    ],
  },
  {
    id: "sharing",
    icon: Share2,
    title: "5. Sharing of Information",
    blocks: [
      {
        kind: "p",
        text: "We do not sell your personal information. We share data only with the partners required to deliver the service:",
      },
      {
        kind: "list",
        items: [
          "The vendor you choose to chat with — only if you tap “chat with vendor,” which opens a direct WhatsApp conversation between you and that vendor. Velte is not part of that conversation and doesn't read or store its content.",
          "Paystack — to process vendor wallet top-ups and payments securely.",
          "Authorities — where required by law, regulation, or valid legal process.",
        ],
      },
    ],
  },
  {
    id: "retention",
    icon: Clock,
    title: "6. Data Retention",
    blocks: [
      {
        kind: "p",
        text: "Search queries and locations are logged to improve matching quality and to understand buyer demand — including which real, nearby businesses buyers were shown that aren't yet on Velte — and this log isn't tied to a buyer identity, since none is collected. Vendor account, store, and product data is retained while the account is active. When a vendor deletes a product or store, or closes their account, we remove or anonymise the associated data within a reasonable period, except where we must retain limited records for legal, tax, or fraud-prevention obligations.",
      },
    ],
  },
  {
    id: "security",
    icon: Lock,
    title: "7. Data Security",
    blocks: [
      {
        kind: "p",
        text: "We apply industry-standard safeguards including encryption in transit and at rest, scoped access controls, and regular security reviews. No method of transmission over the Internet is completely secure, so while we work hard to protect your data, we cannot guarantee absolute security.",
      },
    ],
  },
  {
    id: "your-rights",
    icon: UserCheck,
    title: "8. Your Rights and Choices",
    blocks: [
      {
        kind: "p",
        text: "Vendors may access, correct, delete, or export their account and store data at any time from the dashboard, or by contacting us. Because buyer search requires no account, the main choices available to buyers are whether to grant location permission or upload a photo — both are optional, and search still works with text alone.",
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
    title: "9. International Data Transfers",
    blocks: [
      {
        kind: "p",
        text: "Some of our AI and infrastructure providers process data outside Nigeria. When we transfer data internationally, we put appropriate safeguards in place, such as standard contractual clauses, to keep it protected.",
      },
    ],
  },
  {
    id: "children",
    icon: Baby,
    title: "10. Children's Privacy",
    blocks: [
      {
        kind: "p",
        text: "Our services are not directed to individuals under 18. We do not knowingly collect personal information from children. If you believe a child has provided us with information, please contact us so we can remove it.",
      },
    ],
  },
  {
    id: "changes",
    icon: RefreshCw,
    title: "11. Changes to This Policy",
    blocks: [
      {
        kind: "p",
        text: "We may update this Privacy Policy from time to time. We will post the revised version on this page and, where changes are significant, notify vendors by email or in the dashboard.",
      },
    ],
  },
  {
    id: "contact",
    icon: Mail,
    title: "12. Contact Us",
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

export default function Privacy() {
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

                <h1 className="text-4xl sm:text-5xl font-bold text-[#023337] leading-[1.1] tracking-tight mb-5 text-balance">
                  Privacy Policy
                </h1>
                <p className="text-lg text-gray-500 leading-relaxed max-w-lg mb-7">
                  How we protect your data as a buyer using Velte&rsquo;s AI
                  search, and as a vendor managing your store.
                </p>

                {/* Compliance chips */}
                <div className="flex flex-wrap gap-2.5 mb-6">
                  {[
                    "No account needed to search",
                    "Real data only — never invented",
                    "NDPR & GDPR aligned",
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
                    src="https://res.cloudinary.com/campnet/image/upload/v1784631782/ChatGPT_Image_Jul_21_2026_12_00_30_PM_teh3kf.png"
                    alt="Interior of a Nigerian shopping mall, with shoppers browsing storefronts"
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
                  <Lock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-[#023337] text-[11px] font-medium whitespace-nowrap">
                    Encrypted &amp; secure
                  </span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1.3 }}
                  className="absolute -left-3 bottom-8 hidden sm:flex items-center gap-2 bg-white border border-orange-200 rounded-xl px-3 py-2 shadow-lg"
                >
                  <EyeOff className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-[#023337] text-[11px] font-medium whitespace-nowrap">
                    No account needed
                  </span>
                </motion.div>
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

        {/* ---------- Real-data highlight ---------- */}
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
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Built for real matches
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#023337] mb-4 leading-tight">
                  Real vendors, real inventory — never invented.
                </h2>
                <p className="text-gray-500 leading-relaxed mb-6">
                  Velte&rsquo;s AI never fabricates a vendor, price, or stock
                  level. Every match comes from a live database record a vendor
                  actually entered — the AI&rsquo;s job is to understand what
                  you&rsquo;re asking for and find the closest real answer, not
                  to guess one.
                </p>
                <ul className="space-y-3">
                  {[
                    "Results are ranked by meaning, proximity, and vendor trust — not who paid the most.",
                    "No real match nearby? We show real nearby businesses, clearly labelled as not yet on Velte — never disguised as a listing.",
                    "Buyers stay anonymous throughout — no account, no persistent search history.",
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
                  src="https://res.cloudinary.com/campnet/image/upload/v1784631782/ChatGPT_Image_Jul_21_2026_12_00_30_PM_teh3kf.png"
                  alt="Interior of a Nigerian shopping mall, with shoppers browsing storefronts"
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
