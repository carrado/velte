"use client";

import {
  Wallet,
  CreditCard,
  CurrencyDollar,
  Tag,
  TagSimple,
  Package,
  ShoppingCart,
  Handbag,
  Storefront,
  Gift,
  Star,
  TrendUp,
  ChartBar,
  Gauge,
  Crosshair,
  Lightning,
  Rocket,
  Scales,
  Bank,
  Stack,
  Hash,
  Truck,
  Crown,
  Megaphone,
  Lightbulb,
  Headphones,
  AddressBook,
} from "@phosphor-icons/react";
import { wrapIcon } from "./base";

export const WalletIcon = wrapIcon(Wallet, { displayName: "WalletIcon" });
export const CreditCardIcon = wrapIcon(CreditCard, {
  displayName: "CreditCardIcon",
});
export const DollarSignIcon = wrapIcon(CurrencyDollar, {
  displayName: "DollarSignIcon",
});
export const TagIcon = wrapIcon(Tag, { displayName: "TagIcon" });
export const TagsIcon = wrapIcon(TagSimple, { displayName: "TagsIcon" });
export const PackageIcon = wrapIcon(Package, { displayName: "PackageIcon" });
export const ShoppingCartIcon = wrapIcon(ShoppingCart, {
  displayName: "ShoppingCartIcon",
});
export const HandbagIcon = wrapIcon(Handbag, { displayName: "HandbagIcon" });
export const StoreIcon = wrapIcon(Storefront, { displayName: "StoreIcon" });
export const GiftIcon = wrapIcon(Gift, { displayName: "GiftIcon" });
/** Fill by default — rating rows toggle empty via `weight="regular"` and
 *  `text-*`; Tailwind `fill-transparent` would blank Phosphor's paths. */
export const StarIcon = wrapIcon(Star, {
  weight: "fill",
  displayName: "StarIcon",
});
export const TrendingUpIcon = wrapIcon(TrendUp, {
  displayName: "TrendingUpIcon",
});
export const BarChartIcon = wrapIcon(ChartBar, { displayName: "BarChartIcon" });
export const GaugeIcon = wrapIcon(Gauge, { displayName: "GaugeIcon" });
export const TargetIcon = wrapIcon(Crosshair, { displayName: "TargetIcon" });
export const ZapIcon = wrapIcon(Lightning, { displayName: "ZapIcon" });
export const RocketIcon = wrapIcon(Rocket, { displayName: "RocketIcon" });
export const ScaleIcon = wrapIcon(Scales, { displayName: "ScaleIcon" });
export const LandmarkIcon = wrapIcon(Bank, { displayName: "LandmarkIcon" });
export const LayersIcon = wrapIcon(Stack, { displayName: "LayersIcon" });
export const HashIcon = wrapIcon(Hash, { displayName: "HashIcon" });
export const TruckIcon = wrapIcon(Truck, { displayName: "TruckIcon" });
export const CrownIcon = wrapIcon(Crown, { displayName: "CrownIcon" });
export const MegaphoneIcon = wrapIcon(Megaphone, {
  displayName: "MegaphoneIcon",
});
export const LightbulbIcon = wrapIcon(Lightbulb, {
  displayName: "LightbulbIcon",
});
export const HeadphonesIcon = wrapIcon(Headphones, {
  displayName: "HeadphonesIcon",
});
export const ContactIcon = wrapIcon(AddressBook, {
  displayName: "ContactIcon",
});
