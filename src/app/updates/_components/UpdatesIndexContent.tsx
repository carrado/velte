import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { updates } from "@/lib/updates";
import { ArrowRightIcon } from "@/components/icons";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function UpdatesIndexContent() {
  const sorted = [...updates].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );

  return (
    <>
      <Navbar />
      <main className="bg-[#F1F5F9] min-h-screen pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#023337] tracking-tight">
              Updates
            </h1>
            <p className="text-gray-500 max-w-xl">
              Policy and feature changes that affect your Velte vendor account —
              wallet rules, referral terms, and anything else worth a
              plain-English explanation.
            </p>
          </header>

          <div className="flex flex-col gap-3">
            {sorted.map((entry) => (
              <Link
                key={entry.slug}
                href={`/updates/${entry.slug}`}
                className="group rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6 flex items-center justify-between gap-4 hover:border-orange-200 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 mb-1">
                    {fmtDate(entry.publishedAt)}
                  </p>
                  <p className="font-semibold text-[#023337] truncate">
                    {entry.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                    {entry.dek}
                  </p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
