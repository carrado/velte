"use client";

import { useEffect, useState } from "react";
import {
  X,
  Camera,
  MapPin,
  CheckCircle,
  Building,
  Storefront,
  ShieldCheck,
  UploadSimple,
  Trash,
  Coin,
  CircleNotch,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

export interface StoreVisitCheckModalProps {
  vendorId: string;
  vendorName: string;
  vendorAvatar?: string | null;
  vendorArea?: string | null;
  onClose: () => void;
  onSuccess: (rewardNaira?: number) => void;
}

export function StoreVisitCheckModal({
  vendorId,
  vendorName,
  vendorAvatar,
  vendorArea,
  onClose,
  onSuccess,
}: StoreVisitCheckModalProps) {
  // Metric 1: GPS State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);

  // Metric 2: Photo Proofs (Storefront + Stock)
  const [storefrontPhoto, setStorefrontPhoto] = useState<string | null>(null);
  const [stockPhoto, setStockPhoto] = useState<string | null>(null);
  const [uploadingStorefront, setUploadingStorefront] = useState(false);
  const [uploadingStock, setUploadingStock] = useState(false);

  // Metric 3: Operational Assessment
  const [storeStatus, setStoreStatus] = useState<
    "open_trading" | "closed_temporarily" | "relocated" | "not_found"
  >("open_trading");
  const [stockLevel, setStockLevel] = useState<
    "well_stocked" | "low_stock" | "no_stock"
  >("well_stocked");

  // Metric 4: Merchant Contact Person Met On-site
  const [contactPerson, setContactPerson] = useState("");

  // Metric 5: Auditor Observation Notes
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Lock background window body scroll so there is only one unified scrollbar
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Handler: Acquire Device GPS Location
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGpsLoading(false);
        toast.success("GPS location locked successfully!");
      },
      (err) => {
        setGpsLoading(false);
        toast.error(`Could not access GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // Handler: Upload Photo to Cloudinary
  const handleUploadPhoto = async (
    file: File,
    type: "storefront" | "stock",
  ) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Photo is too large (maximum 15MB).");
      return;
    }

    if (type === "storefront") setUploadingStorefront(true);
    else setUploadingStock(true);

    try {
      const url = await uploadToCloudinary(
        file,
        "velte/validations",
        "default",
        1200,
        0.85,
      );
      if (type === "storefront") setStorefrontPhoto(url);
      else setStockPhoto(url);
      toast.success(
        type === "storefront"
          ? "Storefront photo uploaded!"
          : "Stock photo uploaded!",
      );
    } catch {
      toast.error("Failed to upload photo. Please try again.");
    } finally {
      if (type === "storefront") setUploadingStorefront(false);
      else setUploadingStock(false);
    }
  };

  // Handler: Final Submission
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storefrontPhoto && !stockPhoto && !gpsCoords && !notes.trim()) {
      toast.error(
        "Please provide at least one proof of visit (GPS tag, photo, or detailed auditor notes).",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/trust/validations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          photos: [storefrontPhoto, stockPhoto].filter(Boolean),
          geo: gpsCoords
            ? { coordinates: [gpsCoords.longitude, gpsCoords.latitude] }
            : undefined,
          accuracyMeters: gpsCoords?.accuracy,
          storeStatus,
          stockLevel,
          merchantContactPerson: contactPerson.trim() || undefined,
          visited: storeStatus !== "not_found",
          stockSeen: stockLevel !== "no_stock",
          addressMatched: storeStatus === "open_trading",
          note: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit validation proof.");
      }

      toast.success(
        data.data?.message ||
          "Storefront verification proof submitted! ₦500 PoW reward recorded.",
      );
      onSuccess(data.data?.rewardNaira ?? 500);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Submission error occurred";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-3 sm:p-5">
        <div
          className="relative w-full max-w-lg rounded-2xl bg-surface border border-gray-100 dark:border-white/10 shadow-2xl p-5 sm:p-6 text-ink animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#ff5500]">
                  <ShieldCheck size={20} weight="duotone" />
                </span>
                <h3 className="font-bold text-base sm:text-lg text-ink">
                  Vendor Storefront Verification
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Submit proof of physical stall visit, stock availability, and
                trade status.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-ink hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Vendor Target Card */}
          <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
              {vendorAvatar ? (
                <img
                  src={vendorAvatar}
                  alt={vendorName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : vendorName?.trim() ? (
                <span className="text-[#ff5500] font-bold">
                  {vendorName.trim()[0].toUpperCase()}
                </span>
              ) : (
                <Storefront
                  size={20}
                  weight="duotone"
                  className="text-gray-400"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm text-ink truncate">
                {vendorName}
              </h4>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin size={12} className="text-gray-400 shrink-0" />
                <span className="truncate">
                  {vendorArea || "Location registered on Velte"}
                </span>
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full shrink-0">
              Audit Target
            </span>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmitProof} className="mt-4 space-y-4">
            {/* Proof 1: GPS Geo-Location Lock */}
            <div>
              <label className="text-xs font-bold text-ink flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#ff5500]" />
                  <span>1. Physical GPS Location Lock</span>
                </span>
                <span className="text-[10px] text-gray-400 font-normal">
                  Proves physical presence on-site
                </span>
              </label>

              {gpsCoords ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle
                      size={16}
                      weight="fill"
                      className="text-emerald-500 shrink-0"
                    />
                    <span>
                      GPS Tagged ({gpsCoords.latitude.toFixed(4)},{" "}
                      {gpsCoords.longitude.toFixed(4)}) · ±{gpsCoords.accuracy}m
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    className="text-[11px] underline font-semibold cursor-pointer hover:text-emerald-800"
                  >
                    Retag
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCaptureGps}
                  disabled={gpsLoading}
                  className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/20 hover:border-orange-500 dark:hover:border-orange-500 bg-surface text-xs font-semibold text-gray-700 dark:text-ink/80 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {gpsLoading ? (
                    <>
                      <CircleNotch
                        size={14}
                        className="animate-spin text-[#ff5500]"
                      />
                      <span>Locking GPS Satellite Coordinates…</span>
                    </>
                  ) : (
                    <>
                      <MapPin
                        size={15}
                        weight="duotone"
                        className="text-[#ff5500]"
                      />
                      <span>Tag My Current GPS Coordinates</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Proof 2: Dual Photo Proofs */}
            <div>
              <label className="text-xs font-bold text-ink flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Camera size={14} className="text-[#ff5500]" />
                  <span>2. Photographic Proofs</span>
                </span>
                <span className="text-[10px] text-gray-400 font-normal">
                  Storefront &amp; Stock Photos
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* Photo A: Storefront Signboard */}
                <div>
                  <span className="text-[10px] text-gray-500 font-medium block mb-1">
                    A. Storefront / Signboard
                  </span>
                  {storefrontPhoto ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 group">
                      <img
                        src={storefrontPhoto}
                        alt="Storefront proof"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setStorefrontPhoto(null)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors"
                        title="Remove photo"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-video rounded-xl border border-dashed border-gray-300 dark:border-white/20 hover:border-orange-500 bg-gray-50/50 dark:bg-white/5 cursor-pointer p-2 transition-colors">
                      {uploadingStorefront ? (
                        <CircleNotch
                          size={18}
                          className="animate-spin text-[#ff5500]"
                        />
                      ) : (
                        <>
                          <Building
                            size={18}
                            weight="duotone"
                            className="text-gray-400 mb-1"
                          />
                          <span className="text-[10px] text-gray-500 font-medium text-center leading-tight">
                            Upload Shop Exterior
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleUploadPhoto(e.target.files[0], "storefront");
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Photo B: Live Stock / Shelf */}
                <div>
                  <span className="text-[10px] text-gray-500 font-medium block mb-1">
                    B. Active Stock / Inventory
                  </span>
                  {stockPhoto ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 group">
                      <img
                        src={stockPhoto}
                        alt="Stock proof"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setStockPhoto(null)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors"
                        title="Remove photo"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-video rounded-xl border border-dashed border-gray-300 dark:border-white/20 hover:border-orange-500 bg-gray-50/50 dark:bg-white/5 cursor-pointer p-2 transition-colors">
                      {uploadingStock ? (
                        <CircleNotch
                          size={18}
                          className="animate-spin text-[#ff5500]"
                        />
                      ) : (
                        <>
                          <UploadSimple
                            size={18}
                            weight="duotone"
                            className="text-gray-400 mb-1"
                          />
                          <span className="text-[10px] text-gray-500 font-medium text-center leading-tight">
                            Upload Shelf / Stock
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleUploadPhoto(e.target.files[0], "stock");
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Metric 3: Store Status & Stock Level Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-ink/80 block mb-1">
                  Storefront State
                </label>
                <select
                  value={storeStatus}
                  onChange={(e) =>
                    setStoreStatus(
                      e.target.value as
                        | "open_trading"
                        | "closed_temporarily"
                        | "relocated"
                        | "not_found",
                    )
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-surface text-xs text-ink focus:outline-none focus:border-orange-500"
                >
                  <option value="open_trading">
                    Open &amp; Actively Trading
                  </option>
                  <option value="closed_temporarily">Temporarily Closed</option>
                  <option value="relocated">Store Relocated</option>
                  <option value="not_found">Address Not Found / Fake</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-ink/80 block mb-1">
                  Inventory Level Seen
                </label>
                <select
                  value={stockLevel}
                  onChange={(e) =>
                    setStockLevel(
                      e.target.value as
                        | "well_stocked"
                        | "low_stock"
                        | "no_stock",
                    )
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-surface text-xs text-ink focus:outline-none focus:border-orange-500"
                >
                  <option value="well_stocked">Fully Stocked</option>
                  <option value="low_stock">Limited / Low Stock</option>
                  <option value="no_stock">No Visible Stock</option>
                </select>
              </div>
            </div>

            {/* Metric 4: Contact Person Met On-site */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-ink/80 block mb-1">
                Store Manager / Contact Person Met
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Chukwuma (Store Owner) or Blessing (Sales)"
                className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-surface text-xs text-ink placeholder:text-gray-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Metric 5: Field Notes */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-ink/80 block mb-1">
                Auditor Observation Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={600}
                placeholder="Describe stall landmarks, physical condition, trade legitimacy, or pickup details..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-surface text-xs text-ink placeholder:text-gray-400 focus:outline-none focus:border-orange-500 resize-none"
              />
            </div>

            {/* Incentive Banner */}
            <div className="p-3 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 flex items-center gap-2.5">
              <Coin
                size={22}
                weight="fill"
                className="text-[#ff5500] shrink-0"
              />
              <div className="text-xs">
                <span className="font-bold text-[#ff5500] block">
                  ₦500 Proof-of-Work Verification Reward
                </span>
                <span className="text-[11px] text-gray-600 dark:text-ink/75">
                  Automatically credited to your FinOps earnings balance upon
                  audit submission.
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-semibold text-gray-600 dark:text-ink/75 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingStorefront || uploadingStock}
                className={cn(
                  "flex-2 py-2.5 rounded-xl bg-[#ff5500] hover:bg-orange-600 active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer",
                  (submitting || uploadingStorefront || uploadingStock) &&
                    "opacity-50 pointer-events-none",
                )}
              >
                {submitting ? (
                  <>
                    <CircleNotch size={14} className="animate-spin" />
                    <span>Submitting Proof…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} weight="bold" />
                    <span>Submit Verification Proof</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
