import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, MessageSquarePlus, ShieldCheck } from "lucide-react";
import type { AuthPanelContent } from "@/types/common";

// Shared two-column shell — originally the buyer-only auth screens' look,
// now (2026-08-15 login/signup unification) the shell for the ONE login
// screen and the ONE signup screen, vendor and buyer alike ("we are
// adopting the page design of the buyer's auth designs" — the brief's own
// words). Left panel is a pure marketing surface (brand gradient, headline,
// feature bullets) and is desktop-only (`hidden lg:flex`) — on mobile
// there's no room for it, so the logo moves into the right column instead.
// Right panel keeps the existing dotted-grid-on-#F1F5F9 background and
// centers whatever card content the page passes in as `children`.
//
// `panel` overrides the headline/subtitle/features — defaults to the
// original buyer-request copy, but the unified signup passes vendor-
// flavored copy when the Vendor tab is active, and the unified login passes
// its own neutral copy (it can't know which audience it's talking to yet).
//
// Left panel is `lg:fixed` (2026-08-16) — was a plain flex child, which
// meant it scrolled away with the rest of the page on any content taller
// than the viewport (the vendor signup wizard, especially step 2's sector
// picker, routinely is). Pinning it to the viewport and pushing the right
// column over with a matching `lg:ml-[440px]` keeps the brand panel in
// view the entire time someone's filling in a tall form, instead of
// scrolling out of frame after the first screen.
const DEFAULT_PANEL: AuthPanelContent = {
  headline: "Describe what you need. Nearby vendors find you.",
  subtitle:
    "Velte matches your request against real vendors near you — no scrolling through irrelevant listings.",
  features: [
    {
      icon: MessageSquarePlus,
      text: "Post what you need, vendors who have it respond",
    },
    { icon: MapPin, text: "Matched by what's actually near you" },
    { icon: ShieldCheck, text: "No spam — you pick who to chat with" },
  ],
};

export function BuyerAuthShell({
  children,
  panel = DEFAULT_PANEL,
}: {
  children: ReactNode;
  panel?: AuthPanelContent;
}) {
  return (
    <div className="min-h-screen flex bg-[#F1F5F9]">
      <div className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-[440px] lg:z-10 shrink-0 overflow-hidden bg-gradient-to-br from-[#023337] via-[#0b4a4e] to-orange-600">
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-orange-400/20 blur-3xl pointer-events-none"
          aria-hidden
        />
        <div className="relative flex flex-col justify-between p-10 xl:p-12 text-white">
          {/* velte_logo_light.png — a recolored copy of the real logo
              (velte_logo_esn5dj.png's orange-V/black-ELTE artwork doesn't
              read on this dark panel), generated once via a pixel-level
              recolor script: V → yellow-400 (#facc15), ELTE → white,
              everything else left transparent. Not a live CSS filter/mask —
              a real static asset, same as the original file. */}
          <Link href="/" className="inline-flex w-fit">
            <Image
              src="/velte_logo_light.png"
              alt="Velte"
              width={72}
              height={35}
              priority
            />
          </Link>

          <div>
            <h2 className="text-3xl xl:text-[2.15rem] font-bold tracking-tight leading-[1.15] mb-4 text-balance">
              {panel.headline}
            </h2>
            <p className="text-white/60 text-sm leading-relaxed mb-9 max-w-sm">
              {panel.subtitle}
            </p>
            <div className="space-y-4">
              {panel.features.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-orange-300" />
                  </div>
                  <p className="text-white/85 text-sm leading-snug">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/35 text-xs">
            &copy; {new Date().getFullYear()} Velte. All rights reserved.
          </p>
        </div>
      </div>

      <div className="flex-1 relative lg:ml-[440px]">
        <div
          className="fixed inset-0 lg:absolute opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(249,115,22,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.6) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative min-h-screen flex items-center justify-center p-4 py-12">
          {children}
        </div>
      </div>
    </div>
  );
}
