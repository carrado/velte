// components/BottomNav.tsx
"use client";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  LayoutGrid,
  Menu,
} from "lucide-react";

export default function BottomNav({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const items = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      href: "/dashboard",
    },
    { label: "Orders", icon: <ShoppingBag size={20} />, href: "orders" },
    { label: "Customers", icon: <Users size={20} />, href: "customers" },
    {
      label: "Products",
      icon: <LayoutGrid size={20} />,
      href: "products",
    },
  ];

  const isActive = (href: string) => pathname.includes(href);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10 md:hidden">
      <div className="flex justify-around items-center px-2 py-2">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${
              isActive(item.href) ? "text-orange-500" : "text-gray-500"
            }`}
          >
            {item.icon}
            <span className="text-[11px] font-medium">{item.label}</span>
          </button>
        ))}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-gray-500"
        >
          <Menu size={20} />
          <span className="text-[11px] font-medium">Menu</span>
        </button>
      </div>
    </div>
  );
}
