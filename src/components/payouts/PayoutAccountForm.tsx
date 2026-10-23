"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { payoutsApi } from "@/services/payouts";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { CheckCircleIcon, RefreshIcon } from "@/components/icons/hero";
import type { PayoutAccount } from "@/types/payout";

/* The bank + account-number form, on its own so the Settings card and the
   first-run setup modal are the same code rather than two drifting copies.
   Owns only the form; whoever renders it owns what "done" means. */

/** The `{ value, label }` pair Base UI's Combobox handles without extra
 *  config — a bank's code and its display name. */
interface BankOption {
  value: string;
  label: string;
}

export default function PayoutAccountForm({
  onSaved,
  onCancel,
  saveLabel = "Save Account",
  className,
  popupContainer,
}: {
  onSaved?: (payout: PayoutAccount) => void;
  /** Renders a Cancel button when given. Omit it where there's nothing to go
   *  back to — the setup modal, for instance. */
  onCancel?: () => void;
  saveLabel?: string;
  className?: string;
  /** Element the bank list portals into. The setup modal passes itself:
   *  portaling to `document.body` puts the list under the modal overlay. */
  popupContainer?: HTMLElement | null;
}) {
  const queryClient = useQueryClient();
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const { data: banks = [], isLoading: banksLoading } = useQuery({
    queryKey: queryKeys.payouts.banks,
    queryFn: () => payoutsApi.getBanks(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Base UI's Combobox understands `{ value, label }` natively — label is
  // what it displays and filters on, value is what it hands back. Memoised so
  // item identity is stable across renders.
  const bankOptions: BankOption[] = useMemo(
    () => banks.map((b) => ({ value: b.code, label: b.name })),
    [banks],
  );
  const selectedBank =
    bankOptions.find((option) => option.value === bankCode) ?? null;

  // Enough typed in to ask the bank who owns it.
  const complete = Boolean(bankCode) && /^\d{10}$/.test(accountNumber);

  // The confirmation step. The vendor never types their account name, so this
  // is the only moment they can catch a mistyped number — after this it's a
  // payout destination, and a wrong one sends real money to a stranger.
  // `retry: false`: "no such account" is a 400 answer, not a flaky request,
  // and retrying it just delays the correction.
  const {
    data: resolved,
    isFetching: resolving,
    isError: resolveFailed,
    error: resolveError,
  } = useQuery({
    queryKey: queryKeys.payouts.resolve(bankCode, accountNumber),
    queryFn: () => payoutsApi.resolve({ bankCode, accountNumber }),
    enabled: complete,
    retry: false,
    staleTime: Infinity,
  });

  const saveMutation = useMutation({
    mutationFn: () => payoutsApi.save({ bankCode, accountNumber }),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.payouts.account, saved);
      setBankCode("");
      setAccountNumber("");
      toast.success("Payout account saved");
      onSaved?.(saved);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Couldn't save that account",
      );
    },
  });

  // Saving is deliberately gated on a SUCCESSFUL lookup, not just on a
  // well-formed number — the whole point of the preview is that the vendor
  // has seen the name the bank returned before it becomes their payout
  // destination.
  const canSave = Boolean(resolved?.accountName) && !resolving;

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
          Bank
        </label>
        {/* A Combobox rather than a Select: Nigeria has ~200 banks and
            microfinance institutions, which is far past the point a vendor
            can scroll for their own. Base UI filters `items` itself from
            what's typed.

            `{ value, label }` is the shape it understands natively — it
            displays `label` and submits `value` with no itemToStringLabel
            needed, which also avoids the trap in the Select world next door,
            where the raw value (here, a bank CODE) is what shows. */}
        <Combobox
          items={bankOptions}
          value={selectedBank}
          onValueChange={(option: BankOption | null) =>
            setBankCode(option?.value ?? "")
          }
          isItemEqualToValue={(a: BankOption, b: BankOption) =>
            a.value === b.value
          }
        >
          <div className="relative">
            <ComboboxInput
              placeholder={
                banksLoading
                  ? "Loading banks…"
                  : banks.length === 0
                    ? "Couldn't load banks — reload the page"
                    : "Search for your bank"
              }
              disabled={banksLoading || banks.length === 0}
              className="text-dash-body text-gray-700 border-gray-200 rounded-xl py-2.5 h-auto"
            />
            <ComboboxTrigger />
          </div>
          <ComboboxContent container={popupContainer}>
            <ComboboxEmpty>No bank matches that.</ComboboxEmpty>
            <ComboboxList>
              {(bank: BankOption) => (
                <ComboboxItem key={bank.value} value={bank}>
                  {bank.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      <div>
        <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
          Account number
        </label>
        <p className="text-dash-secondary text-gray-500 mb-2">
          10 digits. We&apos;ll confirm the account name with your bank.
        </p>
        <input
          type="text"
          inputMode="numeric"
          value={accountNumber}
          // Digits only: the field is a NUBAN, and stripping here means a
          // pasted number with spaces or dashes just works.
          onChange={(e) =>
            setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
          }
          placeholder="0123456789"
          className="w-full text-dash-body text-gray-700 border border-gray-200 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
        />
      </div>

      {complete && resolving && (
        <div className="flex items-center gap-2 text-dash-secondary text-gray-500">
          <RefreshIcon size={13} className="animate-spin" />
          Checking with {selectedBank?.label ?? "your bank"}…
        </div>
      )}

      {complete && !resolving && resolved && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-dash-secondary text-green-800">Account name</p>
          <p className="text-dash-body font-semibold text-green-900 mt-0.5">
            {resolved.accountName}
          </p>
          <p className="text-dash-secondary text-green-800 mt-1.5">
            Make sure this is you before saving.
          </p>
        </div>
      )}

      {complete && !resolving && resolveFailed && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-dash-secondary text-red-700">
          {resolveError instanceof Error
            ? resolveError.message
            : "We couldn't find that account. Check the number and bank."}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="py-2.5 px-4 text-dash-body font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending}
          className="flex items-center gap-2 py-2.5 px-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
        >
          {saveMutation.isPending ? (
            <>
              <RefreshIcon size={13} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <CheckCircleIcon size={14} />
              {saveLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
