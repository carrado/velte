"use client";

import Link from "next/link";

import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { CloseIcon, CrownIcon, LockIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { modalScrimClass } from "@/lib/modalScrim";

const DEFAULT_ENTERPRISE_BENEFITS = [
  "Comprehensive conversion funnel analytics & drop-off telemetry",
  "Category performance leaderboard & competitor CTR benchmarks",
  "Direct community forum access with verified founder badge",
  "₦0 lead fees on all buyer inquiries with direct WhatsApp handoff",
];

const DEFAULT_BUYER_BENEFITS = [
  "Direct WhatsApp & phone contact with verified merchants",
  "Access to exclusive buyer community discussions and deals",
  "Save unlimited favorite vendors with instant promo alerts",
  "Zero intermediary checkout & transaction fees",
];

export interface HubLockedModalProps {
  variant: "auth" | "upgrade";
  title: string;
  body: string;
  badge?: string;
  benefits?: readonly string[] | string[];
  benefitsTitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
  onClose: () => void;
  onSignedIn?: () => void;
  /** True when this lock sits on top of a modal that is already open. */
  stacked?: boolean;
}

/**
 * Unified Hub Locked Modal — reproduces the rich /hub analytics lock card design as an interactive modal.
 * Used across the Hub for both buyers and vendors whenever basic users hit locked features.
 */
export function HubLockedModal({
  variant,
  title,
  body,
  badge,
  benefits,
  benefitsTitle,
  ctaLabel,
  ctaHref,
  onCta,
  onClose,
  onSignedIn,
  stacked = false,
}: HubLockedModalProps) {
  const isEnterprise =
    ctaHref?.includes("vendor") ||
    ctaLabel?.toLowerCase().includes("enterprise") ||
    badge?.toLowerCase().includes("enterprise");

  const resolvedBadge =
    badge ??
    (variant === "auth"
      ? "Sign In Required"
      : isEnterprise
        ? "Enterprise Exclusive"
        : "Premium Exclusive");

  const resolvedBenefits =
    benefits && benefits.length > 0
      ? benefits
      : variant === "auth"
        ? [
            "Save favorites and track inquiries across devices",
            "Direct messaging with verified merchants",
            "Personalized timeline feed matching your interests",
          ]
        : isEnterprise
          ? DEFAULT_ENTERPRISE_BENEFITS
          : DEFAULT_BUYER_BENEFITS;

  const resolvedBenefitsHeading =
    benefitsTitle ??
    (variant === "auth"
      ? "Sign in to unlock:"
      : isEnterprise
        ? "Included with Vendor Enterprise:"
        : "Included with Premium:");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={cn(
        "fixed inset-0 z-[70] h-dvh w-dvw flex items-center justify-center p-4 overflow-y-auto",
        modalScrimClass(stacked),
      )}
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-surface p-6 sm:p-8 shadow-2xl max-w-lg w-full text-center text-ink my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Ambient Glow (matches /hub/analytics lock design) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-ink hover:bg-gray-100 dark:hover:bg-white/10 transition-colors z-20 cursor-pointer"
        >
          <CloseIcon size={16} />
        </button>

        <div className="relative flex flex-col items-center">
          {/* Crown & Lock Visual (matches /hub/analytics lock hero) */}
          <div className="relative mb-4 flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-lg shadow-amber-500/30 ring-8 ring-amber-500/15">
            <CrownIcon size={34} weight="fill" className="drop-shadow-sm" />
            <div className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-surface text-amber-500 ring-2 ring-amber-500/30 shadow-xs">
              <LockIcon size={13} weight="bold" />
            </div>
          </div>

          {/* Badge */}
          <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            {resolvedBadge}
          </span>

          {/* Title & Description */}
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-ink leading-snug">
            {title}
          </h3>
          <p className="mt-2.5 max-w-md text-xs sm:text-sm text-gray-500 dark:text-ink/70 leading-relaxed">
            {body}
          </p>

          {/* Feature Highlights Grid */}
          {resolvedBenefits.length > 0 && (
            <div className="mt-5 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-canvas/70 p-4 text-left shadow-xs">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-ink/50">
                {resolvedBenefitsHeading}
              </h4>
              <ul className="mt-3 space-y-2.5">
                {resolvedBenefits.map((benefit, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-ink/80 leading-normal"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                      ✓
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Call to Actions */}
          {variant === "auth" ? (
            <div className="mt-6 space-y-2.5 w-full">
              <GoogleSignInButton
                onSignedIn={() => {
                  if (onSignedIn) onSignedIn();
                  else onClose();
                }}
              />
              <Link
                href="/auth/login"
                className="block w-full px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-ink text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Vendor sign-in
              </Link>
            </div>
          ) : (
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 w-full">
              {onCta && ctaLabel ? (
                <button
                  type="button"
                  onClick={onCta}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:brightness-105 active:scale-[0.98] cursor-pointer"
                >
                  <CrownIcon size={16} weight="fill" />
                  <span>{ctaLabel}</span>
                </button>
              ) : ctaLabel && ctaHref ? (
                <Link
                  href={ctaHref}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:brightness-105 active:scale-[0.98]"
                >
                  <CrownIcon size={16} weight="fill" />
                  <span>{ctaLabel}</span>
                </Link>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-surface px-5 py-3 text-sm font-medium text-ink transition hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
