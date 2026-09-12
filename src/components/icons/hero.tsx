import type { ComponentType, SVGProps } from "react";
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  BuildingStorefrontIcon,
  WalletIcon as HeroWalletIcon,
  BellIcon as HeroBellIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  ChatBubbleLeftIcon,
  PencilSquareIcon,
  TrashIcon as HeroTrashIcon,
  CheckCircleIcon as HeroCheckCircleIcon,
  TagIcon as HeroTagIcon,
  ClockIcon as HeroClockIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleOvalLeftIcon,
  MagnifyingGlassIcon,
  UsersIcon as HeroUsersIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  NoSymbolIcon,
  MapPinIcon as HeroMapPinIcon,
  PhoneIcon as HeroPhoneIcon,
  ShieldCheckIcon as HeroShieldCheckIcon,
  UserIcon as HeroUserIcon,
  ScaleIcon as HeroScaleIcon,
  ShoppingCartIcon as HeroShoppingCartIcon,
  ChevronLeftIcon as HeroChevronLeftIcon,
  ChevronRightIcon as HeroChevronRightIcon,
  WrenchIcon as HeroWrenchIcon,
  CheckIcon as HeroCheckIcon,
  CreditCardIcon as HeroCreditCardIcon,
  GiftIcon as HeroGiftIcon,
  EllipsisHorizontalIcon,
  CubeIcon,
  ArrowDownTrayIcon,
  CheckBadgeIcon,
  LockClosedIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/24/solid";

// Heroicons-backed icons, scoped to the /chat tree only (2026-09-11, per
// explicit request) — everything else in the app keeps the hand-designed
// duotone set in this same directory's other files (see custom_icon_system
// in memory / this directory's own README-equivalent comments). Deliberately
// its OWN module, not folded into the barrel (index.tsx) — importing from
// "@/components/icons/hero" instead of "@/components/icons" is what scopes
// the swap to exactly the files that ask for it, with zero risk of an
// unrelated dashboard/landing page picking these up by accident.
//
// Same prop contract every existing icon call site already relies on (size,
// className, strokeWidth, ...rest) — Heroicons components take plain SVG
// props with no `size` shorthand of their own, so `wrap` is the one place
// that difference is absorbed. Every call site across the /chat files below
// needed ONLY its import source changed, never its JSX.
export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

function wrap(Hero: ComponentType<SVGProps<SVGSVGElement>>) {
  return function WrappedHeroIcon({ size = 20, ...props }: IconProps) {
    return <Hero width={size} height={size} {...props} />;
  };
}

// Name-for-name against the icons each /chat file used to import from the
// duotone set — same exported names, so only the import line at each call
// site had to change.
export const LogOutIcon = wrap(ArrowRightStartOnRectangleIcon);
export const MenuIcon = wrap(Bars3Icon);
export const StoreIcon = wrap(BuildingStorefrontIcon);
export const WalletIcon = wrap(HeroWalletIcon);
export const BellIcon = wrap(HeroBellIcon);
export const ClipboardListIcon = wrap(ClipboardDocumentListIcon);
export const CloseIcon = wrap(XMarkIcon);
// The "bold" weight the old duotone set gave this one specific close button
// — the solid variant is the honest Heroicons equivalent of a heavier mark,
// not just XMarkIcon again.
export const CloseBoldIcon = wrap(XMarkIconSolid);
export const MessageSquareIcon = wrap(ChatBubbleLeftIcon);
// "New chat" — the same pencil-square glyph most chat apps already use for
// exactly this action, not a literal "message bubble with a plus" (Heroicons
// has no compound icon like that).
export const MessageSquarePlusIcon = wrap(PencilSquareIcon);
export const TrashIcon = wrap(HeroTrashIcon);
export const CheckCircleIcon = wrap(HeroCheckCircleIcon);
export const TagIcon = wrap(HeroTagIcon);
export const ClockIcon = wrap(HeroClockIcon);
export const ExternalLinkIcon = wrap(ArrowTopRightOnSquareIcon);
export const MessageCircleIcon = wrap(ChatBubbleOvalLeftIcon);
export const SearchIcon = wrap(MagnifyingGlassIcon);
export const UsersIcon = wrap(HeroUsersIcon);
export const AlertTriangleIcon = wrap(ExclamationTriangleIcon);
export const LoaderIcon = wrap(ArrowPathIcon);
// "Nothing found" marker — Heroicons has no literal compass; a no-entry
// circle reads honestly as "genuinely nothing here" without implying a
// direction to look in instead.
export const CompassIcon = wrap(NoSymbolIcon);
export const MapPinIcon = wrap(HeroMapPinIcon);
export const PhoneIcon = wrap(HeroPhoneIcon);
export const ShieldCheckIcon = wrap(HeroShieldCheckIcon);
export const UserIcon = wrap(HeroUserIcon);
export const ScaleIcon = wrap(HeroScaleIcon);
export const ShoppingCartIcon = wrap(HeroShoppingCartIcon);
export const ChevronLeftIcon = wrap(HeroChevronLeftIcon);
export const ChevronRightIcon = wrap(HeroChevronRightIcon);
export const WrenchIcon = wrap(HeroWrenchIcon);
export const CheckIcon = wrap(HeroCheckIcon);
export const CreditCardIcon = wrap(HeroCreditCardIcon);
export const GiftIcon = wrap(HeroGiftIcon);
export const MoreHorizontalIcon = wrap(EllipsisHorizontalIcon);
// "Package" (an order/delivery) — CubeIcon is Heroicons' own box/product
// glyph; there's no literal "parcel" icon in the set.
export const PackageIcon = wrap(CubeIcon);
export const DownloadIcon = wrap(ArrowDownTrayIcon);
export const BadgeCheckIcon = wrap(CheckBadgeIcon);
export const LockIcon = wrap(LockClosedIcon);
export const CopyIcon = wrap(ClipboardDocumentIcon);
