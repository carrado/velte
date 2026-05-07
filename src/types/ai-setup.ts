// ── AI Setup Domain Types ─────────────────────────────────────────────────────

export type SetupStep = 1 | 2 | 3;

export type BusinessTone = "formal" | "professional" | "casual";

export type VerificationStatus = "verified" | "pending" | "unverified";

export interface WhatsAppNumber {
  numberId: string;
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

export interface AISetupStatus {
  isComplete: boolean;
  metaConnected: boolean;
  wabaConfigured: boolean;
  selectedNumberId: string | null;
  aiConfig: AIConfig | null;
  selectedNumber: WhatsAppNumber | null;
}

// ── API Response shapes (unwrapped — backend wraps these in { success, data }) ─

export interface WABAConfigureResponse {
  wabaConfigured: boolean;
  wabaId: string;
}

export interface NumbersResponse {
  numbers: WhatsAppNumber[];
}

export interface AIConfigResponse {
  config: AIConfig;
}

export interface ActivateAIResponse {
  webhookUrl: string;
  activatedAt: string;
}

export type SetupStatusResponse = AISetupStatus;
