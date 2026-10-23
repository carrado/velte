import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import type { CartLine } from "@/types/cart";

// One vendor per cart. Adding a listing from a different store replaces
// the cart after the buyer confirms — mixing two sellers would break the
// escrow transfer (one recipient) and the commission math.

const CART_TTL_MS = 24 * 60 * 60 * 1000;

interface CartStore {
  vendorId: string | null;
  vendorName: string | null;
  items: CartLine[];
  updatedAt: number;
  drawerOpen: boolean;
  addItem: (line: Omit<CartLine, "quantity">, quantity?: number) => boolean;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  itemCount: () => number;
  openDrawer: () => void;
  closeDrawer: () => void;
}

function isExpired(updatedAt: number) {
  return !updatedAt || Date.now() - updatedAt > CART_TTL_MS;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      vendorId: null,
      vendorName: null,
      items: [],
      updatedAt: 0,
      drawerOpen: false,

      addItem: (line, quantity = 1) => {
        const current = get();
        if (isExpired(current.updatedAt) && current.items.length > 0) {
          set({
            items: [],
            vendorId: null,
            vendorName: null,
            updatedAt: Date.now(),
          });
        }
        const live = get();
        if (
          live.vendorId &&
          live.vendorId !== line.vendorId &&
          live.items.length > 0
        ) {
          toast.error(
            `Your cart is at ${live.vendorName ?? "another store"}. Empty it to shop here.`,
          );
          return false;
        }

        const existing = live.items.find(
          (item) => item.productId === line.productId,
        );
        const nextItems = existing
          ? live.items.map((item) =>
              item.productId === line.productId
                ? {
                    ...item,
                    quantity: item.quantity + quantity,
                    options: line.options ?? item.options,
                  }
                : item,
            )
          : [...live.items, { ...line, quantity }];

        set({
          vendorId: line.vendorId,
          vendorName: line.vendorName,
          items: nextItems,
          updatedAt: Date.now(),
        });
        return true;
      },

      setQuantity: (productId, quantity) => {
        if (quantity < 1) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item,
          ),
          updatedAt: Date.now(),
        });
      },

      removeItem: (productId) => {
        const items = get().items.filter(
          (item) => item.productId !== productId,
        );
        set(
          items.length === 0
            ? {
                items: [],
                vendorId: null,
                vendorName: null,
                updatedAt: Date.now(),
              }
            : { items, updatedAt: Date.now() },
        );
      },

      clear: () =>
        set({
          items: [],
          vendorId: null,
          vendorName: null,
          updatedAt: Date.now(),
          drawerOpen: false,
        }),

      itemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "velte-cart",
      partialize: (state) => ({
        vendorId: state.vendorId,
        vendorName: state.vendorName,
        items: state.items,
        updatedAt: state.updatedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && isExpired(state.updatedAt) && state.items.length > 0) {
          state.items = [];
          state.vendorId = null;
          state.vendorName = null;
          state.updatedAt = Date.now();
        }
      },
    },
  ),
);
