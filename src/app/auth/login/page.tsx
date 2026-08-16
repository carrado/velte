"use client";

import { Suspense, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  MessageSquarePlus,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BuyerAuthShell } from "@/components/buyer/BuyerAuthShell";
import { ApiError } from "@/lib/api-client";
import { usersApi } from "@/services/users";
import type { AuthPanelContent } from "@/types/common";

/* Unified login (2026-08-15) — ONE screen for both account types. The
   backend (auth.js's login) tries the vendor collection first, then falls
   back to Buyer, and tells us which one matched via `accountType` — this
   page just branches on that to route correctly afterward. Replaces the
   separate vendor /auth/login and buyer /buyer/auth/login; both old URLs
   now redirect here. */

const LOGIN_PANEL: AuthPanelContent = {
  headline: "One account. Everything Velte.",
  subtitle:
    "Whether you're finding something or selling it, it's the same login — Velte knows which one you are.",
  features: [
    {
      icon: MessageSquarePlus,
      text: "Buyers: post requests, chat vendors direct",
    },
    {
      icon: Sparkles,
      text: "Vendors: get discovered, manage orders, get paid",
    },
    { icon: ShieldCheck, text: "Your data stays private, always" },
  ],
};

const identifierSchema = z
  .string()
  .trim()
  .min(3, "Enter your email or username");
const passwordSchema = z.string().min(1, "Password is required");

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set by proxy.ts when it bounces an unauthenticated vendor visit to a
  // protected route here. Buyer-facing 401s (post a request, save an item)
  // used to land here too via a /buyer/auth redirect shim, back when this
  // was the buyer login as well — as of 2026-08-16 those go straight to the
  // real buyer identity screen at /buyer/auth instead (see that page's own
  // comment), so `redirect`/`reason` on THIS page only ever come from a
  // vendor bounce now. Still read, still passed through to login, just no
  // longer branches the "Sign up" link — there's no buyer-flavored signup
  // to bias toward anymore (/auth/signup is vendor-only, see that page).
  const redirectTo = searchParams.get("redirect");

  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: (data: { identifier: string; password: string }) =>
      usersApi.login(data),
    onSuccess: (result) => {
      toast.success("Welcome back!");
      if (result.accountType === "vendor") {
        const dest =
          redirectTo && redirectTo.startsWith(`/${result.user.id}/`)
            ? redirectTo
            : `/${result.user.id}/wallet`;
        // .replace(), not .push() — otherwise the login form stays one
        // back-press away from the dashboard.
        router.replace(dest);
      } else {
        router.replace(redirectTo || "/buyer/requests");
      }
    },
    onError: (error: unknown, variables) => {
      const message =
        error instanceof Error
          ? error.message
          : "Invalid email/username or password";
      const status = error instanceof ApiError ? error.status : 0;
      // A blocked account (423) already shows BlockedAccountModal (mounted
      // globally, triggered from api-client.ts) — a toast here would be
      // redundant noise on top of it.
      if (status !== 423) toast.error(message);
      if (status === 403) {
        // Unverified VENDOR account — the backend echoes the real email
        // back (see /api/auth/login's own comment) since `identifier` may
        // have been a username, not the email /auth/verify needs.
        const email =
          (error instanceof ApiError &&
            (error.data as { email?: string } | undefined)?.email) ||
          variables.identifier;
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
      }
    },
  });

  const form = useForm({
    defaultValues: { identifier: "", password: "" },
    onSubmit: ({ value }) => {
      const identifier = identifierSchema.safeParse(value.identifier);
      const password = passwordSchema.safeParse(value.password);
      if (!identifier.success || !password.success) return;
      loginMutation.mutate({
        identifier: identifier.data,
        password: password.data,
      });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-[440px]"
    >
      <Link
        href="/"
        className="flex items-center gap-2.5 justify-center mb-6 lg:hidden"
      >
        <Image
          src="/velte_logo_esn5dj.png"
          alt="Velte logo"
          width={72}
          height={35}
          priority
        />
      </Link>

      <div className="bg-white border border-gray-100 sm:rounded-2xl p-8 shadow-xl shadow-gray-200/60">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#023337] mb-2 tracking-tight">
            Welcome back
          </h1>
          <p className="text-gray-500 text-sm">
            Sign in with your email or username.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-5"
        >
          <form.Field
            name="identifier"
            validators={{
              onChange: ({ value }) => {
                const r = identifierSchema.safeParse(value);
                return r.success ? undefined : r.error.issues[0]?.message;
              },
            }}
          >
            {(field) => (
              <div>
                <Label className="text-gray-600 text-sm mb-1.5 flex items-center gap-2">
                  <UserRound className="w-3.5 h-3.5 text-orange-400" />
                  Email or username
                </Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="you@example.com"
                  className="h-11"
                  autoFocus
                />
                <FieldError message={field.state.meta.errors[0]} />
              </div>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => {
                const r = passwordSchema.safeParse(value);
                return r.success ? undefined : r.error.issues[0]?.message;
              },
            }}
          >
            {(field) => (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-gray-600 text-sm flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-orange-400" />
                    Password
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-orange-600 hover:text-orange-700"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Enter your password"
                    className="h-11 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    tabIndex={-1}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <FieldError message={field.state.meta.errors[0]} />
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit || isSubmitting || loginMutation.isPending}
                size="lg"
                className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 gap-2"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
                {!loginMutation.isPending && <ArrowRight className="w-4 h-4" />}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <BuyerAuthShell panel={LOGIN_PANEL}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </BuyerAuthShell>
  );
}
