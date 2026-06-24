"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Copy,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Link2,
  ChevronDown,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { transactionService } from "@/services/transactions";
import type {
  BankOption,
  ResolvedAccount,
  GeneratePaymentLinkPayload,
} from "@/types/transaction";
import { toast } from "sonner";
import { useOnboardingStore } from "@/store/onboardingStore";

// ── Bank Dropdown ─────────────────────────────────────────────────────────────

function BankDropdown({
  banks,
  value,
  onChange,
  disabled,
}: {
  banks: BankOption[];
  value: string;
  onChange: (code: string, name: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = banks.find((b) => b.code === value);
  const filtered = banks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors",
          "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-ring ring-2 ring-ring ring-offset-2",
        )}
      >
        <span className={cn(!selected && "text-muted-foreground")}>
          {selected ? selected.name : "Select bank"}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search banks…"
                className="w-full rounded-sm border border-input bg-background pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          {/* List */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No banks found
              </p>
            ) : (
              filtered.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => {
                    onChange(bank.code, bank.name);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    value === bank.code && "bg-accent font-medium",
                  )}
                >
                  {bank.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

interface GeneratePaymentLinkModalProps {
  open: boolean;
  onClose: () => void;
}

export default function GeneratePaymentLinkModal({
  open,
  onClose,
}: GeneratePaymentLinkModalProps) {
  // Bank list
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);

  // Form state
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  // Resolve state
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedAccount | null>(null);
  const [resolveError, setResolveError] = useState("");

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Load banks on open
  useEffect(() => {
    if (!open) return;
    reset();
    setBanksLoading(true);
    transactionService
      .getBanks()
      .then((res) => setBanks(res))
      .catch(() => toast.error("Failed to load banks"))
      .finally(() => setBanksLoading(false));
  }, [open]);

  // Auto-resolve when account number hits 10 digits and bank is selected
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

  function reset() {
    setBankCode("");
    setBankName("");
    setAccountNumber("");
    setAccountName("");
    setAmount("");
    setDescription("");
    setResolved(null);
    setResolveError("");
    setGeneratedLink("");
    setCopied(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bankCode || !accountNumber || !accountName) return;

    const payload: GeneratePaymentLinkPayload = {
      bankCode,
      accountNumber,
      accountName,
    };

    setSubmitting(true);
    try {
      const res = await transactionService.generatePaymentLink(payload);
      setGeneratedLink(res.url);
      toast.success("Payment link generated!");
      useOnboardingStore.getState().completeStep(1);
    } catch {
      toast.error("Failed to generate payment link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Link2 size={15} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-gray-900">
                Generate Payment Link
              </h2>
              <p className="text-xs text-gray-400">
                Link sends funds to your bank account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {generatedLink ? (
            /* ── Success state ── */
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 size={22} className="text-green-500" />
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  Link ready to share!
                </p>
                <p className="text-xs text-gray-400 text-center">
                  This link will be shared with your customers to receive
                  payment.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <span className="flex-1 text-xs text-gray-600 truncate font-mono">
                  {generatedLink}
                </span>
              </div>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Bank */}
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-1.5">
                  Bank Account <span className="text-red-500">*</span>
                </label>
                <BankDropdown
                  banks={banks}
                  value={bankCode}
                  onChange={(code, name) => {
                    setBankCode(code);
                    setBankName(name);
                    // Re-trigger resolve if number already entered
                    if (accountNumber.length === 10) {
                      setResolved(null);
                      setAccountName("");
                    }
                  }}
                  disabled={banksLoading}
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-1.5">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={accountNumber}
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
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle2
                    size={14}
                    className="text-green-500 flex-shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-green-800">
                      {resolved.accountName}
                    </p>
                    <p className="text-[11px] text-green-600">
                      Account verified · {bankName}
                    </p>
                  </div>
                </div>
              )}
              {resolveError && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle
                    size={14}
                    className="text-red-500 flex-shrink-0"
                  />
                  <p className="text-xs text-red-700">{resolveError}</p>
                </div>
              )}

              {/* Account Name (read-only after resolve) */}
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-1.5">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Auto-filled after account resolution"
                  readOnly
                  className={cn(resolved && "bg-gray-50 text-gray-500")}
                />
              </div>

              {/* Submit */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !bankCode ||
                    accountNumber.length !== 10 ||
                    !accountName ||
                    resolving
                  }
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Link2 size={14} />
                      Generate Payment Link
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
