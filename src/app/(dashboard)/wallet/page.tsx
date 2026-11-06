import { Suspense } from "react";
import WalletPageRich from "@/components/wallet/redesign/WalletPageRich";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WalletPageRich />
    </Suspense>
  );
}
