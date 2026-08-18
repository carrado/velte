import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { CheckCircleIcon, XCircleIcon } from "@/components/icons";

// Same photo as the homepage's own Hero.tsx (heroPhoto) — same subject, and
// already vetted for this site. Photo credit: Ali Mkumbwa / Unsplash
// (unsplash.com/photos/H1KbBGUs4bM) — license doesn't require attribution,
// kept here for maintainability.
const heroPhoto = {
  src: "https://images.unsplash.com/photo-1687422808384-c896d0efd4ab",
  alt: "Woman standing in front of a store holding a cell phone",
};

// Previously-unused stock asset already sitting in /public (Unsplash,
// credited by its own filename convention) — a real photo of two people
// browsing an online product catalog together, which is exactly what
// step 2 below is about.
const catalogPhoto = {
  src: "/kobu-agency-7okkFhxrxNw-unsplash.jpg",
  alt: "Two people browsing an online product catalog together on a laptop",
};

const STEPS = [
  {
    title: "1. Switch to WhatsApp Business, not your personal number",
    body: "WhatsApp Business is free and gives you a catalog tab, quick replies, away messages, and a business profile with your address and hours — none of which exist on a personal account. If you're currently selling from your personal number, customers can't tell your shop is a real business, and you can't set up automatic replies for when you're offline.",
  },
  {
    title: "2. Build a catalog customers can actually browse",
    body: "The single biggest reason people abandon a WhatsApp purchase is having to scroll through months of chat history to find a product photo and price. A proper catalog — clear photos, one product per entry, a price on every listing — lets a customer browse and decide before they ever type a message, which means the DM they do send is a real order, not a question.",
  },
  {
    title: "3. Make it easy to order without DM chaos",
    body: '"Is this available?", "How much?", "Do you deliver to Yaba?" — the same three questions, twenty times a day, buried inside chats about five other orders. A shareable storefront link that shows your full catalog, prices, and an order button cuts most of that repetition before it starts, and keeps every order as its own trackable thing instead of a scroll-up-to-find-it DM.',
  },
  {
    title: "4. Get paid without losing the sale",
    body: "Asking a customer to send money to a personal account number, then waiting for a screenshot, then manually checking your bank app — every extra step is a chance for them to change their mind or get distracted. A payment link (or an account number your system automatically reconciles for you) removes the back-and-forth and gets you paid before the moment passes.",
  },
  {
    title: "5. Track every order so nothing falls through the cracks",
    body: "Once you're doing more than a handful of sales a week, memory stops being a reliable order-tracking system. A simple status per order — placed, paid, shipped, delivered — and a place to see all of them at once is the difference between a business that scales past 20 orders a day and one that quietly starts losing them.",
  },
  {
    title: "6. Build trust with a real storefront link",
    body: "A link that looks like a real store — your business name, your products, your reviews — does more for conversion than any amount of convincing in a chat. New customers who've never bought from you before are far more likely to trust a proper storefront than a personal WhatsApp number they found in a group chat.",
  },
];

const MISTAKES = [
  "Mixing personal chats and orders in the same conversation thread — it's how orders get missed.",
  "Posting prices only in status updates that disappear after 24 hours.",
  "No fixed reply time, so customers assume you've gone quiet and buy elsewhere.",
  "Sending different prices to different customers with no record of what was agreed.",
  "Asking for bank transfers with no way to confirm payment except a screenshot.",
];

export const FAQS = [
  {
    q: "Do I need a website to sell on WhatsApp in Nigeria?",
    a: "No. A shareable storefront link works the same way a website would for the purpose of showing your catalog and taking orders, without you needing to build or pay for a separate site.",
  },
  {
    q: "Is WhatsApp Business free?",
    a: "Yes, the WhatsApp Business app itself is free to download and use. The catalog, quick replies, and business profile are all included at no cost.",
  },
  {
    q: "How do I stop customers from asking 'is this still available?' repeatedly?",
    a: "Keep your catalog current the moment something sells out, and put your real stock and prices somewhere customers can check themselves before they message you — that alone removes most of the repeat questions.",
  },
  {
    q: "What's the easiest way to accept payment on WhatsApp?",
    a: "A payment link or an account number that's automatically reconciled against your orders, so you're not manually cross-checking bank alerts against a chat thread every time someone claims they've paid.",
  },
  {
    q: "How many products should I list to start?",
    a: "Start with what you actually have in stock right now — a small, accurate catalog builds more trust than a large one with items you can't fulfil. You can always add more as you go.",
  },
];

