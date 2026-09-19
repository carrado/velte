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
  CalendarIcon as HeroCalendarIcon,
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
  ArrowRightIcon as HeroArrowRightIcon,
  ArrowLeftIcon as HeroArrowLeftIcon,
  EyeIcon as HeroEyeIcon,
  EyeSlashIcon,
  SparklesIcon as HeroSparklesIcon,
  UserCircleIcon,
  ExclamationCircleIcon,
  KeyIcon as HeroKeyIcon,
  AtSymbolIcon,
  BuildingOfficeIcon,
  InformationCircleIcon,
  MapIcon,
  EnvelopeIcon,
  BriefcaseIcon as HeroBriefcaseIcon,
  DocumentTextIcon,
  ArrowPathRoundedSquareIcon,
  ArrowTrendingUpIcon,
  CameraIcon as HeroCameraIcon,
  LinkIcon as HeroLinkIcon,
  ChevronDownIcon as HeroChevronDownIcon,
  QuestionMarkCircleIcon,
  NewspaperIcon as HeroNewspaperIcon,
  QueueListIcon,
  ArrowUpRightIcon as HeroArrowUpRightIcon,
  XCircleIcon as HeroXCircleIcon,
  CircleStackIcon,
  FaceFrownIcon,
  FaceSmileIcon,
  GlobeAltIcon,
  ShareIcon as HeroShareIcon,
  IdentificationIcon,
  CpuChipIcon,
  LightBulbIcon,
  DocumentCheckIcon,
  BuildingLibraryIcon,
  PuzzlePieceIcon,
  ShieldExclamationIcon,
  SunIcon as HeroSunIcon,
  MoonIcon as HeroMoonIcon,
  PhotoIcon,
  Squares2X2Icon,
  PlusCircleIcon as HeroPlusCircleIcon,
  Cog6ToothIcon,
  FunnelIcon,
  ServerIcon,
  SignalSlashIcon,
  EllipsisVerticalIcon,
  RocketLaunchIcon,
  ArrowUpOnSquareIcon,
  BoltIcon,
  ComputerDesktopIcon,
  ChartBarIcon,
  CakeIcon,
  ChevronUpIcon as HeroChevronUpIcon,
  Square3Stack3DIcon,
  PlusIcon as HeroPlusIcon,
  ArrowDownOnSquareIcon,
  ArrowUpTrayIcon,
  VideoCameraIcon,
  CurrencyDollarIcon,
  PencilIcon,
  FireIcon,
  HashtagIcon,
  PlayCircleIcon as HeroPlayCircleIcon,
  StarIcon as HeroStarIcon,
  ArrowDownLeftIcon as HeroArrowDownLeftIcon,
  Cog8ToothIcon,
  FlagIcon,
  ChartPieIcon,
  EnvelopeOpenIcon,
  UserPlusIcon as HeroUserPlusIcon,
  PaperAirplaneIcon,
  BellSlashIcon,
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
export const CalendarIcon = wrap(HeroCalendarIcon);
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

// Auth pages (2026-09-16, per explicit request) — same wholesale-swap
// treatment the /chat tree got on 2026-09-11: every icon those pages used
// from the duotone set, name-for-name, so only each file's import line
// changes. A few have no literal Heroicons equivalent — noted inline.
export const ArrowRightIcon = wrap(HeroArrowRightIcon);
export const ArrowLeftIcon = wrap(HeroArrowLeftIcon);
export const EyeIcon = wrap(HeroEyeIcon);
export const EyeOffIcon = wrap(EyeSlashIcon);
export const SparklesIcon = wrap(HeroSparklesIcon);
// A rounded/filled person glyph — Heroicons has no separate "round" user
// variant the way the duotone set did, UserCircleIcon is the closest match.
export const UserRoundIcon = wrap(UserCircleIcon);
export const AlertCircleIcon = wrap(ExclamationCircleIcon);
export const KeyIcon = wrap(HeroKeyIcon);
export const AtSignIcon = wrap(AtSymbolIcon);
export const BuildingIcon = wrap(BuildingOfficeIcon);
export const InfoIcon = wrap(InformationCircleIcon);
// "Use my current location" button — Heroicons has no GPS-crosshair glyph;
// a folded map reads as "locate on a map" without reusing MapPinIcon's own
// single-pin glyph for a visually distinct action on the same form.
export const LocateFixedIcon = wrap(MapIcon);
export const MailIcon = wrap(EnvelopeIcon);
export const BriefcaseIcon = wrap(HeroBriefcaseIcon);
export const FileTextIcon = wrap(DocumentTextIcon);
// Deliberately NOT the same glyph as LoaderIcon (ArrowPathIcon) even though
// both are "refresh"-shaped — this is a static "resend code" button, not a
// spinner, and sharing the exact loader glyph read as though the page were
// already mid-refresh.
export const RefreshIcon = wrap(ArrowPathRoundedSquareIcon);
export const TrendingUpIcon = wrap(ArrowTrendingUpIcon);

