"use client";

import { useEffect } from "react";
import { useNotificationsStore } from "@/store/notificationsStore";
import { fetchOrders } from "@/services/orders";
import { categoriesApi } from "@/services/products";
import type { AppNotification } from "@/types/notification";
import type { Order } from "@/types/order";
import type { CategoryProduct } from "@/types/product";

function parseDDMMYYYY(dateStr: string): string {
  const [d, m, y] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toISOString();
}

function orderToNotification(
  order: Order,
  userId: string,
): AppNotification | null {
  const href = `/${userId}/orders`;
  const createdAt = parseDDMMYYYY(order.date);

  if (order.status === "Cancelled") {
    return {
      id: `order-cancelled-${order.id}`,
      type: "order",
      title: "Order cancelled",
      body: `${order.orderId} for ${order.product.name} was cancelled.`,
      read: false,
      createdAt,
      href,
    };
  }

  if (order.payment === "Unpaid") {
    return {
      id: `order-unpaid-${order.id}`,
      type: "payment",
      title: "Payment pending",
      body: `${order.orderId} (${order.product.name}) — $${order.price.toFixed(2)} unpaid.`,
      read: false,
      createdAt,
      href,
    };
  }

  if (order.status === "Pending") {
    return {
      id: `order-pending-${order.id}`,
      type: "order",
      title: "New order received",
      body: `${order.orderId} for ${order.product.name} awaiting processing.`,
      read: false,
      createdAt,
      href,
    };
  }

  if (order.status === "Shipped") {
    return {
      id: `order-shipped-${order.id}`,
      type: "order",
      title: "Order shipped",
      body: `${order.orderId} for ${order.product.name} is on its way.`,
      read: false,
      createdAt,
      href,
    };
  }

  return null;
}

function productToNotifications(
  product: CategoryProduct,
  userId: string,
): AppNotification[] {
  const href = `/${userId}/products`;
  const createdAt = parseDDMMYYYY(product.createdDate);
  const threshold = product.lowStockThreshold ?? 10;

  if (product.inStock === 0) {
    return [
      {
        id: `product-out-of-stock-${product.id}`,
        type: "product",
        title: "Out of stock",
        body: `${product.name} has sold out and needs restocking.`,
        read: false,
        createdAt,
        href,
      },
    ];
  }

  if (product.inStock <= threshold) {
    return [
      {
        id: `product-low-stock-${product.id}`,
        type: "product",
        title: "Low stock alert",
        body: `${product.name} — only ${product.inStock} unit${product.inStock === 1 ? "" : "s"} remaining.`,
        read: false,
        createdAt,
        href,
      },
    ];
  }

  return [];
}

export function useNotificationSeeder(userId: string | undefined) {
  const {
    seededForUserId,
    upsertNotifications,
    setSeededForUser,
    clearNotifications,
  } = useNotificationsStore();

  useEffect(() => {
    if (!userId || seededForUserId === userId) return;

    let cancelled = false;

    // Clear stale notifications from a previous user before seeding
    if (seededForUserId && seededForUserId !== userId) {
      clearNotifications();
    }

    Promise.all([fetchOrders(), categoriesApi.getProducts()])
      .then(([ordersResult, productsResult]) => {
        if (cancelled) return;
        const orders = ordersResult.orders;
        const products = productsResult.products;

        const notifications: AppNotification[] = [
          ...orders.flatMap((o) => {
            const n = orderToNotification(o, userId);
            return n ? [n] : [];
          }),
          ...products.flatMap((p) => productToNotifications(p, userId)),
        ];

        upsertNotifications(notifications);
        setSeededForUser(userId);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [userId, seededForUserId, upsertNotifications, setSeededForUser]);
}
