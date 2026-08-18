import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { CheckCircleIcon, XCircleIcon } from "@/components/icons";

// Same photo as the homepage's own About page (AboutContent's storyPhoto) —
// already vetted for this site, and directly on-theme: a real vendor
// stall, not a stock "online shopping" photo. Photo credit: Ben Iwara /
// Unsplash (unsplash.com/photos/w1EaPjX71Sw) — two women at a food stall,
// Benin City, Nigeria. License doesn't require attribution, kept for
// maintainability.
const heroPhoto = {
  src: "https://images.unsplash.com/photo-1765584830351-b751c8937c75",
  alt: "Two women at a food stall, Benin City, Nigeria",
};

const CHECKS = [
  {
    title: "1. Look for a real storefront, not just a phone number",
    body: "A vendor who can show you a catalog — their name, their products, prices attached — has something to lose if they disappear. A DM number with no storefront behind it, found in a group chat or a comment section, has nothing tying it to a real business at all.",
  },
  {
    title: "2. Pay attention to how they respond, not just what they say",
    body: "A real business answers specific questions with specific answers: exact stock, exact price, a real photo of the actual item on request. Vague answers, copy-pasted replies, or refusing to answer a direct question are the same red flags online that they'd be in person.",
  },
  {
    title: "3. Never pay to an account with no order trail",
    body: "A personal bank account with no receipt, no order reference, and no record on any platform means that if something goes wrong, you have nothing to point to. A payment tied to an actual order — one you can screenshot, reference, or trace — at least gives you something to work with.",
  },
  {
    title: "4. Ask for proof before you commit, not after",
    body: "A current photo or short video of the actual item, not a stock catalog photo pulled from Google, is a reasonable ask for anything above pocket change. A legitimate seller with real stock can usually do this in minutes; one who can't or won't is telling you something.",
  },
  {
    title: "5. Be suspicious of pressure, not just price",
    body: "\"Last one, pay now or I sell to someone else\" is a pressure tactic that works precisely because it stops you from asking the questions above. A genuine vendor with real inventory rarely needs to rush you before you've even confirmed what you're buying.",
  },
  {
    title: "6. Prefer vendors matched by real proximity and trust",
    body: "A seller surfaced because they're an actual nearby business — not because they replied fastest in a group chat or paid for placement — starts you off with more signal than a cold DM ever will. That's the entire premise behind how Velte ranks results: meaning, distance, and trust, never who bid the most.",
  },
];

const RED_FLAGS = [
  "Insists on payment before showing any real, current photo of the item you asked for.",
  "No storefront or catalog — just a phone number and a lot of confidence.",
  "Refuses a video call or an extra photo when reasonably asked.",
  "Price is dramatically below every other seller for the exact same item.",
  "Pushes urgency before you've asked a single real question.",
  "No trail if something goes wrong — a personal account number with zero order history.",
];

export const FAQS = [
  {
    q: "How do I know if an online vendor in Nigeria is real?",
    a: "Look for a real storefront or catalog behind the phone number, specific (not vague) answers to direct questions, and a willingness to show current photos or video of the actual item before you pay.",
  },
  {
    q: "Is it safe to pay before delivery?",
    a: "It's lower-risk when the payment is tied to a real, traceable order — a receipt, a reference, a platform record — rather than a bare transfer to a personal account with nothing to point back to if something goes wrong.",
  },
  {
    q: "What should I do if a vendor refuses to answer basic questions?",
    a: "Treat it as your answer. A legitimate seller with real stock has no reason to avoid confirming what you're actually buying before you pay.",
  },
  {
    q: "Does Velte verify vendors?",
    a: "Every vendor and listing on Velte comes straight from our database — never invented — and trust builds from real activity over time: verified details, responsiveness, and completed orders. A new store still shows up in search from day one; trust affects ranking, not whether it's found.",
  },
  {
    q: "What if I still get scammed?",
    a: "Keep every receipt, chat log, and order reference — the same trail this guide tells you to insist on before paying is exactly what you'd need afterward too.",
  },
];

