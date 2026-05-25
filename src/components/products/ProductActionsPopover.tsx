"use client";

import type { ProductActionsPopoverProps } from "@/types/product";
import {
  DollarSign,
  Edit2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Eye,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useNavigation } from "../NavigationProgressContext";

export default function ProductActionsPopover({
  product,
  onRestock,
  onChangePrice,
  onDelete,
}: ProductActionsPopoverProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inStock = product.inStock;
  const canDelete = !inStock;

  const pathname = usePathname();
  const userId = pathname.split("/").filter(Boolean)[0];
  const { navigate } = useNavigation();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    }
    if (popoverOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverOpen]);

  return (
    <div ref={popoverRef} className="relative">
      <button
        onClick={() => setPopoverOpen(!popoverOpen)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <MoreHorizontal size={16} />
      </button>
      {popoverOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
          <button
            onClick={() => {
              setPopoverOpen(false);
              navigate(`/${userId}/products/${product.id}`);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors cursor-pointer"
          >
            <Eye size={14} className="text-orange-500" />
            View Product
          </button>
          <button
            onClick={() => {
              setPopoverOpen(false);
              navigate(`/${userId}/products/${product.id}/edit`);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors cursor-pointer"
          >
            <Edit2 size={14} className="text-blue-500" />
            Edit Product
          </button>
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
          <button
            onClick={() => {
              setPopoverOpen(false);
              onChangePrice();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors cursor-pointer"
          >
            <DollarSign size={14} className="text-gray-500" />
            Change Price
          </button>
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
        </div>
      )}
    </div>
  );
}
