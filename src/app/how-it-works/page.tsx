import type { Metadata } from "next";
import HowItWorksContent from "./_components/HowItWorksContent";

// New 2026-08-16 — fills the footer slot Updates was dropped from
// (Updates is vendor-account content, not something a first-time visitor
// clicks; see Footer.tsx's own comment). This page is the literal
// step-by-step answer neither /about (brand story + values) nor /join
// (just the audience picker) gives: what actually happens, in order, on
// each side of Velte. Every step here is grounded in copy that already
// exists elsewhere (Hero/VeluxShowcase for buyers, RegisterCta + the real
// pay-per-lead model from /pricing for vendors) — nothing new is claimed.
export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Two flows, one platform — see exactly what happens when you search as a buyer, or list as a business, on Velte.",
  alternates: {
    canonical: "/how-it-works",
  },
  openGraph: {
    title: "How Velte Works",
    description:
      "Two flows, one platform — see exactly what happens when you search as a buyer, or list as a business, on Velte.",
    url: "/how-it-works",
  },
};

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
