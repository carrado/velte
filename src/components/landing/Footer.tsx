import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
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
