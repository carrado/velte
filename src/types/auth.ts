import type { User } from "@/types/user";
import type { Buyer } from "@/types/buyer";

export interface FieldErrorProps {
  message: string | undefined;
}

export interface WizardProgressProps {
  step: 1 | 2;
}

export interface LoginResult {
  accountType: "vendor" | "buyer";
  user?: User;
  buyer?: Buyer;
}
