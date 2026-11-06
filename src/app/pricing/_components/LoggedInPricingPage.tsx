"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  CheckCircleIcon,
  Headphones,
  HelpCircle,
  MessageSquare,
  Sparkles,
} from "lucide-react";
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
  SparklesIcon,
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

  // Strictly isolate: vendors only see vendor plans; buyers only see buyer plans
  const audience: Audience = isVendorSession ? "vendors" : "buyers";
  const searchParams = useSearchParams();
  const [interval, setInterval] = useState<SubscriptionInterval>("monthly");
  const [checkoutBusy, setCheckoutBusy] = useState<
    "buyer_premium" | "vendor_enterprise" | null
  >(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [activationModal, setActivationModal] = useState<{
    step: "activating" | "confirmed";
    plan: "buyer_premium" | "vendor_enterprise";
  } | null>(null);

  // A vendor is automatically a premium buyer already
  const isVendorAccount = Boolean(vendor || buyer?.linkedVendorId);

  const isBuyerPremium =
    isVendorAccount ||
    Boolean(
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

  const triggerActivationFlow = async (
    plan: "buyer_premium" | "vendor_enterprise",
    reference?: string,
  ) => {
    // Clean up query parameters like ?subscription=done from URL immediately
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (
        url.searchParams.has("subscription") ||
        url.searchParams.has("reference")
      ) {
        url.searchParams.delete("subscription");
        url.searchParams.delete("reference");
        const cleanPath = url.pathname + (url.search ? url.search : "");
        window.history.replaceState({}, "", cleanPath);
      }
    }

    // 1. Immediately open modal in activating step
    setActivationModal({ step: "activating", plan });

    // 2. Instantly update store so the user status reflects on the pricing page immediately
    if (plan === "vendor_enterprise") {
      const curVendor = useUserStore.getState().user;
      if (curVendor) {
        useUserStore.getState().setUser({
          ...curVendor,
          tier: "vendor_enterprise",
          isEnterprise: true,
          enterprise: true,
          plan: "vendor_enterprise",
        } as unknown as User);
      }
    } else {
      const curBuyer = useBuyerStore.getState().buyer;
      if (curBuyer) {
        useBuyerStore.getState().setBuyer({
          ...curBuyer,
          tier: "buyer_premium",
          isPremium: true,
          premium: true,
          plan: "buyer_premium",
        } as unknown as Buyer);
      }
    }

    // 3. Concurrently verify with backend and refresh session
    const syncSessionPromise = (async () => {
      if (reference) {
        try {
          await fetch("/api/subscriptions/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference }),
          });
        } catch {
          /* webhook fallback */
        }
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
          if (session.buyer) useBuyerStore.getState().setBuyer(session.buyer);
          if (session.vendor) useUserStore.getState().setUser(session.vendor);
        }
      } catch {
        /* best effort */
      }
    })();

    // 4. Smooth wait for activating screen before sliding to confirmation
    await Promise.all([
      syncSessionPromise,
      new Promise((resolve) => setTimeout(resolve, 1800)),
    ]);

    // 5. Slide to the confirmation welcome screen
    setActivationModal({ step: "confirmed", plan });
  };

  const handleGoBack = () => {
    setActivationModal(null);
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = isVendorSession ? "/wallet" : "/chat";
    }
  };

  useEffect(() => {
    loadPaystackInline();
  }, []);

  useEffect(() => {
    const subDone = searchParams.get("subscription");
    const ref = searchParams.get("reference");
    if (subDone === "done" || (ref && !activationModal)) {
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("subscription");
        url.searchParams.delete("reference");
        const cleanPath = url.pathname + (url.search ? url.search : "");
        window.history.replaceState({}, "", cleanPath);
      }
      const targetPlan = isVendorSession
        ? "vendor_enterprise"
        : "buyer_premium";
      void triggerActivationFlow(targetPlan, ref || undefined);
    }
  }, [searchParams, isVendorSession]);

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
        onSuccess: (trx) => {
          setCheckoutBusy(null);
          void triggerActivationFlow(plan, trx?.reference);
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

  const accordionFaqs: FaqItem[] = useMemo(() => {
    if (isVendorSession) {
      return [
        {
          question: "Can I change my plan later?",
          answer:
            "Yes. Vendors can start on Basic (pay per lead) and upgrade to Enterprise anytime when you want lead fees waived and Hub perks included.",
          category: "vendor" as const,
        },
        {
          question: "How much does a vendor lead cost?",
          answer:
            "Basic vendors pay a flat ₦1,000 per matched lead delivered to their store. Enterprise vendors don’t pay that lead fee and get direct WhatsApp handoff to chat with buyers.",
          category: "vendor" as const,
        },
        {
          question: "Is there a free tier for vendors?",
          answer:
            "Yes! You can list your store and products on Velte completely for free without a credit card on the Basic plan.",
          category: "vendor" as const,
        },
        {
          question: "How do I pay for my subscription or wallet?",
          answer:
            "Subscriptions and wallet top-ups are charged securely through Paystack (card). Vendors can also fund from their Velte wallet.",
          category: "vendor" as const,
        },
        {
          question: "Do you offer refunds?",
          answer:
            "Lead fees and credit spends for completed work aren’t refundable. If a charge looks wrong, contact support and we’ll review it promptly.",
          category: "vendor" as const,
        },
      ];
    }
    return [
      {
        question: "Can I change my plan later?",
        answer:
          "Yes. Buyers can upgrade to Premium or cancel anytime from your account settings.",
        category: "buyer" as const,
      },
      {
        question: "How do credits and photo search work for buyers?",
        answer:
          "Free registered buyers receive 20 free credits every day and 1 photo search per day. Premium buyers enjoy unlimited credits for shopping, up to 5 photo searches per day, buyer requests to vendors, and full access to Hub tools.",
        category: "buyer" as const,
      },
      {
        question: "Do vendors need to pay for Buyer Premium?",
        answer:
          "No! Registered Velte vendors automatically enjoy full Buyer Premium privileges across the platform when using buyer features.",
        category: "buyer" as const,
      },
      {
        question: "Is there a free trial?",
        answer:
          "You can start on Velte completely for free without a credit card. Buyers receive 20 free credits every day on the Free plan.",
        category: "buyer" as const,
      },
      {
        question: "How do I pay?",
        answer:
          "Subscriptions are charged securely through Paystack (card). Cancel anytime with no penalties.",
        category: "buyer" as const,
      },
      {
        question: "Do you offer refunds?",
        answer:
          "Subscription charges aren’t refundable once used. If a charge looks wrong, contact our team and we’ll review it.",
        category: "buyer" as const,
      },
    ];
  }, [isVendorSession]);

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
                    {isVendorSession
                      ? "Vendor Plans & Upgrades"
                      : "Buyer Plans & Upgrades"}
                  </p>
                  <h1 className="mt-2 text-[1.75rem] font-bold leading-[1.15] tracking-tight text-balance sm:text-4xl">
                    {isVendorSession
                      ? "Manage your Vendor subscription"
                      : "Manage your Buyer subscription"}
                  </h1>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
                    {isVendorSession
                      ? "Upgrade to Enterprise to waive all lead fees, unlock direct WhatsApp customer handoff, and access premium Hub tools."
                      : "Upgrade to Premium to unlock unlimited shopping credits, priority photo searches, and exclusive buyer tools."}
                  </p>

                  <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 md:hidden">
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
                              ? isVendorAccount
                                ? "Included with Vendor"
                                : "All perks unlocked"
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
                          isBuyerSession
                            ? isBuyerPremium
                              ? isVendorAccount
                                ? "Included with Vendor Account"
                                : "Current Plan"
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
                        disabled={isBuyerPremium || !isBuyerSession}
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

            {/* In-app Contact Us Callout */}
            <section className="relative overflow-hidden rounded-none lg:rounded-2xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-orange-500/[0.04] via-surface to-amber-500/[0.03] p-6 sm:p-8">
              <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div className="max-w-2xl space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 dark:bg-orange-950/60 px-3 py-1 text-xs font-bold text-orange-700 dark:text-orange-400">
                    <Headphones className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    <span>Talk to Our Team</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                    {vendor
                      ? "Need a custom plan or have questions before upgrading?"
                      : "Have questions or need help choosing the right plan?"}
                  </h3>
                  <p className="text-xs sm:text-sm text-ink/70 leading-relaxed">
                    {vendor
                      ? "Whether you're looking for custom lead quotas, enterprise billing, or guidance on boosting your store with Velte, our team is ready to help."
                      : "From payment guidance to choosing the tier that matches your shopping needs, our support team is here to assist you anytime."}
                  </p>
                </div>

                <div className="flex shrink-0 w-full md:w-auto">
                  <Link
                    href="/contact"
                    className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 hover:shadow-orange-500/35 active:scale-[0.98]"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Contact Us</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </section>

            {/* Subscription Activation & Confirmation Slider Modal */}
            <AnimatePresence>
              {activationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    aria-hidden="true"
                  />
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-surface shadow-2xl"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {activationModal.step === "activating" ? (
                        <motion.div
                          key="activating"
                          initial={{ opacity: 0, x: 60 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -60 }}
                          transition={{ duration: 0.35, ease: "easeInOut" }}
                          className="p-6 sm:p-8 text-center"
                        >
                          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                            <SparklesIcon
                              size={28}
                              className="animate-spin text-orange-500"
                            />
                          </div>
                          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                            Activating your subscription…
                          </h3>
                          <p className="mt-2 text-xs sm:text-sm text-ink/70 leading-relaxed">
                            Please wait while we confirm your payment and set up
                            your{" "}
                            {activationModal.plan === "vendor_enterprise"
                              ? "Enterprise"
                              : "Premium"}{" "}
                            benefits.
                          </p>
                          <div className="mt-6 w-full h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                              initial={{ width: "10%" }}
                              animate={{ width: "95%" }}
                              transition={{ duration: 1.8, ease: "easeInOut" }}
                            />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="confirmed"
                          initial={{ opacity: 0, x: 60 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -60 }}
                          transition={{ duration: 0.35, ease: "easeInOut" }}
                          className="p-6 sm:p-8 text-center"
                        >
                          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30">
                            <CrownIcon size={28} />
                          </div>
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                            <CheckCircleIcon
                              size={14}
                              className="text-emerald-600 dark:text-emerald-400"
                            />
                            <span>Subscription Active</span>
                          </div>
                          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                            {activationModal.plan === "vendor_enterprise"
                              ? "Welcome to the Enterprise Plan!"
                              : "Welcome to Buyer Premium!"}
                          </h3>
                          <p className="mt-2 text-xs sm:text-sm text-ink/75 leading-relaxed">
                            {activationModal.plan === "vendor_enterprise"
                              ? "Your store now has unlimited lead access with ₦0 lead fees, direct WhatsApp buyer handoff, priority placement, and full Hub tools."
                              : "You now enjoy unlimited shopping credits, priority photo searches, direct WhatsApp contacts, and full Hub access."}
                          </p>

                          <div className="mt-5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-canvas/60 p-4 text-left">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-2">
                              Active Benefits
                            </p>
                            <ul className="space-y-1.5 text-xs text-ink/80">
                              {(activationModal.plan === "vendor_enterprise"
                                ? [
                                    "₦0 lead fees waived on all matched shoppers",
                                    "Direct WhatsApp handoff to close buyers",
                                    "Featured ranking & Enterprise store badge",
                                    "Free Hub advert pins & AI poster generation",
                                  ]
                                : [
                                    "Unlimited credits for AI shopping",
                                    "Up to 5 photo searches per day",
                                    "Direct WhatsApp contact with verified vendors",
                                    "Create buyer requests & full Hub tools",
                                  ]
                              ).map((perk) => (
                                <li
                                  key={perk}
                                  className="flex items-center gap-2"
                                >
                                  <CheckCircleIcon
                                    size={14}
                                    className="shrink-0 text-emerald-500"
                                  />
                                  <span>{perk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="mt-6">
                            <button
                              type="button"
                              onClick={handleGoBack}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 hover:shadow-orange-500/35 active:scale-[0.98] cursor-pointer"
                            >
                              <span>Go Back</span>
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </NavigationProgressProvider>
    </CreditsModalProvider>
  );
}