export default function FindTrustedVendorsContent() {
  return (
    <>
      <Navbar />
      <main className="bg-[#F1F5F9] min-h-screen pt-24 pb-20">
        <article className="max-w-3xl mx-auto px-5 sm:px-8 flex flex-col gap-8">
          {/* Header */}
          <header className="flex flex-col gap-4">
            <div className="w-11 h-[5px] rounded-full bg-orange-500" />
            <span className="inline-flex self-start items-center rounded-full bg-orange-50 border border-orange-200 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-orange-700">
              Guides
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#023337] text-balance tracking-tight">
              How to Find Real, Trusted Vendors Near You in Nigeria
            </h1>
            <p className="text-gray-500 text-base max-w-2xl">
              Buying online in Nigeria comes with a real, well-earned anxiety —
              fake stock, sellers who vanish after payment, prices too good to
              be true. Here&apos;s a practical way to tell a real vendor from a
              risky one before you ever send money.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-400">
              <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
                11 August 2026
              </span>
              <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
                7 min read
              </span>
            </div>
          </header>

          {/* Intro */}
          <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 sm:p-7">
            <p className="text-gray-600 text-[15px] leading-relaxed">
              Almost everyone shopping online in Nigeria has a story — money
              sent for something that never arrived, a seller who went quiet the
              moment payment cleared, a product that showed up nothing like the
              photo. That history is exactly why so many buyers stick to people
              they already know, even when a stranger a few streets away has
              exactly what they need for less. The good news is that spotting a
              real vendor doesn&apos;t take luck — it takes knowing what to
              check, in what order, before money changes hands.
            </p>
          </section>

          {/* Hero photo */}
          <figure className="rounded-2xl overflow-hidden shadow-sm">
            <div className="relative aspect-[16/9]">
              <Image
                src={heroPhoto.src}
                alt={heroPhoto.alt}
                fill
                sizes="(min-width: 768px) 672px, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </figure>

          {/* Checklist */}
          <div className="flex flex-col gap-4">
            {CHECKS.map((check) => (
              <section
                key={check.title}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 sm:p-7"
              >
                <h2 className="text-xl font-bold text-[#023337] mb-2.5">
                  {check.title}
                </h2>
                <p className="text-gray-500 text-[15px] leading-relaxed">
                  {check.body}
                </p>
              </section>
            ))}
          </div>

          {/* Red flags */}
          <section className="rounded-2xl border border-red-100 bg-red-50/40 p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-3.5">
              <XCircleIcon className="w-5 h-5 text-red-500 shrink-0" />
              <h2 className="text-lg font-bold text-[#023337]">
                Red flags worth walking away from
              </h2>
            </div>
            <ul className="flex flex-col gap-2.5">
              {RED_FLAGS.map((flag) => (
                <li
                  key={flag}
                  className="flex items-start gap-2.5 text-sm text-gray-600"
                >
                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 mt-2" />
                  {flag}
                </li>
              ))}
            </ul>
          </section>

          {/* How Velte reduces the risk */}
          <section className="rounded-2xl border border-orange-200 bg-orange-50 p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-3.5">
              <CheckCircleIcon className="w-5 h-5 text-orange-600 shrink-0" />
              <h2 className="text-lg font-bold text-[#023337]">
                How Velte reduces the risk before it starts
              </h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Every vendor and listing on{" "}
              <Link
                href="/"
                className="font-semibold text-orange-700 underline"
              >
                Velte
              </Link>{" "}
              comes straight from a real database — never invented, never a
              stock photo standing in for actual stock. Describe what you need,
              in your own words or a photo, and{" "}
              <Link
                href="/chat"
                className="font-semibold text-orange-700 underline"
              >
                Ask Velte
              </Link>{" "}
              matches you to the nearest real vendor who actually has it, ranked
              by meaning, distance, and trust — not by who paid for placement.
              From there you&apos;re handed straight into a WhatsApp chat with
              the real business, the same conversation you&apos;d have if a
              friend gave you their number, minus the guesswork of finding them
              in the first place.
            </p>
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

          {/* CTA */}
          <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-[#023337] mb-1">
                Ready to find a vendor you can actually trust?
              </p>
              <p className="text-sm text-gray-500">
                Browse real listings or describe what you need — Velte matches
                you to the nearest real vendor who has it.
              </p>
            </div>
            <Link
              href="/"
              className="shrink-0 inline-flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-3 transition-colors"
            >
              Browse the marketplace
            </Link>
          </section>

          {/* Footer note */}
          <div className="border-t border-gray-200 pt-5 text-sm text-gray-400 flex flex-col gap-1">
            <span>
              <strong className="text-gray-500">Velte</strong> — guides for
              buyers and vendors
            </span>
            <span>
              Have a scam to report or a question about a vendor?{" "}
              <Link href="/contact" className="text-orange-600 underline">
                Reach out to us
              </Link>
              .
            </span>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
