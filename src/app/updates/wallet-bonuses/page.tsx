import type { Metadata } from "next";
import WalletBonusesContent from "./_components/WalletBonusesContent";

export const metadata: Metadata = {
  title: "Wallet Bonuses — Updates",
  description:
    "How the ₦500 product-listing bonus and the updated ₦1,000 referral rule work on Velte vendor wallets.",
  alternates: {
    canonical: "/updates/wallet-bonuses",
  },
  openGraph: {
    title: "Velte Wallet Bonuses",
    description:
      "How the ₦500 product-listing bonus and the updated ₦1,000 referral rule work on Velte vendor wallets.",
    url: "/updates/wallet-bonuses",
  },
};

export default function WalletBonusesUpdatePage() {
  return <WalletBonusesContent />;
}
