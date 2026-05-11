"use client";

import { useState } from "react";
import {
  Clock,
  Zap,
  FileText,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Info,
  Moon,
  Sun,
  Building2,
  Phone,
  Mail,
  MapPin,
  Hash,
  Calendar,
  User,
  Package,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { BillingSettingsPanel } from "./BillingSettings";

// ── Types ─────────────────────────────────────────────────────────────────────

type SettingsTab = "account" | "orders" | "ai" | "invoice" | "billing";
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

interface ShopHoursConfig {
  is24Hours: boolean;
  offlineMessage: string;
  openTime: string;
  closeTime: string;
}

interface EscalationConfig {
  enabled: boolean;
  threshold: number;
}

interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
  taxId: string;
  website: string;
}

interface InvoiceConfig {
  business: BusinessInfo;
  footerNote: string;
  primaryColor: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  dueDays: number;
}

interface ReceiptConfig {
  business: BusinessInfo;
  thankYouMessage: string;
  returnPolicy: string;
  primaryColor: string;
  showBarcode: boolean;
}

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
      <label className="text-sm font-semibold text-gray-900 block mb-1.5">
        {label}
      </label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
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
            "w-full text-sm text-gray-700 border border-gray-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow",
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
          <h3 className="text-[13px]  font-bold text-gray-900">{title}</h3>
          {description && (
            <p className="text-xs  text-gray-400 mt-0.5">{description}</p>
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
        className="flex items-center gap-2 py-2.5 px-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
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
        className="flex items-center gap-2 py-2.5 px-6 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
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
  const [profile, setProfile] = useState<UserProfile>({
    fullName: "",
    email: "",
    phone: "",
    businessName: "",
  });

  const [passwords, setPasswords] = useState<PasswordConfig>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notifications, setNotifications] = useState<NotificationConfig>({
    emailOrders: true,
    emailInvoices: true,
    emailMarketing: false,
    smsOrders: false,
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingNotifs, setIsSavingNotifs] = useState(false);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsSavingProfile(false);
    toast.success("Profile updated");
  };

  const handleSavePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setIsSavingPassword(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsSavingPassword(false);
    setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    toast.success("Password changed successfully");
  };

  const handleSaveNotifs = async () => {
    setIsSavingNotifs(true);
    await new Promise((r) => setTimeout(r, 700));
    setIsSavingNotifs(false);
    toast.success("Notification preferences saved");
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
      label: "SMS order alerts",
      description: "Receive a text message for new orders",
    },
  ];

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
        icon={UserCog}
        title="Profile Information"
        description="Your personal and business details"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center">
              <User size={26} className="text-orange-400" />
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-colors">
              <Camera size={11} className="text-white" />
            </button>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Profile Photo</p>
            <p className="text-xs text-gray-400 mt-0.5">JPG or PNG, max 2MB</p>
            <button className="text-xs text-orange-500 font-semibold mt-1 cursor-pointer hover:text-orange-600 transition-colors">
              Upload photo
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
          loading={isSavingProfile}
          label="Save Profile"
        />
      </SectionCard>

      {/* Password */}
      <SectionCard
        icon={Lock}
        title="Change Password"
        description="Update your account password"
      >
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
              onChange={(v) => setPasswords((p) => ({ ...p, newPassword: v }))}
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
                  "text-xs font-medium",
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
        </div>

        <InlineSaveButton
          onClick={handleSavePassword}
          loading={isSavingPassword}
          label="Update Password"
        />
      </SectionCard>

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
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
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
          loading={isSavingNotifs}
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
  const [settings, setSettings] = useState<OrderSettings>({
    minDeliveryDays: 1,
    maxDeliveryDays: 5,
    deliveryNote: "",
    allowSameDay: false,
  });
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
      // Prevent min from exceeding max and vice versa
      if (field === "minDeliveryDays") {
        return { ...p, minDeliveryDays: Math.min(next, p.maxDeliveryDays - 1) };
      }
      return { ...p, maxDeliveryDays: Math.max(next, p.minDeliveryDays + 1) };
    });
  };

  return (
    <div className="space-y-5">
      <SectionCard
        icon={Truck}
        title="Delivery Time Settings"
        description="Set the expected delivery window communicated to customers"
      >
        {/* Visual range display */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4 mb-6">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-3">
            Delivery Window Preview
          </p>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-white border-2 border-orange-300 flex items-center justify-center shadow-sm">
                <span className="text-2xl font-black text-orange-500">
                  {settings.allowSameDay && settings.minDeliveryDays === 0
                    ? 0
                    : settings.minDeliveryDays}
                </span>
              </div>
              <p className="text-[10px] text-orange-500 font-bold mt-1.5 uppercase tracking-wide">
                Min
              </p>
            </div>

            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative h-2 bg-orange-100 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full bg-orange-400 rounded-full w-full" />
              </div>
              <p className="text-[10px] text-orange-400 font-medium">to</p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm">
                <span className="text-2xl font-black text-white">
                  {settings.maxDeliveryDays}
                </span>
              </div>
              <p className="text-[10px] text-orange-500 font-bold mt-1.5 uppercase tracking-wide">
                Max
              </p>
            </div>
          </div>

          <p className="text-xs text-orange-700 text-center mt-3 font-medium">
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
            <p className="text-sm font-semibold text-gray-900">
              Allow Same-Day Delivery
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
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
            <label className="text-sm font-semibold text-gray-900 block mb-1">
              Minimum Delivery Days
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Earliest a customer can expect their order
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => nudge("minDeliveryDays", -1)}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer text-xl font-bold flex-shrink-0"
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
                className="flex-1 text-center text-sm font-black text-gray-800 border border-gray-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
              />
              <button
                onClick={() => nudge("minDeliveryDays", 1)}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer text-xl font-bold flex-shrink-0"
              >
                +
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 text-center">
              {settings.minDeliveryDays === 0
                ? "Same day"
                : `${settings.minDeliveryDays} day${settings.minDeliveryDays !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Max */}
          <div>
            <label className="text-sm font-semibold text-gray-900 block mb-1">
              Maximum Delivery Days
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Latest a customer should receive their order
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => nudge("maxDeliveryDays", -1)}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer text-xl font-bold flex-shrink-0"
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
                className="flex-1 text-center text-sm font-black text-gray-800 border border-gray-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
              />
              <button
                onClick={() => nudge("maxDeliveryDays", 1)}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer text-xl font-bold flex-shrink-0"
              >
                +
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 text-center">
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
            <p className="text-xs text-red-600 font-medium">
              Maximum delivery days must be greater than minimum delivery days.
            </p>
          </div>
        )}

        {/* Delivery note */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-900 block mb-1">
            Delivery Note{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Additional context shown to customers, e.g. exclusions for weekends
            or holidays.
          </p>
          <textarea
            value={settings.deliveryNote}
            onChange={(e) =>
              setSettings((p) => ({ ...p, deliveryNote: e.target.value }))
            }
            rows={2}
            placeholder="e.g. Delivery days exclude Sundays and public holidays."
            className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
          />
        </div>

        {/* Info */}
        <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            These estimates are communicated by the AI when customers ask about
            shipping times. They don't automatically trigger any logistics
            workflow.
          </p>
        </div>
      </SectionCard>

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

function AISettingsPanel() {
  const [shopHours, setShopHours] = useState<ShopHoursConfig>({
    is24Hours: true,
    offlineMessage:
      "We're currently closed. Our team will respond to your message during business hours. Thank you for your patience!",
    openTime: "08:00",
    closeTime: "20:00",
  });

  const [escalation, setEscalation] = useState<EscalationConfig>({
    enabled: false,
    threshold: 5,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSaving(false);
    toast.success("AI settings saved");
  };

  return (
    <div className="space-y-5">
      {/* Shop Hours */}
      <SectionCard
        icon={Clock}
        title="Shop Operating Hours"
        description="Control when your AI assistant is active"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                  shopHours.is24Hours ? "bg-orange-100" : "bg-gray-100",
                )}
              >
                {shopHours.is24Hours ? (
                  <Sun size={13} className="text-orange-500" />
                ) : (
                  <Moon size={13} className="text-gray-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  24/7 Availability
                </p>
                <p className="text-xs  text-gray-500">
                  AI responds at any time of day
                </p>
              </div>
            </div>
            <Toggle
              enabled={shopHours.is24Hours}
              onChange={() =>
                setShopHours((p) => ({ ...p, is24Hours: !p.is24Hours }))
              }
            />
          </div>

          {!shopHours.is24Hours && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Opening Time
                  </label>
                  <div className="relative">
                    <Sun
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="time"
                      value={shopHours.openTime}
                      onChange={(e) =>
                        setShopHours((p) => ({
                          ...p,
                          openTime: e.target.value,
                        }))
                      }
                      className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Closing Time
                  </label>
                  <div className="relative">
                    <Moon
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="time"
                      value={shopHours.closeTime}
                      onChange={(e) =>
                        setShopHours((p) => ({
                          ...p,
                          closeTime: e.target.value,
                        }))
                      }
                      className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-1">
                  Offline Message
                </label>
                <p className="text-xs  text-gray-500 mb-2">
                  Sent to customers who message outside your operating hours
                </p>
                <textarea
                  value={shopHours.offlineMessage}
                  onChange={(e) =>
                    setShopHours((p) => ({
                      ...p,
                      offlineMessage: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="e.g. We're closed right now. We'll get back to you during business hours..."
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {shopHours.offlineMessage.length}/300
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <Info
                  size={13}
                  className="text-gray-400 flex-shrink-0 mt-0.5"
                />
                <p className="text-xs  text-gray-500 leading-relaxed">
                  Your AI will be active from{" "}
                  <span className="font-semibold text-gray-700">
                    {shopHours.openTime}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-gray-700">
                    {shopHours.closeTime}
                  </span>{" "}
                  daily. Outside these hours the offline message above will be
                  sent.
                </p>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Escalation */}
      <SectionCard
        icon={Zap}
        title="Basic Escalation Trigger"
        description="Get notified when order quantities exceed your threshold"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Enable Escalation Trigger
              </p>
              <p className="text-xs  text-gray-500">
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
                <label className="text-sm font-semibold text-gray-900 block mb-1">
                  Order Quantity Threshold
                </label>
                <p className="text-xs  text-gray-500 mb-2">
                  When a customer orders this many items or more, an invoice is
                  generated instead of automated fulfillment
                </p>
                <div className="relative max-w-[160px]">
                  <Package
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="number"
                    min={1}
                    value={escalation.threshold}
                    onChange={(e) =>
                      setEscalation((p) => ({
                        ...p,
                        threshold: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl pl-8 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle
                  size={14}
                  className="text-amber-500 flex-shrink-0 mt-0.5"
                />
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-amber-800">
                    Important — Payment Notice
                  </p>
                  <p className="text-xs  text-amber-700 leading-relaxed">
                    The AI does <span className="font-bold">not</span> receive
                    payment on your behalf when a customer orders{" "}
                    <span className="font-bold">
                      {escalation.threshold}+ items
                    </span>
                    , an invoice is automatically generated and sent to{" "}
                    <span className="font-bold">your email</span> with the
                    customer's full details (name, contact, and order
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
                <p className="text-xs  text-blue-700 leading-relaxed">
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
        loading={isSaving}
        label="Save AI Settings"
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL 4 — Invoice & Receipt
// ══════════════════════════════════════════════════════════════════════════════

function InvoicePreview({ config }: { config: InvoiceConfig }) {
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
      <div
        className="h-2"
        style={{ backgroundColor: config.primaryColor || "#f97316" }}
      />
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div
              className="sm:text-2xl text-lg font-black tracking-tight"
              style={{ color: config.primaryColor || "#f97316" }}
            >
              INVOICE
            </div>
            <p className="text-xs text-gray-400 mt-0.5">#INV-001/2</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">
              {config.business.name || "Your Business Name"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
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
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Issue Date
            </p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">
              {fmt(today)}
            </p>
          </div>
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: `${config.primaryColor || "#f97316"}18` }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: config.primaryColor || "#f97316" }}
            >
              Due Date
            </p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">
              {fmt(due)}
            </p>
          </div>
        </div>

        <div className="mb-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
            Billed To
          </p>
          <p className="text-sm font-semibold text-gray-900">Customer Name</p>
          <p className="text-xs text-gray-500">
            customer@email.com · +234 800 000 0000
          </p>
        </div>

        <div className="mb-5">
          <div
            className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wide px-3 py-2 rounded-lg mb-1"
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
              className="grid grid-cols-12 text-xs px-3 py-2.5 border-b border-gray-100"
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
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span>₦38,500</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Tax (7.5%)</span>
              <span>₦2,888</span>
            </div>
            <div
              className="flex justify-between text-sm font-bold pt-2 border-t border-gray-200"
              style={{ color: config.primaryColor || "#f97316" }}
            >
              <span>Total</span>
              <span>₦41,388</span>
            </div>
          </div>
        </div>

        {(config.bankName || config.accountNumber) && (
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
              Payment Details
            </p>
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Bank:</span>{" "}
              {config.bankName || "Bank Name"}
            </p>
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Account:</span>{" "}
              {config.accountNumber || "0000000000"}
            </p>
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Name:</span>{" "}
              {config.accountName || "Account Name"}
            </p>
          </div>
        )}

        {config.footerNote && (
          <p className="text-[11px] text-gray-400 text-center border-t border-gray-100 pt-3">
            {config.footerNote}
          </p>
        )}
      </div>
      <div
        className="h-1.5 opacity-30"
        style={{ backgroundColor: config.primaryColor || "#f97316" }}
      />
    </div>
  );
}

function ReceiptPreview({ config }: { config: ReceiptConfig }) {
  const today = new Date();
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm max-w-sm mx-auto">
      <div
        className="h-2"
        style={{ backgroundColor: config.primaryColor || "#f97316" }}
      />
      <div className="p-5">
        <div className="text-center mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
            style={{ backgroundColor: `${config.primaryColor || "#f97316"}18` }}
          >
            <Building2
              size={18}
              style={{ color: config.primaryColor || "#f97316" }}
            />
          </div>
          <p className="text-sm font-black text-gray-900">
            {config.business.name || "Your Business Name"}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {config.business.address || "Business Address"}
          </p>
          <p className="text-[11px] text-gray-400">
            {config.business.phone || "+234 800 000 0000"}
          </p>
        </div>
        <div className="border-t border-dashed border-gray-200 mb-4" />
        <div className="flex justify-between text-[11px] text-gray-500 mb-4">
          <span>Receipt #RCP-001</span>
          <span>{fmt(today)}</span>
        </div>
        <div className="space-y-2 mb-4">
          {[
            { name: "Product A", qty: 2, price: 15000 },
            { name: "Product B", qty: 1, price: 8500 },
          ].map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-gray-700">
                {item.qty}x {item.name}
              </span>
              <span className="font-semibold text-gray-900">
                ₦{(item.qty * item.price).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-gray-200 mb-3" />
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Subtotal</span>
          <span>₦38,500</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Tax (7.5%)</span>
          <span>₦2,888</span>
        </div>
        <div
          className="flex justify-between text-sm font-black"
          style={{ color: config.primaryColor || "#f97316" }}
        >
          <span>TOTAL</span>
          <span>₦41,388</span>
        </div>
        <div className="border-t border-dashed border-gray-200 mt-3 mb-4" />
        <div className="text-center">
          <p className="text-xs font-bold text-gray-800 mb-1">
            {config.thankYouMessage || "Thank you for your purchase!"}
          </p>
          {config.returnPolicy && (
            <p className="text-[10px] text-gray-400 leading-relaxed">
              {config.returnPolicy}
            </p>
          )}
        </div>
        {config.showBarcode && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <div className="flex gap-px">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-800"
                  style={{
                    width: i % 3 === 0 ? "3px" : "1.5px",
                    height: "24px",
                  }}
                />
              ))}
            </div>
            <p className="text-[9px] text-gray-400 tracking-widest">
              RCP-2024-001
            </p>
          </div>
        )}
      </div>
      <div
        className="h-1.5 opacity-30"
        style={{ backgroundColor: config.primaryColor || "#f97316" }}
      />
    </div>
  );
}

function InvoiceReceiptPanel() {
  const [activeTab, setActiveTab] = useState<InvoiceTab>("invoice");
  const [isSaving, setIsSaving] = useState(false);

  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig>({
    business: {
      name: "",
      address: "",
      phone: "",
      email: "",
      logo: "",
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

  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>({
    business: {
      name: "",
      address: "",
      phone: "",
      email: "",
      logo: "",
      taxId: "",
      website: "",
    },
    thankYouMessage: "Thank you for your purchase!",
    returnPolicy: "Items can be returned within 7 days with original receipt.",
    primaryColor: "#f97316",
    showBarcode: true,
  });

  const updateInvoiceBusiness = (field: keyof BusinessInfo, value: string) =>
    setInvoiceConfig((p) => ({
      ...p,
      business: { ...p.business, [field]: value },
    }));

  const updateReceiptBusiness = (field: keyof BusinessInfo, value: string) =>
    setReceiptConfig((p) => ({
      ...p,
      business: { ...p.business, [field]: value },
    }));

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSaving(false);
    toast.success(
      `${activeTab === "invoice" ? "Invoice" : "Receipt"} settings saved`,
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
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer",
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
                <h3 className="text-[13px]  font-bold text-gray-900">
                  Invoice Preview
                </h3>
                <p className="text-xs  text-gray-400 mt-0.5">
                  Updates live as you edit below
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="flex items-center gap-1.5 text-xs  font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer">
                  <Eye size={12} /> Preview
                </button>
                <button className="flex items-center gap-1.5 text-xs  font-medium text-orange-600 hover:text-orange-700 border border-orange-200 bg-orange-50 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer">
                  <Download size={12} /> Export PDF
                </button>
              </div>
            </div>
            <InvoicePreview config={invoiceConfig} />
          </div>

          <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-[13px]  font-bold text-gray-800 mb-5">
              Business Information
            </h3>
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
            <h3 className="text-[13px]  font-bold text-gray-800 mb-5">
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
            <h3 className="text-[13px]  font-bold text-gray-800 mb-4">
              Appearance
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-1.5">
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
                  <span className="text-sm text-gray-500 font-mono">
                    {invoiceConfig.primaryColor}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-1">
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
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
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
                <h3 className="text-[13px]  font-bold text-gray-900">
                  Receipt Preview
                </h3>
                <p className="text-xs  text-gray-400 mt-0.5">
                  Updates live as you edit below
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="flex items-center gap-1.5 text-xs  font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer">
                  <Printer size={12} /> Print
                </button>
                <button className="flex items-center gap-1.5 text-xs  font-medium text-orange-600 hover:text-orange-700 border border-orange-200 bg-orange-50 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer">
                  <Download size={12} /> Export PDF
                </button>
              </div>
            </div>
            <ReceiptPreview config={receiptConfig} />
          </div>

          <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-[13px]  font-bold text-gray-800 mb-5">
              Business Information
            </h3>
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
            <h3 className="text-[13px]  font-bold text-gray-800 mb-4">
              Receipt Content
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-1">
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
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-1">
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
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            <div className="h-px bg-gray-100 my-5" />
            <h3 className="text-[13px]  font-bold text-gray-800 mb-4">
              Appearance
            </h3>
            <div className="flex items-center gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-1.5">
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
                  <span className="text-sm text-gray-500 font-mono">
                    {receiptConfig.primaryColor}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-1.5">
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
        loading={isSaving}
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
    {
      id: "billing",
      label: "Billing",
      icon: CreditCard,
      description: "Plan & payments",
    },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 px-5 sm:px-0">
        Manage your profile, order rules, AI behaviour, and document templates
      </p>

      {/* Tab bar */}
      <div className="bg-white sm:rounded-2xl border border-gray-200 p-1.5 grid grid-cols-2 sm:grid-cols-5 gap-1">
        {tabs.map(({ id, label, icon: Icon, description }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2.5 py-3 px-3 rounded-xl transition-all cursor-pointer",
              activeTab === id ? "bg-orange-500 shadow-sm" : "hover:bg-gray-50",
            )}
          >
            <Icon
              size={15}
              className={cn(
                "flex-shrink-0 sm:mt-0.5",
                activeTab === id ? "text-white" : "text-gray-400",
              )}
            />
            <div className="text-center sm:text-left">
              <p
                className={cn(
                  "text-xs  font-semibold leading-none",
                  activeTab === id ? "text-white" : "text-gray-800",
                )}
              >
                {label}
              </p>
              <p
                className={cn(
                  "text-[10px] sm:text-xs mt-0.5 hidden sm:block",
                  activeTab === id ? "text-orange-100" : "text-gray-400",
                )}
              >
                {description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {activeTab === "account" && <AccountSettingsPanel />}
      {activeTab === "orders" && <OrderSettingsPanel />}
      {activeTab === "ai" && <AISettingsPanel />}
      {activeTab === "invoice" && <InvoiceReceiptPanel />}
      {activeTab === "billing" && <BillingSettingsPanel />}
    </div>
  );
}
