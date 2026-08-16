"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { CheckCircle2, MessageCircle } from "lucide-react";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// Replaces the old RequestShowcase (deleted during the AI-agent pivot,
// which staged "Post what you need" as a marketed, manually-triggered
// marketplace action). This is the corrected version of that same idea:
// Buyer Requests are now something Velte itself offers and creates
// mid-conversation (createBuyerRequestTool.ts), never a form or a button
// the buyer goes looking for — so the mockup below shows exactly that
// exchange, word-for-word close to what the real system prompt actually
// produces (see systemPrompt.ts's own "genuine dead end" paragraph), not
// an idealized invented flow. No "Post a Request" CTA anywhere here on
// purpose — the only actionable thing a visitor can do is keep talking to
// Velte, same as the real product.
export function NoMatchShowcase() {
  return (
    <section className="relative bg-[#F1F5F9] border-t border-gray-100 py-14 sm:py-16">
      <div className="max-w-2xl mx-auto px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-9"
        >
          <motion.h2
            variants={fadeUp}
            className="text-2xl sm:text-3xl font-bold text-[#023337] tracking-tight mb-2 text-balance"
          >
            Can&apos;t find it? Let Velte try.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-gray-500 max-w-md mx-auto"
          >
            When nothing on Velte matches yet, Velte offers to reach out to real
            businesses on your behalf — right there in the conversation.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-5 sm:p-6 space-y-4"
        >
          <motion.div variants={fadeUp} className="flex justify-end">
            <div className="max-w-[80%] bg-orange-50 border border-orange-100 rounded-2xl rounded-br-md px-4 py-2.5">
              <p className="text-[13px] text-gray-800">
                I need a caterer for 100 people in Enugu next Saturday, budget
                around ₦300k.
              </p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-start gap-2.5">
            <Image
              src="/velte_ai_assistant.png"
              alt=""
              width={24}
              height={24}
              className="rounded-full object-cover shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0 bg-[#F8FAFC] rounded-2xl rounded-tl-md border border-gray-100 p-3.5">
              <p className="text-[13px] text-gray-700 leading-relaxed mb-3">
                I couldn&apos;t find a match on Velte for that yet — want me to
                check with a few businesses who might be able to help?
              </p>
              <span className="inline-flex items-center gap-1.5 border border-orange-200 bg-orange-50 text-orange-600 text-xs font-semibold px-3.5 py-2 rounded-full">
                Yes, find someone
              </span>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-start gap-2.5">
            <Image
              src="/velte_ai_assistant.png"
              alt=""
              width={24}
              height={24}
              className="rounded-full object-cover shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0 bg-[#F8FAFC] rounded-2xl rounded-tl-md border border-gray-100 p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                <p className="text-[13px] font-semibold text-gray-800">
                  Good news — ABC Catering can help.
                </p>
              </div>
              <p className="text-[12.5px] text-gray-500 leading-relaxed mb-3">
                They confirmed availability for your date and budget.
              </p>
              <span className="inline-flex items-center gap-1.5 bg-green-500 text-white text-xs font-semibold px-3.5 py-2 rounded-full">
                <MessageCircle size={12} />
                Chat with ABC Catering
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