// Homepage + its mobile nav drawer (2026-09-17, per explicit request) — same
// wholesale-swap treatment, every icon name-for-name against the duotone set
// so only each file's import line changes.
export const ListIcon = wrap(Bars3Icon);
export const CameraIcon = wrap(HeroCameraIcon);
export const LinkIcon = wrap(HeroLinkIcon);
export const ChevronDownIcon = wrap(HeroChevronDownIcon);
// No literal "help circle" in Heroicons — a question mark in a circle is
// the same idea FAQ pages use everywhere else.
export const HelpCircleIcon = wrap(QuestionMarkCircleIcon);
export const NewspaperIcon = wrap(HeroNewspaperIcon);
// "How It Works" — no literal route/path glyph in Heroicons; a stepped list
// reads as "a flow, step by step" without borrowing MapIcon's own
// place-on-a-map meaning (already spoken for by LocateFixedIcon above).
export const RouteIcon = wrap(QueueListIcon);
// Same glyph as ShieldCheckIcon above — Heroicons' outline set has no bare
// shield without a check/exclamation mark on it, and "Privacy" reads fine
// with the checked version.
export const ShieldIcon = wrap(HeroShieldCheckIcon);

// Every other public page — About, Blog, Careers, Contact, FAQ, How It
// Works, Pricing, Privacy, Terms, Updates, Welcome (2026-09-17, per explicit
// request: "Heroicons should be used for public pages") — same wholesale
// swap, name-for-name against the duotone set.
export const ArrowUpRightIcon = wrap(HeroArrowUpRightIcon);
export const XCircleIcon = wrap(HeroXCircleIcon);
export const DatabaseIcon = wrap(CircleStackIcon);
// "No results" empty state (FAQ search) — Heroicons has no compound
// "magnifying glass with an X" glyph; a frowning face reads as "nothing
// found" without just repeating SearchIcon's own plain magnifying glass on
// the same page.
export const SearchXIcon = wrap(FaceFrownIcon);
// No singular "sparkle" in Heroicons, only the multi-sparkle SparklesIcon
// above — reused rather than approximated with an unrelated glyph.
export const SparkleIcon = wrap(HeroSparklesIcon);
// "Children's Privacy" (Privacy Policy) — Heroicons has no literal
// baby/child glyph; a smiling face is the closest friendly stand-in.
export const BabyIcon = wrap(FaceSmileIcon);
export const GlobeIcon = wrap(GlobeAltIcon);
export const Share2Icon = wrap(HeroShareIcon);
// "Vendors stay in control" / "Eligibility & Accounts" / "Your Rights" —
// Heroicons has no user-with-checkmark compound; an ID card reads as
// "verified account" without inventing a two-part icon.
export const UserCheckIcon = wrap(IdentificationIcon);
// "Termination" (Terms) — same glyph as CompassIcon's own "genuinely
// nothing here" reuse above; a prohibited-sign fits both meanings.
export const BanIcon = wrap(NoSymbolIcon);
// "Description of Service" (Terms, describing the AI itself) — Heroicons
// has no robot glyph; a chip reads as "automated/AI" without the awkward
// under-fit of borrowing a face icon for something that isn't a person.
export const BotIcon = wrap(CpuChipIcon);
// "Intellectual Property" (Terms) — Heroicons has no copyright symbol; a
// lightbulb ("ideas") is the closer fit of the plausible substitutes over a
// generic document/scale glyph already claimed elsewhere on the same page.
export const CopyrightIcon = wrap(LightBulbIcon);
export const FileCheckIcon = wrap(DocumentCheckIcon);
// "Governed by Nigerian law" (Terms) — a literal courthouse/government
// building, the closest real match Heroicons has for "landmark."
export const LandmarkIcon = wrap(BuildingLibraryIcon);
// "Third-Party Services" (Terms) — the standard "integrations" glyph.
export const PlugIcon = wrap(PuzzlePieceIcon);
// "The agreement between us" / "Plain-language terms" (Terms) — same
// document glyph as FileTextIcon above; both read as "a real document,"
// which is what a scroll-of-text stands in for.
export const ScrollTextIcon = wrap(DocumentTextIcon);
export const ShieldAlertIcon = wrap(ShieldExclamationIcon);

// Public-header light/dark toggle (2026-09-17) — Navbar's own two-state
// switch, distinct from the dashboard's three-way ThemeToggle (System /
// Light / Dark): a marketing header has no room for a segmented control
// next to Sign in / Join, and a buyer landing on the site cold has no
// existing preference to protect the way a signed-in vendor's "follow my
// device" setting does. One tap flips between the two.
export const SunIcon = wrap(HeroSunIcon);
export const MoonIcon = wrap(HeroMoonIcon);

