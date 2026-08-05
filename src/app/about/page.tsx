import type { Metadata } from "next";
import AboutContent from "./_components/AboutContent";

export const metadata: Metadata = {
  title: "About",
  description:
    "Velte matches buyers to real nearby vendors by meaning, proximity, and trust — no invented listings, no ad-bidding, no middlemen.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Velte",
    description:
      "Velte matches buyers to real nearby vendors by meaning, proximity, and trust — no invented listings, no ad-bidding, no middlemen.",
    url: "/about",
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
