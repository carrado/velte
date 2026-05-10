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
  mobile?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  side?: "left" | "right";
}

export interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export interface LogoutModalProps {
  isOpen: boolean;
  disabled: boolean;
  onClose: () => void;
  onConfirm: () => void;
}
