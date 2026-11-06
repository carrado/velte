"use client";

import { useState } from "react";

import {
  SUBSCRIPTION_PRICES_NGN,
  type SubscriptionInterval,
} from "@/lib/subscriptions";
import { cn } from "@/lib/utils";

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export function SubscribeCard({ isVendor }: { isVendor: boolean }) {
  const plan = isVendor ? "vendor_enterprise" : "buyer_premium";
  const prices = SUBSCRIPTION_PRICES_NGN[plan];
  const [interval, setInterval] = useState<SubscriptionInterval>("monthly");
  const [addressLine, setAddressLine] = useState("");
  const [area, setArea] = useState("");
  const [state, setState] = useState("");
  const [nin, setNin] = useState("");
  const [busy, setBusy] = useState<"pay" | "trial" | "nin" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveAddress() {
    const res = await fetch("/api/subscriptions/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressLine, area, state }),
    });
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (!res.ok) throw new Error(body?.error || "Couldn't save that address.");
  }

  async function pay() {
    setBusy("pay");
    setError(null);
    try {
      if (!isVendor) await saveAddress();
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        authorizationUrl?: string;
      } | null;
      if (!res.ok || !body?.authorizationUrl) {
        throw new Error(body?.error || "Couldn't start the payment.");
      }
      window.location.assign(body.authorizationUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't start the payment.",
      );
      setBusy(null);
    }
  }

  async function trial() {
    setBusy("trial");
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/trial", { method: "POST" });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(body?.error || "Couldn't start the trial.");
      window.location.assign("/chat?subscription=trial");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't start the trial.",
      );
      setBusy(null);
    }
  }

  async function verifyNin() {
    setBusy("nin");
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/nin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nin }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        url?: string;
      } | null;
      if (!res.ok || !body?.url) {
        throw new Error(
          body?.error || "Identity verification is not available yet.",
        );
      }
      window.location.assign(body.url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Identity verification is not available yet.",
      );
      setBusy(null);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">
        {isVendor ? "Vendor Enterprise" : "Buyer Premium"}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">
        {isVendor
          ? "14 days free, then a subscription. Enterprise does not pay the ₦1,000 lead fee."
          : "Requests, a rolling search window, and vendor tools. Premium needs your address and a NIN selfie check."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["monthly", "annual"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setInterval(key)}
            className={cn(
              "cursor-pointer rounded-xl border px-3 py-3 text-left",
              interval === key
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 hover:border-orange-300",
            )}
          >
            <span className="block text-xs text-gray-500">
              {key === "monthly" ? "Monthly" : "Yearly"}
            </span>
            <span className="mt-0.5 block text-sm font-semibold text-ink">
              {naira(prices[key])}
            </span>
          </button>
        ))}
      </div>

      {!isVendor && (
        <div className="mt-4 space-y-2">
          <label
            className="block text-sm font-medium text-ink"
            htmlFor="premium-address"
          >
            Address
          </label>
          <input
            id="premium-address"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            placeholder="Street and house"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink focus:border-transparent focus:ring-2 focus:ring-orange-300 focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Area"
              aria-label="Area"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink focus:border-transparent focus:ring-2 focus:ring-orange-300 focus:outline-none"
            />
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
              aria-label="State"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink focus:border-transparent focus:ring-2 focus:ring-orange-300 focus:outline-none"
            />
          </div>
          <label
            className="block text-sm font-medium text-ink"
            htmlFor="premium-nin"
          >
            NIN
          </label>
          <div className="flex gap-2">
            <input
              id="premium-nin"
              inputMode="numeric"
              maxLength={11}
              value={nin}
              onChange={(e) =>
                setNin(e.target.value.replace(/\D/g, "").slice(0, 11))
              }
              placeholder="11 digits"
              className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink focus:border-transparent focus:ring-2 focus:ring-orange-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={verifyNin}
              disabled={nin.length !== 11 || busy !== null}
              className="cursor-pointer rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-ink hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "nin" ? "Opening…" : "Selfie check"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

      <div className="mt-4 flex gap-2">
        {isVendor && (
          <button
            type="button"
            onClick={trial}
            disabled={busy !== null}
            className="flex-1 cursor-pointer rounded-full border border-gray-200 px-3 py-2.5 text-sm font-semibold text-ink hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "trial" ? "Starting…" : "Start 14-day trial"}
          </button>
        )}
        <button
          type="button"
          onClick={pay}
          disabled={busy !== null}
          className="flex-1 cursor-pointer rounded-full bg-orange-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "pay" ? "Opening…" : `Pay ${naira(prices[interval])}`}
        </button>
      </div>
    </section>
  );
}
