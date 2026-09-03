"use client";

import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { CreditsDonut } from "@/components/credits/CreditsDonut";
import { ReferralCard } from "@/components/credits/ReferralCard";
import { SIGNUP_CREDITS, VENDOR_CATALOG_GRANTS } from "@/lib/credits";
import { CREDIT_PACKS } from "@/lib/creditPacks";
import { cn } from "@/lib/utils";

// What credits are and what they buy (2026-08-31).
//
// Replaces the plans page's body. The pricing table it succeeds had three
// columns of tiers to compare; this has none, because there is nothing to
// choose BETWEEN any more — one balance, top up when you need it. Shopping is
// need-driven, and a subscription charged most of its users in months they
// never opened the app.
//
// The per-action price list that sat here until 2026-09-01 is gone too, and
// for the same reason the tier columns went: it answered a question nobody
// opens this panel to ask. What they came for is how much they have left, so
// the meter (CreditsDonut) leads instead. Costs still surface where they are
// actually decided — a refusal names the price of the thing being refused.
//
// Container-agnostic, exactly as PlansContent was: it takes what it renders as
// props and draws a plain column, so the modal supplies the frame and this
// file never has to know it is in one.

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export function CreditsPanel({
  balance,
  used,
  isGuest,
  referralCode,
  walletBalanceKobo,
  onTopUp,
  busyPack,
  topUpError,
}: {
  /** What this viewer has. For a guest this is their browser-side balance. */
  balance: number | null;
  /** What they have already spent — the meter's other half. */
  used: number;
  isGuest: boolean;
  /** The signed-in buyer's own referral code, when they have one. Null for a
   *  guest, for a vendor, and for buyers who predate referrals — ReferralCard
   *  renders nothing rather than an empty link. */
  referralCode: string | null;
  /** The VENDOR's lead wallet, in kobo. Null for guests and buyers, who have
   *  no wallet — which is exactly what the funding choice branches on, so it
   *  can never be offered to someone with nothing to spend. */
  walletBalanceKobo: number | null;
  onTopUp: (packId: string, source?: "card" | "wallet") => void;
  /** The pack currently opening a checkout, if any. */
  busyPack: string | null;
  /** A failed WALLET purchase, usually an empty wallet. A card top-up
   *  navigates away, so it never has an error to report here. */
  topUpError: string | null;
}) {
  // A vendor, and only a vendor, sees a funding choice. The wallet is money
  // they already keep with Velte for lead charges; making them re-enter a
  // card to spend it is the friction that stops a vendor using their own
  // product.
  const isVendor = !isGuest && walletBalanceKobo !== null;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 sm:px-8">
      <div className="mt-8 text-center sm:mt-12">
        <h1 className="text-3xl font-bold tracking-tight text-balance text-[#023337] sm:text-[2.4rem] sm:leading-[1.1]">
          Only pay when you&apos;re shopping
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-pretty text-gray-600 sm:text-base">
          No subscription. Credits don&apos;t expire — top up when you have
          something to buy, and they&apos;re there next time you do.
        </p>
      </div>

      {/* The meter. One ring, one number — a buyer should never have to work
          out which of six allowances applies to what they are about to do,
          and now they can see how much of their own they have spent. */}
      <CreditsDonut
        balance={balance}
        used={used}
        isGuest={isGuest}
        signupCredits={SIGNUP_CREDITS}
      />

      {/* Directly under the balance, because that is the number someone is
          looking at when a way to top it up for free is worth offering. */}
      <ReferralCard code={referralCode} />

      {/* A vendor's credits are EARNED, not granted for signing up, and
          saying so turns the balance into a reason to finish their catalogue
          — which is the thing Velte most needs from them. Only shown to
          vendors: it is meaningless to a buyer and would read as a tier
          table, which is what this whole model replaced. */}
      {isVendor && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-[#023337]">
            Your listings earn credits
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
            The more you have on Velte, the more search you get — and you keep
            whatever you have already earned.
          </p>
          <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
            {/* Cheapest first, so it reads as a ladder to climb rather than a
                target already missed. */}
            {[...VENDOR_CATALOG_GRANTS]
              .reverse()
              .map(({ minOfferings, credits }) => (
                <li
                  key={minOfferings}
                  className="flex items-baseline justify-between gap-3 bg-white px-4 py-2.5"
                >
                  <span className="text-sm text-gray-700">
                    {minOfferings === 0
                      ? "Getting started"
                      : `${minOfferings}+ listings`}
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-[#023337]">
                    {credits}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Top up — SIGNED-IN ONLY (2026-08-31).
          //
          // A guest used to see the pack grid too, and every pack was a dead
          // button: /api/credits/checkout 401s without a session, so a tap
          // opened nothing and said nothing. The step in front of paying is
          // having an account to put the credits on, so a guest is offered
          // that instead — and it is the better ask anyway, because it is
          // free and hands them three times what they are holding. */}
      {isGuest ? (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 text-center">
          <h2 className="text-sm font-semibold text-[#023337]">
            Get {SIGNUP_CREDITS} free credits
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-gray-600">
            Sign in to claim them, keep your searches, and top up whenever you
            need more.
          </p>
          <div className="mx-auto mt-4 flex max-w-xs justify-center">
            <GoogleSignInButton />
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Top-ups start at {naira(CREDIT_PACKS[0].priceNgn)} for{" "}
            {CREDIT_PACKS[0].credits} credits once you&apos;re in.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#023337]">Top up</h2>
            {isVendor && (
              <p className="shrink-0 text-xs text-gray-500">
                Wallet: {naira(Math.floor(walletBalanceKobo / 100))}
              </p>
            )}
          </div>
          {topUpError && (
            <p className="mt-2 text-sm text-red-600">{topUpError}</p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {CREDIT_PACKS.map((pack) => {
              // Affordability is decided here only to LABEL the wallet
              // button, never to hide it: the backend is the authority and
              // answers with the exact shortfall, and a button that vanishes
              // teaches a vendor nothing about why.
              const walletCovers =
                walletBalanceKobo !== null &&
                walletBalanceKobo >= pack.priceNgn * 100;
              return (
                <div
                  key={pack.id}
                  className={cn(
                    "rounded-2xl border bg-white px-4 py-4",
                    pack.highlight
                      ? "border-orange-300 ring-1 ring-orange-200"
                      : "border-gray-200",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span>
                      <span className="block font-mono text-lg font-bold tabular-nums text-[#023337]">
                        {pack.credits}
                        <span className="ml-1 text-xs font-medium text-gray-500">
                          credits
                        </span>
                      </span>
                      {pack.bonus > 0 && (
                        <span className="mt-0.5 block text-xs font-semibold text-orange-600">
                          +{pack.bonus} bonus
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-[#023337]">
                      {naira(pack.priceNgn)}
                    </span>
                  </div>

                  {/* A BUYER has one way to pay, so the whole card is the
                      button and nothing asks them to choose. A vendor gets
                      two, and the wallet leads because it is the one that
                      does not make them find a card. */}
                  <div className="mt-3 flex gap-2">
                    {isVendor && (
                      <button
                        type="button"
                        onClick={() => onTopUp(pack.id, "wallet")}
                        disabled={busyPack !== null}
                        className="flex-1 cursor-pointer rounded-full bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyPack === pack.id
                          ? "Paying…"
                          : walletCovers
                            ? "Pay from wallet"
                            : "Wallet (low)"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onTopUp(pack.id, "card")}
                      disabled={busyPack !== null}
                      className={cn(
                        "flex-1 cursor-pointer rounded-full px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                        isVendor
                          ? "border border-gray-200 text-[#023337] hover:bg-gray-50"
                          : "bg-orange-500 text-white hover:bg-orange-600",
                      )}
                    >
                      {busyPack === pack.id && !isVendor
                        ? "Opening…"
                        : isVendor
                          ? "Card"
                          : "Pay with card"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {isVendor
              ? "Wallet payments come out of the balance you keep for leads, and never change your cost per lead. Card payments go through Paystack."
              : "Paid with any Nigerian card through Paystack."}{" "}
            Credits never expire, and there is no recurring charge — nothing
            renews unless you buy again.
          </p>
        </div>
      )}
    </div>
  );
}
