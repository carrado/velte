"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet as WalletIcon,
  Plus,
  Settings2,
  AlertTriangle,
  Target,
  Zap,
  ArrowDownLeft,
  CreditCard,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { walletApi } from "@/services/wallet";
import { queryKeys } from "@/lib/query-keys";
import { formatNaira } from "@/lib/utils";
import TopUpModal from "./TopUpModal";
import FundingMethodModal from "./FundingMethodModal";
import LeadGenerationCard from "./LeadGenerationCard";
import SpendHistoryTable from "./SpendHistoryTable";

// Below this, a lead charge could fail outright — nudge the vendor to top up
// before that happens rather than after. Purely a UI hint; the actual
// eligibility decision for low-balance vendors belongs to the future
// search/leads ranking layer (see "Known gaps" in the teardown plan).
const LOW_BALANCE_KOBO = 50_000; // ₦500

export default function WalletPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [fundingOpen, setFundingOpen] = useState(false);

  const { data: wallet, isLoading } = useQuery({
    queryKey: queryKeys.wallet.detail,
    queryFn: walletApi.getWallet,
    staleTime: 30_000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.wallet.stats(),
    queryFn: () => walletApi.getStats(),
    staleTime: 30_000,
  });

  // Returning from a Paystack top-up lands here with ?topup=success — refresh
  // once so the balance reflects the credit without waiting on cache staleTime.
  useEffect(() => {
    if (searchParams.get("topup") === "success") {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.detail });
      // Prefix match — catches every months-range variant of the stats query.
      queryClient.invalidateQueries({ queryKey: ["wallet", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["wallet", "transactions"] });
      toast.success("Wallet topped up");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const isEmpty = !isLoading && (wallet?.balanceKobo ?? 0) <= 0;
  const isLow =
    !isLoading && !isEmpty && (wallet?.balanceKobo ?? 0) < LOW_BALANCE_KOBO;
  const hasCard = wallet?.autoRecharge.hasCardOnFile;
  const canAutoRecharge = wallet?.autoRecharge.enabled && hasCard;

  const kpis = [
    {
      key: "spent",
      label: "Spent on Leads",
      value: statsLoading ? "—" : formatNaira(stats?.totalSpentKobo ?? 0),
      sub: statsLoading
        ? ""
        : `${formatNaira(stats?.monthSpentKobo ?? 0)} this month`,
      icon: Target,
      iconClass: "bg-orange-50 text-orange-500",
    },
    {
      key: "leads",
      label: "Leads Received",
      value: statsLoading ? "—" : String(stats?.totalLeads ?? 0),
      sub: statsLoading ? "" : `${stats?.monthLeads ?? 0} this month`,
      icon: Zap,
      iconClass: "bg-teal-50 text-teal-600",
    },
    {
      key: "topups",
      label: "Total Topped Up",
      value: statsLoading ? "—" : formatNaira(stats?.totalToppedUpKobo ?? 0),
      sub: statsLoading
        ? ""
        : `${stats?.topupsCount ?? 0} top-up${(stats?.topupsCount ?? 0) === 1 ? "" : "s"}`,
      icon: ArrowDownLeft,
      iconClass: "bg-green-50 text-green-600",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {(isEmpty || isLow) && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-dash-body font-semibold text-amber-800">
              {isEmpty
                ? "Your wallet balance is empty"
                : "Your wallet balance is low"}
            </p>
            <p className="text-dash-secondary text-amber-700 mt-0.5">
              {canAutoRecharge
                ? "Auto-recharge is on, so this should top up automatically — but topping up now avoids any gap in coverage."
                : "Top up to keep receiving leads without interruption."}
            </p>
          </div>
          <button
            onClick={() => setTopUpOpen(true)}
            className="text-dash-secondary font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap cursor-pointer"
          >
            Top Up
          </button>
        </div>
      )}

      {/* Hero balance card */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-7">
        {/* soft warm glow — pure ambience, no data */}
        <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 bg-orange-100/70 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                <WalletIcon size={15} className="text-orange-500" />
              </div>
              <span className="text-dash-body">Wallet Balance</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {hasCard && (
                <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1 text-dash-caption text-gray-500">
                  <CreditCard size={12} />
                  •••• {wallet?.autoRecharge.last4 ?? "····"}
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1 text-dash-caption text-gray-500">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    canAutoRecharge ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                Auto-recharge {canAutoRecharge ? "on" : "off"}
              </span>
            </div>
          </div>

          <p className="text-4xl sm:text-[2.75rem] leading-tight font-black text-[#023337] mb-6">
            {isLoading ? "—" : formatNaira(wallet?.balanceKobo ?? 0)}
          </p>

          <div className="flex flex-wrap gap-3">
            {/* Auto-recharge on = the wallet funds itself; manual top-up returns
                the moment the vendor switches it off. */}
            {!canAutoRecharge && (
              <button
                onClick={() => setTopUpOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Plus size={16} />
                Top Up
              </button>
            )}
            <button
              onClick={() => setFundingOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Settings2 size={16} />
              Manage Funding
            </button>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map(({ key, label, value, sub, icon: Icon, iconClass }) => (
          <div
            key={key}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
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
            {sub && (
              <p className="text-dash-caption text-gray-400 mt-1">{sub}</p>
            )}
          </div>
        ))}
      </div>

      <LeadGenerationCard />

      <SpendHistoryTable />

      <TopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
      <FundingMethodModal
        open={fundingOpen}
        wallet={wallet}
        onClose={() => setFundingOpen(false)}
      />
    </div>
  );
}
