"use client";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox"; // shadcn checkbox
import { Mail, Lock, ArrowRight, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import { usersApi } from "@/services/users";
import { useEffect } from "react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-red-400 text-xs mt-1">{message}</p>;
}

export default function Login() {
  const router = useRouter();

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      usersApi.login(data),
    onSuccess: (response) => {
      toast.success("Welcome back!");
      router.push(`/${response.user.id}/dashboard`);
    },
    onError: (error: any, variables) => {
      toast.error(error.message || "Invalid email or password");
      if (error.status === 403) {
        router.push(`/auth/verify?email=${variables.email}`);
      }
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    } as LoginForm,
    onSubmit: ({ value }) => {
      const parsed = loginSchema.safeParse(value);
      if (!parsed.success) return;
      loginMutation.mutate({ email: value.email, password: value.password });
    },
  });

  return (
    <div className="min-h-screen bg-[#0d0804] flex items-center justify-center p-5">
      {/* Background effects */}
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
        className="relative w-full h-full max-w-[440px]"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 justify-center mb-1"
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
        <div className="bg-white border border-white/[0.08] rounded-2xl p-8 shadow-2xl overflow-y-auto max-h-[80vh">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-black mb-2 tracking-tight">
              Log in to Velte
            </h1>
            <p className="text-black/45 text-sm">
              Access your AI sales dashboard
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
            className="space-y-5"
          >
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

            {/* Password */}
            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) => {
                  const r = z
                    .string()
                    .min(1, "Password is required")
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

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <form.Field name="remember">
                {(field) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                      className="border-black/30 data-[checked]:!bg-orange-500 data-[checked]:!border-orange-500 data-[checked]:text-white"
                    />
                    <Label
                      htmlFor="remember"
                      className="text-sm text-black/60 cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                )}
              </form.Field>

              <Link
                href="/auth/forgot-password"
                className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={
                    !canSubmit || isSubmitting || loginMutation.isPending
                  }
                  size="lg"
                  className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 mt-4 gap-2"
                >
                  {isSubmitting || loginMutation.isPending
                    ? "Logging in..."
                    : "Log in"}
                  {!isSubmitting && !loginMutation.isPending && (
                    <LogIn className="w-4 h-4" />
                  )}
                </Button>
              )}
            </form.Subscribe>
          </form>

          {/* Signup link */}
          <p className="text-center text-black/40 text-sm mt-6">
            Don't have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-orange-500 hover:text-orange-400 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
