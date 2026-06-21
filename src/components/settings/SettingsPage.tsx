"use client";

import { useState, useEffect, useRef } from "react";
import {
  Clock,
  Zap,
  FileText,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Info,
  Sun,
  Building2,
  Phone,
  Mail,
  MapPin,
  Hash,
  Calendar,
  User,
  Printer,
  Download,
  Eye,
  Sparkles,
  ShoppingCart,
  Truck,
  UserCog,
  Lock,
  Bell,
  Camera,
  RefreshCw,
  Shield,
  KeyRound,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/store/userStore";
import { useOnboardingStore } from "@/store/onboardingStore";
import { settingsApi } from "@/services/settings";
import { useIsFood } from "@/hooks/useBusinessType";
import { queryKeys } from "@/lib/query-keys";
import { uploadAvatarToCloudinary, validateImageFile } from "@/lib/cloudinary";
import { WhatsAppProfileSection } from "./WhatsappProfile";
import { updateWhatsAppProfilePicture } from "@/services/whatsappProfile";
import type {
  InvoiceDocBusiness,
  InvoiceSettings,
  ReceiptSettings,
} from "@/types/invoice";
import type { ShopHoursConfig, EscalationConfig } from "@/types/ai-settings";

// ── Types ─────────────────────────────────────────────────────────────────────

type SettingsTab = "account" | "orders" | "ai" | "invoice";
type InvoiceTab = "invoice" | "receipt";

interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
}

