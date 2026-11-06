import Image from "next/image";
import Link from "next/link";
import { VelteLogo } from "@/components/VelteLogo";

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

// Grouped columns — updated 2026-11-02:
// Added "Product" column (Pricing, Blog) now that both pages are real and
// complete. Pricing was deliberately left out of the footer in the original
// August pass ("not ready to be a footer-level link yet") — that's no longer
// true. Blog reinstated after the route was confirmed live. "For Businesses"
// links to /pricing which is the vendor-facing entry point until a dedicated
// vendor landing page exists.
// Resources column now focused on help/discovery content (How It Works,
// Ask Velte, FAQ) — product links moved to Product column.
const footerGroups: {
  heading: string;
  links: { label: string; href: string }[];
}[] = [
  {
    heading: "Product",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "How It Works", href: "/how-it-works" },
      { label: "Ask Velte", href: "/chat" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
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
    <footer className="bg-surface border-t border-gray-200 dark:border-white/10">
      {/* Container aligned with Navbar (max-w-7xl mx-auto px-5 sm:px-8) so logo,
          columns, and copyright row line up identically with header elements. */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-9 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 mb-8">
          <div className="max-w-[260px] shrink-0">
            <Link href="/" className="flex items-center gap-2.5 mb-2.5">
              <VelteLogo width={56} height={28} priority />
            </Link>
            <p className="text-ink/75 text-sm leading-relaxed mb-3.5">
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

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:flex sm:gap-10 lg:gap-14">
            {footerGroups.map((group) => (
              <div key={group.heading}>
                <p className="text-ink/60 text-xs font-semibold uppercase tracking-wide mb-3">
                  {group.heading}
                </p>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-ink/75 hover:text-ink text-sm transition-colors duration-150"
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

        <div className="border-t border-gray-200 dark:border-white/10 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-ink/65 text-xs text-center sm:text-left">
            &copy; {year} Velte Technologies. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-ink/65 text-xs">🇳🇬 Built for Nigeria</span>
            <span className="text-ink/40 text-xs hidden sm:inline">·</span>
            <p className="text-ink/65 text-xs hidden sm:block">
              Matched by meaning, proximity, and trust.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
