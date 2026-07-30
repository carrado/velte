"use client";

import {
  Wallet as WalletIcon,
  Plus,
  Settings2,
  CreditCard,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import type { Wallet } from "@/types/wallet";

export default function WalletHero({
  wallet,
  isLoading,
  onTopUp,
  onManageFunding,
}: {
  wallet: Wallet | undefined;
  isLoading: boolean;
  onTopUp: () => void;
  onManageFunding: () => void;
}) {
  const balance = wallet?.balanceKobo ?? 0;
  const animatedBalance = useCountUp(isLoading ? 0 : balance);
  const hasCard = wallet?.autoRecharge.hasCardOnFile;
  const canAutoRecharge = wallet?.autoRecharge.enabled && hasCard;

  return (
    <div className="relative overflow-hidden rounded-none sm:rounded-3xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
      {/* Layered ambient glow + dot texture — decoration only, no data. */}
      <div className="pointer-events-none absolute -top-28 -right-24 w-80 h-80 bg-orange-100/70 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 bg-amber-50 rounded-full blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(2,51,55,0.06) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm shadow-orange-200">
              <WalletIcon size={16} className="text-white" />
            </div>
            <span className="text-dash-body text-gray-500">Wallet Balance</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasCard && (
              <span className="flex items-center gap-1.5 bg-white/70 backdrop-blur border border-gray-100 shadow-sm rounded-full px-3 py-1 text-dash-caption text-gray-500">
                <CreditCard size={12} />
                •••• {wallet?.autoRecharge.last4 ?? "····"}
              </span>
            )}
            <span className="flex items-center gap-1.5 bg-white/70 backdrop-blur border border-gray-100 shadow-sm rounded-full px-3 py-1 text-dash-caption text-gray-500">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  canAutoRecharge ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              Auto-recharge {canAutoRecharge ? "on" : "off"}
            </span>
          </div>
        </div>

        <p className="text-4xl sm:text-5xl leading-tight font-black text-[#023337] mb-6 tabular-nums">
          {isLoading ? "—" : formatNaira(Math.round(animatedBalance))}
        </p>

        <div className="flex flex-wrap gap-3">
          {!canAutoRecharge && (
            <button
              onClick={onTopUp}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Plus size={16} />
              Top Up
            </button>
          )}
          <button
            onClick={onManageFunding}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Settings2 size={16} />
            Manage Funding
          </button>
        </div>
      </div>
    </div>
  );
}
