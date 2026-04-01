"use client";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Building2,
  Globe,
  MapPin,
  AtSign,
  Mail,
  Lock,
  ArrowRight,
  Briefcase,
  X,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";
import { usersApi } from "@/services/users";

// ---------------------------------------------------------------------
// Validation schema (updated with strong password and username rules)
// ---------------------------------------------------------------------
const COUNTRIES = [{ label: "Nigeria", value: "Nigeria" }] as const;

// Password strength regex
const hasUpperCase = (str: string) => /[A-Z]/.test(str);
const hasLowerCase = (str: string) => /[a-z]/.test(str);
const hasNumber = (str: string) => /\d/.test(str);
const hasSpecialChar = (str: string) => /[!@#$%^&*(),.?":{}|<>]/.test(str);

const passwordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (hasUpperCase(password)) strength++;
  if (hasLowerCase(password)) strength++;
  if (hasNumber(password)) strength++;
  if (hasSpecialChar(password)) strength++;
  return strength;
};

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine(hasUpperCase, "Must contain at least one uppercase letter")
  .refine(hasLowerCase, "Must contain at least one lowercase letter")
  .refine(hasNumber, "Must contain at least one number")
  .refine(hasSpecialChar, "Must contain at least one special character");

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be under 30 characters")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Must start with a letter and contain only lowercase letters, numbers, and underscores",
  );

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    businessName: z
      .string()
      .min(2, "Business name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: passwordSchema,
    confirmPassword: z.string(),
    country: z.string().min(1, "Please select your country"),
    address: z.string().min(5, "Please enter your business address"),
    username: usernameSchema,
    services: z.array(z.string()).min(1, "Add at least one service"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-red-400 text-xs mt-1">{message}</p>;
}

// ---------------------------------------------------------------------
// ServicesInput component – tag input with chips
// ---------------------------------------------------------------------
function ServicesInput({
  value,
  onChange,
  onBlur,
  error,
}: {
  value: string[];
  onChange: (newServices: string[]) => void;
  onBlur: () => void;
  error?: string;
}) {
  const [inputValue, setInputValue] = useState("");

  const addService = () => {
    const trimmed = inputValue.trim();
    if (trimmed === "") return;
    if (!value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
  };

  const removeService = (serviceToRemove: string) => {
    onChange(value.filter((s) => s !== serviceToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addService();
    }
  };

  return (
    <div>
      <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
        <Briefcase className="w-3.5 h-3.5 text-orange-400" />
        Services Offered
      </Label>
      <div className="bg-transparent border border-black/[0.3] rounded-md p-2 focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/20 transition-colors">
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((service) => (
            <span
              key={service}
              className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-sm px-2.5 py-1 rounded-full"
            >
              {service}
              <button
                type="button"
                onClick={() => removeService(service)}
                className="hover:text-orange-600 focus:outline-none"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          placeholder="e.g., Web Design, SEO, Photography"
          className="w-full bg-transparent text-black placeholder:text-black/25 focus:outline-none"
        />
      </div>
      {error && <FieldError message={error} />}
      <p className="text-black/40 text-xs mt-1">
        Type a service and press{" "}
        <kbd className="px-1 bg-black/5 rounded">Enter</kbd> to add it. You can
        add as many as you like.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
// PasswordStrengthMeter component
// ---------------------------------------------------------------------
function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = passwordStrength(password);
  const getStrengthColor = () => {
    if (strength <= 2) return "bg-red-500";
    if (strength === 3) return "bg-yellow-500";
    if (strength === 4) return "bg-green-500";
    return "bg-green-600";
  };
  const getStrengthText = () => {
    if (strength <= 2) return "Weak";
    if (strength === 3) return "Fair";
    if (strength === 4) return "Good";
    return "Strong";
  };
  if (password.length === 0) return null;
  return (
    <div className="mt-1 space-y-1">
      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getStrengthColor()} transition-all duration-300`}
          style={{ width: `${(strength / 5) * 100}%` }}
        />
      </div>
      <p className={`text-xs ${getStrengthColor().replace("bg-", "text-")}`}>
        {getStrengthText()}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
// UsernameInput with @ prefix
// ---------------------------------------------------------------------
function UsernameInput({
  value,
  onChange,
  onBlur,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  onBlur: () => void;
  error?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    // Remove any characters that are not allowed (lowercase letters, numbers, underscores)
    newValue = newValue.replace(/[^a-z0-9_]/g, "");

    // Enforce first character must be a letter (if any character exists)
    if (newValue.length > 0 && !/^[a-z]/.test(newValue)) {
      // If first character is not a letter, do not update
      return;
    }

    onChange(newValue);
  };

  return (
    <div>
      <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
        <AtSign className="w-3.5 h-3.5 text-orange-400" />
        Username
      </Label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black text-sm pointer-events-none">
          @
        </span>
        <Input
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder="yourstore"
          className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11 pl-8"
        />
      </div>
      <div className="flex items-center gap-1 mt-1">
        <Info className="w-3 h-3 text-black/40" />
        <p className="text-black/40 text-xs">
          Must start with a letter; only lowercase letters, numbers, and
          underscores allowed.
        </p>
      </div>
      {error && <FieldError message={error} />}
    </div>
  );
}

export default function Signup() {
  const router = useRouter();

  // -----------------------------------------------------------------
  // State for password visibility
  // -----------------------------------------------------------------
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // -----------------------------------------------------------------
  // TanStack Query mutation for the signup API call
  // -----------------------------------------------------------------

  const signupMutation = useMutation({
    mutationFn: (data: Omit<SignupForm, "confirmPassword">) =>
      usersApi.create(data),
    onSuccess: (response) => {
      toast.success("Account created! Welcome to Velte.");
      router.push(`/auth/verify?email=${response.user.email}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // -----------------------------------------------------------------
  // TanStack Form
  // -----------------------------------------------------------------

  const form = useForm({
    defaultValues: {
      name: "",
      businessName: "",
      email: "",
      password: "",
      confirmPassword: "",
      country: "",
      address: "",
      username: "",
      services: [] as string[],
    } satisfies SignupForm,
    onSubmit: async ({ value }) => {
      const parsed = signupSchema.safeParse(value);
      if (!parsed.success) return;

      // Remove confirmPassword before sending to API
      const { confirmPassword, ...apiData } = parsed.data;
      signupMutation.mutate(apiData);
    },
  });

  return (
    <div className="min-h-screen bg-[#0d0804] flex items-center justify-center p-5">
      {/* Background effects (unchanged) */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-500/[0.07] rounded-full blur-[120px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(249,115,22,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.6) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-[640px]"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 justify-center mb-3"
        >
          <Image
            src="/velte_ijulb7ijulb7ijul_h3d6xw.png"
            alt="Velte logo"
            width={100}
            height={20}
            priority
          />
        </Link>

        {/* Card */}
        <div className="bg-white border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              Step 1 of 1 — Create your account
            </div>
            <h1 className="text-2xl font-bold text-black mb-2 tracking-tight">
              Get started with Velte
            </h1>
            <p className="text-black/45 text-sm">
              Set up your business profile and AI sales agent in minutes.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
            className="space-y-5"
          >
            {/* Row: Name + Business Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) => {
                    const r = z
                      .string()
                      .min(2, "Name must be at least 2 characters")
                      .safeParse(value);
                    return r.success ? undefined : r.error.errors[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <div>
                    <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-orange-400" />
                      Full Name
                    </Label>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="John Smith"
                      className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                    />
                    <FieldError message={field.state.meta.errors[0]} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="businessName"
                validators={{
                  onChange: ({ value }) => {
                    const r = z
                      .string()
                      .min(2, "Business name must be at least 2 characters")
                      .safeParse(value);
                    return r.success ? undefined : r.error.errors[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <div>
                    <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-orange-400" />
                      Business Name
                    </Label>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Acme Store Ltd."
                      className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                    />
                    <FieldError message={field.state.meta.errors[0]} />
                  </div>
                )}
              </form.Field>
            </div>

            {/* Email */}
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  const r = z
                    .string()
                    .email("Invalid email address")
                    .safeParse(value);
                  return r.success ? undefined : r.error.errors[0]?.message;
                },
              }}
            >
              {(field) => (
                <div>
                  <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-orange-400" />
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="you@example.com"
                    className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                  />
                  <FieldError message={field.state.meta.errors[0]} />
                </div>
              )}
            </form.Field>

            {/* Country */}
            <form.Field
              name="country"
              validators={{
                onChange: ({ value }) => {
                  const r = z
                    .string()
                    .min(1, "Please select your country")
                    .safeParse(value);
                  return r.success ? undefined : r.error.errors[0]?.message;
                },
              }}
            >
              {(field) => (
                <div>
                  <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-orange-400" />
                    Country
                  </Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v ?? "")}
                  >
                    <SelectTrigger className="bg-transparent border-black/[0.3] w-full text-black h-11 focus:border-orange-500/50 focus:ring-orange-500/20">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-black/[0.3] z-50 text-black max-h-60">
                      <SelectGroup>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError message={field.state.meta.errors[0]} />
                </div>
              )}
            </form.Field>

            {/* Address */}
            <form.Field
              name="address"
              validators={{
                onChange: ({ value }) => {
                  const r = z
                    .string()
                    .min(5, "Please enter your business address")
                    .safeParse(value);
                  return r.success ? undefined : r.error.errors[0]?.message;
                },
              }}
            >
              {(field) => (
                <div>
                  <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-orange-400" />
                    Business Address
                  </Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="123 Main St, Lagos, Nigeria"
                    className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                  />
                  <FieldError message={field.state.meta.errors[0]} />
                </div>
              )}
            </form.Field>

            {/* Services – new field */}
            <form.Field
              name="services"
              validators={{
                onChange: ({ value }) => {
                  const r = z
                    .array(z.string())
                    .min(1, "Add at least one service")
                    .safeParse(value);
                  return r.success ? undefined : r.error.errors[0]?.message;
                },
              }}
            >
              {(field) => (
                <ServicesInput
                  value={field.state.value}
                  onChange={(newServices) => field.handleChange(newServices)}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors[0]}
                />
              )}
            </form.Field>

            {/* Username - custom component with @ prefix */}
            <form.Field
              name="username"
              validators={{
                onChange: ({ value }) => {
                  const r = usernameSchema.safeParse(value);
                  return r.success ? undefined : r.error.errors[0]?.message;
                },
              }}
            >
              {(field) => (
                <UsernameInput
                  value={field.state.value}
                  onChange={(val) => field.handleChange(val)}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors[0]}
                />
              )}
            </form.Field>

            {/* Row: Password + Confirm Password (with strength meter and eye toggles) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) => {
                    const r = passwordSchema.safeParse(value);
                    return r.success ? undefined : r.error.errors[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <div>
                    <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-orange-400" />
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="••••••••"
                        className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/60 focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <PasswordStrengthMeter password={field.state.value} />
                    <div className="text-black/40 text-xs mt-1 space-y-0.5">
                      <p>Password must contain:</p>
                      <ul className="list-disc list-inside">
                        <li>At least 8 characters</li>
                        <li>One uppercase letter</li>
                        <li>One lowercase letter</li>
                        <li>One number</li>
                        <li>One special character (e.g., !@#$%^&*)</li>
                      </ul>
                    </div>
                    <FieldError message={field.state.meta.errors[0]} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="confirmPassword"
                validators={{
                  onChange: ({ value }) => {
                    // Check if empty
                    if (!value) {
                      return "Please confirm your password";
                    }
                    // Compare with current password value from form state
                    const currentPassword = form.store.state.values.password;
                    if (value !== currentPassword) {
                      return "Passwords don't match";
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div>
                    <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-orange-400" />
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="••••••••"
                        className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/60 focus:outline-none"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <FieldError message={field.state.meta.errors[0]} />
                  </div>
                )}
              </form.Field>
            </div>

            {/* Global password mismatch error (optional, kept for safety) */}
            <form.Subscribe selector={(state) => state.errors}>
              {(errors) => {
                const mismatchError: any = errors.find(
                  (e: any) => e.path?.[0] === "confirmPassword",
                );
                return mismatchError ? (
                  <p className="text-red-400 text-xs -mt-2">
                    {mismatchError.message}
                  </p>
                ) : null;
              }}
            </form.Subscribe>

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={
                    !canSubmit || isSubmitting || signupMutation.isPending
                  }
                  size="lg"
                  className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 mt-4 gap-2"
                >
                  {isSubmitting || signupMutation.isPending
                    ? "Creating account..."
                    : "Create account"}
                  {!isSubmitting && !signupMutation.isPending && (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <p className="text-center text-black/40 text-sm mt-6">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-orange-500 hover:text-orange-400 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-white/20 text-xs mt-5">
          Your data is never sold to third parties.
        </p>
      </motion.div>
    </div>
  );
}
