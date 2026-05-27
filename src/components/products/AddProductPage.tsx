"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/components/NavigationProgressContext";
import { queryKeys } from "@/lib/query-keys";
import { categoriesApi } from "@/services/products";
import { uploadProductMedia } from "@/lib/cloudinary";
import { getErrorMessage } from "@/lib/error-message";
import {
  Save,
  ChevronDown,
  Calendar,
  PlusCircle,
  RefreshCcw,
  ImageIcon,
  X,
  Trash2,
  Video,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AddProductTaxOption,
  ProductModifier,
  ModifierOption,
  RetailProductPayload,
  FoodProductPayload,
} from "@/types/product";
import { useIsFood } from "@/hooks/useBusinessType";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type TaxType = "percentage" | "fixed";
type MediaType = "image" | "video";

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
    "Discounted Price",
    "Category",
    "Tags",
    "Stock Quantity",
    "SKU",
    "Manufacturing Date",
    "Expiration Date",
  ];
  const retailExample = [
    '"Wireless Headphones"',
    '"Premium wireless audio with noise cancellation"',
    "15000",
    "12000",
    "Electronics",
    '"bluetooth,audio,headphones"',
    "50",
    "WH-001",
    "2024-01-01",
    "2026-12-31",
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

const NIGERIAN_FOOD_CATEGORIES = [
  { id: "rice", label: "Rice Dishes", emoji: "🍚" },
  { id: "soups", label: "Soups & Stews", emoji: "🍲" },
  { id: "swallow", label: "Swallows", emoji: "🫙" },
  { id: "grilled", label: "Grilled & BBQ", emoji: "🔥" },
  { id: "protein", label: "Proteins", emoji: "🍗" },
  { id: "snacks", label: "Snacks & Street", emoji: "🥘" },
  { id: "drinks", label: "Drinks", emoji: "🥤" },
  { id: "breakfast", label: "Breakfast", emoji: "🌅" },
  { id: "desserts", label: "Desserts & Sweets", emoji: "🍨" },
  { id: "party", label: "Party Packs", emoji: "🎉" },
];

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

// ── Import modal ──────────────────────────────────────────────────────────────

function ImportProductsModal({
  isOpen,
  onClose,
  isFood,
}: {
  isOpen: boolean;
  onClose: () => void;
  isFood: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<ImportedRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetFile = () => {
    setFileName(null);
    setPreviewRows([]);
    setPreviewHeaders([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      setPreviewRows(rows.slice(0, 5));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = () => {
    toast.success(
      `${previewRows.length}+ ${isFood ? "menu items" : "products"} queued for import. Processing now…`,
    );
    onClose();
    resetFile();
  };

  if (!isOpen) return null;

  return (
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
                Import {isFood ? "Menu Items" : "Products"}
              </h3>
              <p className="text-dash-caption text-gray-400">
                Bulk-add from a spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              resetFile();
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

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
          {previewRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-green-500" />
                  <p className="text-dash-body font-semibold text-gray-700">
                    {fileName} — {previewRows.length}+{" "}
                    {isFood ? "dishes" : "products"} ready to import
                  </p>
                </div>
                <button
                  onClick={resetFile}
                  className="text-dash-caption text-gray-400 hover:text-red-500 cursor-pointer"
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
                  Showing first {previewRows.length} rows · check they look
                  right before importing
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => {
              onClose();
              resetFile();
            }}
            className="flex-1 px-4 py-2.5 text-dash-body font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {previewRows.length > 0 && (
            <button
              onClick={handleImport}
              className="flex-1 px-4 py-2.5 text-dash-body font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors cursor-pointer"
            >
              Import {previewRows.length}+ {isFood ? "Items" : "Products"}
            </button>
          )}
        </div>
      </div>
    </div>
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
}: {
  open: boolean;
  progress: number;
  step: string;
  done: boolean;
  isFood: boolean;
}) {
  if (!open) return null;

  return (
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
          ) : (
            <Upload size={32} className="text-orange-500 animate-bounce" />
          )}
        </div>

        {/* Title + description */}
        <div className="text-center space-y-1.5">
          <h2 className="text-dash-heading font-black text-[#023337]">
            {done
              ? isFood
                ? "Dish is Live!"
                : "Product is Live!"
              : isFood
                ? "Publishing Your Dish"
                : "Publishing Your Product"}
          </h2>
          <p className="text-dash-caption text-gray-400 leading-relaxed">
            {done
              ? "Everything's set. Your customers can now find this listing on your store."
              : `Hang tight — we're uploading your media and saving your ${isFood ? "dish" : "product"} to your store. This usually takes a few seconds.`}
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
        {!done && (
          <div className="w-full bg-[#F1F5F9] rounded-xl p-3.5">
            <p className="text-dash-caption font-semibold text-[#023337] mb-0.5">
              Did you know?
            </p>
            <p className="text-dash-caption text-gray-500 leading-relaxed">
              {isFood
                ? "Dishes with bright, clear photos get up to 3× more orders. A good cover photo makes all the difference."
                : "Products with detailed descriptions and multiple images sell significantly faster than those with minimal info."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AddProductPage({
  mode,
  productId,
}: {
  mode: "add" | "edit";
  productId?: string;
}) {
  const isEditMode = mode === "edit";
  const isFood = useIsFood();

  // Basic
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Pricing
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [taxIncluded, setTaxIncluded] = useState<AddProductTaxOption>("yes");
  const [taxType, setTaxType] = useState<TaxType>("percentage");
  const [taxValue, setTaxValue] = useState("");
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [minimumPrice, setMinimumPrice] = useState("");

  // Inventory (retail)
  const [stockQuantity, setStockQuantity] = useState("");
  const [threshold, setThreshold] = useState("");
  const [manufacturingDate, setManufacturingDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // Media — preview URLs (blob) + backing File objects for upload
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbnailFiles, setThumbnailFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [videoFileObj, setVideoFileObj] = useState<File | null>(null);

  // Tags + attributes
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [attributeNameInput, setAttributeNameInput] = useState("");
  const [attributeValueInput, setAttributeValueInput] = useState("");
  const [attributeError, setAttributeError] = useState("");

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
  const videoRef = useRef<HTMLInputElement>(null);

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
    setProductName(existingProduct.name);
    setDescription(existingProduct.description ?? "");
    setSelectedCategory(existingProduct.categoryId ?? "");
    setPrice(String(existingProduct.price));
    if (existingProduct.currency) setCurrency(existingProduct.currency);
    if (existingProduct.discountedPrice)
      setDiscountedPrice(String(existingProduct.discountedPrice));
    setTaxIncluded(existingProduct.taxIncluded ? "yes" : "no");
    if (existingProduct.taxType) setTaxType(existingProduct.taxType as TaxType);
    if (existingProduct.taxValue) setTaxValue(String(existingProduct.taxValue));
    if (existingProduct.isNegotiable) setIsNegotiable(true);
    if (existingProduct.minimumPrice)
      setMinimumPrice(String(existingProduct.minimumPrice));
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

  const handleNegotiableToggle = (v: boolean) => {
    setIsNegotiable(v);
    if (v) setDiscountedPrice("");
    else setMinimumPrice("");
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
    selectedCategory !== "" &&
    parseFloat(price) > 0 &&
    (mainImage !== null || videoFile !== null) &&
    (isFood ||
      (stockQuantity !== "" &&
        threshold !== "" &&
        (!(isHealth || isElectronics) || expirationDate !== "")));

  // ── Form submission ────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!productName.trim()) {
      toast.error(
        isFood ? "Dish name is required" : "Product name is required",
      );
      return;
    }
    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      toast.error("Price must be greater than zero");
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
      const uploadCount =
        (mainImageFile ? 1 : 0) +
        thumbnailFiles.length +
        (videoFileObj ? 1 : 0);
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

      // Upload video
      let videoUrl: string | null = null;
      if (videoFileObj) {
        setPublishModal((prev) => ({ ...prev, step: "Uploading video…" }));
        videoUrl = await uploadProductMedia(videoFileObj, "video");
        advanceUpload("Video ready");
      }

      // Save to backend
      setPublishModal((prev) => ({
        ...prev,
        progress: 82,
        step: "Saving to your store…",
      }));

      const priceKobo = Math.round(parseFloat(price) * 100);
      const base = {
        name: productName.trim(),
        description: description.trim() || null,
        category_id: selectedCategory,
        price: priceKobo,
        currency,
        discounted_price:
          !isNegotiable && discountedPrice
            ? Math.round(parseFloat(discountedPrice) * 100)
            : null,
        tax_included: taxIncluded === "yes",
        tax_type: taxIncluded === "yes" ? taxType : null,
        tax_value:
          taxIncluded === "yes" && taxValue ? parseFloat(taxValue) : null,
        is_negotiable: isNegotiable,
        minimum_price:
          isNegotiable && minimumPrice
            ? Math.round(parseFloat(minimumPrice) * 100)
            : null,
        is_featured: isFeatured,
        tags,
        main_image_url: mainImageUrl,
        thumbnail_urls: thumbnailUrls,
        video_url: videoUrl,
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
          stock_quantity: parseInt(stockQuantity) || 0,
          low_stock_threshold: threshold ? parseInt(threshold) : null,
          manufacturing_date: isHealth ? manufacturingDate || null : null,
          expiration_date:
            isHealth || isElectronics ? expirationDate || null : null,
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

  return (
    <>
      <ImportProductsModal
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
                    : "Edit Product"
                  : isFood
                    ? "Add a Dish"
                    : "Add Product"}
              </h2>
              <p className="text-dash-body text-gray-400 mt-0.5">
                {isEditMode
                  ? isFood
                    ? `Editing: ${existingProduct?.name ?? ""}`
                    : `Editing: ${existingProduct?.name ?? ""}`
                  : isFood
                    ? "Add a new dish, drink or snack to your menu"
                    : "Create a new product for your store"}
              </p>
            </div>
          </div>
          {!isEditMode && (
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-600 text-dash-body font-semibold rounded-md transition-colors cursor-pointer"
            >
              <Upload size={15} />
              {isFood ? "Bulk Upload Dishes" : "Import from CSV / CRM"}
            </button>
          )}
        </div>

        {/* Two-column grid */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* ── Left column ── */}
          <div className="flex-1 lg:min-w-0 w-full space-y-5">
            {/* Basic Details */}
            <FormSection
              title="Basic Details"
              icon={isFood ? ChefHat : Package}
            >
              <div>
                <FieldLabel required>
                  {isFood ? "Dish Name" : "Product Name"}
                </FieldLabel>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={
                    isFood
                      ? "e.g., Jollof Rice, Egusi Soup, Suya…"
                      : "e.g., Wireless Headphones"
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
                <FieldLabel optional>Description</FieldLabel>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    isFood
                      ? "e.g., Smoky party jollof rice served with fried plantain and your choice of protein. Contains tomatoes and peppers."
                      : "Describe the product features and benefits…"
                  }
                  rows={4}
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                />
              </div>

              <div>
                <FieldLabel required>
                  {isFood ? "What type of dish is this?" : "Product Category"}
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
            </FormSection>

            {/* Pricing */}
            <FormSection title="Pricing" icon={BarChart3}>
              {/* Base price */}
              <div>
                <FieldLabel required>
                  {isFood ? "Dish Price" : "Product Price"}
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

              {/* Negotiable Price */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dash-body font-bold text-[#023337]">
                      Negotiable Price
                    </p>
                    <p className="text-dash-caption text-gray-400 mt-0.5">
                      Allow customers to negotiate the price
                    </p>
                  </div>
                  <Toggle
                    value={isNegotiable}
                    onChange={handleNegotiableToggle}
                  />
                </div>
                {isNegotiable && (
                  <div>
                    <FieldLabel>Minimum Price</FieldLabel>
                    <div className="flex h-11 items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3">
                      <span className="bg-orange-50 rounded-lg px-2 py-1 text-dash-caption font-bold text-orange-600 flex-shrink-0">
                        {currSymbol}
                      </span>
                      <Input
                        type="number"
                        step="any"
                        value={minimumPrice}
                        onChange={(e) => setMinimumPrice(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 min-w-0 text-dash-body font-bold text-[#023337] bg-transparent !border-none shadow-none placeholder:text-gray-400 focus:!outline-none !outline-none focus-visible:ring-0"
                      />
                    </div>
                    <p className="text-dash-caption text-gray-400 mt-1.5">
                      Lowest price you&apos;re willing to accept
                    </p>
                  </div>
                )}
              </div>

              {/* Discounted Price — full width, hidden when negotiable is on */}
              {!isNegotiable && (
                <div>
                  <FieldLabel optional>Discounted Price</FieldLabel>
                  <div className="flex h-11 items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3">
                    <span className="bg-orange-50 rounded-lg px-2 py-1 text-dash-caption font-bold text-orange-600 flex-shrink-0">
                      {currSymbol}
                    </span>
                    <Input
                      type="number"
                      step="any"
                      value={discountedPrice}
                      onChange={(e) => setDiscountedPrice(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 min-w-0 text-dash-body font-bold text-[#023337] bg-transparent !border-none shadow-none placeholder:text-gray-400 focus:!outline-none !outline-none focus-visible:ring-0"
                    />
                  </div>
                </div>
              )}

              {/* Tax */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dash-body font-bold text-[#023337]">
                      Tax Included
                    </p>
                    <p className="text-dash-caption text-gray-400 mt-0.5">
                      Is tax included in the listed price?
                    </p>
                  </div>
                  <Toggle
                    value={taxIncluded === "yes"}
                    onChange={(v) => setTaxIncluded(v ? "yes" : "no")}
                  />
                </div>
                {taxIncluded === "yes" && (
                  <div>
                    <FieldLabel>Tax Amount</FieldLabel>
                    <div className="flex gap-2">
                      <div className="flex h-11 bg-gray-50 border border-gray-200 rounded-md overflow-hidden flex-1">
                        <Input
                          type="number"
                          step="any"
                          value={taxValue}
                          onChange={(e) => setTaxValue(e.target.value)}
                          placeholder="0.00"
                          className="flex-1 px-3 text-dash-body font-bold text-[#023337] bg-transparent !border-none shadow-none placeholder:text-gray-400 focus:!outline-none !outline-none focus-visible:ring-0"
                        />
                      </div>
                      <div className="flex gap-1.5">
                        {(["percentage", "fixed"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setTaxType(type)}
                            className={cn(
                              "px-3.5 h-11 text-dash-body rounded-md transition-colors cursor-pointer font-medium",
                              taxType === type
                                ? "bg-orange-500 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                            )}
                          >
                            {type === "percentage" ? "%" : "Fixed"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Price summary */}
              {(() => {
                const baseAmt = parseFloat(price) || 0;
                const discAmt = parseFloat(discountedPrice) || 0;
                const minAmt = parseFloat(minimumPrice) || 0;
                const taxAmt = parseFloat(taxValue) || 0;
                const hasDiscount =
                  !isNegotiable && discAmt > 0 && discAmt < baseAmt;
                const effectiveAmt = hasDiscount ? discAmt : baseAmt;
                const fmt = (n: number) =>
                  n.toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                const hasTax = taxIncluded === "yes" && taxAmt > 0;
                const taxComputed = hasTax
                  ? taxType === "percentage"
                    ? (effectiveAmt * taxAmt) / 100
                    : taxAmt
                  : 0;
                const totalAmt = effectiveAmt + taxComputed;
                const taxLabel = hasTax
                  ? taxType === "percentage"
                    ? `+${taxAmt}% (${currSymbol}${fmt(taxComputed)})`
                    : `+${currSymbol}${fmt(taxAmt)}`
                  : "None";
                return (
                  <div className="bg-orange-50/70 border border-orange-100 rounded-2xl p-4">
                    <p className="text-dash-caption font-semibold text-orange-500 uppercase tracking-wider mb-3">
                      Total Price
                    </p>
                    {isNegotiable ? (
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-[1.6rem] font-black text-[#023337] leading-none">
                          {currSymbol}
                          {minAmt > 0 ? fmt(minAmt) : "—"}
                        </span>
                        <span className="text-dash-body text-gray-400 font-medium">
                          to
                        </span>
                        <span className="text-dash-heading font-bold text-gray-500">
                          {currSymbol}
                          {baseAmt > 0 ? fmt(baseAmt) : "—"}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[1.6rem] font-black text-[#023337] leading-none mb-3">
                        {currSymbol}
                        {totalAmt > 0 ? fmt(totalAmt) : "—"}
                      </p>
                    )}
                    <div className="space-y-1.5 pt-3 border-t border-orange-100">
                      {hasDiscount && (
                        <>
                          <div className="flex justify-between text-dash-caption">
                            <span className="text-gray-500">
                              Original price
                            </span>
                            <span className="text-gray-400 line-through">
                              {currSymbol}
                              {fmt(baseAmt)}
                            </span>
                          </div>
                          <div className="flex justify-between text-dash-caption">
                            <span className="text-gray-500">Saving</span>
                            <span className="text-green-600 font-semibold">
                              −{currSymbol}
                              {fmt(baseAmt - discAmt)}
                            </span>
                          </div>
                        </>
                      )}
                      {hasTax && (
                        <div className="flex justify-between text-dash-caption">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="text-gray-500">
                            {currSymbol}
                            {fmt(effectiveAmt)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-dash-caption">
                        <span className="text-gray-500">Tax</span>
                        <span
                          className={
                            hasTax
                              ? "text-orange-500 font-semibold"
                              : "text-gray-400"
                          }
                        >
                          {taxLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </FormSection>

            {/* Inventory — retail only */}
            {!isFood && (
              <FormSection title="Inventory" icon={Layers}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <FieldLabel required>Stock Quantity</FieldLabel>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      placeholder="e.g., 100"
                      className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                  <div>
                    <FieldLabel required>Low Stock Threshold</FieldLabel>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      placeholder="e.g., 10"
                      className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                    <p className="text-dash-caption text-gray-400 mt-1.5">
                      Notify me when stock drops to this level
                    </p>
                  </div>
                </div>

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
                  label="Feature this product in a highlighted section"
                />
              </FormSection>
            )}

            {/* Preparation — food only */}
            {isFood && (
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
            )}
          </div>

          {/* ── Right column ── */}
          <div className="w-full lg:w-[440px] flex-shrink-0 space-y-5">
            {/* Media */}
            <FormSection title="Media" icon={ImageIcon} required>
              <div className="flex gap-2 mb-2 -mt-1">
                {[
                  { key: "image" as const, icon: ImageIcon, label: "Images" },
                  { key: "video" as const, icon: Video, label: "Video" },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMediaType(key)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md text-dash-body font-medium transition-colors cursor-pointer",
                      mediaType === key
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                    )}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {mediaType === "image" ? (
                <>
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
                </>
              ) : (
                <div className="relative border border-gray-200 rounded-md overflow-hidden h-56 bg-gray-50 flex items-center justify-center">
                  {videoFile ? (
                    <video
                      src={videoFile}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center">
                        <Video size={20} className="text-gray-300" />
                      </div>
                      <span className="text-dash-body text-gray-400">
                        No video selected
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => videoRef.current?.click()}
                    className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 h-8 border border-gray-200 rounded-lg bg-white text-dash-caption text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Video size={13} /> Browse
                  </button>
                  {videoFile && (
                    <button
                      onClick={() => {
                        setVideoFile(null);
                        if (videoRef.current) videoRef.current.value = "";
                      }}
                      className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 h-8 bg-white rounded-lg shadow text-dash-caption text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                  <input
                    ref={videoRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setVideoFile(URL.createObjectURL(f));
                        setVideoFileObj(f);
                      }
                    }}
                  />
                </div>
              )}
            </FormSection>

            {/* Tags + attributes — retail only */}
            {!isFood && (
              <FormSection title="Tags & Attributes" icon={Tag}>
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
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={
                      isFood
                        ? "Or type a custom tag and press Enter"
                        : "Type a tag then press Enter or Space"
                    }
                    className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>

                {/* Attributes — retail only */}
                {!isFood && (
                  <div>
                    <FieldLabel optional>Attributes</FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={attributeNameInput}
                        onChange={(e) => {
                          setAttributeNameInput(e.target.value);
                          if (attributeError) setAttributeError("");
                        }}
                        placeholder="Name (e.g., Size)"
                        className="flex-1 h-11 px-3 bg-gray-50 border border-gray-200 rounded-md text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                      <Input
                        type="text"
                        value={attributeValueInput}
                        onChange={(e) => {
                          setAttributeValueInput(e.target.value);
                          if (attributeError) setAttributeError("");
                        }}
                        placeholder="Value (e.g., Large)"
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
            )}

            {/* Availability & Stock — food only */}
            {isFood && (
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
            )}

            {/* Customer Choices & Extras — food only */}
            {isFood && (
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
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end absolute py-2 w-full bg-white px-5 bottom-0 right-0 gap-3">
          {isEditMode ? (
            <>
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
            </>
          ) : (
            <>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !canSubmit}
                className="bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-bold px-5 h-10 rounded-md whitespace-nowrap transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Publishing…"
                  : isFood
                    ? "Publish Dish"
                    : "Publish Product"}
              </button>
            </>
          )}
        </div>
      </div>

      <PublishProgressModal
        open={publishModal.open}
        progress={publishModal.progress}
        step={publishModal.step}
        done={publishModal.done}
        isFood={isFood}
      />
    </>
  );
}
