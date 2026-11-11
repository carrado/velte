"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useCartStore } from "@/store/cartStore";
import { useBuyerStore } from "@/store/buyerStore";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { ShoppingCartIcon } from "@/components/icons/hero";
import { cn } from "@/lib/utils";
import { isSessionSettled, syncSession } from "@/lib/sessionSync";
import type { Buyer } from "@/types/buyer";

export function AddToCartButton({
  productId,
  vendorId,
  vendorName,
  name,
  imageUrl,
  unitPrice,
  className,
}: {
  productId: string;
  vendorId: string;
  vendorName: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  className?: string;
}) {
  const buyer = useBuyerStore((s) => s.buyer);
  const addItem = useCartStore((s) => s.addItem);
  const inCart = useCartStore((s) =>
    s.items.some((item) => item.productId === productId),
  );
  const [askSignIn, setAskSignIn] = useState(false);
  const [checking, setChecking] = useState(!buyer);

  useEffect(() => {
    if (buyer || isSessionSettled()) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    void syncSession().finally(() => {
      if (!cancelled) setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [buyer]);

  if (checking && !buyer) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "w-full inline-flex items-center justify-center gap-1.5 px-3 py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl opacity-60",
          className,
        )}
      >
        <ShoppingCartIcon size={15} />
        Add to cart
      </button>
    );
  }

  if (!buyer) {
    return (
      <div
        className={cn("w-full", className)}
        onClick={(e) => e.stopPropagation()}
      >
        {askSignIn ? (
          <GoogleSignInButton variant="compact" />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAskSignIn(true);
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <ShoppingCartIcon size={15} />
            Sign in to add
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        const added = addItem({
          productId,
          vendorId,
          vendorName,
          name,
          imageUrl,
          unitPrice,
        });
        if (added) toast.success(`Added ${name} to cart`);
      }}
      className={cn(
        "w-full inline-flex items-center justify-center gap-1.5 px-3 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors",
        inCart && "bg-orange-600",
        className,
      )}
    >
      <ShoppingCartIcon size={15} />
      {inCart ? "Add another" : "Add to cart"}
    </button>
  );
}
