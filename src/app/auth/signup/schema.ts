import { z } from "zod";
import type { ReactFormExtendedApi } from "@tanstack/react-form";

// Shared between page.tsx (final submit) and both step components (per-step
// field validators + per-step "can advance" gating) — colocated with the
// route rather than under _components/ since it's not a component.

const hasUpperCase = (str: string) => /[A-Z]/.test(str);
const hasLowerCase = (str: string) => /[a-z]/.test(str);
const hasNumber = (str: string) => /\d/.test(str);
const hasSpecialChar = (str: string) => /[!@#$%^&*(),.?":{}|<>]/.test(str);

export const passwordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (hasUpperCase(password)) strength++;
  if (hasLowerCase(password)) strength++;
  if (hasNumber(password)) strength++;
  if (hasSpecialChar(password)) strength++;
  return strength;
};

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine(hasUpperCase, "Must contain at least one uppercase letter")
  .refine(hasLowerCase, "Must contain at least one lowercase letter")
  .refine(hasNumber, "Must contain at least one number")
  .refine(hasSpecialChar, "Must contain at least one special character");

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be under 30 characters")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Must start with a letter and contain only lowercase letters, numbers, and underscores",
  );

const baseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  confirmPassword: z.string(),
  username: usernameSchema,
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .regex(/^\d+$/, "Digits only, no spaces or symbols"),
  state: z.string().min(1, "Please select your state"),
  address: z.string().min(5, "Please enter your business address"),
  location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  sector: z.string().min(1, "Please select your business sector"),
  businessType: z.enum(["retail", "food", "service", "both", "food_both"], {
    message: "Please select your business sector",
  }),
  description: z
    .string()
    .min(10, "Please write a short description (at least 10 characters)")
    .max(600, "Description must be under 600 characters"),
  // Plain (not `.optional()`): form state always initializes this to `""`,
  // never `undefined` — same "no value yet" idea as `location`'s `.nullable()`
  // above, just with an empty string as the sentinel instead of null, which
  // keeps SignupForm's inferred type a plain `string` (TanStack Form's
  // invariant generics make an optional-vs-required mismatch here a real
  // pain to unwind). An empty string is a legitimate, always-valid "skipped
  // this field" value — whether the code actually belongs to a real vendor
  // is a server-side check on submit (see backend auth.js register), which
  // silently ignores an invalid/typo'd code rather than blocking signup.
  referralCode: z.string(),
});

const passwordsMatch = (
  d: Pick<z.infer<typeof baseSchema>, "password" | "confirmPassword">,
) => d.password === d.confirmPassword;

export const step1Schema = baseSchema
  .pick({
    name: true,
    businessName: true,
    email: true,
    password: true,
    confirmPassword: true,
    username: true,
    phone: true,
    state: true,
    address: true,
    referralCode: true,
  })
  .refine(passwordsMatch, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const step2Schema = baseSchema.pick({
  sector: true,
  businessType: true,
  description: true,
});

export const signupSchema = baseSchema.refine(passwordsMatch, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type SignupForm = z.infer<typeof baseSchema>;
export const SIGNUP_FIELD_SCHEMAS = baseSchema.shape;

// The form is created with only `defaultValues` + `onSubmit` (validation is
// per-field via form.Field's own `validators`). TanStack Form's validator
// generics are invariant (`in out`), so pinning them to `undefined` makes the
// real `useForm(...)` return unassignable to this alias. `any` in those
// phantom positions lets any concrete validator shape flow through while
// TFormData stays strongly typed as `SignupForm`.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type SignupFormApi = ReactFormExtendedApi<
  SignupForm,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;
/* eslint-enable @typescript-eslint/no-explicit-any */
