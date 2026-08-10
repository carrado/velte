import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const SLOTS = [
  { label: "1st listing", amount: "+₦500" },
  { label: "2nd listing", amount: "+₦500" },
  { label: "3rd listing", amount: "+₦500" },
  { label: "4th listing", amount: "+₦500" },
];

const REFERRAL_STEPS = [
  {
    title: "They sign up with your code",
    body: "Your link or code applies automatically at signup.",
    required: false,
  },
  {
    title: "They verify their email",
    body: "Confirms it's a real, reachable account.",
    required: true,
  },
  {
    title: "They list at least 4 products or services",
    body: "The new requirement — proof they're actually building a store, not just holding an account.",
    required: true,
  },
];

const FAQS = [
  {
    q: "Can I earn from both at once?",
    a: "Yes. The listing bonus is about your own catalogue; the referral bonus is about vendors you bring in — they're tracked and paid independently.",
  },
  {
    q: "I referred someone before this update — do they still need to list 4 products?",
    a: "Yes, the updated rule applies to any referral not yet marked Credited, regardless of when they signed up.",
  },
  {
    q: "Where do I see this happening?",
    a: "Open the Velte app → Wallet, for your balance and the full transaction ledger, or Referrals, for the status of everyone you've invited.",
  },
];

export default function WalletBonusesContent() {
  return (
    <>
      <Navbar />
      <main className="bg-[#F1F5F9] min-h-screen pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 flex flex-col gap-8">
          {/* Header */}
          <header className="flex flex-col gap-4">
            <div className="w-11 h-[5px] rounded-full bg-orange-500" />
            <span className="inline-flex self-start items-center rounded-full bg-orange-50 border border-orange-200 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-orange-700">
              Wallet Policy Update
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#023337] text-balance tracking-tight">
              How your wallet earns from listings and referrals
            </h1>
            <p className="text-gray-500 text-base max-w-2xl">
              Two things changed on Velte: what you earn for building out your
              catalogue, and the rule for when a referral actually pays out.
              Both are already live — this page is the plain-English version of
              what&apos;s in your wallet ledger.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-400">
              <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
                Effective 10 August 2026
              </span>
              <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
                Applies to Velte vendor wallets
              </span>
            </div>
          </header>

          {/* At a glance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
              <p className="text-2xl font-bold text-[#023337] tabular-nums">
                ₦2,000
              </p>
              <p className="text-sm text-gray-500 mt-1">
                max from listing your first 4 products or services
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
              <p className="text-2xl font-bold text-[#023337] tabular-nums">
                ₦1,000
              </p>
              <p className="text-sm text-gray-500 mt-1">
                per vendor you refer who verifies and lists 4+
              </p>
            </div>
          </div>

          {/* Product listing bonus */}
          <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 sm:p-7 flex flex-col gap-5">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-[#023337]">
                Product listing bonus
              </h2>
              <span className="text-lg font-bold text-orange-600 tabular-nums whitespace-nowrap">
                ₦500 × 4
              </span>
            </div>
            <p className="text-gray-500 text-[15px]">
              You now earn <strong className="text-[#023337]">₦500</strong>{" "}
              automatically for each of your{" "}
              <strong className="text-[#023337]">first 4</strong> real products
              or services listed — no forms, no request, it lands in your wallet
              the moment the listing is published.
            </p>

            <div className="flex flex-wrap gap-2">
              {SLOTS.map((slot) => (
                <div
                  key={slot.label}
                  className="flex-1 min-w-[120px] rounded-xl border border-dashed border-orange-200 bg-orange-50/50 px-3 py-2.5"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                    {slot.label}
                  </p>
                  <p className="text-sm font-bold text-[#023337] tabular-nums">
                    {slot.amount}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <span className="shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                !
              </span>
              <div className="text-sm text-gray-700">
                <p className="font-semibold text-orange-800 mb-1.5">
                  What to know
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    It&apos;s a <strong>lifetime</strong> allowance, not per day
                    or per month — your 5th listing onward earns no bonus.
                  </li>
                  <li>
                    Deleting a bonused listing and re-adding it does{" "}
                    <strong>not</strong> create a new bonus.
                  </li>
                  <li>
                    Only listings posted{" "}
                    <strong>from the effective date above</strong> count — it
                    doesn&apos;t apply retroactively to products already in your
                    store.
                  </li>
                  <li>
                    You&apos;ll get a notification and a matching entry in your
                    Wallet transaction history each time it&apos;s credited.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Referral bonus */}
          <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 sm:p-7 flex flex-col gap-5">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-[#023337]">
                Referral bonus — updated rule
              </h2>
              <span className="text-lg font-bold text-orange-600 tabular-nums whitespace-nowrap">
                ₦1,000
              </span>
            </div>
            <p className="text-gray-500 text-[15px]">
              Referrals still pay{" "}
              <strong className="text-[#023337]">₦1,000</strong> with no limit
              on how many vendors you bring in. What changed is{" "}
              <strong className="text-[#023337]">when</strong> it pays — it now
              depends on what your referral actually does after signing up, not
              just that they signed up.
            </p>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {REFERRAL_STEPS.map((step, i) => (
                <div
                  key={step.title}
                  className={`flex gap-3.5 px-4 py-3.5 bg-gray-50/60 ${
                    i > 0 ? "border-t border-gray-200" : ""
                  }`}
                >
                  <span
                    className={`shrink-0 w-6.5 h-6.5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                      step.required
                        ? "bg-orange-500 text-white"
                        : "bg-white border border-gray-200 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#023337]">
                      {step.title}
                    </p>
                    <p className="text-[13.5px] text-gray-500">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <span className="shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                !
              </span>
              <div className="text-sm text-gray-700">
                <p className="font-semibold text-orange-800 mb-1.5">
                  What to know
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    All three steps are required. Signing up and verifying alone
                    will <strong>not</strong> release the bonus.
                  </li>
                  <li>
                    Your Referrals page shows each invite as{" "}
                    <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Pending
                    </span>{" "}
                    until every condition is met, then{" "}
                    <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-semibold text-green-700">
                      Credited
                    </span>{" "}
                    — that&apos;s when the ₦1,000 lands.
                  </li>
                  <li>
                    Nothing to do on your side once you&apos;ve shared your code
                    — this is entirely driven by what your referral does in
                    their own account.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-lg font-bold text-[#023337] mb-2">
              Common questions
            </h2>
            <div className="divide-y divide-gray-200">
              {FAQS.map((item) => (
                <div key={item.q} className="py-3.5">
                  <p className="text-sm font-semibold text-[#023337] mb-1">
                    {item.q}
                  </p>
                  <p className="text-sm text-gray-500">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Footer note */}
          <div className="border-t border-gray-200 pt-5 text-sm text-gray-400 flex flex-col gap-1">
            <span>
              <strong className="text-gray-500">Velte</strong> — vendor wallet
              policy notice
            </span>
            <span>
              Questions about a specific credit?{" "}
              <Link href="/contact" className="text-orange-600 underline">
                Reach out to us
              </Link>
              .
            </span>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
