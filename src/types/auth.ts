import type { User } from "@/types/user";

export interface FieldErrorProps {
  message: string | undefined;
}

export interface WizardProgressProps {
  step: 1 | 2;
}

// POST /api/auth/login's response shape. Vendor-only (2026-08-18) — buyers
// never log in at all, see auth.js's login and Buyer.model.js's own
// comments. `accountType` is kept as a literal rather than dropped outright
// so callers that still branch on it don't need a second, unrelated change.
export interface LoginResult {
  accountType: "vendor";
  user: User;
}
