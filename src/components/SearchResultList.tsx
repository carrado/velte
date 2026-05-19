"use client";

import { ShoppingBag, Box, Users, CreditCard, Tag } from "lucide-react";
import type { SearchEntityType, SearchResultItem } from "@/types/search";

export const TYPE_LABELS: Record<SearchEntityType, string> = {
  order: "Orders",
  product: "Products",
  customer: "Customers",
  transaction: "Transactions",
  category: "Categories",
};

const TYPE_ICONS: Record<SearchEntityType, React.ReactNode> = {
  order: <ShoppingBag size={14} />,
  product: <Box size={14} />,
  customer: <Users size={14} />,
  transaction: <CreditCard size={14} />,
  category: <Tag size={14} />,
};

const BADGE_CLASSES: Record<string, string> = {
  success: "bg-green-50 text-green-600",
  warning: "bg-amber-50 text-amber-600",
  error: "bg-red-50 text-red-600",
  info: "bg-blue-50 text-blue-600",
  neutral: "bg-gray-100 text-gray-500",
  purple: "bg-purple-50 text-purple-600",
};

function ResultItem({
  item,
  onSelect,
}: {
  item: SearchResultItem;
  onSelect: (href: string) => void;
}) {
  return (
    <button
      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-orange-50/60 transition-colors text-left cursor-pointer"
      onClick={() => onSelect(item.href)}
    >
      <span className="mt-0.5 text-gray-400 flex-shrink-0">
        {TYPE_ICONS[item.type]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-dash-body font-medium text-gray-900 truncate">
          {item.title}
        </p>
        {item.subtitle && (
          <p className="text-dash-caption text-gray-400 truncate">
            {item.subtitle}
          </p>
        )}
      </div>
      {item.badge && (
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
            BADGE_CLASSES[item.badgeVariant ?? "neutral"] ??
            BADGE_CLASSES.neutral
          }`}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

export function SearchResultSection({
  type,
  items,
  onSelect,
}: {
  type: SearchEntityType;
  items: SearchResultItem[];
  onSelect: (href: string) => void;
}) {
  return (
    <div>
      <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
        {TYPE_LABELS[type]}
      </p>
      {items.map((item) => (
        <ResultItem key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
}
