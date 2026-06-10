"use client";

import { motion } from "motion/react";
import Image from "next/image";

type UseCase = {
  image: string;
  category: string;
  title: string;
  blurb: string;
};

const useCases: UseCase[] = [
  {
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80&auto=format&fit=crop",
    category: "Fashion & Apparel",
    title: "Boutiques that never miss a DM",
    blurb:
      "Answer sizing and restock questions instantly, share lookbooks, and lock in the sale before they scroll away.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80&auto=format&fit=crop",
    category: "Electronics & Gadgets",
    title: "Tech stores that quote in seconds",
    blurb:
      "Confirm specs, compare models, and check live stock so customers buy with confidence — no back-and-forth.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80&auto=format&fit=crop",
    category: "Beauty & Cosmetics",
    title: "Brands that upsell on autopilot",
    blurb:
      "Recommend bundles, handle shade questions, and turn every enquiry into a basket — in your brand's voice.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80&auto=format&fit=crop",
    category: "FMCG & Wholesale",
    title: "Distributors that scale orders",
    blurb:
      "Process bulk requests, apply tiered pricing, and send payment links — all while you focus on logistics.",
  },
];

export default function UseCases() {
  return (
    <section className="bg-[#050d08] py-24 lg:py-32 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-0 right-1/4 w-[420px] h-[420px] bg-[rgb(247,107,16)]/[0.07] rounded-full blur-[110px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest text-[rgb(247,107,16)] uppercase mb-4">
            Built for real sellers
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-5 text-balance">
            Whatever you sell, Velte
            <br />
            sells it better
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            From a one-person boutique to a nationwide distributor — thousands
            of businesses trust Velte to handle the conversations that close
            deals.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {useCases.map((uc, i) => (
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0a140d]"
            >
              {/* Photo */}
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={uc.image}
                  alt={uc.category}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050d08] via-[#050d08]/55 to-transparent" />

                <span className="absolute top-4 left-4 inline-block bg-[rgb(247,107,16)] text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-lg shadow-black/30">
                  {uc.category}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="text-white font-semibold text-[17px] leading-snug mb-2">
                    {uc.title}
                  </h3>
                  <p className="text-white/60 text-[13px] leading-relaxed">
                    {uc.blurb}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
