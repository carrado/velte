import type { ReactNode } from "react";

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
