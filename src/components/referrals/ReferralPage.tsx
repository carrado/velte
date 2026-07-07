"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Gift,
  Copy,
  Share2,
  Check,
  Users,
  Clock,
  Wallet as WalletIcon,
  UserPlus,
  MailCheck,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { fetchMyReferrals } from "@/services/referrals";
import { queryKeys } from "@/lib/query-keys";
import { formatNaira } from "@/lib/utils";
import type { ReferralListItem } from "@/types/referral";

const REFERRAL_BONUS_NAIRA = "₦1,000";

function referralLink(code: string): string {
  if (typeof window === "undefined") return `/auth/signup?ref=${code}`;
  return `${window.location.origin}/auth/signup?ref=${code}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: ReferralListItem["status"] }) {
  if (status === "credited") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-dash-caption font-semibold text-green-700">
        <Check size={11} />
        Credited
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-dash-caption font-semibold text-amber-700">
      <Clock size={11} />
      Pending
    </span>
  );
}

const HOW_IT_WORKS = [
  {
    icon: Share2,
    title: "Share your code",
    body: "Send your link or code to another vendor — WhatsApp, SMS, wherever.",
  },
  {
    icon: MailCheck,
    title: "They sign up & verify",
    body: "They create a Velte account with your code and confirm their email.",
  },
  {
    icon: PartyPopper,
    title: `You earn ${REFERRAL_BONUS_NAIRA}`,
    body: "The moment they verify, the bonus lands straight in your wallet.",
  },
];

export default function ReferralPage() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.referrals.mine,
    queryFn: fetchMyReferrals,
    staleTime: 30_000,
  });

  const code = data?.code ?? "";
  const link = referralLink(code);
  const stats = data?.stats;
  const referrals = data?.referrals ?? [];

  function copy(text: string, which: "code" | "link") {
    navigator.clipboard.writeText(text);
    toast.success(which === "code" ? "Code copied" : "Link copied");
    if (which === "code") {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    }
  }

  async function share() {
    const shareData = {
      title: "Join me on Velte",
      text: `Join Velte with my referral code ${code} and let's grow together.`,
      url: link,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled the share sheet — not an error worth surfacing.
      }
      return;
    }
    copy(link, "link");
  }

  const kpis = [
    {
      key: "total",
      label: "Total Referred",
      value: isLoading ? "—" : String(stats?.totalReferred ?? 0),
      icon: Users,
      iconClass: "bg-orange-50 text-orange-500",
    },
    {
      key: "pending",
      label: "Pending Verification",
      value: isLoading ? "—" : String(stats?.pending ?? 0),
      icon: Clock,
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      key: "earned",
      label: "Total Earned",
      value: isLoading ? "—" : formatNaira(stats?.totalEarnedKobo ?? 0),
      icon: WalletIcon,
      iconClass: "bg-green-50 text-green-600",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Hero — code + link + share */}
      <div className="relative overflow-hidden rounded-none sm:rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-7">
        <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 bg-orange-100/70 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2 text-gray-400 mb-4">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <Gift size={15} className="text-orange-500" />
            </div>
            <span className="text-dash-body">
              Refer a vendor, earn {REFERRAL_BONUS_NAIRA}
            </span>
          </div>

          <p className="text-dash-secondary text-gray-500 max-w-lg mb-5">
            Every vendor you invite who signs up and verifies their email earns
            you {REFERRAL_BONUS_NAIRA} in your wallet — no limit on how many
            times.
          </p>

          {/* Code display */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/50 px-5 py-3.5">
              <span className="text-2xl sm:text-3xl font-black tracking-[0.2em] text-[#023337]">
                {isLoading ? "······" : code}
              </span>
              <button
                onClick={() => copy(code, "code")}
                disabled={isLoading}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white border border-orange-200 rounded-lg text-dash-caption font-semibold text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                {copiedCode ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Full link + share */}
          <div className="flex flex-col sm:flex-row gap-2.5 mt-3">
            <div className="flex-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 min-w-0">
              <span className="text-dash-caption text-gray-500 truncate">
                {isLoading ? "Loading your link…" : link}
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => copy(link, "link")}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-dash-secondary font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
              >
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                Copy link
              </button>
              <button
                onClick={share}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-dash-secondary font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Share2 size={13} />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map(({ key, label, value, icon: Icon, iconClass }) => (
          <div
            key={key}
            className="bg-white rounded-none sm:rounded-2xl border border-gray-100 shadow-sm p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconClass}`}
              >
                <Icon size={15} />
              </div>
              <span className="text-dash-secondary text-gray-400">{label}</span>
            </div>
            <p className="text-xl font-bold text-[#023337]">{value}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-none sm:rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <h2 className="text-dash-heading font-semibold text-gray-900 mb-5">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center relative">
                <step.icon size={16} className="text-orange-500" />
                <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <div>
                <p className="text-dash-body font-semibold text-gray-900">
                  {step.title}
                </p>
                <p className="text-dash-caption text-gray-400 mt-0.5">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent referrals */}
      <div className="bg-white rounded-none sm:rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <h2 className="text-dash-heading font-semibold text-gray-900 mb-1">
          Recent Referrals
        </h2>
        <p className="text-dash-secondary text-gray-400 mb-5">
          Vendors who signed up with your code
        </p>

        {isLoading ? (
          <div className="h-40 rounded-xl bg-gray-50 animate-pulse" />
        ) : referrals.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center gap-2">
            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
              <UserPlus size={17} className="text-orange-500" />
            </div>
            <p className="text-dash-body font-semibold text-gray-700">
              No referrals yet
            </p>
            <p className="text-dash-secondary text-gray-400 max-w-xs">
              Share your code above — every vendor who joins and verifies their
              email earns you {REFERRAL_BONUS_NAIRA}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {referrals.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 font-semibold text-dash-body shrink-0">
                    {r.refereeName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-dash-body font-medium text-gray-900 truncate">
                      {r.refereeName}
                    </p>
                    <p className="text-dash-caption text-gray-400">
                      {fmtDate(r.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={
                      r.status === "credited"
                        ? "text-dash-body font-semibold text-green-600"
                        : "text-dash-body font-semibold text-gray-300"
                    }
                  >
                    +{formatNaira(r.bonusKobo)}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