// Vendor dashboard (2026-09-18, per explicit request) — same wholesale swap
// as every surface above: every icon the dashboard's files used from the
// duotone set, name-for-name, so only each file's import line changes.
export const ImageIcon = wrap(PhotoIcon);
export const LayoutGridIcon = wrap(Squares2X2Icon);
export const PlusCircleIcon = wrap(HeroPlusCircleIcon);
export const SettingsIcon = wrap(Cog6ToothIcon);
export const FilterIcon = wrap(FunnelIcon);
// No literal "crashed server" glyph in Heroicons — a plain server reads
// fine paired with the error copy sitting next to it either way.
export const ServerCrashIcon = wrap(ServerIcon);
export const WifiOffIcon = wrap(SignalSlashIcon);
export const MoreVerticalIcon = wrap(EllipsisVerticalIcon);
export const RocketIcon = wrap(RocketLaunchIcon);
// Distinct from Share2Icon above (which already claimed Heroicons' own
// ShareIcon) — the "box with an arrow up" glyph most platforms use for a
// literal share sheet, so the two stay visually different in the one file
// that uses both (InstallRow, "Add to Home Screen" vs the store's "Share").
export const ShareIcon = wrap(ArrowUpOnSquareIcon);
export const ZapIcon = wrap(BoltIcon);
// The dashboard's three-way ThemeToggle "System" option — distinct from
// SunIcon/MoonIcon above, which is the public header's own two-state
// switch (see that pair's own comment).
export const MonitorIcon = wrap(ComputerDesktopIcon);
export const BarChartIcon = wrap(ChartBarIcon);
// "Food Details" section header (product listings) — Heroicons has no chef
// hat; a cake is the closest literal food glyph in the set.
export const ChefHatIcon = wrap(CakeIcon);
export const ChevronUpIcon = wrap(HeroChevronUpIcon);
// "Variants"/attribute layering — Heroicons' own stacked-squares glyph.
export const LayersIcon = wrap(Square3Stack3DIcon);
export const PlusIcon = wrap(HeroPlusIcon);
// No literal floppy-disk glyph in Heroicons — "save to device" is the
// closest honest stand-in for a plain Save button.
export const SaveIcon = wrap(ArrowDownOnSquareIcon);
export const UploadIcon = wrap(ArrowUpTrayIcon);
export const VideoIcon = wrap(VideoCameraIcon);
export const DollarSignIcon = wrap(CurrencyDollarIcon);
export const EditIcon = wrap(PencilIcon);
export const FlameIcon = wrap(FireIcon);
export const HashIcon = wrap(HashtagIcon);
export const PlayCircleIcon = wrap(HeroPlayCircleIcon);
export const StarIcon = wrap(HeroStarIcon);
export const ArrowDownLeftIcon = wrap(HeroArrowDownLeftIcon);
// Distinct from SettingsIcon above, same reasoning lucide's own
// Settings/Settings2 pair had — Heroicons' second cog variant.
export const Settings2Icon = wrap(Cog8ToothIcon);
// "Spent on Leads" wallet stat — no literal bullseye in Heroicons; a flag
// reads as "a target/goal figure" without inventing a compound icon.
export const TargetIcon = wrap(FlagIcon);
// "Funds Utilized" (a percentage) — no literal gauge/speedometer in
// Heroicons; a pie chart is the closest "proportion" glyph in the set.
export const GaugeIcon = wrap(ChartPieIcon);
// Referral email confirmation — no compound "mail with a check" in
// Heroicons; an opened envelope reads as "delivered" for the same moment.
export const MailCheckIcon = wrap(EnvelopeOpenIcon);
// Referral success state — no party-popper in Heroicons; reusing the same
// sparkle mark other "notable moment" spots on this dashboard already use.
export const PartyPopperIcon = wrap(HeroSparklesIcon);
export const UserPlusIcon = wrap(HeroUserPlusIcon);
// Same glyph as KeyIcon above — "KeyRound" was a rounded-stroke variant in
// the duotone set, not a different key; Heroicons has only the one.
export const KeyRoundIcon = wrap(HeroKeyIcon);
export const SendIcon = wrap(PaperAirplaneIcon);
// Settings page "Profile" section header — no user-with-gear compound in
// Heroicons; reusing the same rounded person mark UserRoundIcon above
// already wraps, distinct in context (a section header, not a nav icon).
export const UserCogIcon = wrap(UserCircleIcon);
// Same glyph as ImageIcon above — Heroicons has no "photo with a plus"
// compound.
export const ImagePlusIcon = wrap(PhotoIcon);
// Same glyph as TagIcon above — Heroicons has no distinct "multiple tags"
// compound.
export const TagsIcon = wrap(HeroTagIcon);
// No plant/leaf glyph in Heroicons — "Vegetarian" reuses the same sparkle
// mark PartyPopperIcon above does, the least-wrong option available for a
// notable dietary attribute.
export const LeafIcon = wrap(HeroSparklesIcon);
export const BellOffIcon = wrap(BellSlashIcon);
// No literal "battery" glyph in Heroicons — reuses the same warning
// triangle AlertTriangleIcon above wraps; the copy beside it is what
// actually says "battery," this just carries "heads up."
export const BatteryWarningIcon = wrap(ExclamationTriangleIcon);
