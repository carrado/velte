"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Bike,
  Building2,
  Car,
  CheckCircle2,
  Copy,
  Info,
  KeyRound,
  Package,
  ShieldCheck,
  User,
  X,
  Clock,
  ArrowRight,
} from "lucide-react";
import { modalScrimClass } from "@/lib/modalScrim";
import { cn } from "@/lib/utils";

interface ByolModalProps {
  open: boolean;
  onClose: () => void;
  productTitle?: string;
  vendorName?: string;
  onConfirmByol?: (details: {
    courierType: string;
    courierName: string;
    riderPhone: string;
    timeWindow: string;
    instructions: string;
  }) => void;
}

const COURIER_TYPES = [
  {
    id: "bike",
    label: "Dispatch Bike",
    desc: "Gokada, Max, or private dispatch rider",
    icon: Bike,
  },
  {
    id: "agency",
    label: "Logistics Agency",
    desc: "DHL, GIG, Fez, Red Star, etc.",
    icon: Building2,
  },
  {
    id: "ride",
    label: "Ride Hailing Package",
    desc: "Uber Package or Bolt Delivery driver",
    icon: Car,
  },
  {
    id: "personal",
    label: "Self / Representative",
    desc: "You or a colleague collecting in person",
    icon: User,
  },
];

const TIME_WINDOWS = [
  "Immediate (Within 1-2 hours)",
  "Today (Afternoon 12PM - 4PM)",
  "Today (Evening 4PM - 7PM)",
  "Tomorrow Morning (9AM - 12PM)",
  "Arrange with Vendor in Chat",
];

export function ByolModal({
  open,
  onClose,
  productTitle = "this item",
  vendorName = "the vendor",
  onConfirmByol,
}: ByolModalProps) {
  const [courierType, setCourierType] = useState("bike");
  const [courierName, setCourierName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [timeWindow, setTimeWindow] = useState(TIME_WINDOWS[0]);
  const [instructions, setInstructions] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  if (!open) return null;

  const handleCopyGuide = () => {
    const text = `Velte BYOL Pickup Guide for ${vendorName}:\n1. Order: ${productTitle}\n2. Pickup method: Bring Your Own Logistics (BYOL)\n3. Handover PIN: Will be provided on order confirmation.\n4. Courier must verify item condition before giving code to seller.`;
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    toast.success("BYOL courier instructions copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleConfirm = () => {
    onConfirmByol?.({
      courierType,
      courierName: courierName.trim() || courierType,
      riderPhone: riderPhone.trim(),
      timeWindow,
      instructions: instructions.trim(),
    });
    toast.success("BYOL courier logistics selected for this order!");
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="byol-modal-title"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto",
        modalScrimClass(),
      )}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl bg-surface border border-gray-200 dark:border-white/10 shadow-2xl p-5 sm:p-7 overflow-hidden my-auto max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-[#ff5500] flex items-center justify-center shrink-0 border border-orange-500/20">
              <Package size={22} className="text-[#ff5500]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="byol-modal-title"
                  className="text-lg font-bold text-ink leading-tight"
                >
                  Bring Your Own Logistics (BYOL)
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-ink/60 mt-0.5">
                Send your own dispatch rider or courier to pick up from{" "}
                {vendorName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-ink hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-6 pt-5 pr-1 text-sm text-ink flex-1">
          {/* Trust Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 p-3.5 flex items-start gap-3">
            <ShieldCheck
              size={20}
              className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
            />
            <div className="text-xs leading-relaxed">
              <span className="font-bold text-emerald-800 dark:text-emerald-300">
                Secure Handover Verification
              </span>
              <p className="text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                Your courier inspects the item, and handover is confirmed once
                the 6-digit pickup PIN is validated with the vendor.
              </p>
            </div>
          </div>

          {/* 3-Step Handover Visual */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-ink/40">
              How BYOL Works
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/2 p-3 space-y-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white font-extrabold text-[10px]">
                  1
                </span>
                <p className="font-bold text-xs text-ink">Choose &amp; Pay</p>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Pay securely for your items without paying extra platform
                  courier fees.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/2 p-3 space-y-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white font-extrabold text-[10px]">
                  2
                </span>
                <p className="font-bold text-xs text-ink">Get Pickup PIN</p>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Receive a secret 6-digit code and seller pickup address.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/2 p-3 space-y-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white font-extrabold text-[10px]">
                  3
                </span>
                <p className="font-bold text-xs text-ink">Courier Handover</p>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Rider verifies package and gives code to release it.
                </p>
              </div>
            </div>
          </div>

          {/* Courier Selection Form */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-ink block">
              Select Courier Type
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {COURIER_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = courierType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setCourierType(type.id)}
                    className={cn(
                      "flex flex-col text-left p-3 rounded-2xl border transition-all cursor-pointer relative",
                      isSelected
                        ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/20 ring-1 ring-orange-500 shadow-xs"
                        : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-surface",
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <Icon
                        size={18}
                        className={
                          isSelected ? "text-[#ff5500]" : "text-gray-400"
                        }
                      />
                      {isSelected && (
                        <CheckCircle2
                          size={15}
                          className="text-[#ff5500] fill-orange-500/20"
                        />
                      )}
                    </div>
                    <span className="text-xs font-bold text-ink">
                      {type.label}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-ink/60 mt-0.5 line-clamp-1">
                      {type.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Details */}
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-ink/80 mb-1">
                  Courier / Rider Name (Optional)
                </label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g. Ibrahim / Gokada rider"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs text-ink placeholder:text-gray-400 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-ink/80 mb-1">
                  Rider Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={riderPhone}
                  onChange={(e) => setRiderPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs text-ink placeholder:text-gray-400 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-ink/80 mb-1">
                Estimated Pickup Window
              </label>
              <div className="relative">
                <select
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-surface text-xs text-ink focus:outline-none focus:border-orange-500 cursor-pointer appearance-none"
                >
                  {TIME_WINDOWS.map((win) => (
                    <option key={win} value={win}>
                      {win}
                    </option>
                  ))}
                </select>
                <Clock
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-ink/80 mb-1">
                Special Handover Instructions for Vendor
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
                placeholder="e.g. Rider will arrive with thermal bag, please double-box fragile contents."
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs text-ink placeholder:text-gray-400 focus:outline-none focus:border-orange-500 resize-none"
              />
            </div>
          </div>

          {/* Code Preview Note */}
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/15 bg-gray-50/50 dark:bg-white/2 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <KeyRound size={18} className="text-[#ff5500] shrink-0" />
              <div>
                <p className="text-xs font-bold text-ink">
                  Handover Verification PIN
                </p>
                <p className="text-[11px] text-gray-500">
                  Unique 6-digit code (e.g.{" "}
                  <span className="font-mono font-bold text-[#ff5500]">
                    VLT-8429
                  </span>
                  ) generated after checkout.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyGuide}
              className="text-[11px] font-bold text-[#ff5500] hover:text-orange-700 inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Copy size={12} />
              <span>{copiedCode ? "Copied!" : "Copy Guide"}</span>
            </button>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="pt-4 mt-2 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-ink/80 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#ff5500] hover:bg-orange-600 active:scale-95 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Confirm BYOL Logistics</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
