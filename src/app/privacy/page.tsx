import type { Metadata } from "next";
import PrivacyContent from "./_components/PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Velte collects, uses, and protects your data as a buyer or vendor on the platform.",
  alternates: {
    canonical: "/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
