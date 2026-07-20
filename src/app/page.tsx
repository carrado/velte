import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import VendorPitch from "@/components/landing/VendorPitch";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";

// Velte's homepage — redesigned for the pivot (replaces the old
// pre-pivot "WhatsApp AI Sales Rep" marketing site that used to live at
// /vendors). The buyer search experience itself lives at /search.
export const metadata: Metadata = {
  title: "Velte | Find anything nearby",
  description:
    "Describe what you need — Velte finds the nearest real vendor who actually has it, then connects you directly.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <VendorPitch />
      <FAQ />
      <Footer />
    </div>
  );
}
