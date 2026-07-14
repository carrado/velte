"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Users,
  Zap,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WAITLIST_SECTOR_TAXONOMY, SECTOR_LABEL_BY_VALUE } from "@/lib/sectors";

const waitlistSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  businessName: z.string().min(2, "Enter your business or shop name"),
  whatsapp: z
    .string()
    .min(10, "Enter a valid WhatsApp number")
    .regex(/^[0-9+\s-]{10,15}$/, "Enter a valid WhatsApp number"),
  sector: z
    .string()
    .min(1, "Select what you sell")
    .refine((v) => v in SECTOR_LABEL_BY_VALUE, "Select what you sell"),
  area: z.string().min(2, "Tell us where in Enugu you're located"),
});

type WaitlistForm = z.infer<typeof waitlistSchema>;

const WEB3FORMS_ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;

async function submitToWaitlist(data: WaitlistForm) {
  if (!WEB3FORMS_ACCESS_KEY) {
    throw new Error(
      "Waitlist form isn't configured yet — missing Web3Forms access key.",
    );
  }

  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: "New Vendor Waitlist Signup — Velte (Enugu)",
      from_name: "Velte Waitlist",
      "Full Name": data.fullName,
      "Business Name": data.businessName,
      "WhatsApp Number": data.whatsapp,
      Sector: SECTOR_LABEL_BY_VALUE[data.sector] ?? data.sector,
      "Area in Enugu": data.area,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Something went wrong. Please try again.");
  }
  return json;
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-red-400 text-xs mt-1">{message}</p>;
}

const highlights = [
  { icon: Zap, label: "More customers, no ads" },
  { icon: MessageCircle, label: "AI sells for you, 24/7" },
  { icon: BadgeCheck, label: "Founding vendor perks" },
];

const VENDOR_BASE_COUNT = "1,000";

const WAITLIST_SECTORS = WAITLIST_SECTOR_TAXONOMY.flatMap((c) => c.sectors);

