"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { X, ImagePlus, Sparkles } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { buyerApi } from "@/lib/buyer-api-client";
import { ApiError } from "@/lib/api-client";
import { useBuyerNavigation } from "@/components/buyer/BuyerNavigationProgressContext";
import {
  uploadProductMedia,
  validateImageFile,
  optimizedImageUrl,
} from "@/lib/cloudinary";
import type { BuyerRequest } from "@/types/buyerRequest";

// Spec §43-44: the buyer fills this out BEFORE we know if they're
// verified — submitting while unauthenticated must not throw the draft
// away. Stashed here, restored on mount, cleared once restored.
const DRAFT_KEY = "velte-pending-request-draft";

interface RequestDraft {
  description: string;
  imageUrl: string | null;
}

const descriptionSchema = z
  .string()
  .trim()
  .min(5, "Tell us a bit more about what you need")
  .max(1000, "Keep it under 1000 characters");

// Read once, synchronously, before any state exists to set — this is what
// lets both the form's defaultValues AND imageUrl's initial state pick up a
// restored draft (spec §43-44) via lazy useState initializers instead of a
// setState call inside an effect body (which cascading-render lint rightly
// flags: it would render once empty, then again with the restored draft).
function readDraft(): RequestDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RequestDraft;
  } catch {
    return null;
  }
}

export default function PostRequestPage() {
  const router = useRouter();
  const { navigate } = useBuyerNavigation();
  const [draft] = useState(readDraft);
  const [imageUrl, setImageUrl] = useState<string | null>(
    draft?.imageUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const createMutation = useMutation({
    mutationFn: (payload: { description: string; imageUrl: string | null }) =>
      buyerApi.post<{ request: BuyerRequest }>("/api/buyer-requests", {
        description: payload.description,
        imageUrl: payload.imageUrl,
        ...(coords && { location: coords }),
      }),
    onSuccess: ({ request }) => {
      toast.success("Request received 🎉");
      navigate(`/buyer/requests/${request.id}`);
    },
    onError: (error: unknown, variables) => {
      if (error instanceof ApiError && error.status === 401) {
        const draft: RequestDraft = {
          description: variables.description,
          imageUrl: variables.imageUrl,
        };
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        router.push("/buyer/auth?redirect=/buyer/requests/new");
        return;
      }
      const message =
        error instanceof Error ? error.message : "Couldn't post your request.";
      toast.error(message);
    },
  });

  const form = useForm({
    defaultValues: { description: draft?.description ?? "" },
    onSubmit: ({ value }) => {
      const parsed = descriptionSchema.safeParse(value.description);
      if (!parsed.success) return;
      createMutation.mutate({ description: parsed.data, imageUrl });
    },
  });

  // Clear the stash once restored, so it isn't replayed on a later visit —
  // a plain side effect (not a setState call), safe in an effect body.
  useEffect(() => {
    if (draft) sessionStorage.removeItem(DRAFT_KEY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A restored draft means we're landing back here right after
  // /buyer/auth verified the buyer (see onError above) — the whole point
  // of stashing it was to finish the post the buyer already asked for, not
  // to make them fill the form in and hit submit a second time. Auto-fires
  // once; the ref guards against React StrictMode's double-invoke in dev
  // firing it twice.
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (!draft || autoSubmittedRef.current) return;
    const parsed = descriptionSchema.safeParse(draft.description);
    if (!parsed.success) return;
    autoSubmittedRef.current = true;
    createMutation.mutate({
      description: parsed.data,
      imageUrl: draft.imageUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Best-effort, silent — no permission modal (see buyerRequests.controller.js's
  // comment on this: geolocation capture was deliberately stepped back on
  // /velux too; a request can post fine with no coords at all, matching
  // resolveSearchLocation's own nationwide fallback).
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        /* denied/unavailable — fine, request still posts without it */
      },
      { timeout: 5000 },
    );
  }, []);

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadProductMedia(file, "velte/buyer-requests");
      setImageUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-5 pb-6">
      <div className="flex items-center gap-3 mb-1.5">
        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
          <Sparkles size={17} className="text-orange-500" />
        </div>
        <h1 className="text-dash-title font-bold text-gray-900">
          What are you looking for?
        </h1>
      </div>
      <p className="text-dash-body text-gray-400 mb-6">
        Describe what you need in your own words. You can also add a photo.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field
          name="description"
          validators={{
            onChange: ({ value }) => {
              const r = descriptionSchema.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <div>
              <Textarea
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Describe what you need... e.g. 'I need a black senator outfit, size L, around ₦50,000.'"
                rows={5}
                className="bg-white border-gray-200 rounded-2xl px-4 py-3.5 text-dash-body min-h-[130px] shadow-sm focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:border-transparent"
                autoFocus
              />
              {field.state.meta.errors[0] && (
                <p className="text-red-500 text-dash-caption mt-1.5">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        {imageUrl ? (
          <div className="relative w-28 h-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={optimizedImageUrl(imageUrl)}
              alt="Attached"
              className="w-28 h-28 object-cover rounded-2xl border border-gray-100"
            />
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="absolute -top-2 -right-2 bg-gray-900/80 text-white rounded-full p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 rounded-2xl py-4 text-dash-body font-medium text-gray-500 hover:text-orange-600 transition-colors cursor-pointer">
            <ImagePlus size={16} />
            {uploading ? "Uploading…" : "Add a photo (optional)"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoSelect}
              disabled={uploading}
            />
          </label>
        )}

        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              disabled={
                !canSubmit ||
                isSubmitting ||
                createMutation.isPending ||
                uploading
              }
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-dash-body font-semibold rounded-2xl shadow-sm shadow-orange-200 transition-colors cursor-pointer"
            >
              {createMutation.isPending ? "Posting…" : "Post Request"}
            </button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
