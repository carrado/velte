"use client";

import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  User,
  UserCog,
  Lock,
  Camera,
  RefreshCw,
  Shield,
  KeyRound,
  MapPin,
  LocateFixed,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/store/userStore";
import { settingsApi, ADDRESS_CHANGE_COOLDOWN_MS } from "@/services/settings";
import { usersApi } from "@/services/users";
import { queryKeys } from "@/lib/query-keys";
import { uploadAvatarToCloudinary, validateImageFile } from "@/lib/cloudinary";
import LogoutModal from "@/components/LogOutModal";
import { NIGERIA_STATES } from "@/lib/states";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserLocation } from "@/types/user";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  area: string;
  state: string;
  location: UserLocation | null;
  addressChangedAt: string | null;
}

interface PasswordConfig {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ── Input Field ───────────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  icon: Icon,
  className,
  hint,
  disabled,
  name,
  autoComplete,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ElementType;
  className?: string;
  hint?: string;
  disabled?: boolean;
  name?: string;
  autoComplete?: string;
}) {
  return (
    <div className={className}>
      <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
        {label}
      </label>
      {hint && <p className="text-dash-secondary text-gray-500 mb-2">{hint}</p>}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={14} />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          name={name}
          autoComplete={autoComplete}
          className={cn(
            "w-full text-dash-body text-gray-700 border border-gray-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow",
            Icon ? "pl-9 pr-3.5" : "px-3.5",
            disabled && "bg-gray-50 text-gray-400 cursor-not-allowed",
          )}
        />
      </div>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id?: string;
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon size={17} className="text-orange-500" />
        </div>
        <div>
          <h3 className="text-dash-heading font-bold text-gray-900">{title}</h3>
          {description && (
            <p className="text-dash-secondary text-gray-400 mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Inline Save Button ────────────────────────────────────────────────────────

function InlineSaveButton({
  onClick,
  loading,
  label = "Save Changes",
}: {
  onClick: () => void;
  loading: boolean;
  label?: string;
}) {
  return (
    <div className="flex justify-end mt-5">
      <button
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 py-2.5 px-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
      >
        {loading ? (
          <>
            <RefreshCw size={13} className="animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <CheckCircle2 size={14} />
            {label}
          </>
        )}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Account Settings — profile + password
// ══════════════════════════════════════════════════════════════════════════════

function AccountSettingsPanel() {
  const storeUser = useUserStore((s) => s.user);
  const queryClient = useQueryClient();

  // ── Profile ──────────────────────────────────────────────────────────────────
  const { data: profileData } = useQuery({
    queryKey: queryKeys.settings.profile,
    queryFn: settingsApi.fetchProfile,
    staleTime: 5 * 60 * 1000,
  });

  const [profile, setProfile] = useState<UserProfile>({
    fullName: "",
    email: "",
    phone: "",
    businessName: "",
    area: "",
    state: "",
    location: null,
    addressChangedAt: null,
  });
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form once profile arrives (from query or store)
  useEffect(() => {
    const source = profileData ?? storeUser;
    if (!source) return;
    setProfile({
      fullName: source.name ?? "",
      email: source.email ?? "",
      phone: source.phone ?? "",
      businessName: source.company?.name ?? "",
      area: source.area ?? "",
      state: source.state ?? "",
      location: source.location ?? null,
      addressChangedAt: source.addressChangedAt ?? null,
    });
    if (source.avatar && !avatarPreview) {
      setAvatarPreview(source.avatar);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData, storeUser]);

  const addressLockedUntil = profile.addressChangedAt
    ? new Date(
        new Date(profile.addressChangedAt).getTime() +
          ADDRESS_CHANGE_COOLDOWN_MS,
      )
    : null;
  const addressLocked =
    !!addressLockedUntil && addressLockedUntil.getTime() > Date.now();

  // Same reverse-geocode endpoint and state-reconciliation logic as signup's
  // Step1BusinessAccount.tsx — "use my current location" here previously
  // only ever captured raw coordinates, leaving the Business Address field
  // untouched even though the buyer-facing search relies on that address
  // text just as much as the lat/lng.
  const reverseGeocodeMutation = useMutation({
    mutationFn: async (coords: { lat: number; lng: number }) => {
      const res = await fetch(
        `/api/geo/reverse?lat=${coords.lat}&lng=${coords.lng}`,
      );
      const data = (await res.json()) as {
        address: string;
        state?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Couldn't resolve address.");
      return data;
    },
    onSuccess: (data, coords) => {
      // Detected state differs from what's already picked — reset it rather
      // than leave a stale, contradicted value sitting there unnoticed
      // (same reasoning as signup: nearby-buyer matching depends on state
      // agreeing with the actual coordinates).
      const stateMismatch =
        !!data.state && !!profile.state && data.state !== profile.state;

      setProfile((p) => ({
        ...p,
        location: coords,
        area: data.address,
        state: stateMismatch ? "" : (data.state ?? p.state),
      }));

      if (stateMismatch) {
        toast.message("Your selected state didn't match your location", {
          description: `We reset it — your location looks like ${data.state}. Please pick your state again.`,
          duration: 8000,
        });
      } else {
        toast.success("Location captured — review the address below");
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
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied"
            : "Couldn't get your location",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setAvatarUploading(true);

    try {
      const url = await uploadAvatarToCloudinary(file);
      await settingsApi.updateProfile({ avatar: url });
      setAvatarPreview(url);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile });
      toast.success("Profile photo updated");
    } catch (err) {
      setAvatarPreview(profileData?.avatar ?? storeUser?.avatar ?? "");
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      URL.revokeObjectURL(localPreview);
      setAvatarUploading(false);
    }
  };

  const profileMutation = useMutation({
    mutationFn: settingsApi.updateProfile,
    onSuccess: ({ addressChangeBlocked, addressChangeAvailableAt }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile });
      if (addressChangeBlocked && addressChangeAvailableAt) {
        toast.success(
          `Profile updated. Business address wasn't changed — you can update it again on ${new Date(
            addressChangeAvailableAt,
          ).toLocaleString("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
          })}.`,
        );
      } else {
        toast.success("Profile updated");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSaveProfile = () => {
    profileMutation.mutate({
      name: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      businessName: profile.businessName,
      area: profile.area,
      state: profile.state,
      ...(profile.location ? { location: profile.location } : {}),
    });
  };

  // ── Password (2-step OTP flow) ────────────────────────────────────────────
  type PwdStep = "form" | "confirming";
  const [pwdStep, setPwdStep] = useState<PwdStep>("form");
  const [passwords, setPasswords] = useState<PasswordConfig>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");

  const requestMutation = useMutation({
    mutationFn: settingsApi.requestPasswordChange,
    onSuccess: (res) => {
      setPwdStep("confirming");
      setOtp("");
      toast.success(res.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const confirmMutation = useMutation({
    mutationFn: settingsApi.confirmPasswordChange,
    onSuccess: () => {
      setPwdStep("form");
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setOtp("");
      toast.success("Password changed successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleRequestPasswordChange = () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    requestMutation.mutate({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
      confirmPassword: passwords.confirmPassword,
    });
  };

  const handleConfirmPasswordChange = () => {
    if (!otp.trim()) {
      toast.error("Please enter the verification code");
      return;
    }
    confirmMutation.mutate({
      otp: otp.trim(),
      newPassword: passwords.newPassword,
      confirmPassword: passwords.confirmPassword,
    });
  };

  const strengthLevel =
    passwords.newPassword.length === 0
      ? 0
      : passwords.newPassword.length < 6
        ? 1
        : passwords.newPassword.length < 10
          ? 2
          : passwords.newPassword.length < 14
            ? 3
            : 4;

  const strengthColors = [
    "bg-gray-200",
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-500",
  ];
  const strengthLabels = ["", "Too short", "Weak", "Good", "Strong"];

  return (
    <div className="space-y-5">
      {/* Profile */}
      <SectionCard
        id="profile-section"
        icon={UserCog}
        title="Profile Information"
        description="Your personal and business details"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center overflow-hidden">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={26} className="text-orange-400" />
              )}
              {avatarUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <RefreshCw size={14} className="text-white animate-spin" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-colors disabled:opacity-60"
            >
              <Camera size={11} className="text-white" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
          <div>
            <p className="text-dash-body font-semibold text-gray-900">
              Profile Photo
            </p>
            <p className="text-dash-secondary text-gray-400 mt-0.5">
              JPG or PNG, max 2MB
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="text-dash-secondary text-orange-500 font-semibold mt-1 cursor-pointer hover:text-orange-600 transition-colors disabled:opacity-60"
            >
              {avatarUploading ? "Uploading…" : "Upload photo"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Full Name"
            value={profile.fullName}
            onChange={(v) => setProfile((p) => ({ ...p, fullName: v }))}
            placeholder="John Doe"
            icon={User}
            name="fullName"
            autoComplete="name"
          />
          <InputField
            label="Business Name"
            value={profile.businessName}
            onChange={(v) => setProfile((p) => ({ ...p, businessName: v }))}
            placeholder="My Store Ltd"
            icon={Building2}
            name="businessName"
            autoComplete="organization"
          />
          <InputField
            label="Email Address"
            value={profile.email}
            onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
            placeholder="you@business.com"
            icon={Mail}
            type="email"
            name="email"
            autoComplete="email"
          />
          <InputField
            label="Phone Number"
            value={profile.phone}
            onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
            placeholder="+234 800 000 0000"
            icon={Phone}
            name="phone"
            autoComplete="tel"
          />
        </div>

        {/* State + Business Address — same layout/order as signup */}
        <div className="mt-4">
          <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
            State
          </label>
          <Select
            value={profile.state}
            onValueChange={(v) => setProfile((p) => ({ ...p, state: v ?? "" }))}
            disabled={addressLocked}
          >
            <SelectTrigger className="w-full h-11 bg-white border border-gray-200 rounded-xl text-dash-body text-gray-700 focus-visible:ring-2 focus-visible:ring-orange-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed">
              <SelectValue placeholder="Select your state" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectGroup>
                {NIGERIA_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <InputField
          className="mt-4"
          label="Business Address"
          value={profile.area}
          onChange={(v) => setProfile((p) => ({ ...p, area: v }))}
          placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos"
          icon={MapPin}
          disabled={addressLocked}
          name="velte-business-address"
          autoComplete="off"
          hint={
            addressLocked && addressLockedUntil
              ? `Locked until ${addressLockedUntil.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })} — addresses can only change once a day so nearby-buyer matching stays trustworthy.`
              : undefined
          }
        />

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3.5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <LocateFixed size={14} className="text-gray-400 shrink-0" />
            <p className="text-dash-secondary text-gray-600 truncate">
              {profile.location
                ? `Location set — ${profile.location.lat.toFixed(4)}, ${profile.location.lng.toFixed(4)}`
                : "No precise location set yet"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={
              locating || reverseGeocodeMutation.isPending || addressLocked
            }
            className="text-dash-secondary text-orange-500 font-semibold whitespace-nowrap cursor-pointer hover:text-orange-600 transition-colors disabled:opacity-60"
          >
            {addressLocked
              ? "Locked"
              : locating
                ? "Locating…"
                : reverseGeocodeMutation.isPending
                  ? "Resolving address…"
                  : "Use my current location"}
          </button>
        </div>

        <InlineSaveButton
          onClick={handleSaveProfile}
          loading={profileMutation.isPending}
          label="Save Profile"
        />
      </SectionCard>

      {/* Password */}
      <SectionCard
        icon={Lock}
        title="Change Password"
        description="Update your account password"
      >
        {pwdStep === "form" ? (
          <div className="space-y-4">
            <InputField
              label="Current Password"
              value={passwords.currentPassword}
              onChange={(v) =>
                setPasswords((p) => ({ ...p, currentPassword: v }))
              }
              placeholder="Enter current password"
              icon={Shield}
              type="password"
              name="currentPassword"
              // "new-password" (not "current-password") is deliberate — it's
              // the standard trick to stop browsers auto-populating this
              // field with the saved site password on page load. The
              // password-manager convenience of current-password autofill
              // isn't worth it here.
              autoComplete="new-password"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="New Password"
                value={passwords.newPassword}
                onChange={(v) =>
                  setPasswords((p) => ({ ...p, newPassword: v }))
                }
                placeholder="Min. 8 characters"
                icon={Lock}
                type="password"
                name="newPassword"
                autoComplete="new-password"
              />
              <InputField
                label="Confirm New Password"
                value={passwords.confirmPassword}
                onChange={(v) =>
                  setPasswords((p) => ({ ...p, confirmPassword: v }))
                }
                placeholder="Repeat new password"
                icon={Lock}
                type="password"
                name="confirmNewPassword"
                autoComplete="new-password"
              />
            </div>

            {passwords.newPassword.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors duration-300",
                        strengthLevel >= level
                          ? strengthColors[strengthLevel]
                          : "bg-gray-200",
                      )}
                    />
                  ))}
                </div>
                <p
                  className={cn(
                    "text-dash-secondary font-medium",
                    strengthLevel <= 1
                      ? "text-red-500"
                      : strengthLevel <= 2
                        ? "text-orange-500"
                        : strengthLevel === 3
                          ? "text-yellow-600"
                          : "text-green-600",
                  )}
                >
                  {strengthLabels[strengthLevel]}
                </p>
              </div>
            )}

            <InlineSaveButton
              onClick={handleRequestPasswordChange}
              loading={requestMutation.isPending}
              label="Update Password"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
              <Mail size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-dash-secondary text-blue-700 leading-relaxed">
                A 6-digit verification code was sent to your email and phone.
                Enter it below to confirm the password change.
              </p>
            </div>

            <div>
              <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
                Verification Code
              </label>
              <div className="relative">
                <KeyRound
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  className="w-full text-dash-body text-gray-700 border border-gray-200 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow tracking-widest font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end pt-1">
              <button
                onClick={() => {
                  setPwdStep("form");
                  setOtp("");
                }}
                className="text-dash-body text-gray-500 font-semibold hover:text-gray-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPasswordChange}
                disabled={confirmMutation.isPending || otp.length < 6}
                className="flex items-center gap-2 py-2.5 px-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {confirmMutation.isPending ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Confirming…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Confirm Change
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGOUT — the mobile home for logout now that the nav drawer is gone
// (desktop also has it in the Header avatar popover).
// ══════════════════════════════════════════════════════════════════════════════

function LogoutSection() {
  const [showModal, setShowModal] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: () => usersApi.logout(),
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Logout failed");
    },
  });

  return (
    <>
      <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-dash-body font-semibold text-gray-900">Log out</p>
          <p className="text-dash-secondary text-gray-400 mt-0.5">
            You&apos;ll need to sign in again to manage your catalog and wallet.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-dash-body font-medium text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <LogOut size={15} />
          Log Out
        </button>
      </div>

      <LogoutModal
        isOpen={showModal}
        disabled={logoutMutation.isPending}
        onClose={() => setShowModal(false)}
        onConfirm={() => logoutMutation.mutate()}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT — Settings Page
// ══════════════════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <p className="text-dash-body text-gray-500 px-5 sm:px-0">
        Manage your profile and account security
      </p>
      <AccountSettingsPanel />
      <LogoutSection />
    </div>
  );
}
