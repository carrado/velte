"use client";

import { motion } from "motion/react";
import { ShoppingBag, Storefront, ArrowRight } from "@phosphor-icons/react";

interface Props {
  onSelect: (role: "buyer" | "vendor") => void;
}

export default function RolePicker({ onSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="w-full max-w-[520px]"
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-ink mb-2 tracking-tight">
          Join Velte
        </h1>
        <p className="text-gray-500 text-sm">
          How would you like to use Velte?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Buyer card */}
        <button
          onClick={() => onSelect("buyer")}
          className="group relative flex flex-col items-center text-center gap-4 p-6 rounded-2xl border border-gray-200 bg-surface hover:border-orange-400 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-200 cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
            <ShoppingBag
              size={28}
              weight="duotone"
              className="text-orange-500"
            />
          </div>
          <div>
            <p className="font-semibold text-ink text-base mb-1">
              I&apos;m a Buyer
            </p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Shop from local vendors, track orders, and discover what&apos;s
              near you.
            </p>
          </div>
          <span className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400">
            <ArrowRight size={16} weight="bold" />
          </span>
        </button>

        {/* Vendor card */}
        <button
          onClick={() => onSelect("vendor")}
          className="group relative flex flex-col items-center text-center gap-4 p-6 rounded-2xl border border-gray-200 bg-surface hover:border-orange-400 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-200 cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
            <Storefront
              size={28}
              weight="duotone"
              className="text-orange-500"
            />
          </div>
          <div>
            <p className="font-semibold text-ink text-base mb-1">
              I&apos;m a Vendor
            </p>
            <p className="text-gray-400 text-xs leading-relaxed">
              List your business, receive orders, and get discovered by nearby
              buyers.
            </p>
          </div>
          <span className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400">
            <ArrowRight size={16} weight="bold" />
          </span>
        </button>
      </div>

      <p className="text-center text-gray-400 text-xs mt-6">
        You can always switch later. By signing up you agree to our{" "}
        <a
          href="/legal/terms"
          className="text-orange-500 hover:text-orange-600 underline underline-offset-2"
        >
          Terms of Service
        </a>
        .
      </p>
    </motion.div>
  );
}
