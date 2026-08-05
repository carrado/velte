import type { Metadata } from "next";
import TermsContent from "./_components/TermsContent";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing use of Velte as a buyer or vendor.",
  alternates: {
    canonical: "/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return <TermsContent />;
}
