import type { Metadata } from "next";
import ContactContent from "./_components/ContactContent";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Velte team — questions, feedback, or partnership inquiries.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Velte",
    description:
      "Get in touch with the Velte team — questions, feedback, or partnership inquiries.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return <ContactContent />;
}
