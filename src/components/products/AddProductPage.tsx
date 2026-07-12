"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/components/NavigationProgressContext";
import { queryKeys } from "@/lib/query-keys";
import { categoriesApi } from "@/services/products";
import { uploadProductMedia } from "@/lib/cloudinary";
import { getErrorMessage } from "@/lib/error-message";
import {
  getServiceDetailPresets,
  getProductAttributePresets,
} from "@/lib/attribute-presets";
import { SECTOR_BY_VALUE } from "@/lib/sectors";
import { NIGERIAN_FOOD_CATEGORIES } from "@/lib/food-categories";
import { useUserStore } from "@/store/userStore";
import AttributePickerModal from "./AttributePickerModal";
import {
  Save,
  ChevronDown,
  Calendar,
  PlusCircle,
  RefreshCcw,
  ImageIcon,
  X,
  Trash2,
  Plus,
  ChevronUp,
  Upload,
  FileSpreadsheet,
  Download,
  Package,
  ChefHat,
  Tag,
  Layers,
  Clock,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Globe,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ProductModifier,
  ModifierOption,
  RetailProductPayload,
  FoodProductPayload,
  CreateProductPayload,
  Category,
} from "@/types/product";
import { storeApi } from "@/services/store";
import type { ConnectedCatalog, CatalogPlatform } from "@/types/store";
import {
  useBusinessType,
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

interface ImportedRow {
  [key: string]: string;
}

// ── CSV utilities ─────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): ImportedRow[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: ImportedRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function downloadTemplate(isFood: boolean) {
  const retailHeaders = [
    "Name",
    "Description",
    "Price",
    "Category",
    "Tags",
    "Stock Quantity",
    "SKU",
    "Manufacturing Date",
    "Expiration Date",
    "Image Filename",
  ];
  const retailExample = [
    '"Wireless Headphones"',
    '"Premium wireless audio with noise cancellation"',
    "15000",
    "Electronics",
    '"bluetooth,audio,headphones"',
    "50",
    "WH-001",
    "2024-01-01",
    "2026-12-31",
    "wireless-headphones.jpg",
  ];

  const foodHeaders = [
    "Name",
    "Description",
    "Price",
    "Category",
    "Prep Time (mins)",
    "Vegetarian",
    "Spicy",
    "Halal",
    "Image Filename",
  ];
  const foodExamples = [
    [
      '"Jollof Rice"',
      '"Smoky party jollof rice served with your choice of protein"',
      "2500",
      '"Rice Dishes"',
      "20",
      "no",
      "no",
      "no",
      "jollof-rice.jpg",
    ],
    [
      '"Egusi Soup"',
      '"Rich egusi soup cooked with assorted meat and stockfish"',
      "3500",
      '"Soups & Stews"',
      "35",
      "no",
      "no",
      "yes",
      "egusi-soup.jpg",
    ],
    [
      '"Pounded Yam"',
      '"Smooth pounded yam — pairs with any soup"',
      "500",
      '"Swallows"',
      "10",
      "yes",
      "no",
      "yes",
      "pounded-yam.jpg",
    ],
    [
      '"Suya (Full Stick)"',
      '"Spiced beef suya grilled over open flame"',
      "1500",
      '"Grilled & BBQ"',
      "15",
      "no",
      "yes",
      "yes",
      "suya.jpg",
    ],
    [
      '"Chin Chin (Pack)"',
      '"Crunchy homemade chin chin — sweet or plain"',
      "800",
      '"Snacks & Street"',
      "0",
      "yes",
      "no",
      "yes",
      "chin-chin.jpg",
    ],
  ];

  const headers = isFood ? foodHeaders : retailHeaders;
  const rows = isFood ? foodExamples : [retailExample];
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = isFood ? "menu_items_template.csv" : "products_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Bulk-import row mapping ──────────────────────────────────────────────────
// Reads a CSV row into a create payload. Header lookups are case/whitespace
// insensitive since vendors retype template headers by hand.

function getCell(row: ImportedRow, ...names: string[]): string {
  const keys = Object.keys(row);
  for (const name of names) {
    const key = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase());
    if (key) return (row[key] ?? "").trim();
  }
  return "";
}

function stripExt(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function matchCategoryId(
  value: string,
  isFood: boolean,
  retailCategories: Category[],
): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (isFood) {
    const found = NIGERIAN_FOOD_CATEGORIES.find(
      (c) => c.label.toLowerCase() === v,
    );
    return found?.id ?? null;
  }
  const found = retailCategories.find((c) => c.name.toLowerCase() === v);
  return found?.id ?? null;
}

/** Best-effort filename match: exact first, then extension-insensitive. */
function findImageFile(
  imageFilenameRaw: string,
  imageFiles: Map<string, File>,
): File | null {
  if (!imageFilenameRaw) return null;
  const key = imageFilenameRaw.trim().toLowerCase();
  const exact = imageFiles.get(key);
  if (exact) return exact;
  const keyNoExt = stripExt(key);
  for (const [fname, file] of imageFiles) {
    if (stripExt(fname) === keyNoExt) return file;
  }
  return null;
}

interface RowResult {
  index: number;
  name: string;
  payload: CreateProductPayload | null;
  error: string | null;
  imageFilenameRaw: string;
  imageFile: File | null;
}

