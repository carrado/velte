"use client";

import { motion } from "motion/react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `
      By accessing or using the Velte platform (“Service”), you agree to be bound by these Terms. If you do not agree, you may not use the Service. We may modify these Terms at any time; continued use constitutes acceptance.
    `,
  },
  {
    title: "2. Description of Service",
    content: `
      Velte provides an AI‑powered sales automation tool for WhatsApp Business. Features include automated messaging, inventory checking, price negotiation, and payment link generation. We reserve the right to modify or discontinue any feature without notice.
    `,
  },
  {
    title: "3. User Accounts",
    content: `
      You must create an account to use the Service. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You must provide accurate and complete information.
    `,
  },
  {
    title: "4. Fees and Payments",
    content: `
      Subscription fees are billed in advance on a monthly or annual basis, as selected. Fees are non‑refundable except as required by law. We may change fees with 30 days' notice. Payment is processed by third‑party providers; we do not store full payment details.
    `,
  },
  {
    title: "5. Acceptable Use",
    content: `
      You agree not to:
      • Use the Service for any illegal purpose.
      • Transmit any harmful code or interfere with the Service.
      • Attempt to reverse‑engineer or copy the software.
      • Use the Service to send spam or harass others.
      • Violate any applicable laws or regulations.
    `,
  },
  {
    title: "6. Intellectual Property",
    content: `
      Velte owns all rights, title, and interest in the Service, including software, trademarks, logos, and content. You may not copy, modify, distribute, or create derivative works without our express permission.
    `,
  },
  {
    title: "7. Third‑Party Services",
    content: `
      The Service may integrate with third‑party services (e.g., WhatsApp, Shopify). We are not responsible for the availability or accuracy of such services, and your use is subject to their terms.
    `,
  },
  {
    title: "8. Termination",
    content: `
      We may suspend or terminate your access at any time for violations of these Terms or for any other reason, with or without notice. You may cancel your account at any time via the dashboard.
    `,
  },
  {
    title: "9. Disclaimer of Warranties",
    content: `
      THE SERVICE IS PROVIDED “AS IS” WITHOUT ANY WARRANTIES, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR‑FREE, OR SECURE.
    `,
  },
  {
    title: "10. Limitation of Liability",
    content: `
      TO THE MAXIMUM EXTENT PERMITTED BY LAW, VELTE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY.
    `,
  },
  {
    title: "11. Governing Law",
    content: `
      These Terms are governed by the laws of the State of California, without regard to conflict of law principles. Any disputes shall be resolved exclusively in the federal or state courts of San Francisco County.
    `,
  },
  {
    title: "12. Contact Information",
    content: `
      For any questions about these Terms, please contact us at:

      Velte Inc.
      548 Market St, San Francisco, CA 94104
      legal@velte.ai
    `,
  },
];

export default function Terms() {
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
              Terms and Conditions
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
