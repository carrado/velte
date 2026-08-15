import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
// Icons from Phosphor (2026-08-16, swapped from lucide-react for this
// session's pages only — see MobileMenu.tsx's own comment). Imported from
// the /ssr subpath, not the default client entry — this page has no "use
// client" (it's a Server Component), and Phosphor's regular export relies
// on a React Context that only the ssr build supports rendering statically
// without a client boundary. Search/Store have no exact match; MagnifyingGlass/
// Storefront are their closest Phosphor equivalents.
import {
  ArrowRight,
  MagnifyingGlass,
  Storefront,
} from "@phosphor-icons/react/ssr";

// The unified public CTA (2026-08-14, replaces the split "Create your free
// account" / "List your business" pair) — one entry point, one question.
// Buyer registration and vendor signup stay two completely separate,
// already-built systems underneath (buyer_auth_token phone+OTP vs the
// vendor auth_token wizard, see proxy.ts's own comment on why they're
// gated differently) — this page never merges them, it just removes the
// "which button do I click" ambiguity from every place that used to link
// straight to one or the other.
export const metadata: Metadata = {
  title: "Join Velte",
  description:
    "Whether you're looking for something or selling it, Velte helps you connect with the right people.",
};

const options = [
  {
    emoji: "🛍️",
    icon: MagnifyingGlass,
    title: "I'm here to find things",
    body: "Find products, discover businesses, ask Velux, post requests and compare options.",
    cta: "Continue as a Buyer",
    href: "/buyer/auth",
  },
  {
    emoji: "🏪",
    icon: Storefront,
    title: "I own a business",
    body: "List your business, get discovered by buyers and respond to buyer requests.",
    cta: "Continue as a Business",
    href: "/auth/signup",
  },
];

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(249,115,22,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative min-h-screen flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">
          <Link href="/" className="flex items-center justify-center mb-8">
            <Image
              src="/velte_logo_esn5dj.png"
              alt="Velte logo"
              // Sized down 100px → 80px (2026-08-16) — matches the size
              // already settled on for Sidebar/BuyerHeader after the same
              // 2026-08-14 aspect-ratio fix made the undistorted logo read
              // larger than intended at its old width everywhere.
              width={80}
              height={39}
              priority
            />
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#023337] tracking-tight mb-2">
              How will you use Velte?
            </h1>
            <p className="text-gray-500 text-sm">
              Pick whichever fits — you can always do both later.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {options.map(({ emoji, title, body, cta, href }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:border-orange-300 hover:shadow-lg transition-all"
              >
                <span className="text-3xl mb-3" aria-hidden>
                  {emoji}
                </span>
                <p className="text-lg font-bold text-[#023337] mb-1.5">
                  {title}
                </p>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  {body}
                </p>
                <span className="mt-auto inline-flex items-center gap-1.5 text-orange-600 group-hover:text-orange-700 font-semibold text-sm">
                  {cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>

          <p className="text-center text-gray-400 text-sm mt-8">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