function buildRowResult(
  row: ImportedRow,
  index: number,
  isFood: boolean,
  retailCategories: Category[],
  imageFiles: Map<string, File>,
): RowResult {
  const name = getCell(row, "Name");
  const imageFilenameRaw = getCell(row, "Image Filename");
  const imageFile = findImageFile(imageFilenameRaw, imageFiles);

  const fail = (error: string): RowResult => ({
    index,
    name: name || `Row ${index + 2}`,
    payload: null,
    error,
    imageFilenameRaw,
    imageFile: null,
  });

  if (!name) return fail("Name is required");

  const priceRaw = getCell(row, "Price");
  const price = parseFloat(priceRaw);
  if (!priceRaw || isNaN(price) || price <= 0)
    return fail("Price must be greater than zero");

  const categoryRaw = getCell(row, "Category");
  if (!categoryRaw) return fail("Category is required");
  const categoryId = matchCategoryId(categoryRaw, isFood, retailCategories);
  if (!categoryId) return fail(`Unknown category "${categoryRaw}"`);

  const description = getCell(row, "Description");
  const base = {
    name,
    description: description || null,
    category_id: categoryId,
    price: Math.round(price * 100),
    price_max: null,
    currency: "NGN" as const,
    is_featured: false,
    main_image_url: null,
    thumbnail_urls: [] as string[],
    video_url: null,
  };

  if (isFood) {
    const tags: string[] = [];
    if (getCell(row, "Vegetarian").toLowerCase() === "yes")
      tags.push("vegetarian");
    if (getCell(row, "Spicy").toLowerCase() === "yes") tags.push("spicy");
    if (getCell(row, "Halal").toLowerCase() === "yes") tags.push("halal");
    const prepRaw = getCell(row, "Prep Time (mins)");
    const payload: FoodProductPayload = {
      ...base,
      tags,
      estimated_prep_mins: parseInt(prepRaw, 10) || 0,
      is_currently_available: true,
      daily_limit: null,
      allow_pre_order: false,
      modifiers: [],
    };
    return { index, name, payload, error: null, imageFilenameRaw, imageFile };
  }

  const tagsRaw = getCell(row, "Tags");
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const sku = getCell(row, "SKU");
  const stockRaw = getCell(row, "Stock Quantity");
  const payload: RetailProductPayload = {
    ...base,
    tags,
    kind: "product",
    quote_on_request: false,
    stock_quantity: parseInt(stockRaw, 10) || 0,
    low_stock_threshold: null,
    manufacturing_date: getCell(row, "Manufacturing Date") || null,
    expiration_date: getCell(row, "Expiration Date") || null,
    attributes: sku ? [{ name: "SKU", value: sku }] : [],
  };
  return { index, name, payload, error: null, imageFilenameRaw, imageFile };
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

// ── Bring-in-your-catalogue modal ────────────────────────────────────────────
// Two ways in: upload a spreadsheet (CSV), or connect the vendor's own website
// so Velte sync-mirrors their catalog (spec §16.1).

type CatalogMethod = "spreadsheet" | "website";

const PLATFORM_LABEL: Record<CatalogPlatform, string> = {
  woocommerce: "WooCommerce",
  shopify: "Shopify",
  feed: "Custom feed",
  unknown: "Website",
};

function ImportCatalogModal({
  isOpen,
  onClose,
  isFood,
}: {
  isOpen: boolean;
  onClose: () => void;
  isFood: boolean;
}) {
  const [method, setMethod] = useState<CatalogMethod>("spreadsheet");
  const queryClient = useQueryClient();

  // Spreadsheet method
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [allRows, setAllRows] = useState<ImportedRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRows = allRows.slice(0, 5);

  // Photo matching (Step 3)
  const [imageFiles, setImageFiles] = useState<Map<string, File>>(new Map());
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Import execution
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importSummary, setImportSummary] = useState<{
    success: number;
    failed: { name: string; error: string }[];
  } | null>(null);

  const { data: retailCategories = [] } = useQuery({
    queryKey: queryKeys.products.categories,
    queryFn: categoriesApi.getCategories,
    enabled: isOpen && !isFood,
  });

  const rowResults = allRows.map((row, i) =>
    buildRowResult(row, i, isFood, retailCategories, imageFiles),
  );
  const validRows = rowResults.filter((r) => !r.error && r.payload);
  const errorRows = rowResults.filter((r) => r.error);
  const rowsWithImageRequested = rowResults.filter((r) => r.imageFilenameRaw);
  const rowsWithImageMatched = rowResults.filter((r) => r.imageFile);

  // Website method
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectResult, setConnectResult] = useState<ConnectedCatalog | null>(
    null,
  );
  const [connectError, setConnectError] = useState<string | null>(null);

  const resetFile = () => {
    setFileName(null);
    setAllRows([]);
    setPreviewHeaders([]);
    setParseError(null);
    setImageFiles(new Map());
    setImportSummary(null);
    setImportProgress({ done: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const resetWebsite = () => {
    setWebsiteUrl("");
    setConnecting(false);
    setConnectResult(null);
    setConnectError(null);
  };

  const closeAll = () => {
    onClose();
    resetFile();
    resetWebsite();
    setMethod("spreadsheet");
  };

  const handleConnect = async () => {
    const url = websiteUrl.trim();
    if (!url) {
      setConnectError("Enter your website address.");
      return;
    }
    setConnecting(true);
    setConnectError(null);
    try {
      const catalog = await storeApi.connectCatalog(url);
      setConnectResult(catalog);
      if (catalog.status === "connected") {
        toast.success(
          `Connected — ${catalog.productCount} ${
            catalog.productCount === 1 ? "product" : "products"
          } found.`,
        );
      } else {
        toast("We couldn't find a Shopify or WooCommerce store there.");
      }
    } catch (err) {
      setConnectError(getErrorMessage(err));
    } finally {
      setConnecting(false);
    }
  };

  const handleFile = (file: File) => {
    setParseError(null);
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      setParseError(
        "Excel files (.xlsx/.xls) are not directly supported. Please save the file as CSV from Excel (File → Save As → CSV) and re-upload.",
      );
      return;
    }
    if (!file.name.endsWith(".csv")) {
      setParseError("Please upload a CSV file (.csv).");
      return;
    }
    setFileName(file.name);
    setImageFiles(new Map());
    setImportSummary(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setParseError(
          "No valid data found. Make sure the file matches the template format.",
        );
        return;
      }
      setPreviewHeaders(Object.keys(rows[0]));
      setAllRows(rows);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImageFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = new Map(imageFiles);
    Array.from(files).forEach((f) => next.set(f.name.trim().toLowerCase(), f));
    setImageFiles(next);
  };

  const handleImport = async () => {
    if (validRows.length === 0) {
      toast.error("No valid rows to import — fix the errors below first.");
      return;
    }

    setImporting(true);
    setImportSummary(null);
    setImportProgress({ done: 0, total: validRows.length });

    const failed: { name: string; error: string }[] = [];
    let success = 0;

    for (const row of validRows) {
      try {
        let payload = row.payload!;
        if (row.imageFile) {
          const url = await uploadProductMedia(row.imageFile, "image");
          payload = { ...payload, main_image_url: url };
        }
        await categoriesApi.createProduct(payload);
        success++;
      } catch (err) {
        failed.push({
          name: row.name,
          error: getErrorMessage(err, "Failed to create"),
        });
      }
      setImportProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    setImporting(false);
    setImportSummary({ success, failed });
    queryClient.invalidateQueries({
      queryKey: ["products", "list"],
      refetchType: "none",
    });
    queryClient.invalidateQueries({
      queryKey: ["products", "stats"],
      refetchType: "none",
    });

    if (failed.length === 0) {
      toast.success(
        `Imported ${success} ${isFood ? "menu items" : "products"}.`,
      );
      closeAll();
    } else if (success === 0) {
      toast.error(`All ${failed.length} rows failed to import.`);
    } else {
      toast.error(
        `Imported ${success}, but ${failed.length} row${failed.length === 1 ? "" : "s"} failed — see details below.`,
      );
    }
  };

  if (!isOpen) return null;

  // Portaled to document.body — rendered inline this backdrop only ever
  // covered its scrollable ancestor's box, not the real viewport (same
  // clipping bug already fixed for dropdowns via AnchoredPopover).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start h-full justify-center bg-black/50 backdrop-blur-sm px-4 pt-12 pb-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-orange-500 flex items-center justify-center flex-shrink-0">
              <Upload size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-dash-heading font-bold text-[#023337]">
                Bring in your catalogue
              </h3>
              <p className="text-dash-caption text-gray-400">
                Upload a spreadsheet or connect Shopify / WooCommerce
              </p>
            </div>
          </div>
          <button
            onClick={closeAll}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Method switcher */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-md">
            {(
              [
                ["spreadsheet", "Spreadsheet", FileSpreadsheet],
                ["website", "Website", Globe],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMethod(value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-dash-body font-semibold transition-colors cursor-pointer",
                  method === value
                    ? "bg-white text-[#023337] shadow-sm"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {method === "spreadsheet" && (
          <div className="px-6 py-5 space-y-4">
            {/* Step 1 — template */}
            <div className="flex items-center justify-between p-3.5 bg-blue-50 border border-blue-100 rounded-md">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet
                  size={16}
                  className="text-blue-500 flex-shrink-0"
                />
                <div>
                  <p className="text-dash-body font-semibold text-blue-700">
                    Step 1 — Download our template
                  </p>
                  <p className="text-dash-caption text-blue-500">
                    {isFood
                      ? "Fill in your dishes — we included 5 examples to guide you"
                      : "Fill in the CSV template, then upload it below"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => downloadTemplate(isFood)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-dash-caption font-semibold rounded-lg transition-colors cursor-pointer flex-shrink-0"
              >
                <Download size={13} />
                Template
              </button>
            </div>

            {/* Step 2 — drop zone */}
            {!previewRows.length && !parseError && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl h-40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
                  dragOver
                    ? "border-orange-400 bg-orange-50"
                    : "border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50/50",
                )}
              >
                <div className="w-11 h-11 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <Upload size={20} className="text-gray-400" />
                </div>
                <p className="text-dash-body font-semibold text-gray-600">
                  {isFood
                    ? "Drop your menu CSV here, or "
                    : "Drop your CSV here, or "}
                  <span className="text-orange-500">browse</span>
                </p>
                <p className="text-dash-caption text-gray-400">
                  {isFood
                    ? "Step 2 — upload your filled template"
                    : "Supports .csv files · Excel → save as CSV"}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            )}

            {/* Error */}
            {parseError && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle
                  size={15}
                  className="text-red-500 mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className="text-dash-body font-semibold text-red-700">
                    Import failed
                  </p>
                  <p className="text-dash-caption text-red-600 mt-0.5">
                    {parseError}
                  </p>
                  <button
                    onClick={resetFile}
                    className="text-dash-caption text-red-500 underline mt-1 cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Preview */}
            {allRows.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-green-500" />
                    <p className="text-dash-body font-semibold text-gray-700">
                      {fileName} — {validRows.length} of {allRows.length}{" "}
                      {isFood ? "dishes" : "products"} ready to import
                    </p>
                  </div>
                  <button
                    onClick={resetFile}
                    disabled={importing}
                    className="text-dash-caption text-gray-400 hover:text-red-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Change file
                  </button>
                </div>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-dash-caption">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {previewHeaders.map((h) => (
                            <th
                              key={h}
                              className="text-left px-3 py-2.5 font-semibold text-gray-500 whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previewRows.map((row, i) => (
                          <tr
                            key={i}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            {previewHeaders.map((h) => (
                              <td
                                key={h}
                                className="px-3 py-2.5 text-gray-700 max-w-[140px] truncate"
                              >
                                {row[h] || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-dash-caption text-gray-400 px-3 py-2 border-t border-gray-100">
                    Showing first {previewRows.length} of {allRows.length} rows
                    · check they look right before importing
                  </p>
                </div>

                {errorRows.length > 0 && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-md">
                    <AlertCircle
                      size={15}
                      className="text-red-500 mt-0.5 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-dash-body font-semibold text-red-700">
                        {errorRows.length} row
                        {errorRows.length === 1 ? "" : "s"} will be skipped
                      </p>
                      <ul className="text-dash-caption text-red-600 mt-1 space-y-0.5">
                        {errorRows.slice(0, 4).map((r) => (
                          <li key={r.index}>
                            Row {r.index + 2} ({r.name}): {r.error}
                          </li>
                        ))}
                        {errorRows.length > 4 && (
                          <li>and {errorRows.length - 4} more…</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Step 3 — photos */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-md space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ImageIcon
                        size={16}
                        className="text-gray-400 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-dash-body font-semibold text-gray-700">
                          Step 3 — Add product photos
                        </p>
                        <p className="text-dash-caption text-gray-400">
                          Optional. Select the photos named in the &quot;Image
                          Filename&quot; column.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={importing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-orange-300 text-gray-700 text-dash-caption font-semibold rounded-lg transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ImageIcon size={13} />
                      {imageFiles.size > 0
                        ? "Add more photos"
                        : "Select photos"}
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleImageFiles(e.target.files)}
                    />
                  </div>
                  {(imageFiles.size > 0 ||
                    rowsWithImageRequested.length > 0) && (
                    <p className="text-dash-caption text-gray-500">
                      {imageFiles.size} photo
                      {imageFiles.size === 1 ? "" : "s"} selected ·{" "}
                      {rowsWithImageMatched.length} of{" "}
                      {rowsWithImageRequested.length} referenced filenames
                      matched
                    </p>
                  )}
                </div>

                {importing && (
                  <div className="p-3.5 bg-orange-50 border border-orange-100 rounded-md space-y-2">
                    <div className="flex items-center justify-between text-dash-caption text-orange-700 font-semibold">
                      <span>
                        Importing {importProgress.done} of{" "}
                        {importProgress.total}…
                      </span>
                      <Loader2 size={14} className="animate-spin" />
                    </div>
                    <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all"
                        style={{
                          width: `${
                            importProgress.total
                              ? (importProgress.done / importProgress.total) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {importSummary && importSummary.failed.length > 0 && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-md space-y-1.5">
                    <p className="text-dash-body font-semibold text-amber-700">
                      Imported {importSummary.success} ·{" "}
                      {importSummary.failed.length} failed
                    </p>
                    <ul className="text-dash-caption text-amber-700 space-y-0.5">
                      {importSummary.failed.slice(0, 4).map((f, i) => (
                        <li key={i}>
                          {f.name}: {f.error}
                        </li>
                      ))}
                      {importSummary.failed.length > 4 && (
                        <li>and {importSummary.failed.length - 4} more…</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Website — connect the vendor's own store (spec §16.1) */}
        {method === "website" && (
          <div className="px-6 py-5 space-y-4">
            {!connectResult ? (
              <>
                <div className="flex items-start gap-2.5 p-3.5 bg-orange-50/70 border border-orange-100 rounded-md">
                  <Globe
                    size={16}
                    className="text-orange-500 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p className="text-dash-body font-semibold text-[#023337]">
                      Already sell on Shopify or WooCommerce?
                    </p>
                    <p className="text-dash-caption text-gray-500 mt-0.5 leading-relaxed">
                      Connect your store and we&apos;ll keep your Velte listings
                      in sync — your store stays the source of truth. We support
                      Shopify and WooCommerce for now; other website builders
                      are coming.
                    </p>
                  </div>
                </div>

                <div>
                  <FieldLabel required>Website address</FieldLabel>
                  <div className="flex h-11 items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 focus-within:ring-2 focus-within:ring-orange-500/30">
                    <Globe size={15} className="text-gray-400 flex-shrink-0" />
                    <input
                      type="url"
                      inputMode="url"
                      value={websiteUrl}
                      onChange={(e) => {
                        setWebsiteUrl(e.target.value);
                        setConnectError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !connecting) handleConnect();
                      }}
                      placeholder="yourstore.com"
                      className="flex-1 min-w-0 bg-transparent text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>
                  {connectError && (
                    <p className="text-dash-caption text-red-500 mt-1.5 flex items-center gap-1">
                      <AlertCircle size={12} className="flex-shrink-0" />
                      {connectError}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {["Shopify", "WooCommerce"].map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-dash-caption font-medium"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {connectResult.status === "connected" ? (
                  <div className="flex items-start gap-2.5 p-4 bg-green-50 border border-green-200 rounded-md">
                    <CheckCircle2
                      size={16}
                      className="text-green-500 mt-0.5 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-dash-body font-semibold text-green-700">
                        Connected to {PLATFORM_LABEL[connectResult.platform]} —{" "}
                        {connectResult.productCount}{" "}
                        {connectResult.productCount === 1
                          ? "product"
                          : "products"}{" "}
                        found
                      </p>
                      <p className="text-dash-caption text-green-600 mt-0.5 leading-relaxed break-all">
                        {connectResult.sourceUrl}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <AlertCircle
                      size={16}
                      className="text-amber-500 mt-0.5 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-dash-body font-semibold text-amber-700">
                        We couldn&apos;t find a Shopify or WooCommerce store
                        there
                      </p>
                      <p className="text-dash-caption text-amber-600 mt-0.5 leading-relaxed break-all">
                        Right now we can only connect stores built on Shopify or
                        WooCommerce. Double-check you entered your store&apos;s
                        web address ({connectResult.sourceUrl}) — or add your
                        products with a spreadsheet instead.
                      </p>
                    </div>
                  </div>
                )}

                {connectResult.status === "connected" && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-gray-50 border border-gray-100 rounded-md">
                    <RefreshCcw
                      size={15}
                      className="text-gray-400 mt-0.5 flex-shrink-0"
                    />
                    <p className="text-dash-caption text-gray-500 leading-relaxed">
                      Your store stays the source of truth. Connected products
                      are read-only in Velte and re-sync automatically — update
                      a price or stock on your store and it follows here.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={resetWebsite}
                  className="text-dash-caption text-orange-500 font-semibold underline cursor-pointer"
                >
                  Connect a different site
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={closeAll}
            disabled={importing}
            className="flex-1 px-4 py-2.5 text-dash-body font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connectResult || importSummary ? "Close" : "Cancel"}
          </button>
          {method === "spreadsheet" && allRows.length > 0 && !importSummary && (
            <button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-dash-body font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Importing…
                </>
              ) : (
                `Import ${validRows.length} ${isFood ? "Items" : "Products"}`
              )}
            </button>
          )}
          {method === "website" && !connectResult && (
            <button
              onClick={handleConnect}
              disabled={connecting || !websiteUrl.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-dash-body font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Checking your site…
                </>
              ) : (
                "Connect website"
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
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
                ? isFood
                  ? "Dish Updated!"
                  : "Changes Saved!"
                : isFood
                  ? "Dish is Live!"
                  : "Listing is Live!"
              : isEditMode
                ? isFood
                  ? "Updating Your Dish"
                  : "Saving Your Changes"
                : isFood
                  ? "Publishing Your Dish"
                  : "Publishing Your Listing"}
          </h2>
          <p className="text-dash-caption text-gray-400 leading-relaxed">
            {done
              ? isEditMode
                ? "Your changes have been saved. Customers will see the updated listing right away."
                : "Everything's set. Your customers can now find this listing on your store."
              : isEditMode
                ? `Hang tight — we're uploading any new media and saving your ${isFood ? "dish" : "listing"} changes. This usually takes a few seconds.`
                : `Hang tight — we're uploading your media and saving your ${isFood ? "dish" : "listing"} to your store. This usually takes a few seconds.`}
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
                ? "Dishes with bright, clear photos get up to 3× more orders. A good cover photo makes all the difference."
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

// New listings no longer collect a real stock count in this wizard — stock
// tracking now lives entirely in the dedicated Restock action on the
// products list. This sentinel just keeps a fresh product reading as "in
// stock" instead of defaulting to 0 and looking sold out immediately.
// Editing an EXISTING product still round-trips its real
// totalQuantity/lowStockThreshold untouched (see the edit-mode prefill
// effect and the submit payload below), so this only ever applies to
// brand-new listings that were never given a real quantity.
const UNTRACKED_STOCK_QUANTITY = 999999;

export default function AddProductPage({
  mode,
  productId,
}: {
  mode: "add" | "edit";
  productId?: string;
}) {
  const isEditMode = mode === "edit";
  const businessType = useBusinessType();
  // Account-level capabilities. `foodAccount` = the product side is a menu
  // (dishes), not a stocked shelf. Only accounts that do both need the toggle;
  // the rest have a fixed kind.
  const foodAccount = isFoodBusiness(businessType);
  const showKindToggle = businessShowsKindToggle(businessType);

  // Sector-level tailoring (preset groups, category pre-fill, placeholder
  // copy) — content inside blocks only; block structure stays businessType's.
  const sectorValue = useUserStore((s) => s.user?.sector);
  const sectorConfig = sectorValue
    ? SECTOR_BY_VALUE[sectorValue]?.listingConfig
    : undefined;

  // Offering identity — a service is a catalog entry with no stock semantics
  // and an optional "from" price. Fixed after creation.
  const [kind, setKind] = useState<"product" | "service">(
    businessOffersProducts(businessType) ? "product" : "service",
  );
  // Services may skip an upfront price entirely — quoted per job in chat.
  const [quoteOnRequest, setQuoteOnRequest] = useState(false);
  // Listing-level: this listing is a service (kind), and so gets dish tooling
  // only when it's a product on a food account.
  const isService = kind === "service";
  const isFood = foodAccount && !isService;
  const isQuote = isService && quoteOnRequest;

  // Keep fixed-kind accounts aligned even if businessType hydrates after mount.
  // "both"/"food_both" are left alone — that vendor drives the toggle.
  useEffect(() => {
    if (isEditMode) return;
    if (!businessOffersServices(businessType))
      setKind("product"); // retail, food
    else if (!businessOffersProducts(businessType)) setKind("service"); // service
  }, [businessType, isEditMode]);

  // Basic
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Pricing — a single price, or a min–max range when the vendor opts in.
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
  const [isRange, setIsRange] = useState(false);
  const [priceMax, setPriceMax] = useState("");

  // Inventory (retail)
  const [stockQuantity, setStockQuantity] = useState("");
  const [threshold, setThreshold] = useState("");
  const [manufacturingDate, setManufacturingDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // Media — preview URLs (blob) + backing File objects for upload
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbnailFiles, setThumbnailFiles] = useState<File[]>([]);

  // Tags + attributes
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [attributeNameInput, setAttributeNameInput] = useState("");
  const [attributeValueInput, setAttributeValueInput] = useState("");
  const [attributeError, setAttributeError] = useState("");
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);

  // Phased wizard (add mode): index of the currently-active block; everything
  // beyond it stays blurred until Next is clicked.
  const [frontier, setFrontier] = useState(0);
  const phaseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Food-specific
  const [estimatedPrepMins, setEstimatedPrepMins] = useState(20);
  const [isCurrentlyAvailable, setIsCurrentlyAvailable] = useState(true);
  const [dailyLimit, setDailyLimit] = useState("");
  const [allowPreOrder, setAllowPreOrder] = useState(false);
  const [modifiers, setModifiers] = useState<ProductModifier[]>([]);
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
  const [importModalOpen, setImportModalOpen] = useState(false);

  const currencyButtonRef = useRef<HTMLButtonElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const manufacturingDateRef = useRef<HTMLInputElement>(null);
  const expirationDateRef = useRef<HTMLInputElement>(null);
  const mainImageRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

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
    setStockQuantity(String(existingProduct.totalQuantity ?? ""));
    setThreshold(String(existingProduct.lowStockThreshold ?? ""));
    setManufacturingDate(existingProduct.manufacturingDate ?? "");
    setExpirationDate(existingProduct.expirationDate ?? "");
    setIsFeatured(existingProduct.featured ?? false);
    setTags(existingProduct.tags ?? []);
    setAttributes(existingProduct.attributes ?? []);
    setModifiers(existingProduct.modifiers ?? []);
    if (existingProduct.mainImageUrl)
      setMainImage(existingProduct.mainImageUrl);
    if (existingProduct.thumbnailUrls?.length)
      setThumbnails(existingProduct.thumbnailUrls);
    if (existingProduct.estimatedPrepMins)
      setEstimatedPrepMins(existingProduct.estimatedPrepMins);
    if (existingProduct.isCurrentlyAvailable !== undefined)
      setIsCurrentlyAvailable(existingProduct.isCurrentlyAvailable);
    if (existingProduct.dailyLimit)
      setDailyLimit(String(existingProduct.dailyLimit));
    if (existingProduct.allowPreOrder !== undefined)
      setAllowPreOrder(existingProduct.allowPreOrder);
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

  const handleMainImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainImage(URL.createObjectURL(file));
      setMainImageFile(file);
    }
  };
  const clearMainImage = () => {
    setMainImage(null);
    setMainImageFile(null);
    if (mainImageRef.current) mainImageRef.current.value = "";
  };
  const handleThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const urls = files.map((f) => URL.createObjectURL(f));
    setThumbnails((prev) => [...prev, ...urls].slice(0, 4));
    setThumbnailFiles((prev) => [...prev, ...files].slice(0, 4));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === " ") && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const addAttribute = () => {
    const name = attributeNameInput.trim();
    const value = attributeValueInput.trim();
    if (!name || !value) {
      setAttributeError("Both attribute name and value are required.");
      return;
    }
    setAttributeError("");
    setAttributes([{ id: Date.now().toString(), name, value }, ...attributes]);
    setAttributeNameInput("");
    setAttributeValueInput("");
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
  const canSubmit =
    productName.trim().length > 0 &&
    (isService || selectedCategory !== "") && // services carry no category
    // Services have no category — the description is what search matches on,
    // so it's required there (and only there).
    (!isService || description.trim().length > 0) &&
    (isQuote || parseFloat(price) > 0) && // quote services need no price
    (isQuote || !isRange || parseFloat(priceMax) > parseFloat(price)) &&
    mainImage !== null &&
    (isFood ||
      isService || // services carry no stock/expiry requirements
      (stockQuantity !== "" &&
        threshold !== "" &&
        (!(isHealth || isElectronics) || expirationDate !== "")));

  // ── Form submission ────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!productName.trim()) {
      toast.error(
        isFood
          ? "Dish name is required"
          : isService
            ? "Service name is required"
            : "Product name is required",
      );
      return;
    }
    if (!isService && !selectedCategory) {
      toast.error("Please select a category");
      return;
    }
    if (isService && !description.trim()) {
      toast.error("Describe your service — it's how buyers find you");
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
      // Calculate how many uploads we'll do so each gets an equal share of 0–75%
      const uploadCount = (mainImageFile ? 1 : 0) + thumbnailFiles.length;
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
        mainImageUrl = await uploadProductMedia(mainImageFile, "image");
        advanceUpload("Main image ready");
      } else if (mainImage && !mainImage.startsWith("blob:")) {
        mainImageUrl = mainImage;
      }

      // Upload thumbnails
      let thumbnailUrls: string[] = [];
      for (let i = 0; i < thumbnailFiles.length; i++) {
        setPublishModal((prev) => ({
          ...prev,
          step:
            thumbnailFiles.length > 1
              ? `Uploading photo ${i + 1} of ${thumbnailFiles.length}…`
              : "Uploading extra photo…",
        }));
        const url = await uploadProductMedia(thumbnailFiles[i], "image");
        thumbnailUrls.push(url);
        advanceUpload(
          thumbnailFiles.length > 1
            ? `Photo ${i + 1} uploaded`
            : "Extra photo ready",
        );
      }
      const remoteThumbUrls = thumbnails.filter((u) => !u.startsWith("blob:"));
      thumbnailUrls = [...remoteThumbUrls, ...thumbnailUrls].slice(0, 5);

      // Save to backend
      setPublishModal((prev) => ({
        ...prev,
        progress: 82,
        step: "Saving to your store…",
      }));

      const priceKobo = isQuote ? 0 : Math.round(parseFloat(price) * 100);
      const priceMaxKobo =
        !isQuote && isRange && priceMax
          ? Math.round(parseFloat(priceMax) * 100)
          : null;
      const base = {
        name: productName.trim(),
        description: description.trim() || null,
        category_id: selectedCategory,
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
          estimated_prep_mins: estimatedPrepMins,
          is_currently_available: isCurrentlyAvailable,
          daily_limit: dailyLimit ? parseInt(dailyLimit) : null,
          allow_pre_order: allowPreOrder,
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
          category_id: isService ? null : selectedCategory,
          quote_on_request: isQuote,
          stock_quantity: isService
            ? 0
            : stockQuantity === ""
              ? UNTRACKED_STOCK_QUANTITY
              : parseInt(stockQuantity) || 0,
          low_stock_threshold:
            !isService && threshold ? parseInt(threshold) : null,
          manufacturing_date:
            !isService && isHealth ? manufacturingDate || null : null,
          expiration_date:
            !isService && (isHealth || isElectronics)
              ? expirationDate || null
              : null,
          attributes: attributes.map(({ name, value }) => ({ name, value })),
        } as RetailProductPayload;
      }

      if (isEditMode && productId) {
        await categoriesApi.updateProduct(productId, payload);
      } else {
        await categoriesApi.createProduct(payload);
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
    } catch (err: unknown) {
      setPublishModal((prev) => ({ ...prev, open: false }));
      const apiErr = err as {
        data?: {
          error?: { fields?: Record<string, string>; message?: string };
        };
        status?: number;
      };
      if (apiErr.status === 400 && apiErr.data?.error?.fields) {
        setFieldErrors(apiErr.data.error.fields);
        toast.error("Please fix the highlighted fields");
      } else {
        toast.error(
          apiErr.data?.error?.message ??
            getErrorMessage(err, "Something went wrong"),
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
    showKindToggle && { id: "type", label: "Type", valid: true },
    // Import decision — add mode only, product/dish kind only (a CSV row is
    // a stocked good or menu item, not a service). Its own buttons drive the
    // flow (import in bulk vs. add one by one), so it has no Next.
    wizard &&
      kind === "product" && { id: "import", label: "Import", valid: true },
    {
      id: "basics",
      label: "Basics",
      valid:
        productName.trim().length > 0 &&
        (isService || selectedCategory !== "") &&
        // Services have no category — description is the matching signal.
        (!isService || description.trim().length > 0),
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
    isFood && { id: "preparation", label: "Prep", valid: true },
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

  // Switching to bulk import abandons manual entry: clear everything typed in
  // the blocks below the decision and re-lock (re-blur) them, so a change of
  // mind later starts the walk clean instead of resuming half-filled state.
  const startBulkImport = () => {
    setFrontier(phaseIndex("import"));
    setProductName("");
    setDescription("");
    setSelectedCategory("");
    setPrice("");
    setIsRange(false);
    setPriceMax("");
    setQuoteOnRequest(false);
    setStockQuantity("");
    setThreshold("");
    setManufacturingDate("");
    setExpirationDate("");
    setIsFeatured(false);
    setMainImage(null);
    setMainImageFile(null);
    setThumbnails([]);
    setThumbnailFiles([]);
    setTags([]);
    setTagInput("");
    setAttributes([]);
    setAttributeNameInput("");
    setAttributeValueInput("");
    setAttributeError("");
    setEstimatedPrepMins(20);
    setIsCurrentlyAvailable(true);
    setDailyLimit("");
    setAllowPreOrder(false);
    setModifiers([]);
    setImportModalOpen(true);
  };

  const publishButton = (
    <button
      onClick={handleSubmit}
      disabled={isSubmitting || !canSubmit}
      className="bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-bold px-6 h-10 rounded-md whitespace-nowrap transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isSubmitting
        ? "Publishing…"
        : isFood
          ? "Publish Dish"
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
      <ImportCatalogModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        isFood={isFood}
      />

      <div className="space-y-5 sm:pb-10 pb-10">
        {/* Page header */}
        <div className="flex items-start px-5 sm:px-0 justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-dash-title font-black text-[#023337]">
                {isEditMode
                  ? isFood
                    ? "Edit Dish"
                    : "Edit Listing"
                  : isFood
                    ? "Add a Dish"
                    : "Add Listing"}
              </h2>
              <p className="text-dash-body text-gray-400 mt-0.5">
                {isEditMode
                  ? isFood
                    ? `Editing: ${existingProduct?.name ?? ""}`
                    : `Editing: ${existingProduct?.name ?? ""}`
                  : foodAccount
                    ? showKindToggle
                      ? "Add a dish or list a service you offer"
                      : "Add a new dish, drink or snack to your menu"
                    : businessType === "service"
                      ? "List a service you offer"
                      : showKindToggle
                        ? "List a product or service in your store"
                        : "List a product in your store"}
              </p>
            </div>
          </div>
        </div>

        {/* Single phased column — desktop gets the same flow, centered */}
        <div className="max-w-3xl mx-auto w-full space-y-5">
          {/* Phase — listing type ("both" accounts only; retail/service have a
              fixed kind. Identity is locked after creation either way). */}
          {showKindToggle && (
            <PhaseBlock {...phaseProps("type")}>
              <FormSection title="Listing Type" icon={Package}>
                <div>
                  <FieldLabel required>What are you listing?</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        foodAccount
                          ? ["product", "Dish", "A menu item you cook & sell"]
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
                        onClick={() => setKind(value as "product" | "service")}
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

          {/* Phase — import decision (add mode only, product/dish kind only).
                A CSV row is a stocked good or menu item, so services skip
                straight to Basics. Same flow for food and retail — only the
                copy adapts. */}
          {wizard && kind === "product" && (
            <PhaseBlock {...phaseProps("import")} hideNext>
              <FormSection
                title={isFood ? "Add Your Dishes" : "Add Your Products"}
                icon={Upload}
              >
                <div>
                  <FieldLabel required>
                    How would you like to add them?
                  </FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={startBulkImport}
                      className="text-left px-3 py-2.5 rounded-md border border-gray-200 bg-white hover:border-orange-300 transition-colors cursor-pointer"
                    >
                      <p className="flex items-center gap-1.5 text-dash-body font-bold text-[#023337]">
                        <Upload size={13} className="text-orange-500" />
                        {isFood
                          ? "Bring in your menu"
                          : "Bring in your catalogue"}
                      </p>
                      <p className="text-dash-caption text-gray-400 mt-0.5">
                        Upload a spreadsheet or connect Shopify / WooCommerce
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => goNext("import")}
                      className="text-left px-3 py-2.5 rounded-md border border-gray-200 bg-white hover:border-orange-300 transition-colors cursor-pointer"
                    >
                      <p className="flex items-center gap-1.5 text-dash-body font-bold text-[#023337]">
                        <PlusCircle size={13} className="text-orange-500" />
                        Add one by one
                      </p>
                      <p className="text-dash-caption text-gray-400 mt-0.5">
                        Fill in the form step by step
                      </p>
                    </button>
                  </div>
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
                  {isFood
                    ? "Dish Name"
                    : isService
                      ? "Service Name"
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
                    Write it exactly as you call it on your menu
                  </p>
                )}
              </div>

              <div>
                {/* Required for services: no category there, so the
                    description is what buyer search matches against. */}
                <FieldLabel required={isService} optional={!isService}>
                  Description
                </FieldLabel>
                <textarea
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
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                />
                {isService && (
                  <p className="text-dash-caption text-gray-400 mt-1.5">
                    Buyers find your service through this description — the more
                    specific, the better your matches
                  </p>
                )}
              </div>

              {/* Category — products & food only. Services are discovered by
                  meaning (their description + sector), not a fixed category. */}
              {!isService && (
                <div>
                  <FieldLabel required>
                    {isFood ? "What type of dish is this?" : "Category"}
                  </FieldLabel>
                  {isFood ? (
                    <div className="flex flex-wrap gap-2">
                      {NIGERIAN_FOOD_CATEGORIES.map((cat) => {
                        const active = selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() =>
                              setSelectedCategory(active ? "" : cat.id)
                            }
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-2 rounded-md text-dash-body font-medium border transition-colors cursor-pointer",
                              active
                                ? "bg-orange-500 text-white border-orange-500"
                                : "bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-orange-50",
                            )}
                          >
                            <span>{cat.emoji}</span>
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <Select
                      value={selectedCategory}
                      onValueChange={(v) => setSelectedCategory(v ?? "")}
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
                    {isFood
                      ? "Dish Price"
                      : isService
                        ? "Service Price"
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

              {/* Price range — turn the single price into a min–max band */}
              {!isQuote && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-dash-body font-bold text-[#023337]">
                        Set a price range
                      </p>
                      <p className="text-dash-caption text-gray-400 mt-0.5">
                        Show a &quot;from – to&quot; band instead of one price
                      </p>
                    </div>
                    <Toggle value={isRange} onChange={handleRangeToggle} />
                  </div>
                  {isRange && (
                    <div>
                      <FieldLabel required>Maximum Price</FieldLabel>
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
              this (no stock/expiry semantics). Stock quantity/threshold are
              no longer collected here — stock tracking now happens entirely
              via the dedicated Restock action on the products list. */}
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

          {/* Preparation — food only */}
          {isFood && (
            <PhaseBlock {...phaseProps("preparation")}>
              <FormSection title="Preparation" icon={Clock}>
                <div>
                  <FieldLabel>How long does it take to prepare?</FieldLabel>
                  {/* Quick presets */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[5, 10, 15, 20, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setEstimatedPrepMins(mins)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-dash-body font-medium border transition-colors cursor-pointer",
                          estimatedPrepMins === mins
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white text-gray-600 border-gray-200 hover:border-orange-300",
                        )}
                      >
                        {mins >= 60 ? "1 hr" : `${mins} min`}
                      </button>
                    ))}
                  </div>
                  {/* Fine-tune stepper */}
                  <div className="flex items-center gap-3 max-w-[200px]">
                    <button
                      type="button"
                      onClick={() =>
                        setEstimatedPrepMins((p) => Math.max(5, p - 5))
                      }
                      className="w-10 h-10 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer text-dash-heading font-bold flex-shrink-0"
                    >
                      −
                    </button>
                    <div className="flex-1 h-10 bg-gray-50 border border-gray-200 rounded-md flex items-center justify-center">
                      <span className="text-dash-body font-black text-gray-800">
                        {estimatedPrepMins} min
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEstimatedPrepMins((p) => p + 5)}
                      className="w-10 h-10 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer text-dash-heading font-bold flex-shrink-0"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-dash-caption text-gray-400 mt-1.5">
                    Customers will see this as estimated wait time
                  </p>
                </div>
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
              {/* Main image */}
              <div className="relative border border-gray-200 rounded-md overflow-hidden h-56 bg-gray-50 flex items-center justify-center">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt="Product"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center">
                      <ImageIcon size={20} className="text-gray-300" />
                    </div>
                    <span className="text-dash-body text-gray-400">
                      No image selected
                    </span>
                  </div>
                )}
                <button
                  onClick={() => mainImageRef.current?.click()}
                  className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 h-8 border border-gray-200 rounded-lg bg-white text-dash-caption text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <ImageIcon size={13} /> Browse
                </button>
                {mainImage && (
                  <>
                    <button
                      onClick={() => mainImageRef.current?.click()}
                      className="absolute bottom-3 right-[72px] flex items-center gap-1.5 px-3 h-8 bg-white rounded-lg shadow text-dash-caption text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <RefreshCcw size={12} /> Replace
                    </button>
                    <button
                      onClick={clearMainImage}
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
                  className="hidden"
                  onChange={handleMainImage}
                />
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2.5 flex-wrap">
                {thumbnails.map((url, i) => (
                  <div
                    key={i}
                    className="relative w-20 h-20 border border-gray-200 rounded-md overflow-hidden flex-shrink-0 group"
                  >
                    <img
                      src={url}
                      alt={`Thumb ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() =>
                        setThumbnails((p) => p.filter((_, j) => j !== i))
                      }
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {thumbnails.length < 4 && (
                  <button
                    onClick={() => thumbRef.current?.click()}
                    className="w-20 h-20 border border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center gap-1 hover:border-orange-400 hover:bg-orange-50/50 transition-colors cursor-pointer"
                  >
                    <PlusCircle size={18} className="text-orange-400" />
                    <span className="text-dash-caption text-orange-400">
                      Add
                    </span>
                  </button>
                )}
                <input
                  ref={thumbRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleThumbUpload}
                />
              </div>
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
                    name/value structure, different vocabulary. */}
                {!isFood && (
                  <div>
                    <FieldLabel optional>
                      {isService ? "Service Details" : "Attributes"}
                    </FieldLabel>
                    {isService && (
                      <p className="text-dash-caption text-gray-400 mb-2">
                        Things buyers ask before booking — duration, coverage
                        area, warranty…
                      </p>
                    )}
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
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={attributeNameInput}
                        onChange={(e) => {
                          setAttributeNameInput(e.target.value);
                          if (attributeError) setAttributeError("");
                        }}
                        placeholder={
                          isService
                            ? "Name (e.g., Duration)"
                            : "Name (e.g., Size)"
                        }
                        className="flex-1 h-11 px-3 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                      <Input
                        type="text"
                        value={attributeValueInput}
                        onChange={(e) => {
                          setAttributeValueInput(e.target.value);
                          if (attributeError) setAttributeError("");
                        }}
                        placeholder={
                          isService
                            ? "Value (e.g., about 2 hours)"
                            : "Value (e.g., Large)"
                        }
                        className="flex-1 h-11 px-3 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                      <button
                        type="button"
                        onClick={addAttribute}
                        className="w-11 h-11 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    {attributeError && (
                      <p className="text-dash-caption text-red-500 mt-1.5">
                        {attributeError}
                      </p>
                    )}
                    {attributes.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {attributes.map((attr) => (
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
                )}
              </FormSection>
            </PhaseBlock>
          )}

          {/* Availability & Stock — food only */}
          {isFood && (
            <PhaseBlock {...phaseProps("availability")}>
              <FormSection title="Availability & Stock" icon={Calendar}>
                {/* Currently available toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dash-body font-bold text-[#023337]">
                      Currently Available
                    </p>
                    <p className="text-dash-caption text-gray-400 mt-0.5">
                      Turn off if this dish is not ready to order right now
                    </p>
                  </div>
                  <Toggle
                    value={isCurrentlyAvailable}
                    onChange={setIsCurrentlyAvailable}
                  />
                </div>

                {/* Daily quantity limit */}
                <div>
                  <FieldLabel>
                    Daily Quantity Limit{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                  <p className="text-dash-caption text-gray-400 mt-1.5">
                    Dish auto-marks as unavailable once this many orders are
                    placed today
                  </p>
                </div>

                {/* Pre-order toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dash-body font-bold text-[#023337]">
                      Allow Pre-orders
                    </p>
                    <p className="text-dash-caption text-gray-400 mt-0.5">
                      Customers can book this dish for a future date and time —
                      their chosen date overrides the prep time
                    </p>
                  </div>
                  <Toggle value={allowPreOrder} onChange={setAllowPreOrder} />
                </div>
              </FormSection>
            </PhaseBlock>
          )}

          {/* Customer Choices & Extras — food only */}
          {isFood && (
            <PhaseBlock {...phaseProps("choices")}>
              <FormSection title="Customer Choices & Extras" icon={Layers}>
                {/* Explainer */}
                <div className="bg-blue-50 border border-blue-100 rounded-md px-4 py-3 -mt-1 space-y-1">
                  <p className="text-dash-body font-semibold text-blue-700">
                    What will customers pick when ordering this dish?
                  </p>
                  <p className="text-dash-caption text-blue-500">
                    Add the choices below — e.g. which protein, what size, which
                    side dish. Only the options you add here will appear to
                    customers at checkout. Remove any option your kitchen does
                    not offer, and set the extra cost for each (type 0 if
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
                    Each group opens below — remove options you don&apos;t offer
                    and set your own prices
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
                              <ChevronUp size={13} className="text-gray-400" />
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
                              if it&apos;s included in the dish price. Delete
                              any option you don&apos;t offer.
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
                                                options: g.options.map((o) =>
                                                  o.id === opt.id
                                                    ? {
                                                        ...o,
                                                        additionalPrice: val,
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
                                        saveTemplatePrice(tplId, opt.name, val);
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
                                onChange={(e) => setOptionName(e.target.value)}
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
              </FormSection>
            </PhaseBlock>
          )}
        </div>

        {/* Edit mode keeps the classic bottom bar; in add mode the Publish
            button lives inside the last phase block. */}
        {isEditMode && (
          <div className="flex justify-end absolute py-2 w-full bg-white px-5 bottom-0 right-0 gap-3">
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
              {isSubmitting
                ? "Saving…"
                : isFood
                  ? "Update Dish"
                  : "Save Changes"}
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
        groups={
          isService
            ? getServiceDetailPresets(sectorValue)
            : getProductAttributePresets(selectedCategory)
        }
        existingNames={attributes.map((a) => a.name)}
        onClose={() => setPresetPickerOpen(false)}
        onAdd={addPresetDetails}
      />
    </>
  );
}
