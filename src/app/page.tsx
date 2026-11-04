import type { Metadata } from "next";
import { getOptionalVendorAuth } from "@/lib/server/guards";
import HomePageContent from "./_components/HomePageContent";

export const metadata: Metadata = {
  title: "Velte | AI Shopping Assistant & Local Vendor Marketplace Nigeria",
  description:
    "Describe what you need and Velte's AI instantly matches you with real, nearby vendors across Nigeria — products, food, and services. Chat directly with them and get it sorted.",
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const vendor = await getOptionalVendorAuth();
  return <HomePageContent initialIsVendor={Boolean(vendor)} />;
}
