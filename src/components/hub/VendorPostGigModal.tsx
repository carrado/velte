"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  Camera,
  CheckCircle,
  Clock,
  CurrencyNgn,
  Globe,
  MapPin,
  Plus,
  ShieldCheck,
  Truck,
  Wrench,
  X,
} from "@phosphor-icons/react";
import { modalScrimClass } from "@/lib/modalScrim";
import { cn } from "@/lib/utils";

interface VendorPostGigModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const GIG_CATEGORIES = [
  {
    id: "audit_kyc",
    name: "KYC & Storefront Audit",
    icon: ShieldCheck,
    desc: "Physical address check, vendor KYC, and storefront verification.",
  },
  {
    id: "photography_media",
    name: "Photography & Media",
    icon: Camera,
    desc: "Product photo shoots, video reviews, and showroom photos.",
  },
  {
    id: "delivery_logistics",
    name: "Delivery & Logistics",
    icon: Truck,
    desc: "Urgent package pickup, dispatch courier, and logistics handoff.",
  },
  {
    id: "technical_service",
    name: "Technical & Installation",
    icon: Wrench,
    desc: "Equipment setup, repair, software configuration, or maintenance.",
  },
  {
    id: "marketing_promotion",
    name: "Marketing & Promotion",
    icon: Globe,
    desc: "Social media unboxing, campus awareness, or regional promo.",
  },
  {
    id: "custom",
    name: "Custom Task / Gig",
    icon: Briefcase,
    desc: "Any other specialized business assignment or merchant errand.",
  },
];

export function VendorPostGigModal({
  open,
  onClose,
  onSuccess,
}: VendorPostGigModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("audit_kyc");
  const [workMode, setWorkMode] = useState<"on-site" | "remote" | "hybrid">(
    "on-site",
  );
  const [location, setLocation] = useState("");
  const [budgetNaira, setBudgetNaira] = useState("");
  const [deadline, setDeadline] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || title.trim().length < 5) {
      toast.error("Please enter a title of at least 5 characters.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      toast.error(
        "Please enter a detailed description of at least 10 characters.",
      );
      return;
    }

    const numericAmount = Number(budgetNaira.replace(/\D/g, ""));
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Please specify a valid bounty reward amount in Naira.");
      return;
    }

    const rewardKobo = numericAmount * 100;
    const finalLocation =
      workMode === "remote"
        ? "Remote (Any Location)"
        : location.trim() || "Nigeria";

    setSubmitting(true);
    try {
      const res = await fetch("/api/hub/gigs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          workMode,
          location: finalLocation,
          rewardType: "instant",
          rewardKobo,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          requiredSkills: skills,
        }),
      });

      const resData = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(resData?.error || "Failed to publish gig.");
      }

      toast.success(
        "Gig published successfully! Verified buyers and agents can now apply.",
      );
      // Reset form
      setTitle("");
      setDescription("");
      setLocation("");
      setBudgetNaira("");
      setDeadline("");
      setSkills([]);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error publishing gig.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        modalScrimClass,
        "z-50 flex items-center justify-center p-3 sm:p-5",
      )}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-surface border border-gray-100 dark:border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#ff5500] flex items-center justify-center shrink-0">
              <Briefcase size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-ink leading-tight">
                Post a Task or Bounty
              </h2>
              <p className="text-xs text-gray-500 dark:text-ink/60">
                Engage verified agents and premium buyers across Nigeria
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-ink hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5"
        >
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-ink mb-2">
              Assignment Category <span className="text-[#ff5500]">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {GIG_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5",
                      isSelected
                        ? "border-[#ff5500] bg-orange-50/70 dark:bg-orange-950/20 text-[#ff5500] ring-1 ring-orange-500/30"
                        : "border-gray-200/80 dark:border-white/10 bg-transparent text-gray-700 dark:text-ink hover:border-gray-300 dark:hover:border-white/20",
                    )}
                  >
                    <Icon
                      size={20}
                      weight={isSelected ? "fill" : "duotone"}
                      className={
                        isSelected ? "text-[#ff5500]" : "text-gray-400"
                      }
                    />
                    <div>
                      <div className="text-xs font-bold leading-tight line-clamp-1">
                        {cat.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Task Title <span className="text-[#ff5500]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Storefront Address & Stock Verification in Ikeja"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3.5 text-xs sm:text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:border-[#ff5500]"
            />
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Detailed Instructions &amp; Requirements{" "}
              <span className="text-[#ff5500]">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe what needs to be done, specific deliverables (e.g. 4 photos of storefront, signed invoice), and inspection steps..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-transparent p-3.5 text-xs sm:text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:border-[#ff5500]"
            />
          </div>

          {/* Work Mode & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Work Mode <span className="text-[#ff5500]">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["on-site", "remote", "hybrid"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setWorkMode(mode)}
                    className={cn(
                      "py-2 px-2 rounded-xl border text-xs font-bold capitalize transition cursor-pointer text-center",
                      workMode === mode
                        ? "border-[#ff5500] bg-orange-50/70 dark:bg-orange-950/20 text-[#ff5500]"
                        : "border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-ink/70 hover:border-gray-300",
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {workMode !== "remote" && (
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Physical Location <span className="text-[#ff5500]">*</span>
                </label>
                <div className="relative">
                  <MapPin
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Village, Ikeja, Lagos"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent pl-9 pr-3.5 text-xs sm:text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:border-[#ff5500]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bounty Reward & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Escrow Bounty Payout (₦){" "}
                <span className="text-[#ff5500]">*</span>
              </label>
              <div className="relative">
                <CurrencyNgn
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ff5500] pointer-events-none"
                />
                <input
                  type="text"
                  required
                  placeholder="e.g. 25,000"
                  value={budgetNaira}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "");
                    setBudgetNaira(clean ? Number(clean).toLocaleString() : "");
                  }}
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent pl-9 pr-3.5 text-xs sm:text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:border-[#ff5500]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Target Deadline (Optional)
              </label>
              <div className="relative">
                <Clock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent pl-9 pr-3.5 text-xs sm:text-sm text-ink focus:outline-none focus:border-[#ff5500]"
                />
              </div>
            </div>
          </div>

          {/* Required Skills (Chips) */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Required Skills / Assets (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Smartphone photography, CAC knowledge, Punctuality"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3.5 text-xs text-ink placeholder:text-gray-400 focus:outline-none focus:border-[#ff5500]"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-3.5 h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-ink text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
              >
                Add
              </button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 text-[#ff5500] text-xs font-medium"
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(s)}
                      className="hover:text-red-600 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Escrow Guarantee Callout */}
          <div className="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-500/20 flex items-start gap-3">
            <CheckCircle
              size={18}
              weight="fill"
              className="text-[#ff5500] shrink-0 mt-0.5"
            />
            <div className="text-[11px] text-gray-600 dark:text-ink/75 leading-relaxed">
              <strong className="text-ink">100% Velte Escrow Protected:</strong>{" "}
              Bounty funds are securely locked upon assignment and released
              directly to the agent only after you inspect and approve their
              proof of work.
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-ink/70 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#ff5500] hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Publishing Task..." : "Publish Bounty to Hub"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
