"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { cartApi } from "@/services/cart";
import { queryKeys } from "@/lib/query-keys";
import { useCartStore } from "@/store/cartStore";
import { useBuyerStore } from "@/store/buyerStore";
import {
  ShoppingCartIcon,
  CloseIcon,
  TrashIcon,
} from "@/components/icons/hero";
import { fmt } from "@/lib/product-price";
import { modalScrimClass } from "@/lib/modalScrim";
import { fulfillmentReady } from "@/lib/orderFulfillment";

function koboToNaira(kobo: number) {
  return kobo / 100;
}

export function CartButton() {
  const count = useCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.quantity, 0),
  );
  const open = useCartStore((s) => s.drawerOpen);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const closeDrawer = useCartStore((s) => s.closeDrawer);

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        className="relative inline-flex items-center justify-center rounded-xl p-2 text-gray-600 hover:bg-gray-50"
        aria-label={count ? `Open cart, ${count} items` : "Open cart"}
      >
        <ShoppingCartIcon size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] rounded-full bg-orange-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
            {count}
          </span>
        )}
      </button>
      {open && <CartDrawer onClose={closeDrawer} />}
    </>
  );
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const buyer = useBuyerStore((s) => s.buyer);
  const items = useCartStore((s) => s.items);
  const vendorName = useCartStore((s) => s.vendorName);
  const vendorId = useCartStore((s) => s.vendorId);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const [name, setName] = useState(buyer?.name ?? "");
  const [phone, setPhone] = useState(buyer?.phone ?? "");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (buyer?.name && !name.trim()) setName(buyer.name);
    if (buyer?.phone && !phone.trim()) setPhone(buyer.phone);
    // Prefill only when the field is still empty — a buyer who already
    // typed a delivery name/number must not have it overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- name/phone are the fields we are filling
  }, [buyer?.name, buyer?.phone]);

  const deliveryReady = fulfillmentReady({ name, phone, address });

  const fingerprint = items
    .map((item) => `${item.productId}:${item.quantity}`)
    .join(",");

  const { data: quote, isFetching } = useQuery({
    queryKey: queryKeys.cart.quote(vendorId ?? "", fingerprint),
    queryFn: () =>
      cartApi.quote({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      }),
    enabled: Boolean(buyer && items.length > 0),
    retry: false,
  });

  const checkout = useMutation({
    mutationFn: () =>
      cartApi.checkout({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        fulfillment: {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
      }),
    onSuccess: (result) => {
      window.location.href = result.authorizationUrl;
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Couldn't start checkout.",
      );
    },
  });

  const localSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items],
  );

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex justify-end">
      <button
        type="button"
        className={`absolute inset-0 ${modalScrimClass()}`}
        aria-label="Close cart"
        onClick={onClose}
      />
      <aside className="relative bg-surface w-full max-w-md h-full shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-dash-heading font-bold text-gray-900">Cart</h2>
            {vendorName && (
              <p className="text-dash-secondary text-gray-400 mt-0.5">
                {vendorName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-50"
            aria-label="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <p className="text-dash-secondary text-gray-500">
              Your cart is empty. Add a listing from search to check out in app.
            </p>
          ) : (
            <>
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {item.name}
                    </p>
                    {item.options && item.options.length > 0 && (
                      <p className="text-xs text-gray-400 truncate">
                        {item.options.map((o) => o.option).join(" · ")}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {fmt(item.unitPrice, "₦")}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(item.productId, item.quantity - 1)
                        }
                        className="w-7 h-7 rounded-lg border border-gray-200 text-gray-700"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(item.productId, item.quantity + 1)
                        }
                        className="w-7 h-7 rounded-lg border border-gray-200 text-gray-700"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="ml-auto text-gray-400 hover:text-red-600"
                        aria-label={`Remove ${item.name}`}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {buyer && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">
                    Delivery details
                  </p>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-500">
                      Name
                    </span>
                    <input
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={80}
                      placeholder="Who should receive this"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-surface px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-500">
                      Phone
                    </span>
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0801 234 5678"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-surface px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-500">
                      Address
                    </span>
                    <textarea
                      autoComplete="street-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      maxLength={300}
                      rows={3}
                      placeholder="Street, area, landmark — e.g. 12 Independence Layout, Enugu, opposite Shoprite"
                      className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-surface px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400"
                    />
                  </label>
                </div>
              )}
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>
                {fmt(
                  quote ? koboToNaira(quote.subtotalKobo) : localSubtotal,
                  "₦",
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Service fee</span>
              <span>
                {quote
                  ? fmt(koboToNaira(quote.serviceFeeKobo), "₦")
                  : isFetching
                    ? "…"
                    : "—"}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900">
              <span>Total</span>
              <span>
                {quote
                  ? fmt(koboToNaira(quote.totalKobo), "₦")
                  : fmt(localSubtotal, "₦")}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              We hold your payment and send it to the vendor after they confirm
              the order.
            </p>
            {buyer ? (
              <button
                type="button"
                onClick={() => checkout.mutate()}
                disabled={checkout.isPending || !quote || !deliveryReady}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold"
              >
                {checkout.isPending
                  ? "Starting checkout…"
                  : deliveryReady
                    ? "Pay now"
                    : "Add delivery details"}
              </button>
            ) : (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
                Sign in with Google from the sidebar to pay. Your cart stays
                here.
              </p>
            )}
            <button
              type="button"
              onClick={clear}
              className="w-full py-2 text-sm font-semibold text-gray-500"
            >
              Empty cart
            </button>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
