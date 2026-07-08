"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User,
  Building2,
  MapPin,
  AtSign,
  Mail,
  Lock,
  Info,
  Eye,
  EyeOff,
  Phone,
  LocateFixed,
  Loader2,
  Gift,
} from "lucide-react";
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
import { NIGERIA_STATES } from "@/lib/states";
import { SIGNUP_FIELD_SCHEMAS, passwordStrength } from "../schema";
import type { SignupFormApi } from "../schema";
import { FieldError } from "./shared";

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
    const newValue = e.target.value.replace(/[^a-z0-9_]/g, "");
    if (newValue.length > 0 && !/^[a-z]/.test(newValue)) return;
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

interface ReverseGeocodeResult {
  address: string;
  state?: string;
}

export default function Step1BusinessAccount({
  form,
}: {
  form: SignupFormApi;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [locating, setLocating] = useState(false);

  const reverseGeocodeMutation = useMutation({
    mutationFn: async (coords: { lat: number; lng: number }) => {
      const res = await fetch(
        `/api/geo/reverse?lat=${coords.lat}&lng=${coords.lng}`,
      );
      const data = (await res.json()) as ReverseGeocodeResult & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Couldn't resolve address.");
      return data;
    },
    onSuccess: (data, coords) => {
      form.setFieldValue("address", data.address);
      form.setFieldValue("location", coords);

      const selectedState = form.store.state.values.state;
      if (!data.state || !selectedState || data.state === selectedState) {
        // Nothing to reconcile — either Nominatim couldn't resolve a state,
        // the dropdown was still empty, or it already agrees. Adopt it.
        if (data.state) form.setFieldValue("state", data.state);
        toast.success("Location captured — review the address below");
      } else {
        // Detected state differs from what's picked — the dropdown was
        // wrong for where they actually are, so clear it rather than leave
        // a stale, contradicted value sitting there unnoticed.
        form.setFieldValue("state", "");
        toast.message("Your selected state didn't match your location", {
          description: `We reset it — your location looks like ${data.state}. Please pick your state again.`,
          duration: 8000,
        });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation isn't supported by this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        reverseGeocodeMutation.mutate({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          // A browser that's already denied location won't re-prompt no
          // matter how many times we call getCurrentPosition — only the
          // person can undo that, from the site's own permission settings.
          toast.error("Location access is blocked", {
            description:
              "Tap the lock icon next to the address bar, allow Location, then try again — or just type your address below.",
            duration: 8000,
          });
        } else {
          toast.error("Couldn't get your location");
        }
      },
    );
  };

  return (
    <div className="space-y-5">
      {/* Row: Name + Business Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) => {
              const r = SIGNUP_FIELD_SCHEMAS.name.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
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
              const r = SIGNUP_FIELD_SCHEMAS.businessName.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
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

      {/* Business phone / WhatsApp number */}
      <form.Field
        name="phone"
        validators={{
          onChange: ({ value }) => {
            const r = SIGNUP_FIELD_SCHEMAS.phone.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <div>
            <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-orange-400" />
              Business Phone Number
            </Label>
            <Input
              value={field.state.value}
              onChange={(e) =>
                field.handleChange(e.target.value.replace(/[^\d]/g, ""))
              }
              onBlur={field.handleBlur}
              inputMode="numeric"
              placeholder="e.g. 2348012345678"
              className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
            />
            <div className="flex items-center gap-1 mt-1">
              <Info className="w-3 h-3 text-black/40 shrink-0" />
              <p className="text-black/40 text-xs">
                This should be your WhatsApp Business number — buyers will be
                sent here to chat.
              </p>
            </div>
            <FieldError message={field.state.meta.errors[0]} />
          </div>
        )}
      </form.Field>

      {/* Email */}
      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) => {
            const r = SIGNUP_FIELD_SCHEMAS.email.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
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

      {/* State */}
      <form.Field
        name="state"
        validators={{
          onChange: ({ value }) => {
            const r = SIGNUP_FIELD_SCHEMAS.state.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <div>
            <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              State
            </Label>
            <Select
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v ?? "")}
            >
              <SelectTrigger className="bg-transparent border-black/[0.3] w-full text-black h-11 focus:border-orange-500/50 focus:ring-orange-500/20">
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent className="bg-white border-black/[0.3] z-50 text-black max-h-60">
                <SelectGroup>
                  {NIGERIA_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError message={field.state.meta.errors[0]} />
          </div>
        )}
      </form.Field>

      {/* Address (manual or geolocated) */}
      <form.Field
        name="address"
        validators={{
          onChange: ({ value }) => {
            const r = SIGNUP_FIELD_SCHEMAS.address.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
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
              placeholder="123 Main St, Ikeja"
              className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
            />
            <div className="flex justify-end mt-1.5">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating || reverseGeocodeMutation.isPending}
                className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 disabled:opacity-60 cursor-pointer"
              >
                {locating || reverseGeocodeMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <LocateFixed className="w-3 h-3" />
                )}
                {locating
                  ? "Locating…"
                  : reverseGeocodeMutation.isPending
                    ? "Resolving address…"
                    : "Use my current location"}
              </button>
            </div>
            <FieldError message={field.state.meta.errors[0]} />
          </div>
        )}
      </form.Field>

      {/* Username */}
      <form.Field
        name="username"
        validators={{
          onChange: ({ value }) => {
            const r = SIGNUP_FIELD_SCHEMAS.username.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
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

      {/* Referral code — optional. Prefilled from localStorage (see
          page.tsx's effect) when the vendor arrived via a shared referral
          link, but always editable in case a friend just told them the code
          instead of sending a link. */}
      <form.Field name="referralCode">
        {(field) => (
          <div>
            <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
              <Gift className="w-3.5 h-3.5 text-orange-400" />
              Referral Code{" "}
              <span className="text-black/35 font-normal">(optional)</span>
            </Label>
            <Input
              value={field.state.value ?? ""}
              onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
              onBlur={field.handleBlur}
              placeholder="e.g. VLT7K2M"
              className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11 uppercase"
            />
            <div className="flex items-center gap-1 mt-1">
              <Info className="w-3 h-3 text-black/40 shrink-0" />
              <p className="text-black/40 text-xs">
                Got invited by another vendor? Enter their code and they’ll earn
                a referral bonus once you verify your account.
              </p>
            </div>
          </div>
        )}
      </form.Field>

      {/* Row: Password + Confirm Password */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) => {
              const r = SIGNUP_FIELD_SCHEMAS.password.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/60 focus:outline-none cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <PasswordStrengthMeter password={field.state.value} />
              <FieldError message={field.state.meta.errors[0]} />
            </div>
          )}
        </form.Field>

        <form.Field
          name="confirmPassword"
          validators={{
            onChange: ({ value }) => {
              if (!value) return "Please confirm your password";
              if (value !== form.store.state.values.password)
                return "Passwords don't match";
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
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/60 focus:outline-none cursor-pointer"
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
    </div>
  );
}
