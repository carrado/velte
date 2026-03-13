"use client";

import { motion } from "motion/react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const sections = [
  {
    title: "1. Information We Collect",
    content: `
      We collect information you provide directly, such as when you create an account, use our services, or communicate with us. This may include:
      • Name, email address, phone number, and business details.
      • Payment information (processed securely by third‑party providers).
      • Any content you upload (e.g., product catalogs, images).

      We also automatically collect certain information when you use Velte, including:
      • Log data (IP address, browser type, pages visited).
      • Device information (operating system, device identifiers).
      • Usage data (features used, time spent, interactions).
    `,
  },
  {
    title: "2. How We Use Your Information",
    content: `
      We use the information we collect to:
      • Provide, maintain, and improve our services.
      • Process transactions and send related communications.
      • Monitor and analyze trends, usage, and activities.
      • Personalize your experience and deliver relevant content.
      • Communicate with you about updates, promotions, and support.
      • Detect, investigate, and prevent fraudulent or illegal activities.
    `,
  },
  {
    title: "3. Sharing of Information",
    content: `
      We do not sell your personal information. We may share information in the following circumstances:
      • With third‑party service providers who help us operate (e.g., cloud hosting, analytics, payment processors).
      • If required by law, regulation, or legal process.
      • In connection with a merger, acquisition, or sale of assets (with notice to you).
      • With your consent or at your direction.
    `,
  },
  {
    title: "4. Data Security",
    content: `
      We implement industry‑standard security measures to protect your information, including encryption, access controls, and regular security audits. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
    `,
  },
  {
    title: "5. Your Rights and Choices",
    content: `
      Depending on your location, you may have the right to:
      • Access, correct, or delete your personal information.
      • Object to or restrict certain processing.
      • Data portability.
      • Withdraw consent at any time (where processing is based on consent).

      To exercise these rights, contact us at privacy@velte.ai. We will respond within the timeframe required by applicable law.
    `,
  },
  {
    title: "6. International Data Transfers",
    content: `
      Velte operates globally and may transfer your information to countries outside your residence. When we do so, we ensure appropriate safeguards are in place, such as standard contractual clauses approved by the European Commission.
    `,
  },
  {
    title: "7. Children's Privacy",
    content: `
      Our services are not directed to individuals under 18. We do not knowingly collect personal information from children. If you become aware that a child has provided us with information, please contact us.
    `,
  },
  {
    title: "8. Changes to This Policy",
    content: `
      We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and, where appropriate, by email.
    `,
  },
  {
    title: "9. Contact Us",
    content: `
      If you have any questions about this Privacy Policy, please contact us at:

      Velte Inc.
      548 Market St, San Francisco, CA 94104
      privacy@velte.ai
      +1 (555) 123-4567
    `,
  },
];

export default function Privacy() {
  return (
    <>
      <Navbar />
      <main className="bg-[#050d08] min-h-screen pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <h1 className="text-5xl font-bold text-white mb-4">
              Privacy Policy
            </h1>
            <p className="text-white/40 text-sm">
              Last updated: March 15, 2026
            </p>
          </motion.div>

          <div className="prose prose-invert max-w-none">
            {sections.map((section, i) => (
              <motion.section
                key={section.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="mb-8"
              >
                <h2 className="text-2xl font-semibold text-white mb-3">
                  {section.title}
                </h2>
                <div className="text-white/60 leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </motion.section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
