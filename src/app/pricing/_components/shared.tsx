"use client";

import Link from "next/link";
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
import { formatNaira, cn } from "@/lib/utils";

export type Audience = "buyers" | "vendors";

export const HERO_CHECKS = [
  "AI-powered discovery",
  "Local vendors",
  "Verified & trusted",
  "WhatsApp handoff",
] as const;

export const BUYER_BASIC_FEATURES = [
  "AI shopping agent on /chat",
  "20 free credits every day",
  "1 photo search per day",
  "Compare listings · cart & checkout",
  "Shopping plans & local vendor discovery",
  "Refer friends for bonus credits",
] as const;

export const BUYER_PREMIUM_FEATURES = [
  "Unlimited credits for shopping",
  "Up to 5 photo searches per day",
  "Create buyer requests to vendors",
  "Favourite vendors & Hub social contact",
  "Place or boost Hub adverts & broadcasts",
  "Onboard, validate & review vendors",
  "Switch to a vendor account · gigs",
] as const;

export const BUYER_COMPARE_ROWS: {
  label: string;
  free: string | true;
  premium: string | true;
  highlight?: boolean;
  section?: string;
}[] = [
  // ── Search & discovery ──────────────────────────────────────────────────────
  {
    label: "AI text search",
    free: true,
    premium: true,
    section: "Search & discovery",
  },
  { label: "Credits", free: "20 / day", premium: "Unlimited", highlight: true },
  {
    label: "Photo search",
    free: "1 / day",
    premium: "Up to 5 / day",
    highlight: true,
  },
  { label: "Compare listings", free: true, premium: true },
  { label: "Shopping plans", free: true, premium: true },
  // ── Shopping ────────────────────────────────────────────────────────────────
  { label: "Cart & checkout", free: true, premium: true, section: "Shopping" },
  { label: "Refer friends for bonus credits", free: true, premium: true },
  // ── Premium buyer actions ───────────────────────────────────────────────────
  {
    label: "Create buyer requests",
    free: "—",
    premium: true,
    section: "Premium actions",
  },
  { label: "Favourite vendors", free: "—", premium: true },
  { label: "Hub social contact", free: "—", premium: true },
  { label: "Place / boost Hub adverts", free: "—", premium: true },
  { label: "Broadcast to vendors", free: "—", premium: true },
  { label: "Onboard & validate vendors", free: "—", premium: true },
  { label: "Switch to vendor account", free: "—", premium: true },
  { label: "Gigs", free: "—", premium: true },
];

export const VENDOR_BASIC_FEATURES = [
  "Free store profile & listings",
  "Be found in AI search",
  "Real-time lead notifications",
  "Pay as you go — ₦1,000 per lead",
] as const;

export const VENDOR_ENTERPRISE_FEATURES = [
  "Zero lead fees (waived entirely)",
  "Direct WhatsApp chat handoff to close buyers",
  "Featured placement & store badge on Hub",
  "Free Hub advert pin & AI poster generation",
  "Free listing boosts & promo broadcasts",
  "Business insights & vendor leaderboard",
] as const;

export const VENDOR_COMPARE_ROWS: {
  label: string;
  basic: string | true;
  enterprise: string | true;
  highlight?: boolean;
  section?: string;
}[] = [
  // ── Store & discovery ───────────────────────────────────────────────────────
  {
    label: "Store profile & listings",
    basic: true,
    enterprise: true,
    section: "Store & discovery",
  },
  { label: "Found in AI search & hub", basic: true, enterprise: true },
  { label: "Instant lead alerts", basic: true, enterprise: true },
  // ── Leads & buyer handoff ───────────────────────────────────────────────────
  {
    label: "Lead fee",
    basic: "₦1,000 / lead",
    enterprise: "₦0 (Waived)",
    highlight: true,
    section: "Leads & buyer handoff",
  },
  {
    label: "WhatsApp handoff (chat direct with buyers)",
    basic: "—",
    enterprise: true,
    highlight: true,
  },
  // ── Promotion & Hub perks ───────────────────────────────────────────────────
  {
    label: "Featured vendor badge",
    basic: "—",
    enterprise: true,
    section: "Promotion & Hub perks",
  },
  {
    label: "Hub advert pin",
    basic: "Pay per pin",
    enterprise: "Free / Included",
    highlight: true,
  },
  {
    label: "Hub listing boost",
    basic: "Pay per boost",
    enterprise: "Free / Included",
  },
  {
    label: "AI advert poster generation",
    basic: "5 slots",
    enterprise: "15 slots + fast cooldown",
  },
  {
    label: "Promo broadcasts to buyers",
    basic: "Pay per broadcast",
    enterprise: "Included",
  },
  // ── Insights & business tools ───────────────────────────────────────────────
  {
    label: "Business analytics & insights",
    basic: "—",
    enterprise: true,
    section: "Insights & business tools",
  },
  { label: "Performance leaderboards", basic: "—", enterprise: true },
  { label: "Priority Hub contact card", basic: "—", enterprise: true },
];

