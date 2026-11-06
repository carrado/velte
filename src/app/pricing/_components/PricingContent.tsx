"use client";

import { useSearchParams } from "next/navigation";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import type { PricingFaqItem } from "@/types/common";
import PublicPricingPage from "./PublicPricingPage";
import LoggedInPricingPage from "./LoggedInPricingPage";
import type { Audience } from "./shared";

export default function PricingContent({ faqs }: { faqs: PricingFaqItem[] }) {
  const searchParams = useSearchParams();
  const forParam = searchParams.get("for") as Audience | null;

  const vendor = useUserStore((s) => s.user);
  const buyer = useBuyerStore((s) => s.buyer);
  const signedIn = Boolean(vendor || buyer);

  const initialAudience: Audience = signedIn
    ? vendor
      ? "vendors"
      : "buyers"
    : forParam === "vendors" || forParam === "buyers"
      ? forParam
      : "buyers";

  if (signedIn) {
    return (
      <LoggedInPricingPage faqs={faqs} initialAudience={initialAudience} />
    );
  }

  return <PublicPricingPage faqs={faqs} initialAudience={initialAudience} />;
}
