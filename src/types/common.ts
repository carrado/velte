import type { ComponentType, ReactNode, SVGProps } from "react";

/** Shared prop contract for every component in `src/components/icons/` —
 *  mirrors lucide-react's own icon API (`size`, `strokeWidth`, plus any
 *  native `<svg>` prop) so swapping an import is a drop-in replacement at
 *  every call site. See [[custom_icon_system]]. */
export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
}

/** A component reference from `src/components/icons/` — the type for any
 *  prop that stores an icon component to render later (e.g. `icon: MapPinIcon`),
 *  replacing lucide-react's `LucideIcon` type. */
export type IconComponent = ComponentType<IconProps>;

/** Which buyer-facing surface produced a WhatsApp lead click — 'browse' (the
 *  "/" homepage marketplace grid, or the public /store/[handle] page; a
 *  direct chat click with no AI involved), 'search' (/chat's AI-matched
 *  result cards), or 'buyer_request' (a buyer read vendor responses on
 *  their posted Buyer Request and chose one to chat — see
 *  docs/velte_buyer_requests_mvp_spec.md §27/§28). The literal value stays
 *  "search", not "velux" — it's a persisted channel value on
 *  velte-backend's WalletTransaction, not a route; renaming it would be a
 *  data-model change, not a page rename. See reportLead(). */
export type LeadSource = "browse" | "search" | "buyer_request";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export interface ColumnDef<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  count?: number;
}

export interface FilterSelectOption {
  value: string;
  label: string;
}

export interface FilterField {
  type: "select";
  key: string;
  label: string;
  options: FilterSelectOption[];
}

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  id?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface HeaderProps {
  title: string;
}

export interface LogoutModalProps {
  isOpen: boolean;
  disabled: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface WhatsAppButtonProps {
  href: string;
  label: string;
  className?: string;
  // Fired synchronously on click, alongside the anchor's own navigation —
  // never gates or delays opening WhatsApp. Search result cards use this to
  // bill the vendor's wallet for the lead (see reportLead.ts).
  onClick?: () => void;
}

export interface ShareButtonProps {
  url: string;
  title: string;
  text: string;
  label?: string;
  className?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  category: "buyer" | "vendor";
  featured?: boolean;
}

export interface FaqSectionImage {
  src: string;
  alt: string;
  credit: string;
}

export interface PricingFaqItem {
  q: string;
  a: string;
}

/** BuyerAuthShell's left marketing panel content — overridable per page
 *  since the shell is now shared by the unified login AND signup (buyer
 *  and vendor branches alike), not just the buyer-only screens it started
 *  as. `icon` takes a component reference (from `src/components/icons/`),
 *  matching NavItem's own `icon` convention elsewhere in this file. */
export interface AuthPanelFeature {
  icon: IconComponent;
  text: string;
}

export interface AuthPanelContent {
  headline: string;
  subtitle: string;
  features: AuthPanelFeature[];
}