interface PasswordConfig {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationConfig {
  emailOrders: boolean;
  emailInvoices: boolean;
  emailMarketing: boolean;
  smsOrders: boolean;
}

interface OrderSettings {
  minDeliveryDays: number;
  maxDeliveryDays: number;
  deliveryNote: string;
  allowSameDay: boolean;
}

// ShopHoursConfig + EscalationConfig live in `@/types/ai-settings` (shared with
// the settings service).

// Invoice / Receipt config types live in `@/types/invoice` (shared with the
// settings service). The business logo is the account avatar, not a stored field.

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      type="button"
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer",
        enabled ? "bg-orange-500" : "bg-gray-200",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
          enabled ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
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
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ElementType;
  className?: string;
  hint?: string;
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
          className={cn(
            "w-full text-dash-body text-gray-700 border border-gray-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow",
            Icon ? "pl-9 pr-3.5" : "px-3.5",
          )}
        />
      </div>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6">
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

// ── Bottom Save Button ────────────────────────────────────────────────────────

function BottomSaveButton({
  onClick,
  loading,
  label = "Save Changes",
}: {
  onClick: () => void;
  loading: boolean;
  label?: string;
}) {
  return (
    <div className="flex justify-end pb-2 px-3">
      <button
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 py-2.5 px-6 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
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
// PANEL 1 — Account Settings
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
  });
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
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
    });
    if (source.avatar && !avatarPreview) {
      setAvatarPreview(source.avatar);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData, storeUser]);

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
      // Push new photo to WhatsApp/Meta in the background; non-fatal if WA not connected
      updateWhatsAppProfilePicture(url).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile });
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.whatsappProfile,
      });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile });
      toast.success("Profile updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSaveProfile = () => {
    profileMutation.mutate({
      name: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      businessName: profile.businessName,
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

  // ── Notifications ─────────────────────────────────────────────────────────
  const { data: notifData } = useQuery({
    queryKey: queryKeys.settings.notifications,
    queryFn: settingsApi.getNotificationSettings,
    staleTime: 5 * 60 * 1000,
  });

  const defaultNotifState: NotificationConfig = {
    emailOrders: true,
    emailInvoices: true,
    emailMarketing: false,
    smsOrders: false,
  };

  const [notifications, setNotifications] =
    useState<NotificationConfig>(defaultNotifState);

  useEffect(() => {
    if (!notifData) return;
    setNotifications({
      emailOrders: notifData.orders,
      emailInvoices: notifData.invoices,
      emailMarketing: notifData.productUpdates,
      smsOrders: notifData.push,
    });
  }, [notifData]);

  const notifMutation = useMutation({
    mutationFn: settingsApi.saveNotificationSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.settings.notifications, updated);
      toast.success("Notification preferences saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSaveNotifs = () => {
    notifMutation.mutate({
      orders: notifications.emailOrders,
      invoices: notifications.emailInvoices,
      productUpdates: notifications.emailMarketing,
      push: notifications.smsOrders,
    });
  };

  const notifItems: {
    key: keyof NotificationConfig;
    label: string;
    description: string;
  }[] = [
    {
      key: "emailOrders",
      label: "Order notifications",
      description: "Email me when a new order is placed",
    },
    {
      key: "emailInvoices",
      label: "Invoice notifications",
      description: "Email me when an escalation invoice is generated",
    },
    {
      key: "emailMarketing",
      label: "Product tips & updates",
      description: "Occasional product news and feature updates",
    },
    {
      key: "smsOrders",
      label: "Push & SMS alerts",
      description: "Receive push or text notifications for new orders",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Profile */}
      <SectionCard
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
          />
          <InputField
            label="Business Name"
            value={profile.businessName}
            onChange={(v) => setProfile((p) => ({ ...p, businessName: v }))}
            placeholder="My Store Ltd"
            icon={Building2}
          />
          <InputField
            label="Email Address"
            value={profile.email}
            onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
            placeholder="you@business.com"
            icon={Mail}
            type="email"
          />
          <InputField
            label="Phone Number"
            value={profile.phone}
            onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
            placeholder="+234 800 000 0000"
            icon={Phone}
          />
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

      <WhatsAppProfileSection />

      {/* Notifications */}
      <SectionCard
        icon={Bell}
        title="Notification Preferences"
        description="Choose how you receive alerts"
      >
        <div className="divide-y divide-gray-100">
          {notifItems.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between py-3.5">
              <div>
                <p className="text-dash-body font-semibold text-gray-900">
                  {label}
                </p>
                <p className="text-dash-secondary text-gray-500 mt-0.5">
                  {description}
                </p>
              </div>
              <Toggle
                enabled={notifications[key]}
                onChange={() =>
                  setNotifications((p) => ({ ...p, [key]: !p[key] }))
                }
              />
            </div>
          ))}
        </div>
        <InlineSaveButton
          onClick={handleSaveNotifs}
          loading={notifMutation.isPending}
          label="Save Preferences"
        />
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL 2 — Order Settings
// ══════════════════════════════════════════════════════════════════════════════

function OrderSettingsPanel() {
  const isFood = useIsFood();
  const [settings, setSettings] = useState<OrderSettings>({
    minDeliveryDays: 1,
    maxDeliveryDays: 5,
    deliveryNote: "",
    allowSameDay: false,
  });
  const [prepMins, setPrepMins] = useState(20);
  const [autoAccept, setAutoAccept] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const hasError = settings.minDeliveryDays >= settings.maxDeliveryDays;

  const handleSave = async () => {
    if (hasError) {
      toast.error("Maximum delivery days must be greater than minimum");
      return;
    }
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsSaving(false);
    toast.success("Order settings saved");
  };

  const nudge = (
    field: "minDeliveryDays" | "maxDeliveryDays",
    delta: number,
  ) => {
    setSettings((p) => {
      const floor =
        field === "minDeliveryDays"
          ? p.allowSameDay
            ? 0
            : 1
          : p.minDeliveryDays + 1;
      const next = Math.max(floor, p[field] + delta);
      if (field === "minDeliveryDays") {
        return { ...p, minDeliveryDays: Math.min(next, p.maxDeliveryDays - 1) };
      }
      return { ...p, maxDeliveryDays: Math.max(next, p.minDeliveryDays + 1) };
    });
  };

  return (
    <div className="space-y-5">
      {isFood ? (
        <SectionCard
          icon={Timer}
          title="Order Preparation Settings"
          description="Set the expected prep time communicated to customers"
        >
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4 mb-6">
            <p className="text-dash-secondary font-semibold text-orange-600 uppercase tracking-wide mb-3">
              Prep Time Preview
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-orange-500 flex items-center justify-center shadow-sm">
                  <span className="text-3xl font-black text-white">
                    {prepMins}
                  </span>
                </div>
                <p className="text-dash-secondary text-orange-600 font-bold mt-2 uppercase tracking-wide">
                  minutes
                </p>
              </div>
            </div>
            <p className="text-dash-secondary text-orange-700 text-center mt-3 font-medium">
              Customers will be told:{" "}
              <span className="font-black">
                Ready in ~{prepMins} min{prepMins !== 1 ? "s" : ""}
              </span>
            </p>
          </div>

          <div className="mb-5">
            <label className="text-dash-body font-semibold text-gray-900 block mb-1">
              Estimated Preparation Time
            </label>
            <p className="text-dash-secondary text-gray-500 mb-3">
              Average time to prepare an order from receipt to ready
            </p>
            <div className="flex items-center gap-2 max-w-[200px]">
              <button
                onClick={() => setPrepMins((p) => Math.max(5, p - 5))}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer text-dash-title font-bold flex-shrink-0"
              >
                −
              </button>
              <input
                type="number"
                min={5}
                step={5}
                value={prepMins}
                onChange={(e) =>
                  setPrepMins(Math.max(5, parseInt(e.target.value) || 5))
                }
                className="flex-1 text-center text-dash-body font-black text-gray-800 border border-gray-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
              />
              <button
                onClick={() => setPrepMins((p) => p + 5)}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer text-dash-title font-bold flex-shrink-0"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-3.5 border-b border-gray-100 mb-5">
            <div>
              <p className="text-dash-body font-semibold text-gray-900">
                Auto-accept Orders
              </p>
              <p className="text-dash-secondary text-gray-500 mt-0.5">
                Automatically accept incoming orders without manual confirmation
              </p>
            </div>
            <Toggle
              enabled={autoAccept}
              onChange={() => setAutoAccept((p) => !p)}
            />
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-dash-secondary text-blue-700 leading-relaxed">
              The AI uses this prep time when customers ask how long their order
              will take. Actual times may vary based on order complexity.
            </p>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          icon={Truck}
          title="Delivery Time Settings"
          description="Set the expected delivery window communicated to customers"
        >
          {/* Visual range display */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4 mb-6">
            <p className="text-dash-secondary font-semibold text-orange-600 uppercase tracking-wide mb-3">
              Delivery Window Preview
            </p>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-white border-2 border-orange-300 flex items-center justify-center shadow-sm">
                  <span className="text-dash-display font-black text-orange-500">
                    {settings.allowSameDay && settings.minDeliveryDays === 0
                      ? 0
                      : settings.minDeliveryDays}
                  </span>
                </div>
                <p className="text-dash-micro text-orange-500 font-bold mt-1.5 uppercase tracking-wide">
                  Min
                </p>
              </div>

              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative h-2 bg-orange-100 rounded-full overflow-hidden">
                  <div className="absolute left-0 top-0 h-full bg-orange-400 rounded-full w-full" />
                </div>
                <p className="text-dash-micro text-orange-400 font-medium">
                  to
                </p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm">
                  <span className="text-dash-display font-black text-white">
                    {settings.maxDeliveryDays}
                  </span>
                </div>
                <p className="text-dash-micro text-orange-500 font-bold mt-1.5 uppercase tracking-wide">
                  Max
                </p>
              </div>
            </div>

            <p className="text-dash-secondary text-orange-700 text-center mt-3 font-medium">
              Customers will be told:{" "}
              <span className="font-black">
                {settings.allowSameDay && settings.minDeliveryDays === 0
                  ? "0"
                  : settings.minDeliveryDays}
                –{settings.maxDeliveryDays} business day
                {settings.maxDeliveryDays !== 1 ? "s" : ""}
              </span>
            </p>
          </div>

          {/* Same-day toggle */}
          <div className="flex items-center justify-between py-3.5 border-b border-gray-100 mb-5">
            <div>
              <p className="text-dash-body font-semibold text-gray-900">
                Allow Same-Day Delivery
              </p>
              <p className="text-dash-secondary text-gray-500 mt-0.5">
                Sets minimum delivery time to 0 days (today)
              </p>
            </div>
            <Toggle
              enabled={settings.allowSameDay}
              onChange={() =>
                setSettings((p) => ({
                  ...p,
                  allowSameDay: !p.allowSameDay,
                  minDeliveryDays: !p.allowSameDay ? 0 : 1,
                }))
              }
            />
          </div>

          {/* Day pickers */}
          <div className="grid sm:grid-cols-2 grid-cols-1 gap-5 mb-5">
            {/* Min */}
            <div>
              <label className="text-dash-body font-semibold text-gray-900 block mb-1">
                Minimum Delivery Days
              </label>
              <p className="text-dash-secondary text-gray-500 mb-3">
                Earliest a customer can expect their order
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => nudge("minDeliveryDays", -1)}
                  className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer text-dash-title font-bold flex-shrink-0"
                >
                  −
                </button>
                <input
                  type="number"
                  min={settings.allowSameDay ? 0 : 1}
                  max={settings.maxDeliveryDays - 1}
                  value={settings.minDeliveryDays}
                  onChange={(e) =>
                    setSettings((p) => ({
                      ...p,
                      minDeliveryDays: Math.max(
                        settings.allowSameDay ? 0 : 1,
                        Math.min(
                          parseInt(e.target.value) || 0,
                          p.maxDeliveryDays - 1,
                        ),
                      ),
                    }))
                  }
                  className="flex-1 text-center text-dash-body font-black text-gray-800 border border-gray-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
                />
                <button
                  onClick={() => nudge("minDeliveryDays", 1)}
                  className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer text-dash-title font-bold flex-shrink-0"
                >
                  +
                </button>
              </div>
              <p className="text-dash-caption text-gray-400 mt-1.5 text-center">
                {settings.minDeliveryDays === 0
                  ? "Same day"
                  : `${settings.minDeliveryDays} day${settings.minDeliveryDays !== 1 ? "s" : ""}`}
              </p>
            </div>

            {/* Max */}
            <div>
              <label className="text-dash-body font-semibold text-gray-900 block mb-1">
                Maximum Delivery Days
              </label>
              <p className="text-dash-secondary text-gray-500 mb-3">
                Latest a customer should receive their order
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => nudge("maxDeliveryDays", -1)}
                  className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer text-dash-title font-bold flex-shrink-0"
                >
                  −
                </button>
                <input
                  type="number"
                  min={settings.minDeliveryDays + 1}
                  value={settings.maxDeliveryDays}
                  onChange={(e) =>
                    setSettings((p) => ({
                      ...p,
                      maxDeliveryDays: Math.max(
                        p.minDeliveryDays + 1,
                        parseInt(e.target.value) || p.minDeliveryDays + 1,
                      ),
                    }))
                  }
                  className="flex-1 text-center text-dash-body font-black text-gray-800 border border-gray-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
                />
                <button
                  onClick={() => nudge("maxDeliveryDays", 1)}
                  className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer text-dash-title font-bold flex-shrink-0"
                >
                  +
                </button>
              </div>
              <p className="text-dash-caption text-gray-400 mt-1.5 text-center">
                {settings.maxDeliveryDays} day
                {settings.maxDeliveryDays !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Validation warning */}
          {hasError && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
              <AlertCircle
                size={13}
                className="text-red-500 flex-shrink-0 mt-0.5"
              />
              <p className="text-dash-secondary text-red-600 font-medium">
                Maximum delivery days must be greater than minimum delivery
                days.
              </p>
            </div>
          )}

          {/* Delivery note */}
          <div className="mb-4">
            <label className="text-dash-body font-semibold text-gray-900 block mb-1">
              Delivery Note{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <p className="text-dash-secondary text-gray-500 mb-2">
              Additional context shown to customers, e.g. exclusions for
              weekends or holidays.
            </p>
            <textarea
              value={settings.deliveryNote}
              onChange={(e) =>
                setSettings((p) => ({ ...p, deliveryNote: e.target.value }))
              }
              rows={2}
              placeholder="e.g. Delivery days exclude Sundays and public holidays."
              className="w-full text-dash-body text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
            />
          </div>

          {/* Info */}
          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-dash-secondary text-blue-700 leading-relaxed">
              These estimates are communicated by the AI when customers ask
              about shipping times. They don&apos;t automatically trigger any
              logistics workflow.
            </p>
          </div>
        </SectionCard>
      )}

      <BottomSaveButton
        onClick={handleSave}
        loading={isSaving}
        label="Save Order Settings"
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL 3 — AI Settings
// ══════════════════════════════════════════════════════════════════════════════

// Fixed order-total amount (Naira) that triggers escalation. Not editable.
const ESCALATION_AMOUNT = 1_000_000;

function AISettingsPanel() {
  const [shopHours, setShopHours] = useState<ShopHoursConfig>({
    is24Hours: true,
  });

  // The escalation threshold is a fixed order-total amount, not editable.
  const escalationAmountText = `₦${ESCALATION_AMOUNT.toLocaleString()}`;
  const [escalation, setEscalation] = useState<EscalationConfig>({
    enabled: false,
    threshold: ESCALATION_AMOUNT,
  });

  const queryClient = useQueryClient();

  // Load saved AI settings. retry:false + ignored error so the panel still works
  // with defaults if the request fails.
  const { data: savedAi } = useQuery({
    queryKey: queryKeys.settings.ai,
    queryFn: settingsApi.getAiSettings,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (savedAi) {
      // 24/7 is enforced; threshold is fixed server-side. Keep both constant
      // regardless of the stored payload.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShopHours({ is24Hours: true });
      setEscalation({ ...savedAi.escalation, threshold: ESCALATION_AMOUNT });
    }
  }, [savedAi]);

  const saveMutation = useMutation({
    mutationFn: settingsApi.saveAiSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.settings.ai, data);
      toast.success("AI settings saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = () => {
    saveMutation.mutate({ shopHours, escalation });
  };

  return (
    <div className="space-y-5">
      {/* Shop Hours */}
      <SectionCard
        icon={Clock}
        title="Shop Operating Hours"
        description="Control when your AI assistant is active"
      >
        {/* 24/7 is enforced for Phase 1 — custom operating-hours design is
            deferred to Phase 2 (see docs/PHASE2_SHOP_OPERATING_HOURS.md). */}
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-100">
                <Sun size={13} className="text-orange-500" />
              </div>
              <div>
                <p className="text-dash-body font-semibold text-gray-900">
                  24/7 Availability
                </p>
                <p className="text-dash-secondary text-gray-500">
                  AI responds at any time of day
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-dash-caption font-semibold text-orange-500">
                Always on
              </span>
              <Toggle enabled disabled onChange={() => {}} />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Escalation */}
      <SectionCard
        icon={Zap}
        title="Basic Escalation Trigger"
        description="Get notified when an order's total amount exceeds the threshold"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-dash-body font-semibold text-gray-900">
                Enable Escalation Trigger
              </p>
              <p className="text-dash-secondary text-gray-500">
                AI flags large orders for your manual review
              </p>
            </div>
            <Toggle
              enabled={escalation.enabled}
              onChange={() =>
                setEscalation((p) => ({ ...p, enabled: !p.enabled }))
              }
            />
          </div>

          {escalation.enabled && (
            <div className="space-y-4">
              <div>
                <label className="text-dash-body font-semibold text-gray-900 block mb-1">
                  Order Amount Threshold
                </label>
                <p className="text-dash-secondary text-gray-500 mb-2">
                  When an order&apos;s total reaches this amount or more, an
                  invoice is generated instead of automated fulfillment
                </p>
                <div className="flex items-center gap-2 max-w-[220px] rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
                  <Lock size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="text-dash-body font-bold text-gray-800">
                    {escalationAmountText}
                  </span>
                </div>
                <p className="text-dash-caption text-gray-400 mt-1.5">
                  Fixed at {escalationAmountText} — this cannot be changed.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle
                  size={14}
                  className="text-amber-500 flex-shrink-0 mt-0.5"
                />
                <div className="space-y-1.5">
                  <p className="text-dash-body font-semibold text-amber-800">
                    Important — Payment Notice
                  </p>
                  <p className="text-dash-secondary text-amber-700 leading-relaxed">
                    The AI does <span className="font-bold">not</span> receive
                    payment on your behalf when an order totals{" "}
                    <span className="font-bold">
                      {escalationAmountText} or more
                    </span>
                    . An invoice is automatically generated and sent to{" "}
                    <span className="font-bold">your email</span> with the
                    customer&apos;s full details (name, contact, and order
                    breakdown). Customise the invoice format in the{" "}
                    <span className="font-bold">Invoice & Receipt tab</span>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Mail
                  size={13}
                  className="text-blue-500 flex-shrink-0 mt-0.5"
                />
                <p className="text-dash-secondary text-blue-700 leading-relaxed">
                  Escalation invoices are delivered to your registered account
                  email with a full order breakdown and customer contact
                  details.
                </p>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <BottomSaveButton
        onClick={handleSave}
        loading={saveMutation.isPending}
        label="Save AI Settings"
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL 4 — Invoice & Receipt
// ══════════════════════════════════════════════════════════════════════════════

function InvoicePreview({
  config,
  logo,
}: {
  config: InvoiceSettings;
  logo?: string;
}) {
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + config.dueDays);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div
              className="text-dash-display font-black tracking-tight"
              style={{ color: config.primaryColor || "#f97316" }}
            >
              INVOICE
            </div>
            <p className="text-dash-secondary text-gray-400 mt-0.5">
              #INV-001/2
            </p>
          </div>
          <div className="text-right">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt="Business logo"
                className="w-12 h-12 rounded-lg object-cover ml-auto mb-1.5 border border-gray-100"
              />
            )}
            <p className="text-dash-body font-bold text-gray-900">
              {config.business.name || "Your Business Name"}
            </p>
            <p className="text-dash-secondary text-gray-500 mt-0.5 leading-relaxed">
              {config.business.address || "Business Address"}
              <br />
              {config.business.phone || "Phone Number"}
              <br />
              {config.business.email || "email@business.com"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-dash-micro font-semibold text-gray-400 uppercase tracking-wide">
              Issue Date
            </p>
            <p className="text-dash-body font-semibold text-gray-800 mt-0.5">
              {fmt(today)}
            </p>
          </div>
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: `${config.primaryColor || "#f97316"}18` }}
          >
            <p
              className="text-dash-micro font-semibold uppercase tracking-wide"
              style={{ color: config.primaryColor || "#f97316" }}
            >
              Due Date
            </p>
            <p className="text-dash-body font-semibold text-gray-800 mt-0.5">
              {fmt(due)}
            </p>
          </div>
        </div>

        <div className="mb-5">
          <p className="text-dash-micro font-bold text-gray-400 uppercase tracking-wide mb-2">
            Billed To
          </p>
          <p className="text-dash-body font-semibold text-gray-900">
            Customer Name
          </p>
          <p className="text-dash-secondary text-gray-500">
            customer@email.com · +234 800 000 0000
          </p>
        </div>

        <div className="mb-5">
          <div
            className="grid grid-cols-12 text-dash-micro font-bold uppercase tracking-wide px-3 py-2 rounded-lg mb-1"
            style={{
              backgroundColor: `${config.primaryColor || "#f97316"}18`,
              color: config.primaryColor || "#f97316",
            }}
          >
            <span className="col-span-4 sm:col-span-6">Item</span>
            <span className="col-span-2 sm:col-span-2 text-center">Qty</span>
            <span className="col-span-3 sm:col-span-2 text-right">Price</span>
            <span className="col-span-3 sm:col-span-2 text-right">Total</span>
          </div>
          {[
            { name: "Product A", qty: 2, price: 15000 },
            { name: "Product B", qty: 1, price: 8500 },
          ].map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-12 text-dash-secondary px-3 py-2.5 border-b border-gray-100"
            >
              <span className="col-span-4 sm:col-span-6 text-gray-800 font-medium">
                {item.name}
              </span>
              <span className="col-span-2 sm:col-span-2 text-center text-gray-500">
                {item.qty}
              </span>
              <span className="col-span-3 sm:col-span-2 text-right text-gray-500">
                ₦{item.price.toLocaleString()}
              </span>
              <span className="col-span-3 sm:col-span-2 text-right text-gray-800 font-semibold">
                ₦{(item.qty * item.price).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end mb-5">
          <div className="w-48 space-y-1.5">
            <div className="flex justify-between text-dash-secondary text-gray-500">
              <span>Subtotal</span>
              <span>₦38,500</span>
            </div>
            <div className="flex justify-between text-dash-secondary text-gray-500">
              <span>Tax (7.5%)</span>
              <span>₦2,888</span>
            </div>
            <div
              className="flex justify-between text-dash-body font-bold pt-2 border-t border-gray-200"
              style={{ color: config.primaryColor || "#f97316" }}
            >
              <span>Total</span>
              <span>₦41,388</span>
            </div>
          </div>
        </div>

        {(config.bankName || config.accountNumber) && (
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <p className="text-dash-micro font-bold text-gray-400 uppercase tracking-wide mb-1.5">
              Payment Details
            </p>
            <p className="text-dash-secondary text-gray-700">
              <span className="font-semibold">Bank:</span>{" "}
              {config.bankName || "Bank Name"}
            </p>
            <p className="text-dash-secondary text-gray-700">
              <span className="font-semibold">Account:</span>{" "}
              {config.accountNumber || "0000000000"}
            </p>
            <p className="text-dash-secondary text-gray-700">
              <span className="font-semibold">Name:</span>{" "}
              {config.accountName || "Account Name"}
            </p>
          </div>
        )}

        {config.footerNote && (
          <p className="text-dash-caption text-gray-400 text-center border-t border-gray-100 pt-3">
            {config.footerNote}
          </p>
        )}
      </div>
    </div>
  );
}

// Abbreviate a business name to uppercase initials for the receipt number prefix:
// "Acme Stores Limited" → "ASL". Mirrors the backend (documents.service.js).
function abbreviateBusiness(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "RCP";
  const words = trimmed.split(/\s+/).filter(Boolean);
  const abbr =
    words.length === 1 ? words[0].slice(0, 3) : words.map((w) => w[0]).join("");
  return (
    abbr
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 5) || "RCP"
  );
}

// Stable sample random segment for the preview (real receipts: ABBR-{random}-{seq}).
const SAMPLE_RECEIPT_RAND = String(Math.floor(1000 + Math.random() * 9000));

function ReceiptPreview({
  config,
  logo,
}: {
  config: ReceiptSettings;
  logo?: string;
}) {
  const today = new Date();
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  // Sample number — real receipts: ABBR-{random}-{incrementing per-store seq}.
  const receiptNo = `${abbreviateBusiness(config.business.name)}-${SAMPLE_RECEIPT_RAND}-0001`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm max-w-md mx-auto">
      <div className="p-6">
        <div className="text-center mb-6">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt="Business logo"
              className="w-16 h-16 rounded-xl object-cover mx-auto mb-2.5 border border-gray-100"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-2.5"
              style={{
                backgroundColor: `${config.primaryColor || "#f97316"}18`,
              }}
            >
              <Building2
                size={28}
                style={{ color: config.primaryColor || "#f97316" }}
              />
            </div>
          )}
          <p className="text-dash-title font-black text-gray-900">
            {config.business.name || "Your Business Name"}
          </p>
          <p className="text-dash-secondary text-gray-400 mt-1">
            {config.business.address || "Business Address"}
          </p>
          <p className="text-dash-secondary text-gray-400">
            {config.business.phone || "+234 800 000 0000"}
          </p>
        </div>

        <div className="border-t-2 border-dashed border-gray-200 mb-4" />
        <div className="flex justify-between text-dash-secondary font-semibold text-gray-500 mb-4">
          <span>Receipt #{receiptNo}</span>
          <span>{fmt(today)}</span>
        </div>

        {/* Billed To — name drops below the label, phone under the name */}
        <div className="mb-4">
          <p className="text-dash-micro font-bold text-gray-400 uppercase tracking-wide mb-1">
            Billed To
          </p>
          <p className="text-dash-body font-bold text-gray-900">
            Customer Name
          </p>
          <p className="text-dash-secondary text-gray-500">+234 800 000 0000</p>
          <p className="text-dash-secondary text-gray-500">
            customer@email.com
          </p>
        </div>

        <div className="mb-4">
          {[
            { name: "Product A", qty: 2, price: 15000 },
            { name: "Product B", qty: 1, price: 8500 },
          ].map((item, i) => (
            <div
              key={i}
              className="flex justify-between text-dash-body py-2 border-b border-gray-100"
            >
              <span className="text-gray-700 font-medium">
                {item.qty} × {item.name}
              </span>
              <span className="font-bold text-gray-900">
                ₦{(item.qty * item.price).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-between text-dash-secondary text-gray-500 mb-1">
          <span>Subtotal</span>
          <span>₦38,500</span>
        </div>
        <div className="flex justify-between text-dash-secondary text-gray-500 mb-2">
          <span>Tax (7.5%)</span>
          <span>₦2,888</span>
        </div>
        <div
          className="flex justify-between text-dash-title font-black pt-2.5 border-t-2 border-gray-200"
          style={{ color: config.primaryColor || "#f97316" }}
        >
          <span>TOTAL</span>
          <span>₦41,388</span>
        </div>

        <div className="border-t-2 border-dashed border-gray-200 mt-4 mb-5" />
        <div className="text-center">
          <p className="text-dash-body font-bold text-gray-800 mb-1.5">
            {config.thankYouMessage || "Thank you for your purchase!"}
          </p>
          {config.returnPolicy && (
            <p className="text-dash-caption text-gray-400 leading-relaxed">
              {config.returnPolicy}
            </p>
          )}
        </div>
        {config.showBarcode && (
          <div className="mt-5 flex flex-col items-center gap-1.5">
            <div className="flex gap-px">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-800"
                  style={{
                    width: i % 3 === 0 ? "3px" : "1.5px",
                    height: "30px",
                  }}
                />
              ))}
            </div>
            <p className="text-dash-caption text-gray-400 tracking-widest">
              {receiptNo}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BusinessLogoNote({ logo }: { logo?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 mb-5 bg-orange-50 border border-orange-100 rounded-xl">
      <div className="w-11 h-11 rounded-lg overflow-hidden bg-white border border-orange-100 flex items-center justify-center flex-shrink-0">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt="Business logo"
            className="w-full h-full object-cover"
          />
        ) : (
          <Building2 size={18} className="text-orange-300" />
        )}
      </div>
      <p className="text-dash-secondary text-orange-700 leading-relaxed">
        Your <span className="font-semibold">account profile photo</span> is
        used as the logo on your invoices and receipts. Change it from the{" "}
        <span className="font-semibold">Account</span> tab.
      </p>
    </div>
  );
}

function InvoiceReceiptPanel() {
  const [activeTab, setActiveTab] = useState<InvoiceTab>("invoice");
  const queryClient = useQueryClient();
  const storeUser = useUserStore((s) => s.user);

  // The business logo IS the account profile photo — shared across the app.
  const logo = storeUser?.avatar ?? "";

  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceSettings>({
    business: {
      name: "",
      address: "",
      phone: "",
      email: "",
      taxId: "",
      website: "",
    },
    footerNote:
      "Thank you for your business! Payment is due within the specified period.",
    primaryColor: "#f97316",
    bankName: "",
    accountNumber: "",
    accountName: "",
    dueDays: 7,
  });

  const [receiptConfig, setReceiptConfig] = useState<ReceiptSettings>({
    business: {
      name: "",
      address: "",
      phone: "",
      email: "",
      taxId: "",
      website: "",
    },
    thankYouMessage: "Thank you for your purchase!",
    returnPolicy: "Items can be returned within 7 days with original receipt.",
    primaryColor: "#f97316",
    showBarcode: true,
  });

  // Load saved settings. retry:false + ignored error so the panel still works
  // (with sensible defaults) before the backend endpoint exists.
  const { data: savedSettings } = useQuery({
    queryKey: queryKeys.settings.invoice,
    queryFn: settingsApi.getInvoiceSettings,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Fill any blank business field from the account profile, so a first-time
  // user sees their details pre-populated instead of empty inputs.
  const fillBusiness = (b: InvoiceDocBusiness): InvoiceDocBusiness => ({
    name: b.name || storeUser?.company?.name || storeUser?.businessName || "",
    address: b.address || storeUser?.company?.location || "",
    phone: b.phone || storeUser?.phone || storeUser?.company?.phone || "",
    email: b.email || storeUser?.email || "",
    taxId: b.taxId || "",
    website: b.website || "",
  });

  useEffect(() => {
    if (savedSettings) {
      setInvoiceConfig({
        ...savedSettings.invoice,
        business: fillBusiness(savedSettings.invoice.business),
      });
      setReceiptConfig({
        ...savedSettings.receipt,
        business: fillBusiness(savedSettings.receipt.business),
      });
    } else if (storeUser) {
      setInvoiceConfig((p) => ({ ...p, business: fillBusiness(p.business) }));
      setReceiptConfig((p) => ({ ...p, business: fillBusiness(p.business) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSettings, storeUser]);

  const updateInvoiceBusiness = (
    field: keyof InvoiceDocBusiness,
    value: string,
  ) =>
    setInvoiceConfig((p) => ({
      ...p,
      business: { ...p.business, [field]: value },
    }));

  const updateReceiptBusiness = (
    field: keyof InvoiceDocBusiness,
    value: string,
  ) =>
    setReceiptConfig((p) => ({
      ...p,
      business: { ...p.business, [field]: value },
    }));

  const saveMutation = useMutation({
    mutationFn: settingsApi.saveInvoiceSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.settings.invoice, data);
      toast.success(
        `${activeTab === "invoice" ? "Invoice" : "Receipt"} settings saved`,
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Save only the tab the user is editing (button label matches).
  const handleSave = () => {
    saveMutation.mutate(
      activeTab === "invoice"
        ? { invoice: invoiceConfig }
        : { receipt: receiptConfig },
    );
  };

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="bg-white sm:rounded-2xl border border-gray-200 p-1.5 flex gap-1">
        {[
          { id: "invoice" as InvoiceTab, label: "Invoice", icon: FileText },
          { id: "receipt" as InvoiceTab, label: "Receipt", icon: Receipt },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-dash-body font-semibold transition-all cursor-pointer",
              activeTab === id
                ? "bg-orange-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "invoice" && (
        <div className="space-y-5">
          <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-dash-heading font-bold text-gray-900">
                  Invoice Preview
                </h3>
                <p className="text-dash-secondary text-gray-400 mt-0.5">
                  Updates live as you edit below
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="flex items-center gap-1.5 text-dash-secondary font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer">
                  <Eye size={12} /> Preview
                </button>
                <button className="flex items-center gap-1.5 text-dash-secondary font-medium text-orange-600 hover:text-orange-700 border border-orange-200 bg-orange-50 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer">
                  <Download size={12} /> Export PDF
                </button>
              </div>
            </div>
            <InvoicePreview config={invoiceConfig} logo={logo} />
          </div>

          <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-dash-heading font-bold text-gray-800 mb-5">
              Business Information
            </h3>
            <BusinessLogoNote logo={logo} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Business Name"
                value={invoiceConfig.business.name}
                onChange={(v) => updateInvoiceBusiness("name", v)}
                placeholder="Your Business Name"
                icon={Building2}
              />
              <InputField
                label="Business Email"
                value={invoiceConfig.business.email}
                onChange={(v) => updateInvoiceBusiness("email", v)}
                placeholder="business@email.com"
                icon={Mail}
                type="email"
              />
              <InputField
                label="Phone Number"
                value={invoiceConfig.business.phone}
                onChange={(v) => updateInvoiceBusiness("phone", v)}
                placeholder="+234 800 000 0000"
                icon={Phone}
              />
              <InputField
                label="Tax ID / RC Number"
                value={invoiceConfig.business.taxId}
                onChange={(v) => updateInvoiceBusiness("taxId", v)}
                placeholder="RC-1234567"
                icon={Hash}
              />
              <InputField
                label="Business Address"
                value={invoiceConfig.business.address}
                onChange={(v) => updateInvoiceBusiness("address", v)}
                placeholder="14 Business Street, Lagos, Nigeria"
                icon={MapPin}
                className="sm:col-span-2"
              />
            </div>

            <div className="h-px bg-gray-100 my-5" />
            <h3 className="text-dash-heading font-bold text-gray-800 mb-5">
              Payment & Invoice Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Bank Name"
                value={invoiceConfig.bankName}
                onChange={(v) =>
                  setInvoiceConfig((p) => ({ ...p, bankName: v }))
                }
                placeholder="First Bank Nigeria"
                icon={Building2}
              />
              <InputField
                label="Account Number"
                value={invoiceConfig.accountNumber}
                onChange={(v) =>
                  setInvoiceConfig((p) => ({ ...p, accountNumber: v }))
                }
                placeholder="0123456789"
                icon={Hash}
              />
              <InputField
                label="Account Name"
                value={invoiceConfig.accountName}
                onChange={(v) =>
                  setInvoiceConfig((p) => ({ ...p, accountName: v }))
                }
                placeholder="Business Account Name"
                icon={User}
              />
              <InputField
                label="Payment Due (Days)"
                value={invoiceConfig.dueDays}
                onChange={(v) =>
                  setInvoiceConfig((p) => ({ ...p, dueDays: parseInt(v) || 7 }))
                }
                type="number"
                placeholder="7"
                icon={Calendar}
              />
            </div>

            <div className="h-px bg-gray-100 my-5" />
            <h3 className="text-dash-heading font-bold text-gray-800 mb-4">
              Appearance
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <div>
                <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
                  Brand Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={invoiceConfig.primaryColor}
                    onChange={(e) =>
                      setInvoiceConfig((p) => ({
                        ...p,
                        primaryColor: e.target.value,
                      }))
                    }
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-dash-body text-gray-500 font-mono">
                    {invoiceConfig.primaryColor}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-dash-body font-semibold text-gray-900 block mb-1">
                Footer Note
              </label>
              <textarea
                value={invoiceConfig.footerNote}
                onChange={(e) =>
                  setInvoiceConfig((p) => ({
                    ...p,
                    footerNote: e.target.value,
                  }))
                }
                rows={2}
                placeholder="Thank you for your business!"
                className="w-full text-dash-body text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "receipt" && (
        <div className="space-y-5">
          <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-dash-heading font-bold text-gray-900">
                  Receipt Preview
                </h3>
                <p className="text-dash-secondary text-gray-400 mt-0.5">
                  Updates live as you edit below
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="flex items-center gap-1.5 text-dash-secondary font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer">
                  <Printer size={12} /> Print
                </button>
                <button className="flex items-center gap-1.5 text-dash-secondary font-medium text-orange-600 hover:text-orange-700 border border-orange-200 bg-orange-50 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer">
                  <Download size={12} /> Export PDF
                </button>
              </div>
            </div>
            <ReceiptPreview config={receiptConfig} logo={logo} />
          </div>

          <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-dash-heading font-bold text-gray-800 mb-5">
              Business Information
            </h3>
            <BusinessLogoNote logo={logo} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Business Name"
                value={receiptConfig.business.name}
                onChange={(v) => updateReceiptBusiness("name", v)}
                placeholder="Your Business Name"
                icon={Building2}
              />
              <InputField
                label="Phone Number"
                value={receiptConfig.business.phone}
                onChange={(v) => updateReceiptBusiness("phone", v)}
                placeholder="+234 800 000 0000"
                icon={Phone}
              />
              <InputField
                label="Business Address"
                value={receiptConfig.business.address}
                onChange={(v) => updateReceiptBusiness("address", v)}
                placeholder="14 Business Street, Lagos, Nigeria"
                icon={MapPin}
                className="sm:col-span-2"
              />
            </div>

            <div className="h-px bg-gray-100 my-5" />
            <h3 className="text-dash-heading font-bold text-gray-800 mb-4">
              Receipt Content
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-dash-body font-semibold text-gray-900 block mb-1">
                  Thank You Message
                </label>
                <input
                  type="text"
                  value={receiptConfig.thankYouMessage}
                  onChange={(e) =>
                    setReceiptConfig((p) => ({
                      ...p,
                      thankYouMessage: e.target.value,
                    }))
                  }
                  placeholder="Thank you for your purchase!"
                  className="w-full text-dash-body text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label className="text-dash-body font-semibold text-gray-900 block mb-1">
                  Return Policy
                </label>
                <textarea
                  value={receiptConfig.returnPolicy}
                  onChange={(e) =>
                    setReceiptConfig((p) => ({
                      ...p,
                      returnPolicy: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Items can be returned within 7 days..."
                  className="w-full text-dash-body text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            <div className="h-px bg-gray-100 my-5" />
            <h3 className="text-dash-heading font-bold text-gray-800 mb-4">
              Appearance
            </h3>
            <div className="flex items-center gap-6">
              <div>
                <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
                  Brand Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={receiptConfig.primaryColor}
                    onChange={(e) =>
                      setReceiptConfig((p) => ({
                        ...p,
                        primaryColor: e.target.value,
                      }))
                    }
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-dash-body text-gray-500 font-mono">
                    {receiptConfig.primaryColor}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
                  Show Barcode
                </label>
                <Toggle
                  enabled={receiptConfig.showBarcode}
                  onChange={() =>
                    setReceiptConfig((p) => ({
                      ...p,
                      showBarcode: !p.showBarcode,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomSaveButton
        onClick={handleSave}
        loading={saveMutation.isPending}
        label={`Save ${activeTab === "invoice" ? "Invoice" : "Receipt"} Settings`}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT — Settings Page
// ══════════════════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const { currentStep: onboardingStep, isComplete: onboardingComplete } =
    useOnboardingStore();

  // Force the account tab during step 3 so #whatsapp-profile-section is in
  // the DOM on first paint — OnboardingTour needs it mounted immediately.
  const forceAccountTab = !onboardingComplete && onboardingStep === 3;
  const effectiveTab: SettingsTab = forceAccountTab ? "account" : activeTab;

  const tabs: {
    id: SettingsTab;
    label: string;
    icon: React.ElementType;
    description: string;
  }[] = [
    {
      id: "account",
      label: "Account",
      icon: UserCog,
      description: "Profile & security",
    },
    {
      id: "orders",
      label: "Orders",
      icon: ShoppingCart,
      description: "Delivery settings",
    },
    {
      id: "ai",
      label: "AI Settings",
      icon: Sparkles,
      description: "Hours & escalation",
    },
    {
      id: "invoice",
      label: "Invoice & Receipt",
      icon: FileText,
      description: "Templates & branding",
    },
  ];

  return (
    <div className="space-y-5">
      <p className="text-dash-body text-gray-500 px-5 sm:px-0">
        Manage your profile, order rules, AI behaviour, and document templates
      </p>

      {/* Tab bar */}
      <div className="bg-white sm:rounded-2xl border border-gray-200 p-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1">
        {tabs.map(({ id, label, icon: Icon, description }) => (
          <button
            key={id}
            onClick={() => {
              if (!forceAccountTab) setActiveTab(id);
            }}
            className={cn(
              "flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2.5 py-3 px-3 rounded-xl transition-all cursor-pointer",
              effectiveTab === id
                ? "bg-orange-500 shadow-sm"
                : "hover:bg-gray-50",
              forceAccountTab &&
                id !== "account" &&
                "opacity-50 cursor-not-allowed",
            )}
          >
            <Icon
              size={15}
              className={cn(
                "flex-shrink-0 sm:mt-0.5",
                effectiveTab === id ? "text-white" : "text-gray-400",
              )}
            />
            <div className="text-center sm:text-left">
              <p
                className={cn(
                  "text-dash-secondary font-semibold leading-none",
                  effectiveTab === id ? "text-white" : "text-gray-800",
                )}
              >
                {label}
              </p>
              <p
                className={cn(
                  "text-dash-caption sm:text-dash-secondary mt-0.5 hidden sm:block",
                  effectiveTab === id ? "text-orange-100" : "text-gray-400",
                )}
              >
                {description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {effectiveTab === "account" && <AccountSettingsPanel />}
      {effectiveTab === "orders" && <OrderSettingsPanel />}
      {effectiveTab === "ai" && <AISettingsPanel />}
      {effectiveTab === "invoice" && <InvoiceReceiptPanel />}
    </div>
  );
}
