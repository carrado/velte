export type NotificationType =
  | "order"
  | "product"
  | "payment"
  | "wallet"
  | "referral"
  | "lead"
  // 2026-09-05 — the first notification type a BUYER ever receives, and the
  // first that belongs to both kinds of account.
  | "buyer-request"
  | "system"
  // Added here 2026-09-20 (found live — velte-backend's own TYPE_MAP has
  // mapped this straight through, unchanged, since the type existed on its
  // Notification model, but this union and NotificationList.tsx's
  // TYPE_CONFIG never gained the matching entry, so a real digest crashed
  // the list on `TYPE_CONFIG[notification.type]` being undefined). A
  // Shopping Plan's periodic "here's what changed" push (shoppingPlan.job.js).
  | "shopping-plan-digest";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string; // ISO string
  href: string | null; // deep-link target; null for notifications with no destination
}
