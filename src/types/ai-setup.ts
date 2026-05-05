export type SetupStep = 1 | 2 | 3 | 4;
export type BusinessTone = "formal" | "casual" | "professional";
export type VerificationStatus = "verified" | "pending" | "unverified";

export interface WhatsAppNumber {
  id: string;
  phoneNumber: string;
  displayName: string;
  businessName: string;
  verificationStatus: VerificationStatus;
}

export interface AIConfig {
  enabled: boolean;
  greetingMessage: string;
  businessTone: BusinessTone;
  productCatalogSync: boolean;
}
