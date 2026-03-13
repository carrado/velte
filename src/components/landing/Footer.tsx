import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#030a05] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <Image
              src="/velte_ijulb7ijulb7ijul_h3d6xw.png"
              alt="Velte logo"
                width={80}
                height={10}
                priority
              />
            </Link>
            <p className="text-white/40 text-sm leading-relaxed max-w-[220px]">
              AI-powered WhatsApp sales agents for modern businesses.
            </p>
          </div>

          {/* Links */}
          {footerLinks.map((col) => (
            <div key={col.heading}>
              <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mb-4">
                {col.heading}
              </p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-white/40 hover:text-white/70 text-sm transition-colors duration-150"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] pt-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-sm">
            &copy; {year} Velte. All rights reserved.
          </p>
          <p className="text-white/20 text-xs">
            Helping businesses sell smarter
          </p>
        </div>
      </div>
    </footer>
  );
}