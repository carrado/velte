import type { Metadata } from "next";
import CareersContent from "./_components/CareersContent";

export const metadata: Metadata = {
  title: "Careers",
  description: "Help build Velte — open roles and how to reach us.",
  alternates: {
    canonical: "/careers",
  },
  openGraph: {
    title: "Careers at Velte",
    description: "Help build Velte — open roles and how to reach us.",
    url: "/careers",
  },
};

export default function CareersPage() {
  return <CareersContent />;
}
