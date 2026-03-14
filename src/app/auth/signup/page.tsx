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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { usersCollection } from "@/db/users";
import { apiClient } from "@/lib/api";
import Image from "next/image";

// ---------------------------------------------------------------------
// Validation schema (same as before)
// ---------------------------------------------------------------------
const COUNTRIES = [
  { label: "Nigeria", value: "Nigeria" },
  { label: "Ghana", value: "Ghana" },
  { label: "Kenya", value: "Kenya" },
  { label: "South Africa", value: "South Africa" },
  { label: "United Kingdom", value: "United Kingdom" },
  { label: "United States", value: "United States" },
] as const;

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    businessName: z
      .string()
      .min(2, "Business name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    country: z.string().min(1, "Please select your country"),
    address: z.string().min(5, "Please enter your business address"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be under 30 characters")
      .regex(
        /^[a-z0-9_]+$/,
        "Only lowercase letters, numbers, and underscores",
      ),
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

export default function Signup() {
  const router = useRouter();

  // -----------------------------------------------------------------
  // TanStack Query mutation for the signup API call
  // -----------------------------------------------------------------
  const signupMutation = useMutation({
    mutationFn: (data: Omit<SignupForm, "confirmPassword">) =>
      apiClient("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      // data is the response from your API (should include the created user)
      const newUser = {
        id: data.user.id,
        name: data.user.name,
        businessName: data.user.businessName,
        email: data.user.email,
        country: data.user.country,
        address: data.user.address,
        username: data.user.username,
      };

      // Insert the new user into the local collection
      usersCollection.insert(newUser);

      toast.success("Account created! Welcome to Velte.");
      router.push("/");
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

            {/* Row: Password + Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) => {
                    const r = z
                      .string()
                      .min(8, "Password must be at least 8 characters")
                      .safeParse(value);
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
                    <Input
                      type="password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="••••••••"
                      className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                    />
                    <FieldError message={field.state.meta.errors[0]} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="confirmPassword"
                validators={{
                  onChange: ({ value }) => {
                    const r = z
                      .string()
                      .min(1, "Please confirm your password")
                      .safeParse(value);
                    return r.success ? undefined : r.error.errors[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <div>
                    <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-orange-400" />
                      Confirm Password
                    </Label>
                    <Input
                      type="password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="••••••••"
                      className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                    />
                    <FieldError message={field.state.meta.errors[0]} />
                  </div>
                )}
              </form.Field>
            </div>

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

            {/* Username */}
            <form.Field
              name="username"
              validators={{
                onChange: ({ value }) => {
                  const r = z
                    .string()
                    .min(3, "At least 3 characters")
                    .max(30, "Under 30 characters")
                    .regex(
                      /^[a-z0-9_]+$/,
                      "Lowercase letters, numbers, underscores only",
                    )
                    .safeParse(value);
                  return r.success ? undefined : r.error.errors[0]?.message;
                },
              }}
            >
              {(field) => (
                <div>
                  <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                    <AtSign className="w-3.5 h-3.5 text-orange-400" />
                    Username
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 text-sm pointer-events-none">
                      @
                    </span>
                    <Input
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(e.target.value.toLowerCase())
                      }
                      onBlur={field.handleBlur}
                      placeholder="yourstore"
                      className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11 pl-8"
                    />
                  </div>
                  <FieldError message={field.state.meta.errors[0]} />
                </div>
              )}
            </form.Field>

            {/* Global password mismatch error */}
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
