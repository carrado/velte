"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Phone,
  MapPin,
  LogOut,
  ShieldCheck,
  ClipboardList,
  Heart,
  Store,
  UserRound,
  AtSign,
  Pencil,
  Check,
  X,
} from "lucide-react";

import { buyerApi } from "@/lib/buyer-api-client";
import { useBuyerStore } from "@/store/buyerStore";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import { useSavedItems } from "@/hooks/useSavedItems";
import { useBuyerNavigation } from "@/components/buyer/BuyerNavigationProgressContext";
import { InstallRow } from "@/components/InstallRow";
import { BuyerPushToggle } from "@/components/buyer/BuyerPushToggle";
import { getInitial } from "@/lib/initials";
import { BuyerEmptyState } from "@/components/buyer/BuyerEmptyState";
import type { BuyerRequest } from "@/types/buyerRequest";
import type { Buyer } from "@/types/buyer";

/* "My Velte" — spec §39's "Buyer profile should remain minimal" is about
   the account FEATURE set (name/phone/location, no address book, no order
   history, edit-in-place left for a later pass), not the activity this
   page surfaces. Per the buyer-redesign brief's §9 ("replace the generic
   feeling of Profile with a personal commerce workspace... the user isn't
   registering because Velte asked them to, they're registering because
   they don't want to lose all this"), this is now a real hub: identity
   card, then live tiles into Requests/Saved/Following (not static stats),
   then account details + logout. Same component language the vendor
   dashboard uses throughout (WalletHero's decorated identity card,
   SettingsPage's icon-row detail card, LogoutSection). */

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
      <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-orange-500" />
      </div>
      <div className="min-w-0">
        <p className="text-dash-caption text-gray-400">{label}</p>
        <p className="text-dash-body font-medium text-gray-900 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

