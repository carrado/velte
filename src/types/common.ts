export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
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