export function formatPlanPrice(
  interval: SubscriptionInterval,
  monthly: number,
  annual: number,
) {
  return interval === "annual"
    ? `${formatNaira(annual * 100)}/year`
    : `${formatNaira(monthly * 100)}/month`;
}

export function CellValue({
  value,
  isPremium,
  highlight,
}: {
  value: string | true;
  isPremium?: boolean;
  highlight?: boolean;
}) {
  if (value === true) {
    return (
      <CheckCircleIcon
        size={18}
        weight="fill"
        className="mx-auto text-orange-500 shrink-0"
      />
    );
  }
  if (value === "—") {
    return (
      <span className="text-base font-light text-ink/30 select-none">—</span>
    );
  }
  if (isPremium && highlight) {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-100/90 px-2.5 py-0.5 text-xs font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
        {value}
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-ink sm:text-sm tabular-nums">
      {value}
    </span>
  );
}

export function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-t border-gray-100 dark:border-white/10 bg-gray-50/80 dark:bg-white/5 px-4 py-2.5 first:border-t-0 sm:px-6">
      <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/70">
        {label}
      </span>
    </div>
  );
}

export interface CompareRowItem {
  label: string;
  basicVal: string | true;
  premiumVal: string | true;
  highlight?: boolean;
  section?: string;
}

export function ComparisonTable({
  basicName,
  basicPrice,
  premiumName,
  premiumPrice,
  badgeText,
  rows,
}: {
  basicName: string;
  basicPrice: string;
  premiumName: string;
  premiumPrice: string;
  badgeText: string;
  rows: CompareRowItem[];
}) {
  return (
    <div className="mx-auto mt-14 max-w-4xl">
      <h3 className="mb-6 text-center text-xl font-bold tracking-tight text-ink sm:text-2xl">
        Full feature comparison
      </h3>
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-canvas shadow-xs">
        {/* Table header */}
        <div className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-gray-200 dark:border-white/10 bg-surface">
          <div className="flex flex-col justify-end px-4 py-4 sm:px-6">
            <span className="text-xs font-semibold text-ink/65 uppercase tracking-wider">
              Feature
            </span>
          </div>
          <div className="flex flex-col items-center justify-end px-3 py-4 text-center sm:px-4">
            <p className="text-sm font-bold text-ink sm:text-base">
              {basicName}
            </p>
            <p className="mt-0.5 text-xs font-medium text-ink/70">
              {basicPrice}
            </p>
          </div>
          <div className="flex flex-col items-center justify-end border-l border-orange-100 bg-orange-50/50 px-3 py-4 text-center dark:border-orange-500/20 dark:bg-orange-500/10 sm:px-4">
            <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-xs">
              {badgeText}
            </span>
            <p className="text-sm font-bold text-ink sm:text-base">
              {premiumName}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
              {premiumPrice}
            </p>
          </div>
        </div>

        {/* Rows with section separators */}
        {rows.flatMap((row, i) => {
          const items = [];
          if (row.section) {
            items.push(
              <SectionHeader
                key={`section-${row.section}`}
                label={row.section}
              />,
            );
          }
          items.push(
            <div
              key={row.label}
              className={cn(
                "grid grid-cols-[1.4fr_1fr_1fr] items-center border-b border-gray-100 dark:border-white/5 transition-colors hover:bg-gray-50/40 dark:hover:bg-white/5",
                i === rows.length - 1 && "border-b-0",
                row.highlight && "bg-orange-50/25 dark:bg-orange-500/5",
              )}
            >
              <div className="px-4 py-3.5 text-left text-xs font-medium text-ink sm:px-6 sm:text-sm">
                {row.label}
              </div>
              <div className="px-2 py-3.5 text-center sm:px-4">
                <CellValue value={row.basicVal} highlight={row.highlight} />
              </div>
              <div className="border-l border-orange-100/70 bg-orange-50/40 px-2 py-3.5 text-center dark:border-orange-500/15 dark:bg-orange-500/5 sm:px-4">
                <CellValue
                  value={row.premiumVal}
                  isPremium
                  highlight={row.highlight}
                />
              </div>
            </div>,
          );
          return items;
        })}
      </div>
    </div>
  );
}

