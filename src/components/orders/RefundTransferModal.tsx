"use client";

import { useState, useEffect } from "react";
import {
  Banknote,
  Loader2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import BankDropdown from "@/components/BankDropdown";
import { transactionService } from "@/services/transactions";
import type { Order } from "@/types/order";
import type { BankOption, ResolvedAccount } from "@/types/transaction";

/**
 * Refund flow for a cancelled, already-paid order. Under the manual-transfer
 * model the customer paid the vendor's bank directly, so the vendor sends the
 * money back themselves; this modal captures + verifies the destination account
 * and records the refund, then cancels the order.
 */
export default function RefundTransferModal({
  isOpen,
  order,
  onSkipAndCancel,
  onTransferSuccess,
}: {
  isOpen: boolean;
  order: Order | null;
  onSkipAndCancel: () => void;
  onTransferSuccess: () => void;
}) {
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedAccount | null>(null);
  const [resolveError, setResolveError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load banks + reset form whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setBankCode("");
    setBankName("");
    setAccountNumber("");
    setAccountName("");
    setResolved(null);
    setResolveError("");
    setBanksLoading(true);
    transactionService
      .getBanks()
      .then(setBanks)
      .catch(() => toast.error("Failed to load banks"))
      .finally(() => setBanksLoading(false));
  }, [isOpen]);

  // Auto-resolve the customer's account once a bank + 10 digits are entered.
  useEffect(() => {
    if (accountNumber.length !== 10 || !bankCode) return;
    setResolved(null);
    setResolveError("");
    setAccountName("");
    setResolving(true);
    transactionService
      .resolveAccount(accountNumber, bankCode)
      .then((res) => {
        setResolved(res);
        setAccountName(res.accountName);
      })
      .catch(() =>
        setResolveError("Could not resolve account. Check number and bank."),
      )
      .finally(() => setResolving(false));
  }, [accountNumber, bankCode]);

  if (!isOpen || !order) return null;

  const amount = order.price.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
  });

  const canSubmit =
    !!resolved &&
    !!accountName &&
    accountNumber.length === 10 &&
    !resolving &&
    !isSubmitting;

  const handleRecordRefund = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await transactionService.initiateOrderRefund({
        orderId: order.id,
        amount: order.price,
        reason: `Refund for cancelled order ${order.orderId} — ${order.product.name}`,
        customerAccountNumber: accountNumber,
        customerBankCode: bankCode,
        customerBankName: bankName,
        customerAccountName: accountName,
      });
      toast.success(`₦${amount} refund recorded for ${accountName}.`);
      setTimeout(() => onTransferSuccess(), 500);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Couldn't record the refund. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Banknote size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-dash-heading font-bold text-[#023337]">
              Refund Customer
            </h3>
            <p className="text-dash-caption text-gray-400">{order.orderId}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-auto">
          {/* Amount */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-4 text-center">
            <p className="text-dash-caption text-orange-400 uppercase tracking-wide font-semibold mb-1">
              Refund Amount
            </p>
            <p className="text-[2rem] font-black text-orange-600 leading-none tracking-tight">
              ₦{amount}
            </p>
            <p className="text-dash-caption text-orange-400 mt-1">
              Full order value
            </p>
          </div>

          {/* How it works */}
          <div className="flex items-start gap-2.5 p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <AlertTriangle
              size={14}
              className="text-orange-500 mt-0.5 flex-shrink-0"
            />
            <p className="text-dash-caption text-gray-600 leading-relaxed">
              This order was paid by direct bank transfer, so the funds are in
              your account. Send the customer their money back, then record the
              account you paid below.
            </p>
          </div>

          {/* Customer bank */}
          <div>
            <label className="text-dash-body font-semibold text-[#023337] block mb-1.5">
              Customer&apos;s Bank
            </label>
            <BankDropdown
              banks={banks}
              value={bankCode}
              onChange={(code, name) => {
                setBankCode(code);
                setBankName(name);
                if (accountNumber.length === 10) {
                  setResolved(null);
                  setAccountName("");
                }
              }}
              disabled={banksLoading || isSubmitting}
            />
          </div>

          {/* Account number */}
          <div>
            <label className="text-dash-body font-semibold text-[#023337] block mb-1.5">
              Account Number
            </label>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={accountNumber}
                disabled={isSubmitting}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setAccountNumber(val);
                  if (val.length < 10) {
                    setResolved(null);
                    setResolveError("");
                    setAccountName("");
                  }
                }}
                placeholder="Enter 10-digit number"
                className="pr-9"
              />
              {resolving && (
                <Loader2
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 animate-spin"
                />
              )}
            </div>
          </div>

          {/* Resolve feedback */}
          {resolved && (
            <div className="flex items-center gap-2.5 px-3.5 py-3 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2
                size={15}
                className="text-green-500 flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-dash-body font-bold text-green-800 truncate">
                  {resolved.accountName}
                </p>
                <p className="text-dash-caption text-green-600">
                  Verified · {accountNumber} · {bankName}
                </p>
              </div>
            </div>
          )}
          {resolveError && (
            <div className="flex items-center gap-2.5 px-3.5 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
              <p className="text-dash-caption text-red-700">{resolveError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-100 space-y-2.5">
          <button
            onClick={handleRecordRefund}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 !text-white text-dash-body font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Recording…
              </>
            ) : (
              <>
                <Banknote size={16} /> I&apos;ve sent ₦{amount} — Mark Refunded
              </>
            )}
          </button>
          <button
            onClick={onSkipAndCancel}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-dash-body font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer"
          >
            Cancel without refund
          </button>
          <p className="text-dash-caption text-gray-400 text-center leading-snug">
            Skipping cancels the order without recording a refund.
          </p>
        </div>
      </div>
    </div>
  );
}
