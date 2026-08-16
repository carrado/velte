"use client";

import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { usersApi } from "@/services/users";
import {
  getStoredReferralCode,
  storeReferralCode,
  clearStoredReferralCode,
} from "@/lib/referralCode";
import { step1Schema, step2Schema, signupSchema } from "../schema";
import type { SignupForm } from "../schema";
import WizardProgress from "./WizardProgress";
import Step1BusinessAccount from "./Step1BusinessAccount";
import Step2SectorDescription from "./Step2SectorDescription";

/* /auth/signup's only form again (2026-08-16 — the Buyer/Vendor toggle it
   briefly shared the page with is gone, see that page's own comment). Was
   already relocated to its own file during the 2026-08-15 unification so
   the page could swap it in/out; kept that way since there's no reason to
   fold it back into the page now. Logic unchanged throughout: still a
   2-step TanStack Form, still validates step 1 before advancing, still
   resends a waitlist-link/referral-code prefill on mount. */

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

export default function VendorSignupForm() {
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
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get("ref");
    if (urlRef) storeReferralCode(urlRef);
    const stored = urlRef
      ? urlRef.trim().toUpperCase()
      : getStoredReferralCode();
    if (stored && !form.store.state.values.referralCode) {
      form.setFieldValue("referralCode", stored);
      setReferralLocked(true);
    }

    // Waitlist signup links (scripts/generate-signup-links.js) carry the
    // vendor's own details as query params so they land on a form that's
    // already filled in with what they told us on the waitlist, instead of
    // retyping it. Written as individual field checks rather than a loop
    // over a field-name map — see SIGNUP_FIELD_SCHEMAS's own comment on
    // TanStack Form's invariant generics; a generic `setFieldValue(name,
    // value)` call fights the types far more than this does. Only ever
    // fills an EMPTY field, never overwrites something already typed.
    if (params.get("name") && !form.store.state.values.name) {
      form.setFieldValue("name", params.get("name")!);
    }
    if (params.get("businessName") && !form.store.state.values.businessName) {
      form.setFieldValue("businessName", params.get("businessName")!);
    }
    if (params.get("phone") && !form.store.state.values.phone) {
      form.setFieldValue("phone", params.get("phone")!);
    }
    if (params.get("state") && !form.store.state.values.state) {
      form.setFieldValue("state", params.get("state")!);
    }
    if (params.get("address") && !form.store.state.values.address) {
      form.setFieldValue("address", params.get("address")!);
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
    <>
      <div className="mb-8">
        <WizardProgress step={step} />
        <h1 className="text-2xl font-bold text-[#023337] mb-2 tracking-tight">
          {step === 1 ? "Get started with Velte" : "Tell buyers what you do"}
        </h1>
        <p className="text-gray-500 text-sm">
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
                className="cursor-pointer border-gray-200 text-gray-600 hover:bg-gray-50 gap-2"
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
                      isSubmitting || signupMutation.isPending || !step2Valid
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
    </>
  );
}
