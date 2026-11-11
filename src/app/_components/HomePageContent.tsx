"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import PublicHomePage from "@/components/landing/PublicHomePage";

export default function HomePageContent({
  initialIsVendor,
}: {
  initialIsVendor?: boolean;
}) {
  const router = useRouter();
  const vendor = useUserStore((s) => s.user);
  const isVendor = Boolean(vendor || initialIsVendor);

  useEffect(() => {
    if (isVendor) {
      router.replace("/wallet");
    }
  }, [isVendor, router]);

  if (isVendor) {
    return null;
  }

  return <PublicHomePage />;
}