export default function SellOnWhatsappNigeriaContent() {
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
              How to Start Selling on WhatsApp in Nigeria: A Complete Guide
            </h1>
            <p className="text-gray-500 text-base max-w-2xl">
              WhatsApp is already where most small-business sales in Nigeria
              happen — the gap between a chat full of DMs and a real,
              trustworthy storefront is smaller than it looks. Here&apos;s how
              to close it.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-400">
              <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
                11 August 2026
              </span>
              <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
                8 min read
              </span>
            </div>
          </header>

          {/* Intro */}
          <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 sm:p-7">
            <p className="text-gray-600 text-[15px] leading-relaxed">
              Nigeria has one of the most active WhatsApp Business markets in
              the world — millions of small vendors, from fashion resellers to
              food vendors to electronics dealers, run their entire business out
              of a chat app. That&apos;s not an accident: WhatsApp is already
              installed on every customer&apos;s phone, it&apos;s free, and it
              doesn&apos;t require anyone to learn new software. The problem
              isn&apos;t WhatsApp itself — it&apos;s that most vendors are still
              running it the way they&apos;d run a personal chat, not a store.
              Below is a practical, step-by-step way to fix that.
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

          {/* Steps */}
          <div className="flex flex-col gap-4">
            {STEPS.map((step, i) => (
              <section
                key={step.title}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 sm:p-7"
              >
                <h2 className="text-xl font-bold text-[#023337] mb-2.5">
                  {step.title}
                </h2>
                <p className="text-gray-500 text-[15px] leading-relaxed">
                  {step.body}
                </p>
                {/* Only the "build a catalog" step gets a photo — one real,
                    relevant image is worth more than decorating every step. */}
                {i === 1 && (
                  <figure className="mt-5 rounded-xl overflow-hidden">
                    <div className="relative aspect-[16/9]">
                      <Image
                        src={catalogPhoto.src}
                        alt={catalogPhoto.alt}
                        fill
                        sizes="(min-width: 768px) 624px, 100vw"
                        className="object-cover"
                      />
                    </div>
                  </figure>
                )}
              </section>
            ))}
          </div>

          {/* Common mistakes */}
          <section className="rounded-2xl border border-red-100 bg-red-50/40 p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-3.5">
              <XCircleIcon className="w-5 h-5 text-red-500 shrink-0" />
              <h2 className="text-lg font-bold text-[#023337]">
                Common mistakes that cost vendors sales
              </h2>
            </div>
            <ul className="flex flex-col gap-2.5">
              {MISTAKES.map((mistake) => (
                <li
                  key={mistake}
                  className="flex items-start gap-2.5 text-sm text-gray-600"
                >
                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 mt-2" />
                  {mistake}
                </li>
              ))}
            </ul>
          </section>

          {/* What good looks like */}
          <section className="rounded-2xl border border-orange-200 bg-orange-50 p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-3.5">
              <CheckCircleIcon className="w-5 h-5 text-orange-600 shrink-0" />
              <h2 className="text-lg font-bold text-[#023337]">
                What a working setup looks like
              </h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              A vendor with this figured out has a WhatsApp Business profile, a
              storefront link they can drop in status updates and group chats,
              an always-current catalog with real prices, a way to collect
              payment that doesn&apos;t rely on screenshots, and a simple view
              of every order&apos;s status. None of that requires developer help
              or a big budget — it&apos;s the same handful of habits, done
              consistently. Tools like{" "}
              <Link
                href="/"
                className="font-semibold text-orange-700 underline"
              >
                Velte
              </Link>{" "}
              exist specifically to make that setup a five-minute job instead of
              a bunch of separate workarounds — a product catalog, a shareable
              store link, order tracking, and payment collection in one place,
              built around how Nigerian vendors already sell.
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
                Ready to turn your WhatsApp chats into a real store?
              </p>
              <p className="text-sm text-gray-500">
                Set up your catalog, storefront link, and order tracking on
                Velte — free to start.
              </p>
            </div>
            <Link
              href="/auth/signup"
              className="shrink-0 inline-flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-3 transition-colors"
            >
              Get started free
            </Link>
          </section>

          {/* Footer note */}
          <div className="border-t border-gray-200 pt-5 text-sm text-gray-400 flex flex-col gap-1">
            <span>
              <strong className="text-gray-500">Velte</strong> — guides for
              buyers and vendors
            </span>
            <span>
              More questions about selling online?{" "}
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
