import { backendData } from "./backend";
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

export async function validateCartAdd(
  payload: {
    productId: string;
    quantity: number;
    options?: { groupName: string; optionName: string }[];
    clientRequestId?: string;
  },
  cookie: string,
): Promise<CartAddOutcome> {
  return backendData<CartAddOutcome>("/cart/validate-add", {
    method: "POST",
    body: payload,
    cookie,
  });
}

export async function quoteCart(
  payload: QuotePayload,
  cookie: string,
): Promise<CartQuote> {
  return backendData<CartQuote>("/cart/quote", {
    method: "POST",
    body: payload,
    cookie,
  });
}

export async function checkoutCart(
  payload: CheckoutPayload,
  cookie: string,
): Promise<CartCheckoutResult> {
  return backendData<CartCheckoutResult>("/cart/checkout", {
    method: "POST",
    body: payload,
    cookie,
  });
}

export async function verifyCartCheckout(
  reference: string,
  cookie: string,
): Promise<CartOrder> {
  const { order } = await backendData<{ order: CartOrder }>("/cart/verify", {
    method: "POST",
    body: { reference },
    cookie,
  });
  return order;
}

export async function listBuyerOrders(cookie: string): Promise<CartOrder[]> {
  const { orders } = await backendData<{ orders: CartOrder[] }>(
    "/cart/orders",
    { cookie },
  );
  return orders;
}

export async function getBuyerOrder(
  id: string,
  cookie: string,
): Promise<CartOrder> {
  const { order } = await backendData<{ order: CartOrder }>(
    `/cart/orders/${id}`,
    { cookie },
  );
  return order;
}

export async function listVendorOrders(
  cookie: string,
  status?: "paid" | "confirmed",
): Promise<CartOrder[]> {
  const qs = status ? `?status=${status}` : "";
  const { orders } = await backendData<{ orders: CartOrder[] }>(
    `/vendor/orders${qs}`,
    { cookie },
  );
  return orders;
}

export async function getVendorOrder(
  id: string,
  cookie: string,
): Promise<CartOrder> {
  const { order } = await backendData<{ order: CartOrder }>(
    `/vendor/orders/${id}`,
    { cookie },
  );
  return order;
}

export async function confirmVendorOrder(
  id: string,
  cookie: string,
): Promise<CartOrder> {
  const { order } = await backendData<{ order: CartOrder }>(
    `/vendor/orders/${id}/accept`,
    { method: "POST", cookie },
  );
  return order;
}

export async function dispatchVendorOrder(
  id: string,
  cookie: string,
  body: { method: "self" | "courier"; carrier?: string; trackingCode?: string },
): Promise<CartOrder> {
  const { order } = await backendData<{ order: CartOrder }>(
    `/vendor/orders/${id}/dispatch`,
    { method: "POST", cookie, body },
  );
  return order;
}

export async function deliverVendorOrder(
  id: string,
  cookie: string,
): Promise<CartOrder> {
  const { order } = await backendData<{ order: CartOrder }>(
    `/vendor/orders/${id}/deliver`,
    { method: "POST", cookie },
  );
  return order;
}
