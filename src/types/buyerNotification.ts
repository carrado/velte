export type BuyerNotificationType =
  | "request-response"
  | "saved-price-change"
  | "system";

export interface BuyerNotification {
  id: string;
  type: BuyerNotificationType;
  title: string;
  body: string;
  read: boolean;
  href: string | null;
  createdAt: string;
}
