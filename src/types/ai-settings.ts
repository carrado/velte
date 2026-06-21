// Types for the AI Settings (Settings → AI Settings tab) and its service.
// Shop operating hours + the escalation trigger.

export interface ShopHoursConfig {
  // 24/7 availability is enforced for Phase 1. Custom operating hours
  // (openTime/closeTime/offlineMessage) are deferred — see
  // docs/PHASE2_SHOP_OPERATING_HOURS.md.
  is24Hours: boolean;
}

export interface EscalationConfig {
  enabled: boolean;
  /** Order-total amount (Naira) that triggers escalation. Fixed server-side. */
  threshold: number;
}

export interface AiSettings {
  shopHours: ShopHoursConfig;
  escalation: EscalationConfig;
}
