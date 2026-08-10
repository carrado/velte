"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/components/NavigationProgressContext";
import { queryKeys } from "@/lib/query-keys";
import { categoriesApi } from "@/services/products";
import { uploadProductMedia } from "@/lib/cloudinary";
import { getErrorMessage } from "@/lib/error-message";
import {
  getServiceDetailPresets,
  getFoodDetailPresets,
  getProductAttributePresets,
} from "@/lib/attribute-presets";
import { SECTOR_BY_VALUE } from "@/lib/sectors";
import type { SectorClassification } from "@/types/sectors";
import { useUserStore, EMPTY_SECTORS } from "@/store/userStore";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import AttributePickerModal from "./AttributePickerModal";
import {
  Save,
  ChevronDown,
  Calendar,
  RefreshCcw,
  ImageIcon,
  X,
  Trash2,
  Plus,
  ChevronUp,
  Upload,
  Package,
  ChefHat,
  Tag,
  Layers,
  BarChart3,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ProductModifier,
  ModifierOption,
  RetailProductPayload,
  FoodProductPayload,
  ProductBonus,
} from "@/types/product";
import {
  isFoodBusiness,
  businessOffersProducts,
  businessOffersServices,
  businessShowsKindToggle,
} from "@/hooks/useBusinessType";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ProductAttribute {
  id: string;
  name: string;
  value: string;
}

interface ThumbnailItem {
  /** Preview — a blob: URL for a freshly picked file, a real URL for an
   * already-remote thumbnail (edit mode). */
  url: string;
  /** Null for an already-remote thumbnail — nothing left to upload for it. */
  file: File | null;
}

// ── Nigerian food add-on templates ───────────────────────────────────────────

interface NigerianTemplate {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  options: Array<{ name: string; additionalPrice: number }>;
}

const NIGERIAN_TEMPLATES: NigerianTemplate[] = [
  {
    id: "protein",
    name: "Protein Choice",
    required: true,
    multiSelect: false,
    options: [
      { name: "Chicken", additionalPrice: 0 },
      { name: "Beef", additionalPrice: 0 },
      { name: "Fish", additionalPrice: 0 },
      { name: "Goat Meat", additionalPrice: 0 },
      { name: "Turkey", additionalPrice: 0 },
      { name: "Ponmo", additionalPrice: 0 },
      { name: "Gizzard", additionalPrice: 0 },
      { name: "Assorted", additionalPrice: 0 },
    ],
  },
  {
    id: "portion",
    name: "Portion Size",
    required: true,
    multiSelect: false,
    options: [
      { name: "Small", additionalPrice: 0 },
      { name: "Medium", additionalPrice: 0 },
      { name: "Large", additionalPrice: 0 },
      { name: "Party Size", additionalPrice: 0 },
    ],
  },
  {
    id: "sides",
    name: "Add a Side",
    required: false,
    multiSelect: true,
    options: [
      { name: "Fried Plantain", additionalPrice: 0 },
      { name: "Coleslaw", additionalPrice: 0 },
      { name: "Moi Moi", additionalPrice: 0 },
      { name: "Garden Egg Salad", additionalPrice: 0 },
      { name: "Extra Sauce / Stew", additionalPrice: 0 },
    ],
  },
];

// ── Nigerian food constants ───────────────────────────────────────────────────

const POPULAR_FOOD_TAGS = [
  "popular",
  "spicy",
  "local",
  "continental",
  "quick meal",
  "family size",
  "party",
  "healthy",
  "street food",
  "no pepper",
  "with protein",
  "soup base",
  "light",
  "vegan",
];

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function FormSection({
  title,
  icon: Icon,
  required,
  children,
}: {
  title: string;
  icon: React.ElementType;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Icon size={13} className="text-orange-500" />
        </div>
        <h3 className="text-dash-heading font-bold text-[#023337]">
          {title}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </h3>
      </div>
      <div className="px-5 py-5 space-y-5">{children}</div>
    </div>
  );
}

function FieldLabel({
  children,
  optional,
  required,
}: {
  children: React.ReactNode;
  optional?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block text-dash-body font-bold text-[#023337] mb-2">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
      {optional && (
        <span className="font-normal text-gray-400 ml-1">(Optional)</span>
      )}
    </label>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors focus:outline-none cursor-pointer flex-shrink-0",
        value ? "bg-orange-500" : "bg-gray-200",
      )}
    >
      <div
        className={cn(
          "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
          value ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

function CheckboxField({
  checked,
  onChange,
  label,
  color = "orange",
  icon: Icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  color?: "orange" | "green" | "red";
  icon?: React.ElementType;
}) {
  const bg = {
    orange: "bg-orange-500",
    green: "bg-green-500",
    red: "bg-red-500",
  }[color];
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 cursor-pointer"
    >
      <div
        className={cn(
          "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors border",
          checked ? `${bg} border-transparent` : "border-gray-300 bg-white",
        )}
      >
        {checked && (
          <svg
            viewBox="0 0 12 9"
            className="w-3 h-2.5 fill-none"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 4l3.5 3.5L11 1" />
          </svg>
        )}
      </div>
      <span className="flex items-center gap-1.5 text-dash-body text-gray-600">
        {Icon && (
          <Icon
            size={14}
            className={
              checked
                ? color === "green"
                  ? "text-green-500"
                  : color === "red"
                    ? "text-red-500"
                    : "text-orange-500"
                : "text-gray-400"
            }
          />
        )}
        {label}
      </span>
    </button>
  );
}

// ── Edit skeleton ─────────────────────────────────────────────────────────────

function EditProductSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-md" />
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 space-y-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4"
            >
              <div className="h-5 w-32 bg-gray-200 rounded-lg" />
              <div className="h-11 bg-gray-100 rounded-md" />
              <div className="h-24 bg-gray-100 rounded-md" />
            </div>
          ))}
        </div>
        <div className="w-full lg:w-[440px] space-y-5">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4"
            >
              <div className="h-5 w-24 bg-gray-200 rounded-lg" />
              <div className="h-56 bg-gray-100 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Publish progress modal ───────────────────────────────────────────────────

