import { api } from "@/lib/api-client";
import type {
  CartAddOutcome,
  CartCheckoutResult,
  CartOrder,
  CartQuote,
  OrderFulfillment,
} from "@/types/cart";

interface QuotePayload {
  items: { productId: string; quantity: number }[];
}

interface CheckoutPayload extends QuotePayload {
  fulfillment: OrderFulfillment;
}

export const cartApi = {
  async validateAdd(payload: {
    productId: string;
    quantity: number;
    options?: { groupName: string; optionName: string }[];
    clientRequestId?: string;
  }): Promise<CartAddOutcome> {
    return api.post<CartAddOutcome>("/api/cart/validate-add", payload);
  },

  async quote(payload: QuotePayload): Promise<CartQuote> {
    return api.post<CartQuote>("/api/cart/quote", payload);
  },

  async checkout(payload: CheckoutPayload): Promise<CartCheckoutResult> {
    return api.post<CartCheckoutResult>("/api/cart/checkout", payload);
  },

  async verify(reference: string): Promise<CartOrder> {
    const { order } = await api.post<{ order: CartOrder }>("/api/cart/verify", {
      reference,
    });
    return order;
  },

  async listOrders(): Promise<CartOrder[]> {
    const { orders } = await api.get<{ orders: CartOrder[] }>(
      "/api/cart/orders",
    );
    return orders;
  },

  async confirmReceipt(id: string): Promise<CartOrder> {
    const { order } = await api.post<{ order: CartOrder }>(
      `/api/cart/orders/${id}/received`,
    );
    return order;
  },

  async dispute(
    id: string,
    body: {
      reason: "not_received" | "wrong_item" | "damaged" | "other";
      detail?: string;
    },
  ): Promise<CartOrder> {
    const { order } = await api.post<{ order: CartOrder }>(
      `/api/cart/orders/${id}/dispute`,
      body,
    );
    return order;
  },

  async getOrder(id: string): Promise<CartOrder> {
    const { order } = await api.get<{ order: CartOrder }>(
      `/api/cart/orders/${id}`,
    );
    return order;
  },
};

export const vendorOrdersApi = {
  async list(status?: "paid" | "confirmed"): Promise<CartOrder[]> {
    const qs = status ? `?status=${status}` : "";
    const { orders } = await api.get<{ orders: CartOrder[] }>(
      `/api/vendor/orders${qs}`,
    );
    return orders;
  },

  async get(id: string): Promise<CartOrder> {
    const { order } = await api.get<{ order: CartOrder }>(
      `/api/vendor/orders/${id}`,
    );
    return order;
  },

  async confirm(id: string): Promise<CartOrder> {
    const { order } = await api.post<{ order: CartOrder }>(
      `/api/vendor/orders/${id}/accept`,
    );
    return order;
  },

  async dispatch(
    id: string,
    body: {
      method: "self" | "courier";
      carrier?: string;
      trackingCode?: string;
    },
  ): Promise<CartOrder> {
    const { order } = await api.post<{ order: CartOrder }>(
      `/api/vendor/orders/${id}/dispatch`,
      body,
    );
    return order;
  },

  async deliver(id: string): Promise<CartOrder> {
    const { order } = await api.post<{ order: CartOrder }>(
      `/api/vendor/orders/${id}/deliver`,
    );
    return order;
  },
};
