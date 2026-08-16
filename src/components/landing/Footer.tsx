import Image from "next/image";
import Link from "next/link";

// Real brand marks (not generic outline icons) — inline SVGs so no icon
// library dependency is needed for just these two.
function FacebookLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect width="24" height="24" rx="12" fill="#1877F2" />
      <path
        d="M15.5 12.5h-2v7h-3v-7H9v-2.5h1.5V8.5c0-1.9 1.1-3 3.3-3 .66 0 1.5.1 1.5.1v2.2h-1c-1 0-1.3.5-1.3 1.2v1.5h2.3l-.3 2.5z"
        fill="#fff"
      />
    </svg>
  );
}

const socialLinks = [
  {
    label: "Facebook",
    href: "https://web.facebook.com/velte.ng",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/veltetechnologies/",
    // Real asset already in public/ — use it as-is rather than
    // hand-drawing an approximation.
    iconSrc: "/instagram.svg",
  },
];

// Grouped columns (2026-08-16, replaces the flat "essential links" list from
// 2026-08-15 below) — the flat-list version was itself a reaction to an
// EARLIER two-column attempt that stacked too tall on mobile (no side-by-side
// grid there). This version fixes that instead of re-triggering it: on
// mobile the groups sit in a 2x2-ish grid (`grid-cols-2`), not stacked full
// height one under another, so it's barely taller than the old flat list;
// desktop goes to one row (a justified flex, not a fixed grid-cols-N — see
// the render below). Pricing deliberately left out (2026-08-16) — not
// dropped for a design reason, just not ready to be a footer-level link yet
// on its own; it's still reachable from How It Works' vendor column.
//
// `/updates` swapped for `/how-it-works` (2026-08-16) — Updates is a vendor-
// account changelog ("policy and feature changes that affect your Velte
// vendor account"), content for people who already have a store, not
// something a first-time visitor gets value from. How It Works fills the
// same Resources slot with a real step-by-step page instead (grounded in
// existing Hero/VeluxShowcase/RegisterCta/pricing copy, not new claims).
//
// Standalone "Product" column (Marketplace + Ask Velux) folded into
// Resources same day — it originally existed because "both already live in
// Navbar, just not re-surfaced here"; that stopped being true once Navbar's
// AI-agent-pivot redesign dropped its own Ask Velux button and Browse link
// (see Navbar.tsx's own comment). "Ask Velte" kept — Footer renders on
// every static page (About, FAQ, How It Works, ...) and FloatingAskBar/
// Hero's composer only exist on "/", so this is genuinely the only path
// into /chat from anywhere else. "Marketplace" dropped entirely, not just
// de-emphasized (2026-08-16) — the product itself doesn't work that way
// anymore: AI search is what surfaces every product/business/service now,
// there's no separate "browse the stacked-up catalog" experience left to
// send anyone to. The /marketplace route and its MarketplaceBrowse/
// VendorsGrid components are UNTOUCHED by this — only the navigational
// path to it is gone; deleting the page itself is a separate, bigger call
// nobody's made yet.
const footerGroups: {
  heading: string;
  links: { label: string; href: string }[];
}[] = [
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "How It Works", href: "/how-it-works" },
      { label: "Ask Velte", href: "/chat" },
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200">
      {/* Widened 5xl → 6xl and switched brand/groups to a justified flex row
          (2026-08-16) — the old grid-cols-6 packed everything toward the
          left edge of a narrower container; this spreads the 4 groups across
          the full row with real gaps between them instead of being squeezed
          together, closer to the airy spacing on the reference site. Logo
          also sized down (72px → 56px) — the 2026-08-14 aspect-ratio fix
          (see Navbar's own comment) rendered every logo instance at its true
          undistorted height, which read as noticeably larger than intended
          here. */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-9 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 mb-8">
          <div className="max-w-[260px] shrink-0">
            <Link href="/" className="flex items-center gap-2.5 mb-2.5">
              <Image
                src="/velte_logo_esn5dj.png"
                alt="Velte"
                width={56}
                height={28}
                priority
              />
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed mb-3.5">
              Describe what you need — we find the nearest real vendor who
              actually has it.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map(({ label, href, iconSrc }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="opacity-90 hover:opacity-100 transition-opacity duration-150"
                >
                  {iconSrc ? (
                    <Image src={iconSrc} alt={label} width={28} height={28} />
                  ) : (
                    <FacebookLogo className="h-7 w-7" />
                  )}
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:flex sm:gap-10 lg:gap-16">
            {footerGroups.map((group) => (
              <div key={group.heading}>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">
                  {group.heading}
                </p>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-gray-500 hover:text-gray-900 text-sm transition-colors duration-150"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-400 text-xs text-center sm:text-left">
            &copy; {year} Velte Technologies. All rights reserved.
          </p>
          <p className="text-gray-400 text-xs">
            Matched by meaning, proximity, and trust — not keywords.
          </p>
        </div>
      </div>
    </footer>
  );
}
