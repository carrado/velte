"use client";

import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { usersApi } from "@/services/users";
import {
  getStoredReferralCode,
  storeReferralCode,
  clearStoredReferralCode,
} from "@/lib/referralCode";
import { step1Schema, step2Schema, signupSchema } from "./schema";
import type { SignupForm } from "./schema";
import WizardProgress from "./_components/WizardProgress";
import Step1BusinessAccount from "./_components/Step1BusinessAccount";
import Step2SectorDescription from "./_components/Step2SectorDescription";

const STEP1_FIELDS = [
  "name",
  "businessName",
  "phone",
  "email",
  "state",
  "address",
  "username",
  "password",
  "confirmPassword",
  "referralCode",
] as const;

export default function Signup() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  // True once a code was actually prefilled from a referral link (see the
  // effect below) — locks the field so it can't be edited/cleared, since it
  // came from a trusted source. Stays false (field stays editable, empty)
  // when nothing was captured, e.g. a friend just told them the code.
  const [referralLocked, setReferralLocked] = useState(false);

  const signupMutation = useMutation({
    mutationFn: (data: Omit<SignupForm, "confirmPassword" | "agreedToTerms">) =>
      usersApi.create(data),
    onSuccess: (_response, variables) => {
      // Done its job — a leftover code in storage after a real signup would
      // otherwise silently reattach to a completely unrelated future signup
      // on this same browser.
      clearStoredReferralCode();
      toast.success("Account created! Welcome to Velte.");
      router.push(`/auth/verify?email=${variables.email}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      businessName: "",
      email: "",
      password: "",
      confirmPassword: "",
      username: "",
      phone: "",
      state: "",
      address: "",
      location: null as { lat: number; lng: number } | null,
      sectors: [] as string[],
      description: "",
      referralCode: "",
      agreedToTerms: false as boolean,
    } satisfies SignupForm,
    onSubmit: async ({ value }) => {
      const parsed = signupSchema.safeParse(value);
      if (!parsed.success) {
        toast.error("Please fix the highlighted fields before submitting.");
        return;
      }
      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        confirmPassword: _confirmPassword,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        agreedToTerms: _agreedToTerms,
        ...apiData
      } = parsed.data;
      signupMutation.mutate(apiData);
    },
  });

  // Deliberately in an effect, not `defaultValues` — defaultValues is
  // evaluated during SSR too (where localStorage doesn't exist), so reading
  // it there would either always be empty or risk a hydration mismatch
  // against whatever the client actually has stored. Only prefills if the
  // buyer hasn't already typed something in themselves.
  //
  // Read the URL's own `?ref=` directly rather than only trusting localStorage
  // — <ReferralCapture> (root layout) writes that same storage, but it's a
  // separate Suspense boundary with no ordering guarantee against this effect,
  // so a referral link pointed straight at /auth/signup could otherwise lose
  // the race and land here before the code is persisted.
  useEffect(() => {
    const urlRef = new URLSearchParams(window.location.search).get("ref");
    if (urlRef) storeReferralCode(urlRef);
    const stored = urlRef
      ? urlRef.trim().toUpperCase()
      : getStoredReferralCode();
    if (stored && !form.store.state.values.referralCode) {
      form.setFieldValue("referralCode", stored);
      setReferralLocked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = async () => {
    // Surface inline errors on any untouched step-1 fields, then gate advance.
    await Promise.all(
      STEP1_FIELDS.map((name) => form.validateField(name, "change")),
    );
    const result = step1Schema.safeParse(form.store.state.values);
    if (!result.success) {
      toast.error("Please complete all fields in this step to continue.");
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen bg-[#F1F5F9] flex items-center justify-center sm:p-5 overflow-x-hidden">
      {/* Background effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-500/[0.07] rounded-full blur-[120px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(249,115,22,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.6) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-[640px]"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 justify-center mb-3"
        >
          <Image
            src="/velte_logo_esn5dj.png"
            alt="Velte logo"
            width={100}
            height={20}
            priority
          />
        </Link>

        {/* Card */}
        <div className="bg-white border border-white/[0.08] sm:rounded-2xl p-8 shadow-2xl">
          <div className="mb-8">
            <WizardProgress step={step} />
            <h1 className="text-2xl font-bold text-black mb-2 tracking-tight">
              {step === 1
                ? "Get started with Velte"
                : "Tell buyers what you do"}
            </h1>
            <p className="text-black/45 text-sm">
              {step === 1
                ? "Set up your business profile so buyers can find and reach you."
                : "Pick your sector and describe your business — this powers AI discovery."}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: step === 1 ? -16 : 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: step === 1 ? 16 : -16 }}
                transition={{ duration: 0.25 }}
              >
                {step === 1 ? (
                  <Step1BusinessAccount
                    form={form}
                    referralLocked={referralLocked}
                  />
                ) : (
                  <Step2SectorDescription form={form} />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <div className="mt-8">
              {step === 1 ? (
                <Button
                  type="button"
                  onClick={handleContinue}
                  size="lg"
                  className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setStep(1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="cursor-pointer border-black/[0.15] text-black/70 hover:bg-black/[0.03] gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <form.Subscribe
                    selector={(state) =>
                      [
                        state.isSubmitting,
                        step2Schema.safeParse({
                          sectors: state.values.sectors,
                          description: state.values.description,
                          agreedToTerms: state.values.agreedToTerms,
                        }).success,
                      ] as const
                    }
                  >
                    {([isSubmitting, step2Valid]) => (
                      <Button
                        type="submit"
                        disabled={
                          isSubmitting ||
                          signupMutation.isPending ||
                          !step2Valid
                        }
                        size="lg"
                        className="flex-1 bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 gap-2"
                      >
                        {isSubmitting || signupMutation.isPending
                          ? "Creating account..."
                          : "Create account"}
                        {!isSubmitting && !signupMutation.isPending && (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </form.Subscribe>
                </div>
              )}
            </div>
          </form>

          <p className="text-center text-black/40 text-sm mt-6">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-orange-500 hover:text-orange-400 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-white/20 text-xs mt-5">
          Your data is never sold to third parties.
        </p>
      </motion.div>
    </div>
  );
}
