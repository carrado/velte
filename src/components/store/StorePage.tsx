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
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { storeApi } from "@/services/store";
import { queryKeys } from "@/lib/query-keys";
import { SECTOR_SUGGESTIONS } from "@/lib/sectors";
import { uploadProductMedia, validateImageFile } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import type { Store } from "@/types/store";

const MAX_DESCRIPTION = 600;
const MAX_SECTORS = 5;
const MAX_GALLERY = 6;

export default function StorePage() {
  const queryClient = useQueryClient();

  const { data: store, isLoading } = useQuery({
    queryKey: queryKeys.store.mine,
    queryFn: storeApi.getMyStore,
    staleTime: 30_000,
  });

  const [form, setForm] = useState<Store | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed the form once the store arrives (render-phase adjust, no effect).
  const [seeded, setSeeded] = useState(false);
  if (store && !seeded) {
    setSeeded(true);
    setForm(store);
  }

  const saveMutation = useMutation({
    mutationFn: (payload: Store) => storeApi.updateMyStore(payload),
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
        <div className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        <div className="h-72 bg-white rounded-2xl border border-gray-100 animate-pulse" />
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

  const toggleSector = (sector: string) => {
    const has = form.sectors.includes(sector);
    if (!has && form.sectors.length >= MAX_SECTORS) {
      toast.error(`You can pick at most ${MAX_SECTORS} sectors`);
      return;
    }
    set(
      "sectors",
      has
        ? form.sectors.filter((s) => s !== sector)
        : [...form.sectors, sector],
    );
  };

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
    <div className="max-w-3xl mx-auto space-y-5">
      <p className="text-dash-body text-gray-500 px-5 sm:px-0">
        Your public storefront — what buyers see when Velte connects them to you
      </p>

      {/* Completeness nudge — description drives AI matching, photos and a
          chat number drive buyer trust/conversion. */}
      {(() => {
        const missing = [
          !form.description.trim() && "a description of what you do",
          form.gallery.length === 0 && "a few photos",
          !form.whatsapp && "your WhatsApp number",
        ].filter(Boolean) as string[];
        if (missing.length === 0) return null;
        return (
          <div className="flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 mx-5 sm:mx-0">
            <Sparkles size={15} className="text-orange-500 mt-0.5 shrink-0" />
            <p className="text-dash-secondary text-gray-700">
              Stores with a description and photos get matched to buyers more
              often. Add {missing.join(", ").replace(/, ([^,]*)$/, " and $1")}{" "}
              to complete yours.
            </p>
          </div>
        );
      })()}

      {/* Public link */}
      <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <StoreIcon size={17} className="text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-dash-body font-semibold text-gray-900">
                Your store link
              </p>
              <p className="text-dash-secondary text-orange-600 truncate">
                {publicUrl}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast.success("Link copied");
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-dash-secondary font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              <Copy size={13} />
              Copy
            </button>
            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-dash-secondary font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <ExternalLink size={13} />
              View
            </a>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
              Store name
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={80}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-dash-body focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
              Handle
            </label>
            <div className="flex items-center border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-orange-300 overflow-hidden">
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
                className="flex-1 min-w-0 pr-3.5 py-2.5 text-dash-body focus:outline-none"
              />
            </div>
            {!handleValid && form.handle !== "" && (
              <p className="text-dash-caption text-red-500 mt-1">
                2–30 characters; letters, numbers and hyphens only.
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
            What do you do?
          </label>
          <p className="text-dash-secondary text-gray-500 mb-2">
            Describe your business in plain language — this is what our AI uses
            to match buyers to you, even before you list anything.
          </p>
          <textarea
            value={form.description}
            onChange={(e) =>
              set("description", e.target.value.slice(0, MAX_DESCRIPTION))
            }
            rows={4}
            placeholder="e.g. We sell original phone accessories — chargers, earphones, screen guards — in Computer Village, Ikeja. We also do same-day phone repairs."
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-dash-body focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent resize-none"
          />
          <p className="text-dash-caption text-gray-400 text-right">
            {form.description.length}/{MAX_DESCRIPTION}
          </p>
        </div>

        <div>
          <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
            Sectors
          </label>
          <p className="text-dash-secondary text-gray-500 mb-2">
            Pick up to {MAX_SECTORS} that describe your business.
          </p>
          <div className="flex flex-wrap gap-2">
            {SECTOR_SUGGESTIONS.map((sector) => {
              const selected = form.sectors.includes(sector);
              return (
                <button
                  key={sector}
                  type="button"
                  onClick={() => toggleSector(sector)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-dash-secondary font-medium rounded-full border transition-colors cursor-pointer",
                    selected
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600",
                  )}
                >
                  {selected && <Check size={12} />}
                  {sector}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
            WhatsApp number
          </label>
          <p className="text-dash-secondary text-gray-500 mb-2">
            Buyers are handed off to this number. Use international format, e.g.
            2348012345678.
          </p>
          <input
            value={form.whatsapp ?? ""}
            onChange={(e) =>
              set("whatsapp", e.target.value.replace(/[^\d]/g, "") || null)
            }
            inputMode="numeric"
            placeholder="234…"
            className="w-full sm:w-64 px-3.5 py-2.5 border border-gray-200 rounded-xl text-dash-body focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
          />
        </div>

        <div>
          <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
            Showcase photos
          </label>
          <p className="text-dash-secondary text-gray-500 mb-2">
            Up to {MAX_GALLERY} photos of your shop, work, or products.
          </p>
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
        </div>

        <button
          onClick={() => saveMutation.mutate(form)}
          disabled={!isValid || saveMutation.isPending || uploading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-dash-body font-medium bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {saveMutation.isPending && (
            <Loader2 size={14} className="animate-spin" />
          )}
          Save Store
        </button>
      </div>
    </div>
  );
}
