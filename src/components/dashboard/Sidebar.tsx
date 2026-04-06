"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import {
  AlignLeft,
  LayoutDashboard,
  ShoppingBag,
  Users,
  LayoutGrid,
  CreditCard,
  PlusCircle,
  List,
  Star,
  Shield,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getInitial } from "@/lib/initials";
import { useMutation } from "@tanstack/react-query";
import { usersApi } from "@/services/users";
import { toast } from "sonner";
import LogoutModal from "@/components/LogOutModal";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 py-2 px-3 rounded-lg text-sm cursor-pointer transition-colors ${
        active ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      <span className={active ? "text-white" : "text-gray-500"}>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userDetails, setUserDetails] = useState<any>({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [btnDisabled, setBtnDisabled] = useState(false);

  useEffect(() => {
    useUserStore.persist.rehydrate();
    const userDetails: any = useUserStore.getState().user;
    setUserDetails(userDetails);
  }, []);

  const handleLogout = () => {
    loginMutation.mutate();
    setBtnDisabled(true);
  };

  const loginMutation = useMutation({
    mutationFn: () => usersApi.logout(),
    onSuccess: () => {
      setBtnDisabled(false);
      // Redirect to home page
      window.location.href = "/";
    },
    onError: (error: any, variables) => {
      toast.error(error.message || "Invalid email or password");
    },
  });

  const sections: NavSection[] = [
    {
      title: "Main menu",
      items: [
        {
          label: "Dashboard",
          icon: <LayoutDashboard size={16} />,
          href: "/dashboard",
        },
        {
          label: "Order Management",
          icon: <ShoppingBag size={16} />,
          href: "orders",
        },
        {
          label: "Customers",
          icon: <Users size={16} />,
          href: "/customers",
        },
        {
          label: "Categories",
          icon: <LayoutGrid size={16} />,
          href: "/categories",
        },
        {
          label: "Transaction",
          icon: <CreditCard size={16} />,
          href: "/transactions",
        },
      ],
    },
    {
      title: "Product",
      items: [
        {
          label: "Add Products",
          icon: <PlusCircle size={16} />,
          href: "/products/add",
        },
        {
          label: "Product List",
          icon: <List size={16} />,
          href: "/products/list",
        },
        {
          label: "Product Reviews",
          icon: <Star size={16} />,
          href: "/products/reviews",
        },
      ],
    },
    {
      title: "Admin",
      items: [
        {
          label: "Admin role",
          icon: <Shield size={16} />,
          href: "/admin/role",
        },
        {
          label: "Settings",
          icon: <Settings size={16} />,
          href: "/admin/settings",
        },
      ],
    },
  ];

  const isNavActive = (href: string) => {
    return pathname.includes(href);
  };

  return (
    <>
      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-30
        md:w-[260px] w-3/4 h-screen bg-[#FFFFFF] flex flex-col border-r border-[#E5E7EB] overflow-y-auto flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-2 h-[70px] border-b border-[#E5E7EB]">
          <div className="flex gap-1.5 -ml-4">
            <img
              src="https://res.cloudinary.com/dbhpul04t/image/upload/q_auto/f_auto/v1775263781/velte_logo_esn5dj_kzprnp.png"
              alt="Velte logo"
              width={100}
              height={20}
            />
          </div>
          {/* Close button on mobile, collapse button on desktop */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer lg:hidden"
          >
            <X size={18} />
          </button>
          <button className="text-gray-400 hover:text-gray-600 cursor-pointer hidden lg:block">
            <AlignLeft size={18} />
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 py-4 space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] font-semibold uppercase text-[#9CA3AF] px-3 mb-2 tracking-wider">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.label}
                    item={item}
                    active={isNavActive(item.href)}
                    onClick={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom user section */}
        <div className="px-3 py-4 border-t border-[#E5E7EB] space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {getInitial(userDetails?.company?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#111827] leading-tight">
                {userDetails?.company?.name}
              </p>
              <p className="text-xs text-[#9CA3AF] truncate">
                @{userDetails?.username}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut size={18} className="align-middle" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        disabled={btnDisabled}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
