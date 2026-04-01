import { z } from "zod";

export const hasUpperCase = (str: string) => /[A-Z]/.test(str);
export const hasLowerCase = (str: string) => /[a-z]/.test(str);
export const hasNumber = (str: string) => /\d/.test(str);
export const hasSpecialChar = (str: string) =>
  /[!@#$%^&*(),.?":{}|<>]/.test(str);

export const passwordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (hasUpperCase(password)) strength++;
  if (hasLowerCase(password)) strength++;
  if (hasNumber(password)) strength++;
  if (hasSpecialChar(password)) strength++;
  return strength;
};

export const getPasswordStrengthColor = (strength: number) => {
  if (strength <= 2) return "bg-red-500";
  if (strength === 3) return "bg-yellow-500";
  if (strength === 4) return "bg-green-500";
  return "bg-green-600";
};

export const getPasswordStrengthText = (strength: number) => {
  if (strength <= 2) return "Weak";
  if (strength === 3) return "Fair";
  if (strength === 4) return "Good";
  return "Strong";
};

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine(hasUpperCase, "Must contain at least one uppercase letter")
  .refine(hasLowerCase, "Must contain at least one lowercase letter")
  .refine(hasNumber, "Must contain at least one number")
  .refine(hasSpecialChar, "Must contain at least one special character");
