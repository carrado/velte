"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import FaqAccordionItem from "@/components/landing/FaqAccordionItem";
import {
  BuildingIcon,
  CheckCircleIcon,
  CrownIcon,
  StarIcon,
  UserIcon,
} from "@/components/icons";
import {
  SUBSCRIPTION_PRICES_NGN,
  type SubscriptionInterval,
} from "@/lib/subscriptions";
import { formatNaira } from "@/lib/utils";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { buyerApi } from "@/lib/buyer-api-client";
import {
  clearBuyerReferralCode,
  storedBuyerReferralCode,
} from "@/lib/buyerReferralCode";
import { firebaseAuth } from "@/lib/firebase";
import type { Buyer } from "@/types/buyer";
import type { User } from "@/types/user";
import type { FaqItem, PricingFaqItem } from "@/types/common";

import {
  type Audience,
  type CompareRowItem,
  HERO_CHECKS,
  BUYER_BASIC_FEATURES,
  BUYER_PREMIUM_FEATURES,
  BUYER_COMPARE_ROWS,
  VENDOR_BASIC_FEATURES,
  VENDOR_ENTERPRISE_FEATURES,
  VENDOR_COMPARE_ROWS,
  formatPlanPrice,
  BillingIntervalToggle,
  ComparisonTable,
  PlanCard,
} from "./shared";

