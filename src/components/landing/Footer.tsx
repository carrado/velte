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

function InstagramLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <defs>
        <linearGradient id="ig-gradient" x1="0" y1="24" x2="24" y2="0">
          <stop offset="0%" stopColor="#FFDD55" />
          <stop offset="50%" stopColor="#FF543E" />
          <stop offset="100%" stopColor="#C837AB" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-gradient)" />
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="4"
        stroke="#fff"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3.2" stroke="#fff" strokeWidth="1.6" />
      <circle cx="16.2" cy="7.8" r="0.9" fill="#fff" />
    </svg>
  );
}

const socialLinks = [
  {
    label: "Facebook",
    href: "https://web.facebook.com/velte.ng",
    Logo: FacebookLogo,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/veltetechnologies/",
    Logo: InstagramLogo,
  },
];

const footerLinks = [
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <Image
                src="/velte_logo_esn5dj.png"
                alt="Velte"
                width={90}
                height={12}
                priority
              />
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed max-w-[280px]">
              Describe what you need — we find the nearest real vendor who
              actually has it.
            </p>
            <div className="flex items-center gap-3 mt-5">
              {socialLinks.map(({ label, href, Logo }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="opacity-90 hover:opacity-100 transition-opacity duration-150"
                >
                  <Logo className="h-8 w-8" />
                </a>
              ))}
            </div>
          </div>

          {footerLinks.map((col) => (
            <div key={col.heading}>
              <p className="text-gray-400 text-xs font-semibold tracking-widest uppercase mb-4">
                {col.heading}
              </p>
              <ul className="space-y-3">
                {col.links.map((link) => (
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

        <div className="border-t border-gray-200 pt-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
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
