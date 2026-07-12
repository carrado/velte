// components/BottomNav.tsx
"use client";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/components/NavigationProgressContext";
import { LayoutGrid, PlusCircle, Wallet, Store, Settings } from "lucide-react";
import { useIsFood } from "@/hooks/useBusinessType";

export default function BottomNav() {
  const pathname = usePathname();
  const { navigate } = useNavigation();
  const isFood = useIsFood();

  const segments = pathname.split("/").filter(Boolean);
  const userId = segments[0];
  const subPath = segments.slice(1).join("/");

  const items = [
    {
      label: isFood ? "Menu" : "Listings",
      icon: <LayoutGrid size={20} />,
      segment: "products",
      // "Add" owns the products/add route, so keep this tab off there.
      active: subPath.startsWith("products") && subPath !== "products/add",
    },
    {
      label: "Add",
      icon: <PlusCircle size={20} />,
      segment: "products/add",
      active: subPath === "products/add",
    },
    {
      label: "Wallet",
      icon: <Wallet size={20} />,
      segment: "wallet",
      active: subPath.startsWith("wallet"),
    },
    {
      label: "Store",
      icon: <Store size={20} />,
      segment: "store",
      active: subPath.startsWith("store"),
    },
    {
      label: "Settings",
      icon: <Settings size={20} />,
      segment: "settings",
      active: subPath.startsWith("settings"),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center px-2 py-2">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(`/${userId}/${item.segment}`)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${
              item.active ? "text-orange-500" : "text-gray-500"
            }`}
          >
            {item.icon}
            <span className="text-dash-caption font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