// Name/username are the two fields registration deliberately deferred
// (see buyer/auth/page.tsx's 2026-08-14 rework — name is skippable, username
// is auto-generated) — this is where a buyer actually comes back to set a
// real value later, per the "let them change it later" model. Phone/location
// stay plain DetailRows: phone is the verified identity itself (not
// editable in place — changing it means re-verifying, out of scope here),
// and location comes from geolocation, not manual entry.
function EditableDetailRow({
  icon: Icon,
  label,
  value,
  placeholder,
  prefix,
  normalize,
  validate,
  onSave,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  placeholder: string;
  prefix?: string;
  normalize?: (v: string) => string;
  validate: (v: string) => string | null;
  onSave: (v: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0 group">
        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
          <Icon size={15} className="text-orange-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-dash-caption text-gray-400">{label}</p>
          <p className="text-dash-body font-medium text-gray-900 truncate">
            {value || `${placeholder} not set`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer"
          aria-label={`Edit ${label.toLowerCase()}`}
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  async function handleSave() {
    const normalized = (normalize ? normalize(draft) : draft).trim();
    const error = validate(normalized);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      await onSave(normalized);
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
      <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-orange-500" />
      </div>
      <div className="min-w-0 flex-1 flex items-center gap-2">
        {prefix && (
          <span className="text-dash-body text-gray-400">{prefix}</span>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder={placeholder}
          autoFocus
          disabled={saving}
          className="min-w-0 flex-1 text-dash-body font-medium text-gray-900 bg-transparent border-b border-orange-300 outline-none disabled:opacity-60"
        />
      </div>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-60"
        aria-label="Save"
      >
        <Check size={15} />
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        disabled={saving}
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60"
        aria-label="Cancel"
      >
        <X size={15} />
      </button>
    </div>
  );
}

// Each tile is a real destination now, not a static stat — tapping one
// takes the buyer straight into that slice of their activity, same
// "activity tile as navigation" idiom the vendor Sidebar's wallet card
// uses for its own "Manage Wallet" tap-through.
function StatChip({
  icon: Icon,
  iconClass,
  label,
  value,
  onClick,
  roundedClass = "rounded-xl",
}: {
  icon: React.ElementType;
  iconClass: string;
  label: string;
  value: number;
  onClick: () => void;
  // The grid this sits in goes edge-to-edge on mobile (see its own -mx-4) —
  // the leftmost/rightmost cards pass a variant that zeroes out just the
  // side actually touching the screen edge there (restored at sm: once
  // the grid is back to its normal inset margin), everyone else just gets
  // a smaller radius than the old rounded-2xl.
  roundedClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white ${roundedClass} border border-gray-100 shadow-sm p-3 flex flex-col text-left hover:border-orange-200 hover:shadow-md transition-all cursor-pointer`}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}
        >
          <Icon size={13} />
        </div>
        <p className="text-base font-bold text-[#023337] tabular-nums text-right">
          {value}
        </p>
      </div>
      <p className="text-dash-caption text-gray-400 mt-auto pt-1 truncate">
        {label}
      </p>
    </button>
  );
}

export default function BuyerProfilePage() {
  const router = useRouter();
  const { navigate } = useBuyerNavigation();
  const clearBuyer = useBuyerStore((s) => s.clearBuyer);
  const { buyer: shown, isLoading } = useBuyerSession();
  const { products: savedProducts, vendors: followedVendors } = useSavedItems();

  // Shares the Requests tab's own query key — real numbers, not invented,
  // and free (served from cache) whenever that tab's already been visited.
  const { data: requestsData } = useQuery({
    queryKey: ["buyer-requests", "my"],
    queryFn: () =>
      buyerApi.get<{ requests: BuyerRequest[] }>("/api/buyer-requests/my"),
    enabled: !!shown,
    retry: false,
  });
  const requests = requestsData?.requests ?? [];

  const setBuyer = useBuyerStore((s) => s.setBuyer);
  const updateProfileMutation = useMutation({
    mutationFn: (patch: { name?: string; username?: string }) =>
      buyerApi.patch<{ buyer: Buyer }>("/api/buyer-auth/me", patch),
    onSuccess: ({ buyer }) => {
      setBuyer(buyer);
      toast.success("Updated.");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => buyerApi.post("/api/buyer-auth/logout"),
    onSuccess: () => {
      clearBuyer();
      router.push("/chat");
    },
    onError: () => {
      toast.error("Couldn't log out. Try again.");
    },
  });

  if (isLoading && !shown) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
        <div className="h-40 rounded-3xl bg-white border border-gray-100 shadow-sm animate-pulse" />
        <div className="h-24 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse" />
      </div>
    );
  }

  if (!shown) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-5">
        <BuyerEmptyState
          icon={UserRound}
          title="You're not verified yet"
          subtitle="Verify your phone number to see your profile."
          action={
            <button
              onClick={() => navigate("/buyer/auth?redirect=/buyer/profile")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Verify your number
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
      <div>
        <h1 className="text-dash-title font-bold text-gray-900 mb-1">
          My Velte
        </h1>
        <p className="text-dash-body text-gray-400">
          Your requests, saved items, and account — all in one place.
        </p>
      </div>

      {/* Identity hero — same layered-glow + dot-texture recipe as the
          vendor dashboard's WalletHero, so this reads as the equivalent
          "top of page" card rather than a plain heading. */}
      <div className="relative overflow-hidden -mx-4 sm:mx-0 rounded-none sm:rounded-3xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 bg-orange-100/70 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-14 w-56 h-56 bg-amber-50 rounded-full blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(2,51,55,0.06) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-sm shadow-orange-200">
            {getInitial(shown.name ?? "") || <UserRound size={26} />}
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-black text-[#023337] truncate">
              {shown.name || "Hi there"} 👋
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-dash-body text-gray-500">
                {shown.phone}
              </span>
              {shown.phoneVerified && (
                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-dash-micro font-semibold px-2 py-0.5 rounded-full">
                  <ShieldCheck size={10} />
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real activity, not filler — each tile is a real destination, and
          Requests/Saved share the exact query keys those tabs use. */}
      <div className="grid grid-cols-3 gap-3 -mx-4 sm:mx-0">
        <StatChip
          icon={ClipboardList}
          iconClass="bg-orange-50 text-orange-500"
          label="Requests"
          value={requests.length}
          onClick={() => navigate("/buyer/requests")}
          roundedClass="rounded-l-none rounded-r-xl sm:rounded-xl"
        />
        <StatChip
          icon={Heart}
          iconClass="bg-pink-50 text-pink-500"
          label="Saved"
          value={savedProducts.length}
          onClick={() => navigate("/buyer/saved")}
        />
        <StatChip
          icon={Store}
          iconClass="bg-teal-50 text-teal-600"
          label="Following"
          value={followedVendors.length}
          onClick={() => navigate("/buyer/saved")}
          roundedClass="rounded-r-none rounded-l-xl sm:rounded-xl"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <h2 className="text-dash-heading font-bold text-gray-900 mb-1">
          Your Details
        </h2>
        <div className="divide-y divide-gray-100">
          <EditableDetailRow
            icon={UserRound}
            label="Name"
            value={shown.name ?? ""}
            placeholder="Your name"
            validate={(v) => (v.length < 2 ? "Enter your name" : null)}
            onSave={(v) => updateProfileMutation.mutateAsync({ name: v })}
          />
          <EditableDetailRow
            icon={AtSign}
            label="Username"
            value={shown.username ?? ""}
            placeholder="username"
            prefix="@"
            normalize={(v) => v.toLowerCase().replace(/^@/, "")}
            validate={(v) =>
              /^[a-z0-9_]{3,20}$/.test(v)
                ? null
                : "3-20 characters — letters, numbers and underscores only"
            }
            onSave={(v) => updateProfileMutation.mutateAsync({ username: v })}
          />
          <DetailRow icon={Phone} label="Phone" value={shown.phone} />
          <DetailRow
            icon={MapPin}
            label="Location"
            value={shown.area || shown.state || "Not set"}
          />
        </div>
      </div>

      {/* Permanent — not the dismissible /chat install popup, not the
          notification bell's own inline opt-in row. Same spot every time,
          whether or not either of those ever showed. Its own card, not
          nested in another one — when installable it IS the tap target,
          benefits and all, so it needs to read as one self-contained
          surface rather than a row squeezed inside a settings list. */}
      <InstallRow />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <h2 className="text-dash-heading font-bold text-gray-900 mb-3">
          Notifications
        </h2>
        <BuyerPushToggle />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-dash-body font-semibold text-gray-900">Log out</p>
          <p className="text-dash-caption text-gray-400 mt-0.5">
            You&apos;ll need to verify your number again next time.
          </p>
        </div>
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 text-dash-body font-medium text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
        >
          <LogOut size={15} />
          {logoutMutation.isPending ? "Logging out…" : "Log Out"}
        </button>
      </div>
    </div>
  );
}
