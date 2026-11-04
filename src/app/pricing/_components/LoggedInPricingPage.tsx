"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircleIcon, HelpCircle } from "lucide-react";
import { toast } from "sonner";

import { HubHeader } from "@/components/hub/HubHeader";
import { HubNotificationsSync } from "@/components/hub/HubNotificationsSync";
import { NavigationProgressProvider } from "@/components/hub/HubNavigationProgressContext";
import { CreditsModalProvider } from "@/components/credits/CreditsModal";
import { IdentitySessionSync } from "@/components/chat/IdentitySessionSync";
import FaqAccordionItem from "@/components/landing/FaqAccordionItem";
import {
  BuildingIcon,
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
import type { Buyer } from "@/types/buyer";
import type { User } from "@/types/user";
import type { FaqItem, PricingFaqItem } from "@/types/common";
import { loadPaystackInline, openPaystackInline } from "@/lib/paystackInline";

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

export default function LoggedInPricingPage({
  faqs,
  initialAudience,
}: {
  faqs: PricingFaqItem[];
  initialAudience?: Audience;
}) {
  const vendor = useUserStore((s) => s.user);
  const buyer = useBuyerStore((s) => s.buyer);

  const isVendorSession = Boolean(vendor);
  const isBuyerSession = Boolean(buyer && !vendor);

  const defaultAudience: Audience =
    initialAudience || (isVendorSession ? "vendors" : "buyers");

  const [audience, setAudience] = useState<Audience>(defaultAudience);
  const [interval, setInterval] = useState<SubscriptionInterval>("monthly");
  const [checkoutBusy, setCheckoutBusy] = useState<
    "buyer_premium" | "vendor_enterprise" | null
  >(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const isBuyerPremium = Boolean(
    (
      buyer as unknown as {
        tier?: string;
        plan?: string;
        isPremium?: boolean;
        premium?: boolean;
      }
    )?.tier === "buyer_premium" ||
    (
      buyer as unknown as {
        tier?: string;
        plan?: string;
        isPremium?: boolean;
        premium?: boolean;
      }
    )?.plan === "buyer_premium" ||
    (
      buyer as unknown as {
        tier?: string;
        plan?: string;
        isPremium?: boolean;
        premium?: boolean;
      }
    )?.isPremium ||
    (
      buyer as unknown as {
        tier?: string;
        plan?: string;
        isPremium?: boolean;
        premium?: boolean;
      }
    )?.premium,
  );

  const isVendorEnterprise = Boolean(
    (
      vendor as unknown as {
        tier?: string;
        plan?: string;
        isEnterprise?: boolean;
        enterprise?: boolean;
      }
    )?.tier === "vendor_enterprise" ||
    (
      vendor as unknown as {
        tier?: string;
        plan?: string;
        isEnterprise?: boolean;
        enterprise?: boolean;
      }
    )?.plan === "vendor_enterprise" ||
    (
      vendor as unknown as {
        tier?: string;
        plan?: string;
        isEnterprise?: boolean;
        enterprise?: boolean;
      }
    )?.isEnterprise ||
    (
      vendor as unknown as {
        tier?: string;
        plan?: string;
        isEnterprise?: boolean;
        enterprise?: boolean;
      }
    )?.enterprise,
  );

  useEffect(() => {
    loadPaystackInline();
  }, []);

  async function startSubscriptionCheckout(
    plan: "buyer_premium" | "vendor_enterprise",
  ) {
    setCheckoutBusy(plan);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        authorizationUrl?: string;
        accessCode?: string;
        reference?: string;
      } | null;
      if (!res.ok || (!body?.authorizationUrl && !body?.accessCode)) {
        throw new Error(body?.error || "Couldn't start payment.");
      }

      const accessCode =
        body.accessCode ||
        (body.authorizationUrl
          ? body.authorizationUrl.split("/").filter(Boolean).pop()
          : undefined);

      if (!accessCode) {
        if (body.authorizationUrl) {
          window.location.assign(body.authorizationUrl);
          return;
        }
        throw new Error("Missing payment access code.");
      }

      await openPaystackInline({
        accessCode,
        authorizationUrl: body.authorizationUrl,
        onSuccess: async (trx) => {
          setCheckoutBusy(null);
          toast.success("Payment completed! Activating your subscription…");
          try {
            await fetch("/api/subscriptions/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reference: trx.reference }),
            });
          } catch {
            /* Webhook will also activate */
          }
          try {
            const res = await fetch("/api/auth/session", {
              credentials: "same-origin",
            });
            if (res.ok) {
              const session = (await res.json()) as {
                buyer?: Buyer | null;
                vendor?: User | null;
              };
              if (session.buyer)
                useBuyerStore.getState().setBuyer(session.buyer);
              if (session.vendor)
                useUserStore.getState().setUser(session.vendor);
            }
          } catch {
            /* best effort */
          }

          toast.success("Subscription active!");
          if (plan === "buyer_premium") {
            window.location.href = "/chat?subscription=done";
          } else {
            window.location.href = vendor ? "/wallet?subscription=done" : "/";
          }
        },
        onCancel: () => {
          setCheckoutBusy(null);
        },
        onError: (err) => {
          setCheckoutBusy(null);
          toast.error("Payment failed. Please try again.");
          setCheckoutError(err.message || "Payment was not successful.");
        },
      });
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Couldn't start payment.",
      );
      setCheckoutBusy(null);
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

  const dashboardHref = vendor ? "/wallet" : "/chat";
  const dashboardLabel = vendor ? "Go to Dashboard" : "Go to Chat";

  return (
    <CreditsModalProvider>
      <NavigationProgressProvider>
        <IdentitySessionSync />
        <HubNotificationsSync />
        <div className="min-h-dvh bg-canvas overflow-x-clip">
          <HubHeader />
          <main className="w-full max-w-[1240px] mx-auto px-0 lg:px-6 pt-0 pb-12 lg:py-6 space-y-6">
            {/* HubHero slab matching in-app logged in surfaces */}
            <section className="relative overflow-hidden rounded-none lg:rounded-2xl bg-slab text-white">
              <div className="absolute inset-y-0 right-0 hidden w-[52%] md:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/pricing-hero-subject.jpg"
                  alt=""
                  className="h-full w-full object-cover object-[62%_center]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slab via-slab/55 to-transparent" />
              </div>

              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 px-5 py-7 sm:px-8 sm:py-9">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="max-w-xl"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                    Plans &amp; Upgrades
                  </p>
                  <h1 className="mt-2 text-[1.75rem] font-bold leading-[1.15] tracking-tight text-balance sm:text-4xl">
                    Manage your Velte subscription
                  </h1>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
                    Upgrade anytime to unlock higher allowances, priority
                    discovery, and dedicated tools for your account.
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
                          height="fill"
                          className="shrink-0 text-orange-500"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Current plan badge / status card on desktop */}
                <div className="relative shrink-0 hidden md:block">
                  <div className="rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur-sm min-w-[240px]">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                      Current Status
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                        {isBuyerSession ? (
                          isBuyerPremium ? (
                            <CrownIcon size={18} />
                          ) : (
                            <UserIcon size={18} />
                          )
                        ) : isVendorEnterprise ? (
                          <CrownIcon size={18} />
                        ) : (
                          <BuildingIcon size={18} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {isBuyerSession
                            ? isBuyerPremium
                              ? "Buyer Premium"
                              : "Buyer Free"
                            : isVendorEnterprise
                              ? "Vendor Enterprise"
                              : "Vendor Basic"}
                        </p>
                        <p className="text-xs text-white/60">
                          {isBuyerSession
                            ? isBuyerPremium
                              ? "All perks unlocked"
                              : "20 free daily credits"
                            : isVendorEnterprise
                              ? "₦0 lead fee · Priority"
                              : "Pay-as-you-grow · ₦1k/lead"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
                  className="rounded-none lg:rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-5 sm:p-8"
                >
                  <div className="mx-auto max-w-5xl">
                    <div className="mx-auto mb-8 max-w-2xl text-center">
                      <p className="mb-2 text-xs font-bold tracking-[0.16em] text-orange-500 uppercase">
                        Buyer plans
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink text-balance">
                        Get more from Velte
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-ink/75 sm:text-base">
                        Upgrade to Premium for unlimited shopping credits, more
                        photo searches, and every buyer power tool.
                      </p>

                      <div className="mt-6 flex justify-center">
                        <BillingIntervalToggle
                          interval={interval}
                          onChange={setInterval}
                        />
                      </div>
                    </div>

                    {checkoutError && (
                      <div className="mx-auto mb-6 max-w-md rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        {checkoutError}
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
                        currentPlan={isBuyerSession && !isBuyerPremium}
                        ctaLabel={
                          isBuyerSession && !isBuyerPremium
                            ? "Current Plan"
                            : undefined
                        }
                        disabled={isBuyerSession && !isBuyerPremium}
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
                        currentPlan={isBuyerSession && isBuyerPremium}
                        ctaLabel={
                          isVendorSession
                            ? "Buyer Subscription"
                            : isBuyerSession
                              ? isBuyerPremium
                                ? "Current Plan"
                                : checkoutBusy === "buyer_premium"
                                  ? "Redirecting to Paystack…"
                                  : "Upgrade to Premium"
                              : undefined
                        }
                        onCtaClick={
                          isBuyerSession && !isBuyerPremium
                            ? () => startSubscriptionCheckout("buyer_premium")
                            : undefined
                        }
                        loading={checkoutBusy === "buyer_premium"}
                        disabled={isBuyerPremium || isVendorSession}
                        variant="popular"
                        badge="Most Popular"
                      />
                    </div>

                    {/* Feature comparison table */}
                    <div className="mt-8">
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
                    </div>

                    <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-ink/65">
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
                  className="rounded-none lg:rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-5 sm:p-8"
                >
                  <div className="mx-auto max-w-5xl">
                    <div className="mx-auto mb-8 max-w-2xl text-center">
                      <p className="mb-2 text-xs font-bold tracking-[0.16em] text-orange-500 uppercase">
                        Vendor plans
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink text-balance">
                        Grow your business with Velte
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-ink/75 sm:text-base">
                        Basic vendors pay ₦1,000 per matched lead. Enterprise
                        waives all lead fees, unlocks direct WhatsApp handoffs
                        to chat and close buyers, and includes Hub boosts, pins,
                        and analytics.
                      </p>

                      <div className="mt-6 flex justify-center">
                        <BillingIntervalToggle
                          interval={interval}
                          onChange={setInterval}
                        />
                      </div>
                    </div>

                    {checkoutError && (
                      <div className="mx-auto mb-6 max-w-md rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        {checkoutError}
                      </div>
                    )}

                    <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
                      <PlanCard
                        icon={BuildingIcon}
                        name="Basic"
                        blurb="Free to list. Pay ₦1,000 only when a qualified lead is delivered."
                        priceLabel="₦1,000"
                        priceSuffix="/lead"
                        priceNote="Pay as you go"
                        features={VENDOR_BASIC_FEATURES}
                        currentPlan={isVendorSession && !isVendorEnterprise}
                        ctaLabel={
                          isVendorSession && !isVendorEnterprise
                            ? "Current Plan"
                            : undefined
                        }
                        disabled={isVendorSession && !isVendorEnterprise}
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
                        currentPlan={isVendorSession && isVendorEnterprise}
                        ctaLabel={
                          isVendorSession
                            ? isVendorEnterprise
                              ? "Current Plan"
                              : checkoutBusy === "vendor_enterprise"
                                ? "Redirecting to Paystack…"
                                : "Upgrade to Enterprise"
                            : "Vendor Plan"
                        }
                        onCtaClick={
                          isVendorSession && !isVendorEnterprise
                            ? () =>
                                startSubscriptionCheckout("vendor_enterprise")
                            : undefined
                        }
                        loading={checkoutBusy === "vendor_enterprise"}
                        disabled={isVendorEnterprise || !isVendorSession}
                        variant="popular"
                        badge="Best Value"
                      />
                    </div>

                    {/* Feature comparison table */}
                    <div className="mt-8">
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
                    </div>

                    <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-ink/65">
                      Cancel anytime. Yearly plans include a 17% discount.
                    </p>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* In-app FAQ */}
            <section className="rounded-none lg:rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-5 sm:p-8">
              <div className="mx-auto max-w-3xl">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <h2 className="mb-6 text-center text-2xl sm:text-3xl font-bold tracking-tight text-ink">
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

            {/* In-app Support / Dashboard banner */}
            <section className="rounded-none lg:rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-5 sm:p-7">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-base font-bold text-ink sm:text-lg">
                    Questions about your subscription?
                  </p>
                  <p className="mt-1 text-xs text-ink/70 sm:text-sm">
                    Manage your wallet, track leads, or contact our team
                    anytime.
                  </p>
                </div>
                <Link
                  href={dashboardHref}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-colors hover:bg-orange-600 shrink-0"
                >
                  {dashboardLabel}
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </section>
          </main>
        </div>
      </NavigationProgressProvider>
    </CreditsModalProvider>
  );
}
