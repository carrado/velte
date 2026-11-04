"use client";

import { useUserStore } from "@/store/userStore";
import PublicHomePage from "@/components/landing/PublicHomePage";
import DashboardRootLayout from "@/components/dashboard/DashboardRootLayout";
import ProductsPage from "@/components/products/ProductsPage";

export default function HomePageContent({
  initialIsVendor,
}: {
  initialIsVendor?: boolean;
}) {
  const vendor = useUserStore((s) => s.user);
  const isVendor = Boolean(vendor || initialIsVendor);

  if (isVendor) {
    return (
      <DashboardRootLayout pageTitle="My Listings">
        <ProductsPage />
      </DashboardRootLayout>
    );
  }

  return <PublicHomePage />;
}