function PublishProgressModal({
  open,
  progress,
  step,
  done,
  isFood,
  isEditMode,
}: {
  open: boolean;
  progress: number;
  step: string;
  done: boolean;
  isFood: boolean;
  isEditMode: boolean;
}) {
  if (!open) return null;

  // Portaled to document.body — rendered inline this backdrop only ever
  // covered its scrollable ancestor's box, not the real viewport (same
  // clipping bug already fixed for dropdowns via AnchoredPopover).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center gap-5">
        {/* Icon */}
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-500",
            done ? "bg-green-100" : "bg-orange-100",
          )}
        >
          {done ? (
            <CheckCircle2 size={32} className="text-green-500" />
          ) : isEditMode ? (
            <Save size={32} className="text-orange-500 animate-pulse" />
          ) : (
            <Upload size={32} className="text-orange-500 animate-bounce" />
          )}
        </div>

        {/* Title + description */}
        <div className="text-center space-y-1.5">
          <h2 className="text-dash-heading font-black text-[#023337]">
            {done
              ? isEditMode
                ? "Changes Saved!"
                : "Listing is Live!"
              : isEditMode
                ? "Saving Your Changes"
                : "Publishing Your Listing"}
          </h2>
          <p className="text-dash-caption text-gray-400 leading-relaxed">
            {done
              ? isEditMode
                ? "Your changes have been saved. Customers will see the updated listing right away."
                : "Everything's set. Your customers can now find this listing on your store."
              : isEditMode
                ? "Hang tight — we're uploading any new media and saving your listing changes. This usually takes a few seconds."
                : "Hang tight — we're uploading your media and saving your listing to your store. This usually takes a few seconds."}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                done ? "bg-green-500" : "bg-orange-500",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1.5">
            <p className="text-dash-caption text-gray-400 truncate">{step}</p>
            <p className="text-dash-caption font-bold text-[#023337] ml-2 shrink-0">
              {progress}%
            </p>
          </div>
        </div>

        {/* Tip card */}
        {!done && !isEditMode && (
          <div className="w-full bg-[#F1F5F9] rounded-xl p-3.5">
            <p className="text-dash-caption font-semibold text-[#023337] mb-0.5">
              Did you know?
            </p>
            <p className="text-dash-caption text-gray-500 leading-relaxed">
              {isFood
                ? "Listings with bright, clear photos get up to 3× more orders. A good cover photo makes all the difference."
                : "Listings with detailed descriptions and multiple images sell significantly faster than those with minimal info."}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

// ── Phased wizard building block ──────────────────────────────────────────────
// Add mode walks the form block-by-block: everything past the frontier block is
// blurred and inert until the vendor clicks Next on the current one. Edit mode
// renders every block unlocked (wizard=false) — editing shouldn't re-walk the
// wizard. Desktop gets the same single column, centered; a wizard gains
// nothing from two columns.

function PhaseBlock({
  index,
  frontier,
  wizard,
  isLast,
  nextDisabled,
  onNext,
  publish,
  blockRef,
  hideNext = false,
  children,
}: {
  index: number;
  frontier: number;
  wizard: boolean;
  isLast: boolean;
  nextDisabled: boolean;
  onNext: () => void;
  publish: React.ReactNode;
  blockRef: (el: HTMLDivElement | null) => void;
  /** For blocks whose own buttons drive the flow (e.g. the import choice). */
  hideNext?: boolean;
  children: React.ReactNode;
}) {
  const locked = wizard && index > frontier;
  const isCurrent = wizard && index === frontier;
  return (
    <div ref={blockRef} className="scroll-mt-4">
      <div
        inert={locked || undefined}
        aria-hidden={locked || undefined}
        className={cn(
          "transition-all duration-300",
          locked && "blur-[3px] opacity-50 pointer-events-none select-none",
        )}
      >
        {children}
      </div>
      {isCurrent && !hideNext && (
        <div className="mt-3 flex justify-end px-5 sm:px-0">
          {isLast ? (
            publish
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-bold px-6 h-10 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AddProductPage({
  mode,
  productId,
}: {
  mode: "add" | "edit";
  productId?: string;
}) {
  const isEditMode = mode === "edit";

  // The vendor's own operating sectors (slugs, up to 5) — chosen at signup,
  // editable from the Store editor.
  const sectors = useUserStore((s) => s.user?.sectors ?? EMPTY_SECTORS);

  // Per-LISTING sector choice — replaces what used to be one frozen
  // account-wide businessType. Add mode: auto-seeded when the vendor has
  // exactly one sector (zero added friction for the common case); a
  // multi-sector vendor picks one via the wizard's "sector" phase below.
  // Edit mode: seeded from the existing listing's own stored sector (see the
  // pre-fill effect further down) and never changed afterward.
  const [sectorValue, setSectorValue] = useState(
    !isEditMode && sectors.length === 1 ? sectors[0] : "",
  );
  // Sectors hydrate asynchronously (account data loads after mount) —
  // re-seed once they arrive if nothing's been picked yet and there's only
  // one to pick.
  useEffect(() => {
    if (isEditMode) return;
    if (sectors.length === 1 && !sectorValue) setSectorValue(sectors[0]);
  }, [isEditMode, sectors, sectorValue]);

  // This listing's classification (retail/food/service/both/food_both) —
  // drives shape. Defaults to "retail" only until a sector's actually been
  // picked; progression is gated on picking one for multi-sector vendors, so
  // this fallback is never consequential once the wizard's actually usable.
  const classification: SectorClassification =
    SECTOR_BY_VALUE[sectorValue]?.classification ?? "retail";

  // Listing-level capabilities, derived from THIS listing's sector rather
  // than one frozen account-wide type. `foodAccount` = the product side is a
  // menu (dishes), not a stocked shelf, for this listing. Only sectors that
  // support both need the toggle; the rest have a fixed kind.
  const foodAccount = isFoodBusiness(classification);
  const showKindToggle = businessShowsKindToggle(classification);

  // Sector-level tailoring (preset groups, category pre-fill, placeholder
  // copy) — content inside blocks only; block structure stays classification's.
  const sectorConfig = sectorValue
    ? SECTOR_BY_VALUE[sectorValue]?.listingConfig
    : undefined;

  // Offering identity — a service is a catalog entry with no stock semantics
  // and an optional "from" price. Fixed after creation.
  const [kind, setKind] = useState<"product" | "service">(
    businessOffersProducts(classification) ? "product" : "service",
  );
  // Services may skip an upfront price entirely — quoted per job in chat.
  const [quoteOnRequest, setQuoteOnRequest] = useState(false);
  // Listing-level: this listing is a service (kind), and so gets dish tooling
  // only when it's a product under a food-classified sector.
  const isService = kind === "service";
  const isFood = foodAccount && !isService;
  const isQuote = isService && quoteOnRequest;
  // Sectors where no seeded retail category ever fits (real estate) skip the
  // required Category dropdown entirely, same as services/dishes already do.
  const categoryOptional = Boolean(sectorConfig?.categoryOptional);

  // Keep fixed-kind listings aligned to whichever sector is currently picked.
  // "both"/"food_both" sectors are left alone — the vendor drives the toggle.
  useEffect(() => {
    if (isEditMode) return;
    if (!businessOffersServices(classification))
      setKind("product"); // retail, food
    else if (!businessOffersProducts(classification)) setKind("service"); // service
  }, [classification, isEditMode]);

  // Basic
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const descriptionAutoResize = useAutoResizeTextarea(description);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Pricing — a single price, or a min–max range when the vendor opts in.
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
  const [isRange, setIsRange] = useState(false);
  const [priceMax, setPriceMax] = useState("");

  // Inventory (retail)
  const [manufacturingDate, setManufacturingDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // Media — preview URL (blob) + backing File for the cover; thumbnails are
  // paired {url, file} so removing one by index always removes the right
  // File too — `file` is null for an already-remote thumbnail (edit mode),
  // set for a freshly picked one still needing upload at publish time.
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<ThumbnailItem[]>([]);

  // Tags + attributes
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);

  // AI-drafted description — reads whatever's already on the form (name,
  // category/sector, attributes already added) so the draft is as specific
  // as possible, since this text is exactly what later gets embedded for
  // buyer-search matching (see attribute-presets.ts's own comment).
  const generateDescriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/listing-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productName.trim(),
          kind: isService ? "service" : "product",
          categoryLabel: retailCategories.find((c) => c.id === selectedCategory)
            ?.name,
          sectorValue: sectorValue || undefined,
          attributes: attributes.map((a) => ({ name: a.name, value: a.value })),
        }),
      });
      const data = (await res.json()) as {
        description?: string;
        error?: string;
      };
      if (!res.ok)
        throw new Error(data.error ?? "Couldn't generate a description.");
      return data.description!;
    },
    onSuccess: (generated) => {
      setDescription(generated);
      toast.success("Draft ready — edit it to sound like you");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleGenerateDescription = () => {
    if (!productName.trim()) {
      toast.error("Add a name first");
      return;
    }
    generateDescriptionMutation.mutate();
  };

  // Phased wizard (add mode): index of the currently-active block; everything
  // beyond it stays blurred until Next is clicked.
  const [frontier, setFrontier] = useState(0);
  const phaseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Food-specific
  const [isCurrentlyAvailable, setIsCurrentlyAvailable] = useState(true);
  const [modifiers, setModifiers] = useState<ProductModifier[]>([]);
  const [choicesExpanded, setChoicesExpanded] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [optionName, setOptionName] = useState("");
  const [optionPrice, setOptionPrice] = useState("");

  // Persisted modifier prices (carried across products)
  const [savedTemplatePrices, setSavedTemplatePrices] = useState<
    Record<string, Record<string, number>>
  >({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [publishModal, setPublishModal] = useState({
    open: false,
    progress: 0,
    step: "",
    done: false,
  });

  // UI state
  const [currencyPopoverOpen, setCurrencyPopoverOpen] = useState(false);

  const currencyButtonRef = useRef<HTMLButtonElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const manufacturingDateRef = useRef<HTMLInputElement>(null);
  const expirationDateRef = useRef<HTMLInputElement>(null);
  const mainImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("velte_modifier_prices");
      if (raw) setSavedTemplatePrices(JSON.parse(raw));
    } catch {}
  }, []);

  const saveTemplatePrice = (
    templateId: string,
    optionName: string,
    price: number,
  ) => {
    setSavedTemplatePrices((prev) => {
      const next = {
        ...prev,
        [templateId]: { ...(prev[templateId] ?? {}), [optionName]: price },
      };
      try {
        localStorage.setItem("velte_modifier_prices", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Retail categories (food uses hardcoded constants)
  const { data: retailCategories = [] } = useQuery({
    queryKey: queryKeys.products.categories,
    queryFn: categoriesApi.getCategories,
    enabled: !isFood,
  });

  // Sector-driven default for the category dropdown — one-shot, add mode only,
  // and only when the vendor's own category list actually contains the
  // configured id (retailCategories are per-account, not a fixed taxonomy).
  const categoryPrefilled = useRef(false);
  useEffect(() => {
    if (isEditMode || categoryPrefilled.current) return;
    const preset = sectorConfig?.productCategoryId;
    if (!preset || selectedCategory !== "") return;
    if (retailCategories.some((c) => c.id === preset)) {
      categoryPrefilled.current = true;
      setSelectedCategory(preset);
    }
  }, [isEditMode, sectorConfig, retailCategories, selectedCategory]);

  // Edit mode: fetch single product by ID
  const pathname = usePathname();
  const userId = pathname.split("/").filter(Boolean)[0];
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();

  const { data: existingProduct, isLoading: productLoading } = useQuery({
    queryKey: queryKeys.products.detail(productId!),
    queryFn: () => categoriesApi.getProduct(productId!),
    enabled: isEditMode && !!productId,
  });

  // Pre-fill form once the product is loaded
  useEffect(() => {
    if (!existingProduct) return;
    if (existingProduct.kind) setKind(existingProduct.kind);
    if (existingProduct.sectorValue)
      setSectorValue(existingProduct.sectorValue);
    setQuoteOnRequest(existingProduct.quoteOnRequest === true);
    setProductName(existingProduct.name);
    setDescription(existingProduct.description ?? "");
    setSelectedCategory(existingProduct.categoryId ?? "");
    setPrice(String(existingProduct.price));
    if (existingProduct.currency) setCurrency(existingProduct.currency);
    if (existingProduct.priceMax != null) {
      setIsRange(true);
      setPriceMax(String(existingProduct.priceMax));
    }
    setManufacturingDate(existingProduct.manufacturingDate ?? "");
    setExpirationDate(existingProduct.expirationDate ?? "");
    setIsFeatured(existingProduct.featured ?? false);
    setTags(existingProduct.tags ?? []);
    setAttributes(existingProduct.attributes ?? []);
    setModifiers(existingProduct.modifiers ?? []);
    if (existingProduct.mainImageUrl)
      setMainImage(existingProduct.mainImageUrl);
    if (existingProduct.thumbnailUrls?.length)
      setThumbnails(
        existingProduct.thumbnailUrls.map((url) => ({ url, file: null })),
      );
    if (existingProduct.isCurrentlyAvailable !== undefined)
      setIsCurrentlyAvailable(existingProduct.isCurrentlyAvailable);
  }, [existingProduct]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(event.target as Node) &&
        currencyButtonRef.current &&
        !currencyButtonRef.current.contains(event.target as Node)
      ) {
        setCurrencyPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleRangeToggle = (v: boolean) => {
    setIsRange(v);
    if (!v) setPriceMax("");
  };

  const handleQuoteToggle = (v: boolean) => {
    setQuoteOnRequest(v);
    if (v) {
      setPrice("");
      setIsRange(false);
      setPriceMax("");
    }
  };

  const openDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (!ref.current) return;
    if (typeof ref.current.showPicker === "function") ref.current.showPicker();
    else ref.current.click();
  };

  // One control for the whole cover-media slot now — the first file (of
  // however many came in from a single browse or drop) becomes the cover
  // photo, any rest are appended as extra thumbnails (capped at 4, same
  // cap as before). Picking/dropping again always replaces the cover with
  // the new first file, matching "Replace" semantics rather than only ever
  // adding — a vendor fixing their cover shouldn't need to Clear first.
  const addMediaFiles = (files: File[]) => {
    if (files.length === 0) return;
    const [cover, ...extra] = files;
    setMainImage(URL.createObjectURL(cover));
    setMainImageFile(cover);
    if (extra.length) {
      const items: ThumbnailItem[] = extra.map((file) => ({
        url: URL.createObjectURL(file),
        file,
      }));
      setThumbnails((prev) => [...prev, ...items].slice(0, 4));
    }
  };
  const handleMainImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    addMediaFiles(Array.from(e.target.files ?? []));
    e.target.value = ""; // allow re-picking the exact same file(s) later
  };
  // Clears the whole cover-media slot, not just the cover — the thumbnails
  // only ever got there via this same widget in the first place, so
  // clearing "the photo" should reasonably mean starting the slot over
  // entirely rather than leaving orphaned extras behind with no cover.
  const clearMainImage = () => {
    setMainImage(null);
    setMainImageFile(null);
    setThumbnails([]);
    if (mainImageRef.current) mainImageRef.current.value = "";
  };
  const [isDraggingOverMedia, setIsDraggingOverMedia] = useState(false);
  const handleMediaDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOverMedia(true);
  };
  const handleMediaDragLeave = () => setIsDraggingOverMedia(false);
  const handleMediaDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOverMedia(false);
    addMediaFiles(
      Array.from(e.dataTransfer.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      ),
    );
  };
  const removeThumbnail = (index: number) => {
    setThumbnails((prev) => prev.filter((_, i) => i !== index));
  };
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === " ") && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const addPresetDetails = (details: { name: string; value: string }[]) => {
    const existing = new Set(attributes.map((a) => a.name.toLowerCase()));
    const fresh = details
      .filter((d) => !existing.has(d.name.toLowerCase()))
      .map((d, i) => ({
        // eslint-disable-next-line react-hooks/purity
        id: `${Date.now()}-${i}`,
        name: d.name,
        value: d.value,
      }));
    if (fresh.length) setAttributes([...fresh, ...attributes]);
  };

  const addTemplateGroup = (tpl: NigerianTemplate) => {
    if (modifiers.some((m) => m.name === tpl.name)) return;
    const saved = savedTemplatePrices[tpl.id] ?? {};
    const group: ProductModifier = {
      // eslint-disable-next-line react-hooks/purity
      id: Date.now().toString(),
      name: tpl.name,
      required: tpl.required,
      multiSelect: tpl.multiSelect,
      options: tpl.options.map((o) => ({
        id: Math.random().toString(36).slice(2),
        name: o.name,
        additionalPrice: saved[o.name] ?? o.additionalPrice,
      })),
    };
    setModifiers((prev) => [...prev, group]);
    setExpandedGroupId(group.id);
  };

  const addModifierOption = (groupId: string) => {
    if (!optionName.trim()) return;
    const opt: ModifierOption = {
      // eslint-disable-next-line react-hooks/purity
      id: Date.now().toString(),
      name: optionName.trim(),
      additionalPrice: parseFloat(optionPrice) || 0,
    };
    setModifiers((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, options: [...g.options, opt] } : g,
      ),
    );
    setOptionName("");
    setOptionPrice("");
  };

  const currSymbol = currency === "NGN" ? "₦" : "$";
  const isElectronics = selectedCategory === "electronics";
  const isHealth = selectedCategory === "health";
  // Locks the category dropdown once it matches what the sector actually
  // dictates — the sector-driven prefill effect below sets it to exactly
  // this value in add mode, so the common case is locked from the start.
  // Guarded by equality (not just "sector has a configured category") so an
  // existing product whose stored category predates this rule, or was
  // deliberately set to something else, is never trapped on a wrong value
  // with no way to change it.
  const categoryLockedBySector =
    Boolean(sectorConfig?.productCategoryId) &&
    selectedCategory === sectorConfig?.productCategoryId;
  const canSubmit =
    sectorValue !== "" &&
    productName.trim().length > 0 &&
    (isService || isFood || categoryOptional || selectedCategory !== "") && // services, food & category-optional sectors carry no category
    // Required for every kind — services have no category at all, so it's
    // their only real search-matching signal, but a plain product/dish
    // benefits just as much from a real description instead of an empty one.
    description.trim().length > 0 &&
    (isQuote || parseFloat(price) > 0) && // quote services need no price
    (isQuote || !isRange || parseFloat(priceMax) > parseFloat(price)) &&
    mainImage !== null &&
    // Stock quantity/threshold are no longer collected on this form (see the
    // "Additional Details" block's own comment) — only the conditional
    // expiration/guarantee date still applies, matching that phase's own
    // `valid` flag below.
    (isFood ||
      isService ||
      !(isHealth || isElectronics) ||
      expirationDate !== "");

  // Same preset pool the AttributePickerModal draws from — computed once
  // here so both the always-visible "important" inputs below AND the modal
  // (for everything else) read from a single source instead of calling
  // getServiceDetailPresets/getFoodDetailPresets/getProductAttributePresets
  // twice with the risk of the two call sites drifting apart.
  // isFood MUST be checked before the retail branch below — food listings
  // have no selectedCategory (see the canSubmit comment above), so falling
  // through to getProductAttributePresets("") used to silently return only
  // GENERAL_PRODUCT_PRESETS (Brand, Material, Weight, Warranty, Country of
  // Origin — none of it dish-shaped) for every single dish/menu item.
  const presetGroups = isService
    ? getServiceDetailPresets(sectorValue)
    : isFood
      ? getFoodDetailPresets(sectorValue)
      : getProductAttributePresets(
          // Substitute the sector's more specific attribute category when
          // either (a) the sector names no real productCategoryId at all —
          // there's nothing for the vendor to have "switched away from", this
          // is the toys_kids_items/groceries_supermarket/etc. shape, where
          // none of the 8 seeded retail categories (see
          // velte-backend/src/seeds/categories.seed.js) fit the sector well
          // enough to prefill, but the attribute suggestions should still
          // apply regardless of which generic bucket the vendor ends up
          // picking — or (b) the vendor is still on the category the sector
          // actually suggested (see SectorListingConfig.attributeCategoryId's
          // doc comment) — if they picked something else themselves, respect
          // that instead.
          sectorConfig?.attributeCategoryId &&
            (!sectorConfig?.productCategoryId ||
              selectedCategory === sectorConfig.productCategoryId)
            ? sectorConfig.attributeCategoryId
            : selectedCategory,
        );

  // The handful of fields that matter most for AI matching (see
  // attribute-presets.ts) — promoted to always-visible inputs directly on
  // the form instead of hiding behind the "Quick add" modal, per vendor
  // feedback that these shouldn't read as skippable. Deduped by name since
  // a category-specific group and General can both mark the same field
  // (e.g. "Brand") important.
  const importantFields = (() => {
    const seen = new Set<string>();
    const out: { name: string; example: string }[] = [];
    for (const group of presetGroups) {
      for (const item of group.items) {
        if (!item.important) continue;
        const key = item.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
      }
    }
    return out;
  })();
  const importantFieldNames = new Set(
    importantFields.map((f) => f.name.toLowerCase()),
  );
  // Vendor-added details that aren't one of the promoted important fields —
  // shown in the always-visible "More Service Details"/"More Attributes"
  // block below.
  const otherAttributes = attributes.filter(
    (a) => !importantFieldNames.has(a.name.toLowerCase()),
  );
  // Everything else stays behind the modal — stripped of the fields already
  // promoted above so the same field is never editable in two places.
  const modalPresetGroups = presetGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.important),
    }))
    .filter((g) => g.items.length > 0);

  const getAttributeValue = (name: string) =>
    attributes.find((a) => a.name === name)?.value ?? "";

  const setAttributeValue = (name: string, value: string) => {
    setAttributes((prev) => {
      const idx = prev.findIndex((a) => a.name === name);
      if (!value.trim()) {
        return idx === -1 ? prev : prev.filter((a) => a.name !== name);
      }
      if (idx === -1) {
        return [...prev, { id: `${Date.now()}-${name}`, name, value }];
      }
      return prev.map((a) => (a.name === name ? { ...a, value } : a));
    });
  };

  // ── Form submission ────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!sectorValue) {
      toast.error("Please pick which sector this listing is for");
      return;
    }
    if (!productName.trim()) {
      toast.error(
        isService
          ? "Service name is required"
          : isFood
            ? "Menu item name is required"
            : "Product name is required",
      );
      return;
    }
    if (!isService && !isFood && !categoryOptional && !selectedCategory) {
      toast.error("Please select a category");
      return;
    }
    if (!description.trim()) {
      toast.error(
        isService
          ? "Describe your service — it's how buyers find you"
          : isFood
            ? "Describe this menu item — it's how buyers find you"
            : "Describe this product — it's how buyers find you",
      );
      return;
    }
    if (!isQuote && (!price || parseFloat(price) <= 0)) {
      toast.error("Price must be greater than zero");
      return;
    }
    if (!isQuote && isRange && !(parseFloat(priceMax) > parseFloat(price))) {
      toast.error("The maximum price must be greater than the price");
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setPublishModal({
      open: true,
      progress: 0,
      step: "Preparing…",
      done: false,
    });

    try {
      // Only thumbnails that still carry a File need uploading — an
      // already-remote one (edit mode, untouched) has file: null.
      const newThumbs = thumbnails.filter((t) => t.file);

      // Calculate how many uploads we'll do so each gets an equal share of 0–75%
      const uploadCount = (mainImageFile ? 1 : 0) + newThumbs.length;
      const uploadShare = uploadCount > 0 ? Math.floor(75 / uploadCount) : 0;
      let uploadsCompleted = 0;

      const advanceUpload = (step: string) => {
        uploadsCompleted++;
        setPublishModal((prev) => ({
          ...prev,
          progress: Math.min(75, uploadsCompleted * uploadShare),
          step,
        }));
      };

      // Upload main image
      let mainImageUrl: string | null = null;
      if (mainImageFile) {
        setPublishModal((prev) => ({ ...prev, step: "Uploading main image…" }));
        mainImageUrl = await uploadProductMedia(mainImageFile);
        advanceUpload("Main image ready");
      } else if (mainImage && !mainImage.startsWith("blob:")) {
        mainImageUrl = mainImage;
      }

      // Upload thumbnails
      let thumbnailUrls: string[] = [];
      for (let i = 0; i < newThumbs.length; i++) {
        setPublishModal((prev) => ({
          ...prev,
          step:
            newThumbs.length > 1
              ? `Uploading photo ${i + 1} of ${newThumbs.length}…`
              : "Uploading extra photo…",
        }));
        const url = await uploadProductMedia(newThumbs[i].file!);
        thumbnailUrls.push(url);
        advanceUpload(
          newThumbs.length > 1
            ? `Photo ${i + 1} uploaded`
            : "Extra photo ready",
        );
      }
      const remoteThumbUrls = thumbnails
        .filter((t) => !t.file)
        .map((t) => t.url);
      thumbnailUrls = [...remoteThumbUrls, ...thumbnailUrls].slice(0, 5);

      // Save to backend — a plain API call has no real progress signal of
      // its own, so this creeps the bar up gradually while waiting instead
      // of leaving it frozen at 82% for however long the request takes.
      // The creep is capped short of 100 — actual completion below always
      // snaps it the rest of the way, never the timer.
      setPublishModal((prev) => ({
        ...prev,
        progress: 82,
        step: "Saving to your store…",
      }));
      const savingTimer = setInterval(() => {
        setPublishModal((prev) =>
          prev.progress >= 95 ? prev : { ...prev, progress: prev.progress + 1 },
        );
      }, 300);

      const priceKobo = isQuote ? 0 : Math.round(parseFloat(price) * 100);
      const priceMaxKobo =
        !isQuote && isRange && priceMax
          ? Math.round(parseFloat(priceMax) * 100)
          : null;
      const base = {
        name: productName.trim(),
        description: description.trim() || null,
        sector_value: sectorValue,
        // Null for services, dishes, and category-optional sectors (e.g.
        // real estate) — none of those carry a real category.
        category_id:
          isService || isFood || categoryOptional ? null : selectedCategory,
        price: priceKobo,
        price_max: priceMaxKobo,
        currency,
        is_featured: isFeatured,
        tags,
        main_image_url: mainImageUrl,
        thumbnail_urls: thumbnailUrls,
      };

      let payload: RetailProductPayload | FoodProductPayload;

      if (isFood) {
        payload = {
          ...base,
          is_currently_available: isCurrentlyAvailable,
          modifiers: modifiers.map((m) => ({
            name: m.name,
            required: m.required,
            multi_select: m.multiSelect,
            options: m.options.map((o) => ({
              name: o.name,
              additional_price: Math.round(o.additionalPrice * 100),
            })),
          })),
        } as FoodProductPayload;
      } else {
        payload = {
          ...base,
          kind,
          category_id: isService || categoryOptional ? null : selectedCategory,
          quote_on_request: isQuote,
          manufacturing_date:
            !isService && isHealth ? manufacturingDate || null : null,
          expiration_date:
            !isService && (isHealth || isElectronics)
              ? expirationDate || null
              : null,
          attributes: attributes.map(({ name, value }) => ({ name, value })),
        } as RetailProductPayload;
      }

      let bonus: ProductBonus | null = null;
      try {
        if (isEditMode && productId) {
          await categoriesApi.updateProduct(productId, payload);
        } else {
          ({ bonus } = await categoriesApi.createProduct(payload));
        }
      } finally {
        clearInterval(savingTimer);
      }

      setPublishModal((prev) => ({
        ...prev,
        progress: 100,
        step: isEditMode ? "Changes saved!" : "Published successfully!",
        done: true,
      }));

      queryClient.invalidateQueries({
        queryKey: ["products", "list"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["products", "stats"],
        refetchType: "none",
      });

      await new Promise((r) => setTimeout(r, 1100));
      setPublishModal((prev) => ({ ...prev, open: false }));
      navigate(`/${userId}/products`);

      // Fired after the publish modal closes (not inside it) — that modal is
      // only on screen for ~1.1s, nowhere near enough to actually read a
      // second message, and stacking it in there just visually competes with
      // "Published successfully!". The Toaster lives in the root layout, so
      // this survives the navigate() above and stays legible on the
      // destination page — a longer duration than the sonner default since
      // this is confirming real money landed, not just a routine save.
      if (bonus) {
        toast.success(
          `+₦${bonus.amountNaira.toLocaleString("en-NG")} bonus credited to your wallet (${bonus.grantedCount}/${bonus.maxCount} used)`,
          { duration: 6000 },
        );
      }
    } catch (err: unknown) {
      setPublishModal((prev) => ({ ...prev, open: false }));
      const apiErr = err as {
        data?: { error?: string; fields?: Record<string, string> };
        status?: number;
      };
      const fields = apiErr.data?.fields;
      if (apiErr.status === 400 && fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields);
        // Not every field with a backend rule has inline highlighting yet
        // (e.g. tags, category_id) — surface the specific reason in the
        // toast itself so it's never silently invisible.
        toast.error(Object.values(fields)[0]);
      } else {
        toast.error(
          apiErr.data?.error ?? getErrorMessage(err, "Something went wrong"),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditMode && productLoading) return <EditProductSkeleton />;

  if (isEditMode && !productLoading && !existingProduct) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Package size={28} className="text-gray-300" />
        </div>
        <div>
          <p className="text-dash-heading font-bold text-[#023337]">
            Product not found
          </p>
          <p className="text-dash-body text-gray-400 mt-1">
            This product no longer exists or was deleted.
          </p>
        </div>
        <button
          onClick={() => navigate(`/${userId}/products`)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-semibold rounded-md transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} />
          Back to Products
        </button>
      </div>
    );
  }

  // ── Phased wizard definition (must match the blocks' DOM order) ────────────
  const wizard = !isEditMode;
  const phases = [
    wizard &&
      sectors.length > 1 && {
        id: "sector",
        label: "Sector",
        valid: sectorValue !== "",
      },
    showKindToggle && { id: "type", label: "Type", valid: true },
    {
      id: "basics",
      label: "Basics",
      valid:
        productName.trim().length > 0 &&
        (isService || isFood || categoryOptional || selectedCategory !== "") &&
        description.trim().length > 0,
    },
    {
      id: "pricing",
      label: "Pricing",
      valid:
        isQuote ||
        (parseFloat(price) > 0 &&
          (!isRange || parseFloat(priceMax) > parseFloat(price))),
    },
    !isFood &&
      !isService && {
        id: "inventory",
        label: "Additional Details",
        valid: !(isHealth || isElectronics) || expirationDate !== "",
      },
    {
      id: "media",
      label: "Media",
      valid: mainImage !== null,
    },
    !isFood && {
      id: "tags",
      label: isService ? "Details" : "Tags",
      valid: true,
    },
    isFood && { id: "availability", label: "Availability", valid: true },
    isFood && { id: "choices", label: "Extras", valid: true },
  ].filter(Boolean) as { id: string; label: string; valid: boolean }[];

  // Clamp: switching Product↔Service changes the phase count mid-flight.
  const effFrontier = wizard
    ? Math.min(frontier, phases.length - 1)
    : phases.length - 1;
  const phaseIndex = (id: string) => phases.findIndex((p) => p.id === id);
  const scrollToPhase = (id: string) =>
    phaseRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  const goNext = (id: string) => {
    const i = phaseIndex(id);
    setFrontier((f) => Math.max(f, i + 1));
    const nextId = phases[i + 1]?.id;
    if (nextId) requestAnimationFrame(() => scrollToPhase(nextId));
  };

  // Shared reset for anything that changes which SHAPE of listing this is —
  // switching kind (product/dish vs. service) or sector below, or starting a
  // bulk import — since fields typed for one shape (e.g. a service's price)
  // carry no meaning for another (e.g. a dish's category) and would
  // otherwise silently sit there prefilled after the switch.
  const resetListingFields = () => {
    setProductName("");
    setDescription("");
    setSelectedCategory("");
    setPrice("");
    setIsRange(false);
    setPriceMax("");
    setQuoteOnRequest(false);
    setManufacturingDate("");
    setExpirationDate("");
    setIsFeatured(false);
    setMainImage(null);
    setMainImageFile(null);
    setThumbnails([]);
    setTags([]);
    setTagInput("");
    setAttributes([]);
    setIsCurrentlyAvailable(true);
    setModifiers([]);
  };

  const publishButton = (
    <button
      onClick={handleSubmit}
      disabled={isSubmitting || !canSubmit}
      className="bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-bold px-6 h-10 rounded-md whitespace-nowrap transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isSubmitting
        ? "Publishing…"
        : isService
          ? "Publish Service"
          : "Publish Product"}
    </button>
  );

  const phaseProps = (id: string) => ({
    index: phaseIndex(id),
    frontier: effFrontier,
    wizard,
    isLast: phaseIndex(id) === phases.length - 1,
    nextDisabled: !phases[phaseIndex(id)]?.valid,
    onNext: () => goNext(id),
    publish: publishButton,
    blockRef: (el: HTMLDivElement | null) => {
      phaseRefs.current[id] = el;
    },
  });

  return (
    <>
      <div
        className={cn(
          "space-y-5 sm:pb-10 pb-10",
          // The bottom bar below is `fixed`, out of normal flow — reserve
          // real space here so it doesn't overlap the last phase block's
          // content once scrolled all the way down.
          isEditMode && "pb-16 md:pb-24",
        )}
      >
        {/* Page header */}
        <div className="flex items-start px-5 sm:px-0 justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-dash-title font-black text-[#023337]">
                {isEditMode ? "Edit Listing" : "Add Listing"}
              </h2>
              <p className="text-dash-body text-gray-400 mt-0.5">
                {isEditMode
                  ? `Editing: ${existingProduct?.name ?? ""}`
                  : classification === "service"
                    ? "List a service you offer"
                    : showKindToggle
                      ? foodAccount
                        ? "List a menu item or service in your store"
                        : "List a product or service in your store"
                      : foodAccount
                        ? "List a menu item in your store"
                        : "List a product in your store"}
              </p>
            </div>
          </div>
        </div>

        {/* Single phased column — desktop gets the same flow, centered */}
        <div className="max-w-3xl mx-auto w-full space-y-5">
          {/* Phase — which sector this listing is for. Skipped entirely for
              single-sector vendors (auto-seeded, zero added friction) — only
              shown when there's an actual choice to make. Drives shape (via
              `classification` above) and per-sector wizard tailoring, so it
              has to be picked before Type/Basics can make sense. */}
          {wizard && sectors.length > 1 && (
            <PhaseBlock {...phaseProps("sector")}>
              <FormSection title="Sector" icon={Tag}>
                <div>
                  <FieldLabel required>
                    Which of your sectors is this listing for?
                  </FieldLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sectors.map((value) => {
                      const leaf = SECTOR_BY_VALUE[value];
                      if (!leaf) return null;
                      const active = sectorValue === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            if (value === sectorValue) return;
                            setSectorValue(value);
                            resetListingFields();
                          }}
                          className={cn(
                            "text-left px-3 py-2.5 rounded-md border transition-colors cursor-pointer",
                            active
                              ? "border-orange-500 bg-orange-50"
                              : "border-gray-200 bg-white hover:border-orange-300",
                          )}
                        >
                          <p className="text-dash-body font-bold text-[#023337]">
                            {leaf.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-dash-caption text-gray-400 mt-1.5">
                    This shapes what you can list and how the form is tailored.
                  </p>
                </div>
              </FormSection>
            </PhaseBlock>
          )}

          {/* Phase — listing type ("both"-classified sectors only;
              retail/food/service-only sectors have a fixed kind. Identity is
              locked after creation either way). */}
          {showKindToggle && (
            <PhaseBlock {...phaseProps("type")}>
              <FormSection title="Listing Type" icon={Package}>
                <div>
                  <FieldLabel required>What are you listing?</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        foodAccount
                          ? ["product", "Menu Item", "A menu item you prepare"]
                          : ["product", "Product", "A physical item you stock"],
                        [
                          "service",
                          "Service",
                          "Work you do — catering, repairs…",
                        ],
                      ] as const
                    ).map(([value, label, hint]) => (
                      <button
                        key={value}
                        type="button"
                        disabled={isEditMode}
                        onClick={() => {
                          if (value === kind) return;
                          setKind(value as "product" | "service");
                          resetListingFields();
                        }}
                        className={cn(
                          "text-left px-3 py-2.5 rounded-md border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
                          kind === value
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 bg-white hover:border-orange-300",
                        )}
                      >
                        <p className="text-dash-body font-bold text-[#023337]">
                          {label}
                        </p>
                        <p className="text-dash-caption text-gray-400 mt-0.5">
                          {hint}
                        </p>
                      </button>
                    ))}
                  </div>
                  {isEditMode && (
                    <p className="text-dash-caption text-gray-400 mt-1.5">
                      The listing type can&apos;t be changed after creation.
                    </p>
                  )}
                </div>
              </FormSection>
            </PhaseBlock>
          )}

          {/* Basic Details */}
          <PhaseBlock {...phaseProps("basics")}>
            <FormSection
              title="Basic Details"
              icon={isFood ? ChefHat : Package}
            >
              <div>
                <FieldLabel required>
                  {isService
                    ? "Service Name"
                    : isFood
                      ? "Menu Item Name"
                      : "Product Name"}
                </FieldLabel>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={
                    isFood
                      ? "e.g., Jollof Rice, Egusi Soup, Suya…"
                      : isService
                        ? (sectorConfig?.serviceNamePlaceholder ??
                          "e.g., Phone Screen Repair, Home Cleaning…")
                        : (sectorConfig?.productNamePlaceholder ??
                          "e.g., Wireless Headphones")
                  }
                  className={`w-full h-11 px-3 bg-gray-50 border rounded-md text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${fieldErrors.name ? "border-red-400" : "border-gray-200"}`}
                />
                {fieldErrors.name && (
                  <p className="text-dash-caption text-red-500 mt-1">
                    {fieldErrors.name}
                  </p>
                )}
                {!fieldErrors.name && isFood && (
                  <p className="text-dash-caption text-gray-400 mt-1.5">
                    Write it exactly as you&apos;d list it for customers
                  </p>
                )}
              </div>

              <div>
                <FieldLabel required>Description</FieldLabel>
                <textarea
                  {...descriptionAutoResize}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    isFood
                      ? "e.g., Smoky party jollof rice served with fried plantain and your choice of protein. Contains tomatoes and peppers."
                      : isService
                        ? (sectorConfig?.serviceDescriptionPlaceholder ??
                          "Describe what the service includes and how it works…")
                        : (sectorConfig?.productDescriptionPlaceholder ??
                          "Describe the product features and benefits…")
                  }
                  rows={4}
                  className="w-full px-3 py-3 min-h-[140px] sm:min-h-[120px] bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none overflow-hidden"
                />
                <div className="flex items-center justify-between mt-1.5">
                  {isService ? (
                    <p className="text-dash-caption text-gray-400">
                      Buyers find your service through this description — the
                      more specific, the better your matches
                    </p>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={generateDescriptionMutation.isPending}
                    className="flex items-center gap-1 text-dash-caption font-medium text-orange-500 hover:text-orange-600 disabled:opacity-60 cursor-pointer shrink-0"
                  >
                    {generateDescriptionMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkle size={12} className="fill-orange-500" />
                    )}
                    {generateDescriptionMutation.isPending
                      ? "Generating…"
                      : "Ask AI to generate"}
                  </button>
                </div>
              </div>

              {/* Category — retail products only. Services are discovered by
                  meaning (their description + sector); food dishes carry no
                  category — matched purely on name/description/sector too.
                  Category-optional sectors (e.g. real estate) skip it for the
                  same reason: nothing in the fixed category list fits. */}
              {!isService && !isFood && !categoryOptional && (
                <div>
                  <FieldLabel required>Category</FieldLabel>
                  <Select
                    value={selectedCategory}
                    onValueChange={(v) => setSelectedCategory(v ?? "")}
                    disabled={categoryLockedBySector}
                  >
                    <SelectTrigger className="w-full h-11 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] focus-visible:ring-2 focus-visible:ring-orange-500/30">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {retailCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.emoji} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categoryLockedBySector && (
                    <p className="text-dash-caption text-gray-400 mt-1.5">
                      Set automatically from your sector.
                    </p>
                  )}
                </div>
              )}
            </FormSection>
          </PhaseBlock>

          {/* Pricing */}
          <PhaseBlock {...phaseProps("pricing")}>
            <FormSection title="Pricing" icon={BarChart3}>
              {/* Quote on request — services can skip an upfront price */}
              {isService && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dash-body font-bold text-[#023337]">
                      Quote on request
                    </p>
                    <p className="text-dash-caption text-gray-400 mt-0.5">
                      No set price — you&apos;ll quote each buyer in chat
                    </p>
                  </div>
                  <Toggle value={quoteOnRequest} onChange={handleQuoteToggle} />
                </div>
              )}

              {/* Quote-on-request note — no price to enter */}
              {isQuote && (
                <div className="bg-orange-50/70 border border-orange-100 rounded-2xl p-4">
                  <p className="text-dash-body font-bold text-[#023337]">
                    Buyers will see &quot;Contact for quote&quot;
                  </p>
                  <p className="text-dash-caption text-gray-500 mt-1 leading-relaxed">
                    You&apos;ll agree the final price with each buyer over
                    WhatsApp. Add things like duration or coverage under Service
                    Details so they know what to expect.
                  </p>
                </div>
              )}

              {/* Base price — hidden for quote-on-request services */}
              {!isQuote && (
                <div>
                  <FieldLabel required>
                    {isService
                      ? "Service Price"
                      : isFood
                        ? "Menu Item Price"
                        : "Product Price"}
                  </FieldLabel>
                  <div className="flex h-11 bg-gray-50 border border-gray-200 rounded-md overflow-hidden">
                    <Input
                      type="number"
                      step="any"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 min-w-0 px-3 pt-3 text-dash-body font-bold text-[#023337] bg-transparent !border-none shadow-none placeholder:text-gray-400 focus:!outline-none !outline-none focus-visible:ring-0"
                    />
                    <div className="relative">
                      <button
                        ref={currencyButtonRef}
                        type="button"
                        onClick={() =>
                          setCurrencyPopoverOpen(!currencyPopoverOpen)
                        }
                        className="h-full pl-3 pr-8 text-dash-body bg-transparent border-l border-gray-200 flex items-center gap-1.5 cursor-pointer text-gray-600 font-medium"
                      >
                        {currSymbol}
                        <ChevronDown size={13} className="text-gray-400" />
                      </button>
                      {currencyPopoverOpen && (
                        <div
                          ref={currencyDropdownRef}
                          className="absolute right-0 top-full mt-1 z-50 bg-white rounded-md shadow-lg border border-gray-200 py-1 min-w-[100px]"
                        >
                          {[
                            ["NGN", "₦ NGN"],
                            ["USD", "$ USD"],
                          ].map(([code, label]) => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => {
                                setCurrency(code as "NGN" | "USD");
                                setCurrencyPopoverOpen(false);
                              }}
                              className="w-full px-4 py-2 text-left text-dash-body hover:bg-orange-50 transition-colors cursor-pointer"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {fieldErrors.price && (
                    <p className="text-dash-caption text-red-500 mt-1">
                      {fieldErrors.price}
                    </p>
                  )}
                </div>
              )}

              {/* Price range — turn the single price into a min–max band.
                  Collapsed to a small link by default: most vendors sell at
                  one price, so the row only expands into the fuller UI once
                  opted into. */}
              {!isQuote && (
                <div>
                  {!isRange ? (
                    <button
                      type="button"
                      onClick={() => handleRangeToggle(true)}
                      className="flex items-center gap-1.5 text-dash-caption font-semibold text-orange-500 hover:text-orange-600 cursor-pointer"
                    >
                      <Plus size={12} />
                      Add a price range instead of one price
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FieldLabel required>Maximum Price</FieldLabel>
                        <button
                          type="button"
                          onClick={() => handleRangeToggle(false)}
                          className="text-dash-caption text-gray-400 hover:text-red-500 cursor-pointer"
                        >
                          Remove range
                        </button>
                      </div>
                      <div className="flex h-11 items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3">
                        <span className="bg-orange-50 rounded-lg px-2 py-1 text-dash-caption font-bold text-orange-600 flex-shrink-0">
                          {currSymbol}
                        </span>
                        <Input
                          type="number"
                          step="any"
                          value={priceMax}
                          onChange={(e) => setPriceMax(e.target.value)}
                          placeholder="0.00"
                          className="flex-1 min-w-0 text-dash-body font-bold text-[#023337] bg-transparent !border-none shadow-none placeholder:text-gray-400 focus:!outline-none !outline-none focus-visible:ring-0"
                        />
                      </div>
                      <p className="text-dash-caption text-gray-400 mt-1.5">
                        The top of your range — must be above the price above
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Price summary */}
              {!isQuote &&
                (() => {
                  const lo = parseFloat(price) || 0;
                  const hi = parseFloat(priceMax) || 0;
                  const fmtAmt = (n: number) =>
                    n.toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                  const showRange = isRange && hi > lo;
                  return (
                    <div className="bg-orange-50/70 border border-orange-100 rounded-2xl p-4">
                      <p className="text-dash-caption font-semibold text-orange-500 uppercase tracking-wider mb-3">
                        Buyers will see
                      </p>
                      <p className="text-[1.6rem] font-black text-[#023337] leading-none">
                        {lo > 0 ? (
                          showRange ? (
                            <>
                              {currSymbol}
                              {fmtAmt(lo)}
                              <span className="mx-1.5 text-gray-400 font-medium">
                                –
                              </span>
                              {currSymbol}
                              {fmtAmt(hi)}
                            </>
                          ) : (
                            <>
                              {currSymbol}
                              {fmtAmt(lo)}
                            </>
                          )
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                  );
                })()}
            </FormSection>
          </PhaseBlock>

          {/* Additional details — retail only; services skip straight past
              this (no expiry semantics). Stock is no longer tracked at all. */}
          {!isFood && !isService && (
            <PhaseBlock {...phaseProps("inventory")}>
              <FormSection title="Additional Details" icon={Layers}>
                {(isHealth || isElectronics) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {isHealth && (
                      <div>
                        <FieldLabel optional>Manufacturing Date</FieldLabel>
                        <div className="relative">
                          <Input
                            ref={manufacturingDateRef}
                            type="date"
                            value={manufacturingDate}
                            onClick={() => openDatePicker(manufacturingDateRef)}
                            onChange={(e) =>
                              setManufacturingDate(e.target.value)
                            }
                            className="w-full h-11 px-3 pr-10 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] focus:outline-none focus:ring-2 focus:ring-orange-500/30 [&::-webkit-calendar-picker-indicator]:hidden"
                          />
                          <Calendar
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                            onClick={() => openDatePicker(manufacturingDateRef)}
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <FieldLabel required>
                        {isElectronics ? "Guarantee Until" : "Expiration Date"}
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          ref={expirationDateRef}
                          type="date"
                          value={expirationDate}
                          onClick={() => openDatePicker(expirationDateRef)}
                          onChange={(e) => setExpirationDate(e.target.value)}
                          className="w-full h-11 px-3 pr-10 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] focus:outline-none focus:ring-2 focus:ring-orange-500/30 [&::-webkit-calendar-picker-indicator]:hidden"
                        />
                        <Calendar
                          size={16}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                          onClick={() => openDatePicker(expirationDateRef)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <CheckboxField
                  checked={isFeatured}
                  onChange={setIsFeatured}
                  label="Feature this listing in a highlighted section"
                />
              </FormSection>
            </PhaseBlock>
          )}

          {/* Media */}
          <PhaseBlock {...phaseProps("media")}>
            <FormSection title="Media" icon={ImageIcon} required>
              {isService && (
                <p className="text-dash-caption text-gray-400 -mt-1">
                  Show your work — photos of finished jobs or before/after shots
                  are what convince buyers to reach out.
                </p>
              )}
              {/* Cover photo — single control for the whole slot: browse
                  (multi-select) or drag-and-drop, first file becomes the
                  cover, any rest fall into the thumbnails below. */}
              <div>
                <div
                  onClick={() => mainImageRef.current?.click()}
                  onDragOver={handleMediaDragOver}
                  onDragLeave={handleMediaDragLeave}
                  onDrop={handleMediaDrop}
                  className={cn(
                    "relative border rounded-md overflow-hidden h-56 bg-gray-50 flex items-center justify-center transition-colors cursor-pointer",
                    isDraggingOverMedia
                      ? "border-orange-400 bg-orange-50/50"
                      : "border-gray-200",
                  )}
                >
                  {mainImage ? (
                    <img
                      src={mainImage}
                      alt="Product"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center">
                        <ImageIcon size={20} className="text-gray-300" />
                      </div>
                      <span className="text-dash-body text-gray-400">
                        No image selected
                      </span>
                      <span className="text-dash-caption text-gray-400">
                        Drag photos here, or browse — pick several at once
                      </span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      mainImageRef.current?.click();
                    }}
                    className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 h-8 border border-gray-200 rounded-lg bg-white text-dash-caption text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <ImageIcon size={13} /> Browse
                  </button>
                  {mainImage && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          mainImageRef.current?.click();
                        }}
                        className="absolute bottom-3 right-[72px] flex items-center gap-1.5 px-3 h-8 bg-white rounded-lg shadow text-dash-caption text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <RefreshCcw size={12} /> Replace
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearMainImage();
                        }}
                        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 h-8 bg-white rounded-lg shadow text-dash-caption text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} /> Clear
                      </button>
                    </>
                  )}
                  <input
                    ref={mainImageRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleMainImage}
                  />
                </div>
              </div>

              {/* Thumbnails — whatever landed here from the drop/browse
                  above, beyond the first file. Purely a display + remove
                  list now; all uploading happens through the cover control. */}
              {thumbnails.length > 0 && (
                <div className="flex gap-2.5 flex-wrap">
                  {thumbnails.map((thumb, i) => (
                    <div
                      key={thumb.url}
                      className="relative w-20 h-20 border border-gray-200 rounded-md overflow-hidden flex-shrink-0 group"
                    >
                      <img
                        src={thumb.url}
                        alt={`Thumb ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeThumbnail(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>
          </PhaseBlock>

          {/* Tags + attributes — retail only */}
          {!isFood && (
            <PhaseBlock {...phaseProps("tags")}>
              <FormSection
                title={
                  isService ? "Tags & Service Details" : "Tags & Attributes"
                }
                icon={Tag}
              >
                <div>
                  <FieldLabel optional>Tags</FieldLabel>

                  {/* Popular food tags (quick-add chips) */}
                  {isFood && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {POPULAR_FOOD_TAGS.map((t) => {
                        const active = tags.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              active
                                ? setTags(tags.filter((x) => x !== t))
                                : setTags([...tags, t])
                            }
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-dash-caption font-medium border transition-colors cursor-pointer",
                              active
                                ? "bg-orange-500 text-white border-orange-500"
                                : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50",
                            )}
                          >
                            {active && <span className="mr-1">✓</span>}
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Active tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-lg text-dash-caption font-medium"
                        >
                          {tag}
                          <button
                            onClick={() =>
                              setTags(tags.filter((t) => t !== tag))
                            }
                            className="hover:text-red-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <Input
                    type="text"
                    value={tagInput}
                    onChange={(e) => {
                      // Mobile virtual keyboards routinely skip a real
                      // keydown for character keys (space included),
                      // routing input through the `input` event instead —
                      // the same reason Enter is unreliable there. Watching
                      // onChange for a trailing space is what actually
                      // works cross-platform; onKeyDown below stays for
                      // Enter and hardware keyboards.
                      const value = e.target.value;
                      if (value.endsWith(" ")) {
                        const trimmed = value.trim();
                        if (trimmed && !tags.includes(trimmed))
                          setTags([...tags, trimmed]);
                        setTagInput("");
                        return;
                      }
                      setTagInput(value);
                    }}
                    onKeyDown={handleTagKeyDown}
                    placeholder={
                      isFood
                        ? "Or type a custom tag and press Enter"
                        : isService
                          ? "e.g. home-service, same-day — press Enter"
                          : "Type a tag then press Enter or Space"
                    }
                    className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>

                {/* Attributes — retail only. For services these read as
                    "service details" (Duration, Coverage, Warranty…) — same
                    name/value structure, different vocabulary. The fields
                    that matter most for AI matching (importantFields) render
                    directly here, always visible — not gated behind a click,
                    since leaving them blank is exactly what quietly hurts
                    match quality. Everything else stays collapsed by
                    default behind the Quick-add modal. */}
                {!isFood && (
                  <div className="space-y-4">
                    {importantFields.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <FieldLabel>
                            {isService
                              ? "Key Service Details"
                              : "Key Attributes"}
                          </FieldLabel>
                        </div>
                        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-md px-3 py-2.5 mb-2">
                          <Info
                            size={15}
                            className="shrink-0 text-blue-500 mt-0.5"
                          />
                          <p className="text-dash-caption text-blue-700">
                            The more of these you fill in, the easier it is for
                            our AI to match you to buyers — and the more often
                            you&apos;ll show up in their search results.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {importantFields.map((field) => (
                            <div key={field.name}>
                              <label className="block text-dash-caption font-medium text-gray-600 mb-1">
                                {field.name}
                              </label>
                              <Input
                                value={getAttributeValue(field.name)}
                                onChange={(e) =>
                                  setAttributeValue(field.name, e.target.value)
                                }
                                placeholder={field.example}
                                className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <FieldLabel optional>
                        {isService ? "More Service Details" : "More Attributes"}
                      </FieldLabel>
                      <button
                        type="button"
                        onClick={() => setPresetPickerOpen(true)}
                        className="w-full mb-2 flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-orange-300 bg-orange-50/60 hover:bg-orange-50 text-orange-600 text-dash-body font-medium rounded-md transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                        {isService
                          ? "Quick add — pick from common service details"
                          : "Quick add — pick from common attributes"}
                      </button>
                      {otherAttributes.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {otherAttributes.map((attr) => (
                            <div
                              key={attr.id}
                              className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-md"
                            >
                              <div className="text-dash-body">
                                <span className="font-semibold text-[#023337]">
                                  {attr.name}:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {attr.value}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  setAttributes(
                                    attributes.filter((a) => a.id !== attr.id),
                                  )
                                }
                                className="text-red-400 hover:text-red-600 cursor-pointer"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </FormSection>
            </PhaseBlock>
          )}

          {/* Availability — food only */}
          {isFood && (
            <PhaseBlock {...phaseProps("availability")}>
              <FormSection title="Availability" icon={Calendar}>
                {/* Currently available toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dash-body font-bold text-[#023337]">
                      Currently Available
                    </p>
                    <p className="text-dash-caption text-gray-400 mt-0.5">
                      Turn off if this listing is not ready to order right now
                    </p>
                  </div>
                  <Toggle
                    value={isCurrentlyAvailable}
                    onChange={setIsCurrentlyAvailable}
                  />
                </div>
              </FormSection>
            </PhaseBlock>
          )}

          {/* Customer Choices & Extras — food only */}
          {isFood && (
            <PhaseBlock {...phaseProps("choices")}>
              <FormSection title="Customer Choices & Extras" icon={Layers}>
                {/* Default state: reads as safely skippable — most listings
                    have no modifiers, so this shouldn't require parsing the
                    builder UI below just to confirm there's nothing to do. */}
                {modifiers.length === 0 && !choicesExpanded && (
                  <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-100 rounded-md">
                    <CheckCircle2
                      size={18}
                      className="text-green-500 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <p className="text-dash-body font-bold text-[#023337]">
                        No extra choices for this listing
                      </p>
                      <p className="text-dash-caption text-gray-400 mt-0.5">
                        Buyers order it exactly as described. Only add choices
                        if customers pick something — like protein, size or a
                        side.
                      </p>
                      <button
                        type="button"
                        onClick={() => setChoicesExpanded(true)}
                        className="mt-2.5 flex items-center gap-1.5 text-dash-caption font-semibold text-orange-500 hover:text-orange-600 cursor-pointer"
                      >
                        <Plus size={12} />
                        This listing has choices to add
                      </button>
                    </div>
                  </div>
                )}

                {(modifiers.length > 0 || choicesExpanded) && (
                  <>
                    {/* Explainer */}
                    <div className="bg-blue-50 border border-blue-100 rounded-md px-4 py-3 -mt-1 space-y-1">
                      <p className="text-dash-body font-semibold text-blue-700">
                        What will customers pick when ordering this?
                      </p>
                      <p className="text-dash-caption text-blue-500">
                        Add the choices below — e.g. which protein, what size,
                        which side. Only the options you add here will appear to
                        customers at checkout. Remove any option you do not
                        offer, and set the extra cost for each (type 0 if
                        it&apos;s included in the base price).
                      </p>
                    </div>

                    {/* Quick templates */}
                    <div>
                      <p className="text-dash-caption font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                        Tap to add a choice group
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {NIGERIAN_TEMPLATES.map((tpl) => {
                          const alreadyAdded = modifiers.some(
                            (m) => m.name === tpl.name,
                          );
                          return (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => addTemplateGroup(tpl)}
                              disabled={alreadyAdded}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-dash-caption font-semibold border transition-colors",
                                alreadyAdded
                                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                  : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 cursor-pointer",
                              )}
                            >
                              {alreadyAdded ? (
                                <CheckCircle2
                                  size={12}
                                  className="text-green-500"
                                />
                              ) : (
                                <Plus size={12} />
                              )}
                              {tpl.name}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-dash-caption text-gray-400 mt-2">
                        Each group opens below — remove options you don&apos;t
                        offer and set your own prices
                      </p>
                    </div>

                    {modifiers.length > 0 && (
                      <div className="space-y-2">
                        {modifiers.map((group) => (
                          <div
                            key={group.id}
                            className="border border-gray-200 rounded-md overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedGroupId((p) =>
                                  p === group.id ? null : group.id,
                                )
                              }
                              className="w-full flex items-center justify-between px-3.5 py-3 bg-gray-50 hover:bg-orange-50 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-dash-body font-semibold text-[#023337] truncate">
                                  {group.name}
                                </span>
                                <div className="flex gap-1 flex-shrink-0">
                                  {group.required && (
                                    <span className="text-dash-caption bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md">
                                      Required
                                    </span>
                                  )}
                                  {group.multiSelect && (
                                    <span className="text-dash-caption bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md">
                                      Multi-select
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-dash-caption text-gray-400">
                                  {group.options.length} option
                                  {group.options.length !== 1 ? "s" : ""}
                                </span>
                                {expandedGroupId === group.id ? (
                                  <ChevronUp
                                    size={13}
                                    className="text-gray-400"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={13}
                                    className="text-gray-400"
                                  />
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModifiers((p) =>
                                      p.filter((g) => g.id !== group.id),
                                    );
                                    if (expandedGroupId === group.id)
                                      setExpandedGroupId(null);
                                  }}
                                  className="text-red-400 hover:text-red-600 p-0.5 cursor-pointer"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </button>

                            {expandedGroupId === group.id && (
                              <div className="px-3.5 py-3 space-y-2 border-t border-gray-100">
                                <p className="text-dash-caption text-gray-400 pb-1">
                                  Set the extra cost for each option — type{" "}
                                  <span className="font-semibold text-gray-500">
                                    0
                                  </span>{" "}
                                  if it&apos;s included in the base price.
                                  Delete any option you don&apos;t offer.
                                </p>
                                {group.options.map((opt) => (
                                  <div
                                    key={opt.id}
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                                  >
                                    <span className="flex-1 text-dash-body text-[#023337]">
                                      {opt.name}
                                    </span>
                                    <div className="relative flex-shrink-0">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-dash-caption font-medium">
                                        +₦
                                      </span>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={
                                          opt.additionalPrice === 0
                                            ? ""
                                            : opt.additionalPrice
                                        }
                                        placeholder="0"
                                        onChange={(e) => {
                                          const val =
                                            parseFloat(e.target.value) || 0;
                                          setModifiers((p) =>
                                            p.map((g) =>
                                              g.id === group.id
                                                ? {
                                                    ...g,
                                                    options: g.options.map(
                                                      (o) =>
                                                        o.id === opt.id
                                                          ? {
                                                              ...o,
                                                              additionalPrice:
                                                                val,
                                                            }
                                                          : o,
                                                    ),
                                                  }
                                                : g,
                                            ),
                                          );
                                          const tplId = NIGERIAN_TEMPLATES.find(
                                            (t) => t.name === group.name,
                                          )?.id;
                                          if (tplId)
                                            saveTemplatePrice(
                                              tplId,
                                              opt.name,
                                              val,
                                            );
                                        }}
                                        className="w-24 h-8 pl-8 pr-2 bg-white border border-gray-200 rounded-lg text-dash-caption text-[#023337]"
                                      />
                                    </div>
                                    <button
                                      onClick={() =>
                                        setModifiers((p) =>
                                          p.map((g) =>
                                            g.id === group.id
                                              ? {
                                                  ...g,
                                                  options: g.options.filter(
                                                    (o) => o.id !== opt.id,
                                                  ),
                                                }
                                              : g,
                                          ),
                                        )
                                      }
                                      className="text-red-400 hover:text-red-600 cursor-pointer flex-shrink-0"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                ))}
                                <div className="flex gap-2 pt-1 border-t border-gray-100 mt-1">
                                  <Input
                                    type="text"
                                    value={optionName}
                                    onChange={(e) =>
                                      setOptionName(e.target.value)
                                    }
                                    placeholder="Add another option…"
                                    className="flex-1 h-9 px-2 bg-gray-50 border border-gray-200 rounded-lg text-dash-body"
                                  />
                                  <div className="relative flex-shrink-0">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-dash-caption">
                                      +₦
                                    </span>
                                    <Input
                                      type="number"
                                      value={optionPrice}
                                      onChange={(e) =>
                                        setOptionPrice(e.target.value)
                                      }
                                      placeholder="0"
                                      min={0}
                                      className="w-24 h-9 pl-7 pr-2 bg-gray-50 border border-gray-200 rounded-lg text-dash-body"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => addModifierOption(group.id)}
                                    disabled={!optionName.trim()}
                                    className="w-9 h-9 bg-orange-500 text-white rounded-lg flex items-center justify-center hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex-shrink-0"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </FormSection>
            </PhaseBlock>
          )}
        </div>

        {/* Edit mode keeps the classic bottom bar; in add mode the Publish
            button lives inside the last phase block. `fixed` (not
            `absolute`) so it's pinned to the viewport, not the bottom of
            this scrolling page's full content height — same recipe as
            StorePage.tsx's own fixed bottom bar: lg:left matches the
            w-[260px] sidebar, and the mobile bottom offset clears
            BottomNav (fixed, ~4.5rem tall, mobile-only). */}
        {isEditMode && (
          <div className="flex justify-end fixed inset-x-0 lg:left-[260px] bottom-[calc(env(safe-area-inset-bottom)+4rem)] md:bottom-0 z-40 py-2 bg-white border-t border-gray-100 px-5 gap-3">
            <button
              onClick={() => navigate(`/${userId}/products`)}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 border border-gray-200 bg-white text-[#023337] text-dash-body font-bold px-4 h-10 rounded-md hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
              className="bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-bold px-5 h-10 rounded-md whitespace-nowrap transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      <PublishProgressModal
        open={publishModal.open}
        progress={publishModal.progress}
        step={publishModal.step}
        done={publishModal.done}
        isFood={isFood}
        isEditMode={isEditMode}
      />

      <AttributePickerModal
        open={presetPickerOpen}
        title={isService ? "Add Service Details" : "Add Attributes"}
        subtitle={
          isService
            ? "Fill in whatever applies to your service — buyers see these before they chat."
            : "Fill in whatever applies to this product."
        }
        groups={modalPresetGroups}
        existingNames={attributes.map((a) => a.name)}
        onClose={() => setPresetPickerOpen(false)}
        onAdd={addPresetDetails}
      />
    </>
  );
}
