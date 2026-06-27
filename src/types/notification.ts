export type NotificationType = "order" | "product" | "payment" | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string; // ISO string
  href: string | null; // deep-link target; null for notifications with no destination
}
