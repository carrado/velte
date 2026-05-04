// components/BottomNav.tsx
"use client";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/components/NavigationProgressContext";
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
  const { navigate } = useNavigation();

  const userId = pathname.split("/")[1];

  const items = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      segment: "dashboard",
    },
    { label: "Orders", icon: <ShoppingBag size={20} />, segment: "orders" },
    { label: "Customers", icon: <Users size={20} />, segment: "customers" },
    { label: "Products", icon: <LayoutGrid size={20} />, segment: "products" },
  ];

  const isActive = (segment: string) => pathname.includes(segment);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10 md:hidden">
      <div className="flex justify-around items-center px-2 py-2">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(`/${userId}/${item.segment}`)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${
              isActive(item.segment) ? "text-orange-500" : "text-gray-500"
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
