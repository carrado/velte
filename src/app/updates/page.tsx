import type { Metadata } from "next";
import UpdatesIndexContent from "./_components/UpdatesIndexContent";

export const metadata: Metadata = {
  title: "Updates",
  description:
    "Policy and feature changes that affect your Velte vendor account.",
  alternates: {
    canonical: "/updates",
  },
};

export default function UpdatesPage() {
  return <UpdatesIndexContent />;
}