export function BillingIntervalToggle({
  interval,
  onChange,
}: {
  interval: SubscriptionInterval;
  onChange: (val: SubscriptionInterval) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 dark:border-white/10 bg-canvas p-1 shadow-xs">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={cn(
          "cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-all sm:text-sm",
          interval === "monthly"
            ? "bg-surface text-ink shadow-xs"
            : "text-ink/70 hover:text-ink",
        )}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("annual")}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all sm:text-sm",
          interval === "annual"
            ? "bg-surface text-ink shadow-xs"
            : "text-ink/70 hover:text-ink",
        )}
      >
        Yearly
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600 sm:text-[11px] dark:bg-orange-500/20 dark:text-orange-400">
          Save 17%
        </span>
      </button>
    </div>
  );
}

export function PlanCard({
  icon: Icon,
  name,
  blurb,
  priceLabel,
  priceSuffix,
  priceNote,
  features,
  ctaLabel,
  ctaHref,
  onCtaClick,
  loading,
  disabled,
  variant,
  badge,
  currentPlan,
}: {
  icon:
    | typeof UserIcon
    | typeof BuildingIcon
    | typeof CrownIcon
    | typeof StarIcon;
  name: string;
  blurb: string;
  priceLabel: string;
  priceSuffix: string;
  priceNote?: string;
  features: readonly string[];
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant: "default" | "popular";
  badge?: string;
  currentPlan?: boolean;
}) {
  const popular = variant === "popular";
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-surface p-6 sm:p-7",
        popular
          ? "border-orange-500 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/20"
          : "border-gray-200 dark:border-white/10",
      )}
    >
      {badge && (
        <span className="absolute -top-3 left-6 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
          {badge}
        </span>
      )}
      {currentPlan && (
        <span className="absolute -top-3 right-6 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
          Current Plan
        </span>
      )}
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
        <Icon size={22} />
      </div>
      <h3 className="text-xl font-bold text-ink">{name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink/75">{blurb}</p>
      <p className="mt-5 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight text-ink tabular-nums">
          {priceLabel}
        </span>
        <span className="text-sm text-ink/65">{priceSuffix}</span>
      </p>
      {priceNote && <p className="mt-1 text-xs text-ink/65">{priceNote}</p>}
      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-ink">
            <CheckCircleIcon
              size={16}
              weight="fill"
              className="mt-0.5 shrink-0 text-orange-500"
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {ctaLabel &&
        (onCtaClick || disabled ? (
          <button
            type="button"
            onClick={disabled ? undefined : onCtaClick}
            disabled={loading || disabled}
            className={cn(
              "mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              disabled
                ? "border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
                : cn(
                    "cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
                    popular
                      ? "bg-orange-500 text-white shadow-sm hover:bg-orange-600"
                      : "border border-gray-300 text-ink hover:border-orange-400 hover:text-orange-600",
                  ),
            )}
          >
            {loading ? "Processing…" : ctaLabel}
          </button>
        ) : (
          <Link
            href={ctaHref || "#"}
            className={cn(
              "mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              popular
                ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
                : "border border-gray-300 text-ink hover:border-orange-400 hover:text-orange-600",
            )}
          >
            {ctaLabel}
          </Link>
        ))}
    </div>
  );
}