export default function PublicPricingPage({
  faqs,
  initialAudience = "buyers",
}: {
  faqs: PricingFaqItem[];
  initialAudience?: Audience;
}) {
  const [audience, setAudience] = useState<Audience>(initialAudience);
  const [interval, setInterval] = useState<SubscriptionInterval>("monthly");
  const [googleBusy, setGoogleBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  async function triggerGoogleSignIn() {
    if (googleBusy) return;
    const auth = firebaseAuth();
    if (!auth) {
      window.location.href = "/auth/signup";
      return;
    }
    setGoogleBusy(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();

      const { buyer: newBuyer } = await buyerApi.post<{ buyer: Buyer }>(
        "/api/buyer-auth/firebase",
        { idToken, referralCode: storedBuyerReferralCode() },
      );
      clearBuyerReferralCode();
      useBuyerStore.getState().setBuyer(newBuyer);

      try {
        const res = await fetch("/api/auth/session", {
          credentials: "same-origin",
        });
        if (res.ok) {
          const session = (await res.json()) as {
            vendor: User | null;
            buyer: Buyer | null;
          };
          if (session.buyer) useBuyerStore.getState().setBuyer(session.buyer);
          if (session.vendor) useUserStore.getState().setUser(session.vendor);
        }
      } catch {
        /* best effort */
      }

      toast.success("Welcome to Velte!");
      window.location.href = "/pricing?for=buyers";
    } catch (err) {
      const code =
        typeof err === "object" && err && "code" in err
          ? String((err as { code: unknown }).code)
          : "";
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      const message =
        code === "auth/popup-blocked"
          ? "Your browser blocked the sign-in window. Allow pop-ups for this site and try again."
          : code === "auth/network-request-failed"
            ? "Couldn't reach Google. Check your connection and try again."
            : err instanceof Error
              ? err.message
              : "Couldn't sign you in.";
      setAuthError(message);
      toast.error(message);
    } finally {
      setGoogleBusy(false);
    }
  }

  const accordionFaqs: FaqItem[] = useMemo(
    () =>
      faqs.map((f) => ({
        question: f.q,
        answer: f.a,
        category: "buyer" as const,
      })),
    [faqs],
  );

  const premiumMonthly = SUBSCRIPTION_PRICES_NGN.buyer_premium.monthly;
  const premiumAnnual = SUBSCRIPTION_PRICES_NGN.buyer_premium.annual;
  const enterpriseMonthly = SUBSCRIPTION_PRICES_NGN.vendor_enterprise.monthly;
  const enterpriseAnnual = SUBSCRIPTION_PRICES_NGN.vendor_enterprise.annual;

  const buyerTableRows: CompareRowItem[] = useMemo(
    () =>
      BUYER_COMPARE_ROWS.map((r) => ({
        label: r.label,
        basicVal: r.free,
        premiumVal: r.premium,
        highlight: r.highlight,
        section: r.section,
      })),
    [],
  );

  const vendorTableRows: CompareRowItem[] = useMemo(
    () =>
      VENDOR_COMPARE_ROWS.map((r) => ({
        label: r.label,
        basicVal: r.basic,
        premiumVal: r.enterprise,
        highlight: r.highlight,
        section: r.section,
      })),
    [],
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-canvas pt-16">
        {/* Full-width HubHero slab immediately after header — photo fades in from the right */}
        <section className="relative w-full overflow-hidden bg-slab text-white">
          <div className="absolute inset-y-0 right-0 hidden w-[52%] md:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pricing-hero-subject.jpg"
              alt=""
              className="h-full w-full object-cover object-[62%_center]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slab via-slab/55 to-transparent" />
          </div>

          <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-7 sm:py-9 flex items-center gap-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-xl"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                Simple plans. Bigger opportunities.
              </p>
              <h1 className="mt-2 text-[1.75rem] font-bold leading-[1.15] tracking-tight text-balance sm:text-4xl">
                Choose the plan that fits your goals
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
                Whether you&apos;re a buyer looking for the best deals or a
                vendor ready to grow, Velte has a plan for you.
              </p>

              <div
                role="tablist"
                aria-label="Pricing audience"
                className="mt-4 inline-flex rounded-full border border-white/15 bg-black/35 p-1"
              >
                {(
                  [
                    { key: "buyers", label: "For Buyers" },
                    { key: "vendors", label: "For Vendors" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={audience === tab.key}
                    onClick={() => setAudience(tab.key)}
                    className="rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer text-white/80 hover:text-white data-[selected=true]:bg-orange-500 data-[selected=true]:text-white data-[selected=true]:shadow-lg data-[selected=true]:shadow-orange-500/30"
                    data-selected={audience === tab.key}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 md:hidden">
                {HERO_CHECKS.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-1.5 text-xs font-medium text-white/80"
                  >
                    <CheckCircleIcon
                      size={14}
                      weight="fill"
                      className="shrink-0 text-orange-500"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {audience === "buyers" ? (
            <motion.section
              key="buyers"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="bg-canvas px-5 py-16 sm:px-8 sm:py-20"
            >
              <div className="mx-auto max-w-7xl">
                <div className="mx-auto mb-8 max-w-2xl text-center">
                  <p className="mb-2 text-xs font-bold tracking-[0.16em] text-orange-500 uppercase">
                    Buyer plans
                  </p>
                  <h2 className="text-3xl font-bold tracking-tight text-ink text-balance sm:text-4xl">
                    Get more from Velte
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink/75 sm:text-base">
                    Start for free. Upgrade to Premium for unlimited search
                    credits, more photo searches, and every buyer power tool.
                  </p>

                  <div className="mt-6 flex justify-center">
                    <BillingIntervalToggle
                      interval={interval}
                      onChange={setInterval}
                    />
                  </div>
                </div>

                {authError && (
                  <div className="mx-auto mb-6 max-w-md rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    {authError}
                  </div>
                )}

                <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
                  <PlanCard
                    icon={UserIcon}
                    name="Free"
                    blurb="Comparative search, cart, and checkout inside a daily credit allowance."
                    priceLabel="₦0"
                    priceSuffix="/month"
                    priceNote="Free forever"
                    features={BUYER_BASIC_FEATURES}
                    ctaLabel={googleBusy ? "Signing in…" : "Get Started"}
                    onCtaClick={triggerGoogleSignIn}
                    loading={googleBusy}
                    variant="default"
                  />
                  <PlanCard
                    icon={CrownIcon}
                    name="Premium"
                    blurb="Unlimited shopping credits, more photo searches, buyer requests, Hub tools, and the full social toolkit."
                    priceLabel={
                      interval === "annual"
                        ? formatNaira(premiumAnnual * 100)
                        : formatNaira(premiumMonthly * 100)
                    }
                    priceSuffix={interval === "annual" ? "/year" : "/month"}
                    priceNote={
                      interval === "annual"
                        ? `${formatNaira(Math.round(premiumAnnual / 12) * 100)}/mo equivalent · 17% discount`
                        : "Billed monthly · Cancel anytime"
                    }
                    features={BUYER_PREMIUM_FEATURES}
                    ctaLabel={googleBusy ? "Signing in…" : "Get Started"}
                    onCtaClick={triggerGoogleSignIn}
                    loading={googleBusy}
                    variant="popular"
                    badge="Most Popular"
                  />
                </div>

                {/* Feature comparison table */}
                <ComparisonTable
                  basicName="Free"
                  basicPrice="₦0/month"
                  premiumName="Premium"
                  premiumPrice={formatPlanPrice(
                    interval,
                    premiumMonthly,
                    premiumAnnual,
                  )}
                  badgeText="Most Popular"
                  rows={buyerTableRows}
                />

                <p className="mx-auto mt-8 max-w-xl text-center text-xs leading-relaxed text-ink/65">
                  Cancel anytime. Yearly plans include a 17% discount.
                </p>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="vendors"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="bg-canvas px-5 py-16 sm:px-8 sm:py-20"
            >
              <div className="mx-auto max-w-7xl">
                <div className="mx-auto mb-8 max-w-2xl text-center">
                  <p className="mb-2 text-xs font-bold tracking-[0.16em] text-orange-500 uppercase">
                    Vendor plans
                  </p>
                  <h2 className="text-3xl font-bold tracking-tight text-ink text-balance sm:text-4xl">
                    Grow your business with Velte
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink/75 sm:text-base">
                    List for free. Basic vendors pay ₦1,000 per matched lead.
                    Enterprise waives all lead fees, unlocks direct WhatsApp
                    handoffs to chat and close buyers, and includes Hub boosts,
                    pins, and analytics.
                  </p>

                  <div className="mt-6 flex justify-center">
                    <BillingIntervalToggle
                      interval={interval}
                      onChange={setInterval}
                    />
                  </div>
                </div>

                <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
                  <PlanCard
                    icon={BuildingIcon}
                    name="Basic"
                    blurb="Free to list. Pay ₦1,000 only when a qualified lead is delivered."
                    priceLabel="₦1,000"
                    priceSuffix="/lead"
                    priceNote="Pay as you go"
                    features={VENDOR_BASIC_FEATURES}
                    ctaLabel="Get Started"
                    ctaHref="/auth/signup"
                    variant="default"
                  />
                  <PlanCard
                    icon={StarIcon}
                    name="Enterprise"
                    blurb="Direct WhatsApp handoff, lead fee waived, free boosts and pins, plus business insights."
                    priceLabel={
                      interval === "annual"
                        ? formatNaira(enterpriseAnnual * 100)
                        : formatNaira(enterpriseMonthly * 100)
                    }
                    priceSuffix={interval === "annual" ? "/year" : "/month"}
                    priceNote={
                      interval === "annual"
                        ? `${formatNaira(Math.round(enterpriseAnnual / 12) * 100)}/mo equivalent · 17% discount`
                        : "Billed monthly · Cancel anytime"
                    }
                    features={VENDOR_ENTERPRISE_FEATURES}
                    ctaLabel="Get Started"
                    ctaHref="/auth/signup"
                    variant="popular"
                    badge="Best Value"
                  />
                </div>

                {/* Feature comparison table */}
                <ComparisonTable
                  basicName="Basic"
                  basicPrice="₦1,000/lead"
                  premiumName="Enterprise"
                  premiumPrice={formatPlanPrice(
                    interval,
                    enterpriseMonthly,
                    enterpriseAnnual,
                  )}
                  badgeText="Best Value"
                  rows={vendorTableRows}
                />

                <p className="mx-auto mt-8 max-w-xl text-center text-xs leading-relaxed text-ink/65">
                  Cancel anytime. Yearly plans include a 17% discount.
                </p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="border-t border-gray-200 dark:border-white/10 bg-canvas px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-ink">
              Got questions?
            </h2>
            <div className="space-y-3">
              {accordionFaqs.map((faq, i) => (
                <FaqAccordionItem
                  key={faq.question}
                  faq={faq}
                  defaultOpen={i === 0}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#14120f] px-5 py-12 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-lg font-bold text-white">
                Ready to get started?
              </p>
              <p className="mt-1 text-sm text-white/60">
                Join thousands of Nigerians finding — and selling — what they
                need on Velte.
              </p>
            </div>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-colors hover:bg-orange-600"
            >
              Get Started
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
