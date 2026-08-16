"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowLeft, X, ImagePlus, Sparkles } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { buyerApi } from "@/lib/buyer-api-client";
import { ApiError } from "@/lib/api-client";
import {
  uploadProductMedia,
  validateImageFile,
  optimizedImageUrl,
} from "@/lib/cloudinary";
import type { BuyerRequest } from "@/types/buyerRequest";

/* Standalone "compose" screen (2026-08-15) — deliberately lives OUTSIDE the
   /buyer/(dashboard) route group now, at the same URL (/buyer/requests/new)
   the group used to own. Originally reachable from a landing-page CTA
   (RequestShowcase); that CTA and the component itself are gone as of the
   AI-agent pivot (createBuyerRequestTool now handles this invisibly from
   inside /chat — see page.tsx's own comment), so this page is no longer
   linked from marketing surfaces at all. Kept as a direct-URL fallback for
   a buyer who lands here some other way (a bookmark, an old link) — the
   dashboard shell (BuyerHeader/Sidebar/BottomNav) rendering around it made an
   anonymous visitor look like they'd already landed inside somebody's
   account dashboard (Home/Discover/Saved/Profile tabs and all) before
   they'd ever signed up. A logged-in buyer reaches this exact same page via
   the "Post a Request" CTA on Home/Requests — losing the persistent nav for
   one focused compose screen is the normal trade-off (same pattern as any
   "new message"/"new post" screen), not a regression.

   Spec §43-44: the buyer fills this out BEFORE we know if they're
   verified — submitting while unauthenticated must not throw the draft
   away. Stashed here, restored on mount, cleared once restored. */
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
      router.push(`/buyer/requests/${request.id}`);
    },
    onError: (error: unknown, variables) => {
      if (error instanceof ApiError && error.status === 401) {
        const draft: RequestDraft = {
          description: variables.description,
          imageUrl: variables.imageUrl,
        };
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        router.push("/buyer/auth?redirect=/buyer/requests/new&reason=request");
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
  // /chat too; a request can post fine with no coords at all, matching
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
    <div className="min-h-screen bg-[#F1F5F9] relative">
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(249,115,22,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <header className="relative sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <Link href="/" className="cursor-pointer">
            <Image
              src="/velte_logo_esn5dj.png"
              alt="Velte"
              width={72}
              height={35}
              priority
            />
          </Link>
          <div className="w-9" aria-hidden />
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative max-w-xl mx-auto px-4 pt-10 pb-16"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
            <Sparkles size={19} className="text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-[#023337] tracking-tight">
            What are you looking for?
          </h1>
        </div>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Describe what you need in your own words — nearby vendors who actually
          have it will respond. You can also add a photo.
        </p>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-7">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
            className="space-y-5"
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
                    className="bg-[#F8FAFC] border-gray-200 rounded-2xl px-4 py-3.5 text-[15px] min-h-[140px] focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:border-transparent"
                    autoFocus
                  />
                  {field.state.meta.errors[0] && (
                    <p className="text-red-500 text-xs mt-1.5">
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
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 rounded-2xl py-4 text-sm font-medium text-gray-500 hover:text-orange-600 transition-colors cursor-pointer">
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
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-2xl shadow-lg shadow-orange-500/20 transition-colors cursor-pointer"
                >
                  {createMutation.isPending ? "Posting…" : "Post Request"}
                </button>
              )}
            </form.Subscribe>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Free to post. You&apos;ll only need to verify your phone number right
          before it goes out.
        </p>
      </motion.div>
    </div>
  );
}
