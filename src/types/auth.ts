import type { User } from "@/types/user";
import type { Buyer } from "@/types/buyer";

export interface FieldErrorProps {
  message: string | undefined;
}

export interface WizardProgressProps {
  step: 1 | 2;
}

// The unified login endpoint's response shape (POST /api/auth/login) —
// one login screen for both account types, so the caller has to branch on
// `accountType` to know which store to populate and where to route.
export type LoginResult =
  | { accountType: "vendor"; user: User }
  | { accountType: "buyer"; buyer: Buyer };
