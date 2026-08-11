import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { blogPosts } from "@/lib/blog";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BlogIndexContent() {
  const sorted = [...blogPosts].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );

  return (
    <>
      <Navbar />
      <main className="bg-[#F1F5F9] min-h-screen pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#023337] tracking-tight">
              Blog
            </h1>
            <p className="text-gray-500 max-w-xl">
              Guides and stories for buyers and small-business vendors in
              Nigeria — selling online, growing on WhatsApp, and finding what
              you need nearby.
            </p>
          </header>

          <div className="flex flex-col gap-3">
            {sorted.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6 flex items-center gap-4 hover:border-orange-200 transition-colors"
              >
                {post.image && (
                  <div className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-100">
                    <Image
                      src={post.image.src}
                      alt={post.image.alt}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                    {post.category && (
                      <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                        {post.category}
                      </span>
                    )}
                    <span>{fmtDate(post.publishedAt)}</span>
                    <span>·</span>
                    <span>{post.readingTime}</span>
                  </div>
                  <p className="font-semibold text-[#023337] truncate">
                    {post.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                    {post.dek}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
