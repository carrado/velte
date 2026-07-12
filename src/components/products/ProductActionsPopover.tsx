"use client";

import type { ProductActionsPopoverProps } from "@/types/product";
import {
  DollarSign,
  Edit2,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Eye,
} from "lucide-react";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useNavigation } from "../NavigationProgressContext";
import AnchoredPopover from "../AnchoredPopover";

export default function ProductActionsPopover({
  product,
  isFood = false,
  onRestock,
  onChangePrice,
  onSwitchToQuote,
  onDelete,
}: ProductActionsPopoverProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inStock = product.inStock;
  const canDelete = !inStock;
  // Menu labels follow the listing's identity — a service is not a product,
  // and on a food account the product side is a dish.
  const noun =
    product.kind === "service" ? "Service" : isFood ? "Dish" : "Product";

  const pathname = usePathname();
  const userId = pathname.split("/").filter(Boolean)[0];
  const { navigate } = useNavigation();

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setPopoverOpen(!popoverOpen)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-300 bg-gray-100 transition-colors cursor-pointer"
      >
        <MoreHorizontal size={16} />
      </button>
      <AnchoredPopover
        open={popoverOpen}
        onClose={() => setPopoverOpen(false)}
        anchorRef={triggerRef}
        align="right"
        className="w-44 bg-white rounded-lg shadow-lg border border-gray-100 py-1"
      >
        <button
          onClick={() => {
            setPopoverOpen(false);
            navigate(`/${userId}/products/${product.id}`);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors cursor-pointer"
        >
          <Eye size={14} className="text-orange-500" />
          View {noun}
        </button>
        <button
          onClick={() => {
            setPopoverOpen(false);
            navigate(`/${userId}/products/${product.id}/edit`);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors cursor-pointer"
        >
          <Edit2 size={14} className="text-blue-500" />
          Edit {noun}
        </button>
        {!isFood && product.kind !== "service" && (
          <button
            onClick={() => {
              setPopoverOpen(false);
              onRestock();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className="text-orange-500" />
            Restock
          </button>
        )}
        <button
          onClick={() => {
            setPopoverOpen(false);
            onChangePrice();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors cursor-pointer"
        >
          <DollarSign size={14} className="text-gray-500" />
          {product.quoteOnRequest ? "Set Price" : "Change Price"}
        </button>
        {product.kind === "service" && !product.quoteOnRequest && (
          <button
            onClick={() => {
              setPopoverOpen(false);
              onSwitchToQuote();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors cursor-pointer"
          >
            <MessageCircle size={14} className="text-teal-500" />
            Switch to Quote
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => {
              setPopoverOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 size={14} className="text-red-400" />
            Delete
          </button>
        )}
      </AnchoredPopover>
    </>
  );
}
