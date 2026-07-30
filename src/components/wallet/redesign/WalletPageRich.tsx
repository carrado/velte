"use client";

// Redesigned wallet page — visual layer only, same data/mutations as the
// original src/components/wallet/WalletPage.tsx (kept untouched as a
// reference/rollback point). TopUpModal, FundingMethodModal and
// SpendHistoryTable are reused as-is since they carry real Paystack/DVA
// logic and a working filterable table — no reason to rebuild those, only
// the surrounding presentation changed.

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Gift, ChevronRight } from "lucide-react";
import { useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { walletApi } from "@/services/wallet";
import { queryKeys } from "@/lib/query-keys";
import { useNavigation } from "@/components/NavigationProgressContext";
import TopUpModal from "@/components/wallet/TopUpModal";
import FundingMethodModal from "@/components/wallet/FundingMethodModal";
import SpendHistoryTable from "@/components/wallet/SpendHistoryTable";
import WalletHero from "./WalletHero";
import WalletStatCards from "./WalletStatCards";
import WalletSpendChart from "./WalletSpendChart";

// Matches WalletPage's own constant / the backend's LOW_BALANCE_KOBO.
const LOW_BALANCE_KOBO = 100_000; // ₦1,000

export default function WalletPageRich() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { navigate } = useNavigation();
  const userId = pathname.split("/")[1];
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

  useEffect(() => {
    if (searchParams.get("topup") === "success") {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.detail });
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

  return (
    <div className="flex flex-col gap-5">
      {(isEmpty || isLow) && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-none sm:rounded-xl px-4 py-3">
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

      <WalletHero
        wallet={wallet}
        isLoading={isLoading}
        onTopUp={() => setTopUpOpen(true)}
        onManageFunding={() => setFundingOpen(true)}
      />

      {/* Mobile-only referral entry — Sidebar nav already covers this on
          desktop (lg:hidden matches Sidebar's own `hidden lg:flex` breakpoint). */}
      <button
        onClick={() => navigate(`/${userId}/referrals`)}
        className="lg:hidden flex items-center gap-3 rounded-none sm:rounded-2xl bg-white border border-gray-100 shadow-sm p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
          <Gift size={16} className="text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-dash-body font-semibold text-gray-900">
            Refer a vendor, earn ₦1,000
          </p>
          <p className="text-dash-caption text-gray-400">
            Share your code — get paid when they verify their account
          </p>
        </div>
        <span className="flex items-center gap-1 shrink-0 px-3 py-1.5 bg-orange-500 text-white text-dash-caption font-semibold rounded-lg">
          View
          <ChevronRight size={13} />
        </span>
      </button>

      <WalletStatCards stats={stats} isLoading={statsLoading} />

      <WalletSpendChart />

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