export default function Waitlist() {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm]);

  const mutation = useMutation({
    mutationFn: submitToWaitlist,
    onSuccess: () => {
      setSubmitted(true);
      toast.success("You're on the list! We'll reach out on WhatsApp.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  const form = useForm({
    defaultValues: {
      fullName: "",
      businessName: "",
      whatsapp: "",
      sector: "",
      area: "",
    } as WaitlistForm,
    onSubmit: async ({ value }) => {
      const parsed = waitlistSchema.safeParse(value);
      if (!parsed.success) return;
      await mutation.mutateAsync(parsed.data);
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#050d08]">
      {/* Header */}
      <header className="relative z-10 shrink-0">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-6 flex items-center justify-between">
          <Image
            src="/velte_ijulb7ijulb7ijul_h3d6xw.png"
            alt="Velte logo"
            width={92}
            height={18}
            priority
          />
          <span className="hidden sm:inline-flex items-center gap-1.5 bg-[rgb(247,107,16)]/[0.1] border border-[rgb(247,107,16)]/[0.2] text-[rgb(247,107,16)] text-xs font-semibold px-3 py-1.5 rounded-full">
            <MapPin className="w-3 h-3" />
            Now onboarding vendors in Enugu
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="relative flex-1 flex items-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(rgba(247,107,16,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(247,107,16,0.6) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[rgb(247,107,16)]/[0.12] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-2xl mx-auto px-5 sm:px-8 py-10 text-center w-full">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="sm:hidden inline-flex items-center gap-1.5 bg-[rgb(247,107,16)]/[0.1] border border-[rgb(247,107,16)]/[0.2] text-[rgb(247,107,16)] text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
          >
            <MapPin className="w-3 h-3" />
            Now onboarding vendors in Enugu
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[2.2rem] sm:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-4 text-balance"
          >
            Let AI Bring Buyers{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[rgb(247,107,16)] via-[rgb(255,140,50)] to-[rgb(255,180,90)]">
              Straight To Your Shop
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-white/55 max-w-xl mx-auto mb-7 leading-relaxed"
          >
            A buyer describes what they need — our AI matches them to nearby
            vendors like you and hands them straight to your WhatsApp to close
            the sale.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-8"
          >
            {highlights.map((h) => (
              <span
                key={h.label}
                className="flex items-center gap-1.5 text-white/60 text-sm font-medium"
              >
                <h.icon className="w-3.5 h-3.5 text-[rgb(247,107,16)]" />
                {h.label}
              </span>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex items-center justify-center gap-1.5 text-white/45 text-sm mb-7"
          >
            <Users className="w-3.5 h-3.5 text-[rgb(247,107,16)]" />
            {submitted ? `${VENDOR_BASE_COUNT}+` : VENDOR_BASE_COUNT} vendors
            joining the Enugu pilot
          </motion.p>

          {!showForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Button
                size="lg"
                onClick={() => setShowForm(true)}
                className="bg-[rgb(247,107,16)] cursor-pointer hover:bg-[rgb(247,107,16)]/90 text-white shadow-xl shadow-[rgb(247,107,16)]/25 text-[15px] px-9 gap-2 h-12"
              >
                Join the Waitlist
                <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="text-white/35 text-xs mt-4">
                Free · 2-minute signup · No card required
              </p>
            </motion.div>
          )}

          {/* Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                ref={formRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.4 }}
                className="overflow-hidden scroll-mt-24"
              >
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 sm:p-7 text-left mt-2">
                  {submitted ? (
                    <div className="text-center py-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-1.5">
                        You&apos;re on the list!
                      </h3>
                      <p className="text-white/50 text-sm leading-relaxed">
                        We&apos;ll reach out on WhatsApp as we onboard vendors
                        in your area.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.handleSubmit();
                      }}
                      className="space-y-3.5"
                    >
                      <form.Field
                        name="fullName"
                        validators={{
                          onChange: ({ value }) => {
                            const r =
                              waitlistSchema.shape.fullName.safeParse(value);
                            return r.success
                              ? undefined
                              : r.error.issues[0]?.message;
                          },
                        }}
                      >
                        {(field) => (
                          <div>
                            <Label
                              htmlFor={field.name}
                              className="text-white/70 text-sm mb-1.5"
                            >
                              Full Name
                            </Label>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              placeholder="e.g. Chidinma Okafor"
                              className="bg-transparent text-white border-white/15 placeholder:text-white/25 h-11"
                            />
                            <FieldError message={field.state.meta.errors[0]} />
                          </div>
                        )}
                      </form.Field>

                      <form.Field
                        name="businessName"
                        validators={{
                          onChange: ({ value }) => {
                            const r =
                              waitlistSchema.shape.businessName.safeParse(
                                value,
                              );
                            return r.success
                              ? undefined
                              : r.error.issues[0]?.message;
                          },
                        }}
                      >
                        {(field) => (
                          <div>
                            <Label
                              htmlFor={field.name}
                              className="text-white/70 text-sm mb-1.5"
                            >
                              Business / Shop Name
                            </Label>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              placeholder="e.g. Chidinma Fashion Hub"
                              className="bg-transparent text-white border-white/15 placeholder:text-white/25 h-11"
                            />
                            <FieldError message={field.state.meta.errors[0]} />
                          </div>
                        )}
                      </form.Field>

                      <form.Field
                        name="whatsapp"
                        validators={{
                          onChange: ({ value }) => {
                            const r =
                              waitlistSchema.shape.whatsapp.safeParse(value);
                            return r.success
                              ? undefined
                              : r.error.issues[0]?.message;
                          },
                        }}
                      >
                        {(field) => (
                          <div>
                            <Label
                              htmlFor={field.name}
                              className="text-white/70 text-sm mb-1.5"
                            >
                              WhatsApp Number
                            </Label>
                            <Input
                              id={field.name}
                              name={field.name}
                              type="tel"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              placeholder="e.g. 08012345678"
                              className="bg-transparent text-white border-white/15 placeholder:text-white/25 h-11"
                            />
                            <FieldError message={field.state.meta.errors[0]} />
                          </div>
                        )}
                      </form.Field>

                      <form.Field
                        name="sector"
                        validators={{
                          onChange: ({ value }) => {
                            const r =
                              waitlistSchema.shape.sector.safeParse(value);
                            return r.success
                              ? undefined
                              : r.error.issues[0]?.message;
                          },
                        }}
                      >
                        {(field) => (
                          <div>
                            <Label
                              htmlFor={field.name}
                              className="text-white/70 text-sm mb-1.5"
                            >
                              What do you sell?
                            </Label>
                            <Select
                              items={WAITLIST_SECTORS}
                              value={field.state.value}
                              onValueChange={(val) =>
                                field.handleChange(val ?? "")
                              }
                            >
                              <SelectTrigger
                                id={field.name}
                                className="w-full bg-transparent text-white border-white/15 h-11 [&_svg]:text-white/50"
                              >
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent className="max-h-72">
                                {WAITLIST_SECTOR_TAXONOMY.map((category) => (
                                  <SelectGroup key={category.id}>
                                    <SelectLabel className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                      {category.label}
                                    </SelectLabel>
                                    {category.sectors.map((leaf) => (
                                      <SelectItem
                                        key={leaf.value}
                                        value={leaf.value}
                                      >
                                        {leaf.label}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                              </SelectContent>
                            </Select>
                            <FieldError message={field.state.meta.errors[0]} />
                          </div>
                        )}
                      </form.Field>

                      <form.Field
                        name="area"
                        validators={{
                          onChange: ({ value }) => {
                            const r =
                              waitlistSchema.shape.area.safeParse(value);
                            return r.success
                              ? undefined
                              : r.error.issues[0]?.message;
                          },
                        }}
                      >
                        {(field) => (
                          <div>
                            <Label
                              htmlFor={field.name}
                              className="text-white/70 text-sm mb-1.5"
                            >
                              Where in Enugu?
                            </Label>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              placeholder="e.g. New Haven, Independence Layout"
                              className="bg-transparent text-white border-white/15 placeholder:text-white/25 h-11"
                            />
                            <FieldError message={field.state.meta.errors[0]} />
                          </div>
                        )}
                      </form.Field>

                      <form.Subscribe
                        selector={(state) => [
                          state.canSubmit,
                          state.isSubmitting,
                        ]}
                      >
                        {([canSubmit, isSubmitting]) => (
                          <Button
                            type="submit"
                            size="lg"
                            disabled={
                              !canSubmit || isSubmitting || mutation.isPending
                            }
                            className="w-full bg-[rgb(247,107,16)] cursor-pointer hover:bg-[rgb(247,107,16)]/90 text-white shadow-xl shadow-[rgb(247,107,16)]/25 h-12 gap-2 mt-1"
                          >
                            {isSubmitting || mutation.isPending
                              ? "Joining..."
                              : "Join the Waitlist"}
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        )}
                      </form.Subscribe>

                      <p className="flex items-center justify-center gap-1.5 text-white/30 text-xs pt-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        We&apos;ll only reach out about your Velte onboarding.
                      </p>
                    </form>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 py-4 text-center text-white/25 text-xs">
        &copy; {new Date().getFullYear()} Velte Technologies
      </footer>
    </div>
  );
}
