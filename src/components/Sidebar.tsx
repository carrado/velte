"use client";
/* eslint-disable @next/next/no-img-element */

import { usePathname } from "next/navigation";
import { useNavigation } from "@/components/NavigationProgressContext";
import { useUserStore } from "@/store/userStore";
import {
  AlignLeft,
  LayoutDashboard,
  ShoppingBag,
  Users,
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
import type { NavItem, NavSection, SidebarProps } from "@/types/common";

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const { navigate } = useNavigation();

  return (
    <button
      id={item.id}
      onClick={() => {
        onClick?.();
        navigate(item.href);
      }}
      className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-dash-body cursor-pointer transition-colors ${
        active ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-100"
      } ${item.mobile ? "" : "hidden sm:flex"}`}
    >
      <span className={active ? "text-white" : "text-gray-500"}>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </button>
  );
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [effectiveSide, setEffectiveSide] = useState<"left" | "right">("left");

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      setEffectiveSide(isMobile ? "right" : "left");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    setMounted(true);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    useUserStore.persist.rehydrate();
  }, []);

  const userDetails = useUserStore((state) => state.user);

  const handleLogout = () => {
    logoutMutation.mutate();
    setBtnDisabled(true);
  };

  const logoutMutation = useMutation({
    mutationFn: () => usersApi.logout(),
    onSuccess: () => {
      setBtnDisabled(false);
      window.location.href = "/";
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Logout failed";
      toast.error(message);
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
          mobile: false,
        },
        {
          label: "Order Management",
          icon: <ShoppingBag size={16} />,
          href: "orders",
          mobile: false,
        },
        {
          label: "Customers",
          icon: <Users size={16} />,
          href: "customers",
          mobile: false,
        },
        {
          label: "Transaction",
          icon: <CreditCard size={16} />,
          href: "transactions",
          mobile: true,
        },
      ],
    },
    {
      title: "Product",
      items: [
        {
          label: "Add Products",
          icon: <PlusCircle size={16} />,
          href: "products/add",
          mobile: true,
        },
        {
          label: "Product List",
          icon: <List size={16} />,
          href: "products/",
          mobile: true,
        },
      ],
    },
    {
      title: "Admin",
      items: [
        {
          label: "AI Set up",
          icon: <Shield size={16} />,
          href: "ai-setup",
          id: "ai-settings-nav",
          mobile: true,
        },
        {
          label: "Settings",
          icon: <Settings size={16} />,
          href: "settings",
          mobile: true,
        },
        {
          label: "Billing",
          icon: <CreditCard size={16} />,
          href: "billing",
          mobile: true,
        },
      ],
    },
  ];

  // Extract user ID from the first segment of the pathname
  const userId = pathname.split("/")[1]; // e.g., "69cc90bae9d771796ecdd3b4"

  // Helper to build an absolute path for the sidebar link
  const getFullPath = (relativePath: string) => {
    const clean = relativePath.replace(/^\//, "").replace(/\/$/, "");
    return `/${userId}/${clean}`;
  };

  // Helper to check if a given relative path matches the current route
  const isNavActive = (relativePath: string) => {
    const segments = pathname.split("/").filter(Boolean);
    const currentRoute = segments.slice(1).join("/");
    const normalized = relativePath.replace(/^\//, "").replace(/\/$/, "");
    return currentRoute === normalized;
  };

  let translateClass = "";
  if (effectiveSide === "left") {
    translateClass = isOpen ? "translate-x-0" : "-translate-x-full";
  } else {
    translateClass = isOpen ? "translate-x-0" : "translate-x-full";
  }

  const sidePosition = effectiveSide === "left" ? "left-0" : "right-0";

  if (!mounted) {
    return (
      <div
        className="hidden lg:block w-[260px] flex-shrink-0"
        aria-hidden="true"
      />
    );
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static
          top-0 bottom-0 ${sidePosition}
          w-3/4 md:w-[260px] h-full bg-white flex flex-col border-r border-gray-200
          overflow-y-auto flex-shrink-0 z-30
          transition-transform duration-300 ease-in-out
          ${translateClass}
          lg:translate-x-0
        `}
      >
        <div className="flex items-center justify-between px-4 py-2 h-[70px] border-b border-gray-200">
          <div className="flex gap-1.5 -ml-4">
            <img
              src="https://res.cloudinary.com/dbhpul04t/image/upload/q_auto/f_auto/v1775263781/velte_logo_esn5dj_kzprnp.png"
              alt="Velte logo"
              width={100}
              height={20}
            />
          </div>
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

        <nav className="flex-1 flex-col px-3 py-4 space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-dash-micro font-semibold uppercase text-gray-400 px-3 mb-2 tracking-wider">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.label}
                    item={{ ...item, href: getFullPath(item.href) }}
                    active={isNavActive(item.href)}
                    onClick={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-200 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-dash-secondary font-bold flex-shrink-0 overflow-hidden">
              {userDetails?.avatar ? (
                <img
                  src={userDetails.avatar}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitial(userDetails?.company?.name ?? "")
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-dash-body font-semibold text-gray-900 leading-tight">
                {userDetails?.company?.name}
              </p>
              <p className="text-dash-caption text-gray-400 truncate">
                @{userDetails?.username}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="lg:hidden flex items-center px-3 justify-center gap-2 text-dash-body text-red-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <LogoutModal
        isOpen={showLogoutModal}
        disabled={btnDisabled}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
