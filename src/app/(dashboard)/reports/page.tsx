"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [balance, setBalance] = useState<number | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/trust/finops")
      .then((res) => res.json())
      .then((body) => {
        setBalance(body.walletBalanceKobo ?? null);
        setNote(body.note ?? "");
      })
      .catch(() => setNote("Couldn't load the report."));
  }, []);

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-surface p-5">
      <h1 className="text-lg font-semibold text-ink">Reports</h1>
      <p className="mt-1 text-sm text-gray-600">{note}</p>
      <p className="mt-4 text-2xl font-semibold text-ink">
        {balance == null ? "…" : `₦${(balance / 100).toLocaleString("en-NG")}`}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Wallet balance. This page does not move money.
      </p>
    </div>
  );
}
