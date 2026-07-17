"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store as StoreIcon,
  ExternalLink,
  Copy,
  Loader2,
  ImagePlus,
  X,
  CheckCircle2,
  FileText,
  Tags,
  MessageCircle,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { storeApi } from "@/services/store";
import { settingsApi } from "@/services/settings";
import { useUserStore, EMPTY_SECTORS } from "@/store/userStore";
import { queryKeys } from "@/lib/query-keys";
import { uploadProductMedia, validateImageFile } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import { ShareButton } from "@/components/ShareButton";
import SectorMultiSelect from "@/components/sectors/SectorMultiSelect";
import type { Store } from "@/types/store";

const MAX_DESCRIPTION = 600;
const MAX_GALLERY = 6;

const inputClass =
  "w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-lg text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300";

function SectionCard({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white sm:rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Icon size={15} className="text-orange-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-dash-heading font-bold text-[#023337]">
            {title}
          </h3>
          <p className="text-dash-secondary text-gray-400">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function StorePage() {
  const queryClient = useQueryClient();
  const avatar = useUserStore((state) => state.user?.avatar);
  const sectors = useUserStore((state) => state.user?.sectors ?? EMPTY_SECTORS);

  const { data: store, isLoading } = useQuery({
    queryKey: queryKeys.store.mine,
    queryFn: storeApi.getMyStore,
    staleTime: 30_000,
  });

  const [form, setForm] = useState<Store | null>(null);
  // Sectors are canonical on User.sectors, not Store.sectors (a read-only
  // derived label cache) — tracked as their own draft array, seeded/reset
  // alongside `form` and folded into the same general Save bar below rather
  // than saving on every chip click.
  const [sectorValues, setSectorValues] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed the form once the store arrives (render-phase adjust, no effect).
  const [seeded, setSeeded] = useState(false);
  if (store && !seeded) {
    setSeeded(true);
    setForm(store);
    setSectorValues(sectors);
  }

  const sameSectors = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v) => b.includes(v));

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Sectors first (a different record, User.sectors) so the store-profile
      // save below re-reads the store with its sectors-derived label cache
      // already fresh, instead of racing it.
      if (!sameSectors(sectorValues, sectors)) {
        await settingsApi.updateSectors(sectorValues);
      }
      // sectors is a read-only derived cache on this endpoint — stripped so
      // this save can't trip the backend's rejection of a sectors key here.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sectors: _sectors, ...rest } = form!;
      return storeApi.updateMyStore(rest);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.store.mine, updated);
      setForm(updated);
      toast.success("Store updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !form) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-40 bg-white sm:rounded-2xl border border-gray-100 animate-pulse" />
        <div className="h-72 bg-white sm:rounded-2xl border border-gray-100 animate-pulse" />
      </div>
    );
  }

  const set = <K extends keyof Store>(key: K, value: Store[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const publicPath = `/store/${form.handle}`;
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${publicPath}`
      : publicPath;

  const handleValid = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(
    form.handle,
  );
  const nameValid = form.name.trim().length > 0 && form.name.length <= 80;
  const isValid = handleValid && nameValid;
  const dirty = store
    ? JSON.stringify(form) !== JSON.stringify(store) ||
      !sameSectors(sectorValues, sectors)
    : false;

  // Completeness — description drives AI matching, photos and a chat number
  // drive buyer trust/conversion.
  const checklist = [
    { done: nameValid, label: "a store name" },
    { done: !!form.description.trim(), label: "a description of what you do" },
    { done: sectorValues.length > 0, label: "your sectors" },
    { done: !!form.whatsapp, label: "your WhatsApp number" },
    { done: form.gallery.length > 0, label: "a few photos" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const percent = Math.round((doneCount / checklist.length) * 100);
  const missing = checklist.filter((c) => !c.done).map((c) => c.label);

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_GALLERY - form.gallery.length;
    const picked = Array.from(files).slice(0, room);
    if (!picked.length) {
      toast.error(`Gallery is full (${MAX_GALLERY} photos max)`);
      return;
    }
    for (const file of picked) {
      const error = validateImageFile(file);
      if (error) {
        toast.error(error);
        return;
      }
    }
    setUploading(true);
    try {
      const urls = await Promise.all(picked.map((f) => uploadProductMedia(f)));
      set("gallery", [...form.gallery, ...urls]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("max-w-3xl mx-auto space-y-4", dirty && "pb-16")}>
      {/* ── Store overview ─────────────────────────────────────────────── */}
      <div className="bg-white sm:rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0">
                {avatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatar}
                    alt={form.name.trim() || "Store avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : form.name.trim() ? (
                  form.name.trim().charAt(0).toUpperCase()
                ) : (
                  <StoreIcon size={22} />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-dash-title font-black text-[#023337] truncate">
                  {form.name.trim() || "Your store"}
                </h2>
                <p className="text-dash-secondary text-orange-600 truncate">
                  {publicUrl}
                </p>
                <p className="text-dash-caption text-gray-400 mt-0.5">
                  What buyers see when Velte connects them to you
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  toast.success("Link copied");
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-dash-secondary font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                <Copy size={13} />
                Copy link
              </button>
              <ShareButton
                url={publicUrl}
                title={form.name.trim() || "My store on Velte"}
                text={`Check out ${form.name.trim() || "my store"} on Velte!`}
              />
              <a
                href={publicPath}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 text-dash-secondary font-semibold border border-orange-200 bg-orange-50 rounded-lg text-orange-600 hover:bg-orange-100"
              >
                <ExternalLink size={13} />
                View store
              </a>
            </div>
          </div>
        </div>

        {/* Completeness meter */}
        <div className="px-5 sm:px-6 py-4 bg-gray-50/60 border-t border-gray-100">
          {percent === 100 ? (
            <p className="flex items-center gap-2 text-dash-secondary font-medium text-green-600">
              <CheckCircle2 size={15} />
              Your storefront is complete — buyers see the full picture.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-dash-secondary font-semibold text-[#023337]">
                  Storefront {percent}% complete
                </p>
                <p className="text-dash-caption text-gray-400">
                  {doneCount}/{checklist.length}
                </p>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-dash-caption text-gray-500 mt-1.5">
                Complete stores get matched to buyers more often. Add{" "}
                {missing.join(", ").replace(/, ([^,]*)$/, " and $1")}.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Identity ───────────────────────────────────────────────────── */}
      <SectionCard
        icon={StoreIcon}
        title="Store identity"
        hint="Your name and public link on Velte."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
              Store name
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={80}
              placeholder="e.g. Chidi Phones & Accessories"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
              Handle
            </label>
            <div className="flex items-center h-11 bg-gray-50 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-300 overflow-hidden">
              <span className="pl-3.5 text-dash-body text-gray-400 select-none">
                /store/
              </span>
              <input
                value={form.handle}
                onChange={(e) =>
                  set(
                    "handle",
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  )
                }
                maxLength={30}
                className="flex-1 min-w-0 pr-3.5 h-full bg-transparent text-dash-body text-[#023337] focus:outline-none"
              />
            </div>
            {!handleValid && form.handle !== "" ? (
              <p className="text-dash-caption text-red-500 mt-1">
                2–30 characters; letters, numbers and hyphens only.
              </p>
            ) : (
              <p className="text-dash-caption text-gray-400 mt-1">
                Changing your handle changes your public link.
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── About ──────────────────────────────────────────────────────── */}
      <SectionCard
        icon={FileText}
        title="What do you do?"
        hint="Our AI uses this to match buyers to you — even before you list anything."
      >
        <textarea
          value={form.description}
          onChange={(e) =>
            set("description", e.target.value.slice(0, MAX_DESCRIPTION))
          }
          rows={4}
          placeholder="e.g. We sell original phone accessories — chargers, earphones, screen guards — in Computer Village, Ikeja. We also do same-day phone repairs."
          className={cn(inputClass, "h-auto py-2.5 resize-none")}
        />
        <p className="text-dash-caption text-gray-400 text-right mt-1">
          {form.description.length}/{MAX_DESCRIPTION}
        </p>
      </SectionCard>

      {/* ── Sectors ────────────────────────────────────────────────────── */}
      <SectionCard
        icon={Tags}
        title="Sectors"
        hint="Pick up to 5 that describe your business — the same list as signup, editable here anytime."
      >
        <div className="max-h-80 overflow-y-auto pr-1">
          <SectorMultiSelect
            selected={sectorValues}
            onChange={setSectorValues}
          />
        </div>
      </SectionCard>

      {/* ── Contact ────────────────────────────────────────────────────── */}
      <SectionCard
        icon={MessageCircle}
        title="WhatsApp number"
        hint="Buyers are handed off to this number to chat and close the deal."
      >
        <input
          value={form.whatsapp ?? ""}
          onChange={(e) =>
            set("whatsapp", e.target.value.replace(/[^\d]/g, "") || null)
          }
          inputMode="numeric"
          placeholder="e.g. 2348012345678"
          className={cn(inputClass, "sm:w-72")}
        />
        <p className="text-dash-caption text-gray-400 mt-1">
          International format, without + or spaces.
        </p>
      </SectionCard>

      {/* ── Photos ─────────────────────────────────────────────────────── */}
      <SectionCard
        icon={Camera}
        title="Showcase photos"
        hint={`Up to ${MAX_GALLERY} photos of your shop, work, or products.`}
      >
        <div className="flex flex-wrap gap-3">
          {form.gallery.map((url) => (
            <div key={url} className="relative w-24 h-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Showcase"
                className="w-full h-full object-cover rounded-xl border border-gray-100"
              />
              <button
                onClick={() =>
                  set(
                    "gallery",
                    form.gallery.filter((u) => u !== url),
                  )
                }
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900/80 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-900"
                aria-label="Remove photo"
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {form.gallery.length < MAX_GALLERY && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <ImagePlus size={18} />
                  <span className="text-dash-caption">Add</span>
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
      </SectionCard>

      {/* ── Unsaved-changes bar ────────────────────────────────────────── */}
      {dirty && (
        /* Fixed to the viewport (sticky is unreliable inside the dashboard's
           scroll container); lg:left matches the w-[260px] sidebar, and the
           mobile bottom offset clears the BottomNav. */
        <div className="fixed inset-x-0 lg:left-[260px] bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] md:bottom-6 z-40 px-4 sm:px-6 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl pl-4 pr-2 py-2 shadow-lg">
            <p className="text-dash-secondary text-gray-500 min-w-0 truncate">
              {!isValid
                ? "Fix the highlighted fields to save"
                : uploading
                  ? "Uploading photos…"
                  : "You have unsaved changes"}
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  if (store) setForm(store);
                  setSectorValues(sectors);
                }}
                disabled={saveMutation.isPending || uploading}
                className="px-3.5 py-2 text-dash-secondary font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer disabled:opacity-50"
              >
                Discard
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={!isValid || saveMutation.isPending || uploading}
                className="flex items-center gap-2 px-4 py-2 text-dash-secondary font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saveMutation.isPending && (
                  <Loader2 size={13} className="animate-spin" />
                )}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
