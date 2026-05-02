"use client";

import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AddProductTaxOption, AddProductColor } from "@/types/product";
import { Input } from "../ui/input";

type TaxType = "percentage" | "fixed";
type MediaType = "image" | "video";

interface ProductAttribute {
  id: string;
  name: string;
  value: string;
}

export default function AddProductPage() {
  // Basic Details
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");

  // Pricing
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [taxIncluded, setTaxIncluded] = useState<AddProductTaxOption>("yes");
  const [taxType, setTaxType] = useState<TaxType>("percentage");
  const [taxValue, setTaxValue] = useState("");

  // Dates
  const [manufacturingDate, setManufacturingDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");

  // Inventory
  const [stockQuantity, setStockQuantity] = useState("");
  const [threshold, setThreshold] = useState("");

  // Featured flag
  const [isFeatured, setIsFeatured] = useState(false);

  // Media
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<string | null>(null);

  // Categories & tags & attributes
  const [selectedCategory, setSelectedCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [attributeNameInput, setAttributeNameInput] = useState("");
  const [attributeValueInput, setAttributeValueInput] = useState("");

  // UI state for currency popover
  const [currencyPopoverOpen, setCurrencyPopoverOpen] = useState(false);
  const currencyButtonRef = useRef<HTMLButtonElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  // Refs for date pickers and file inputs
  const manufacturingDateRef = useRef<HTMLInputElement>(null);
  const expirationDateRef = useRef<HTMLInputElement>(null);
  const mainImageRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
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

  // Date picker helpers
  const openDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) {
      if (typeof ref.current.showPicker === "function") {
        ref.current.showPicker();
      } else {
        ref.current.click();
      }
    }
  };

  // Image handlers
  const handleMainImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setMainImage(URL.createObjectURL(file));
  };

  const clearMainImage = () => {
    setMainImage(null);
    if (mainImageRef.current) mainImageRef.current.value = "";
  };

  const handleThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const urls = files.map((f) => URL.createObjectURL(f));
    setThumbnails((prev) => [...prev, ...urls].slice(0, 4));
  };

  const removeThumb = (index: number) =>
    setThumbnails((prev) => prev.filter((_, i) => i !== index));

  // Video handler
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoFile(URL.createObjectURL(file));
  };

  const clearVideo = () => {
    setVideoFile(null);
    if (videoRef.current) videoRef.current.value = "";
  };

  // Tag handling
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Attributes handling
  const addAttribute = () => {
    if (attributeNameInput.trim() && attributeValueInput.trim()) {
      setAttributes([
        ...attributes,
        {
          id: Date.now().toString(),
          name: attributeNameInput.trim(),
          value: attributeValueInput.trim(),
        },
      ]);
      setAttributeNameInput("");
      setAttributeValueInput("");
    }
  };

  const removeAttribute = (id: string) => {
    setAttributes(attributes.filter((attr) => attr.id !== id));
  };

  // Action buttons component (reused at bottom)
  const ActionButtons = () => (
    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-6">
      <button className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 h-10 rounded-lg whitespace-nowrap transition-colors">
        Publish Product
      </button>
      <button className="flex items-center gap-1.5 border border-gray-200 bg-white text-[#023337] text-sm font-bold px-3 h-10 rounded-lg whitespace-nowrap hover:bg-gray-50 transition-colors">
        <Save size={14} />
        Save to draft
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* ── Left column: Basic Details + Pricing + Inventory ── */}
        <div className="bg-white rounded-lg shadow-sm flex-1 lg:min-w-0 w-full p-6 space-y-6">
          {/* Basic Details */}
          <h3 className="text-xl font-bold text-[#23272e]">Basic Details</h3>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-[#023337]">
              Product Name
            </label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter product name"
              className="w-full h-12 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-[#023337]">
              Product Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter product description"
              rows={5}
              className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
            />
          </div>

          {/* Pricing */}
          <h3 className="text-xl font-bold text-[#23272e]">Pricing</h3>

          {/* Product Price with custom currency dropdown */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-[#023337]">
              Product Price
            </label>
            <div className="flex h-12 bg-gray-50 border border-gray-200 rounded-lg">
              <Input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="flex-1 min-w-0 px-3 text-sm font-bold mt-1.5 text-[#023337] bg-transparent !border-none shadow-none placeholder:text-gray-400 focus:!outline-none !outline-none focus-visible:ring-0"
              />
              <div className="relative">
                <button
                  ref={currencyButtonRef}
                  onClick={() => setCurrencyPopoverOpen(!currencyPopoverOpen)}
                  className="h-full pl-3 pr-8 text-sm bg-transparent border-l border-gray-200 flex items-center gap-1.5 cursor-pointer"
                >
                  {currency === "NGN" ? "₦" : "$"}
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {currencyPopoverOpen && (
                  <div
                    ref={currencyDropdownRef}
                    className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[100px]"
                  >
                    <button
                      onClick={() => {
                        setCurrency("NGN");
                        setCurrencyPopoverOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 transition-colors"
                    >
                      ₦ NGN
                    </button>
                    <button
                      onClick={() => {
                        setCurrency("USD");
                        setCurrencyPopoverOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 transition-colors"
                    >
                      $ USD
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-5">
            <div className="flex-1 min-w-0 space-y-3">
              <label className="block text-sm font-bold text-[#023337]">
                Discounted Price{" "}
                <span className="font-normal text-gray-500">(Optional)</span>
              </label>
              <div className="flex h-12 items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 overflow-hidden">
                <div className="bg-orange-50 rounded px-2 py-1 text-sm font-bold text-black flex-shrink-0">
                  {currency === "NGN" ? "₦" : "$"}
                </div>
                <Input
                  type="number"
                  step="any"
                  value={discountedPrice}
                  onChange={(e) => setDiscountedPrice(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 min-w-0 text-sm font-bold text-[#023337] bg-transparent !border-none shadow-none placeholder:text-gray-400 focus:!outline-none !outline-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <label className="block text-sm font-bold text-[#023337]">
                Tax Included
              </label>
              <div className="flex items-center gap-3 h-12">
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    taxIncluded === "no" ? "text-[#023337]" : "text-gray-400",
                  )}
                >
                  NO
                </span>
                <button
                  onClick={() =>
                    setTaxIncluded(taxIncluded === "yes" ? "no" : "yes")
                  }
                  className={cn(
                    "relative w-12 h-6 rounded-full transition-colors focus:outline-none",
                    taxIncluded === "yes" ? "bg-orange-500" : "bg-gray-300",
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                      taxIncluded === "yes" ? "translate-x-7" : "translate-x-1",
                    )}
                  />
                </button>
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    taxIncluded === "yes" ? "text-[#023337]" : "text-gray-400",
                  )}
                >
                  YES
                </span>
              </div>
            </div>
          </div>

          {/* Tax value input (only when tax included) */}
          {taxIncluded === "yes" && (
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="block text-sm font-bold text-[#023337]">
                  Tax Amount
                </label>
                <div className="flex h-12 bg-gray-50 pt-1.5 border border-gray-200 rounded-lg overflow-hidden">
                  <Input
                    type="number"
                    step="any"
                    value={taxValue}
                    onChange={(e) => setTaxValue(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 px-3 text-sm text-[#023337] bg-transparent !border-none shadow-none placeholder:text-gray-400 focus:!outline-none !outline-none focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="flex gap-2 pb-1">
                <button
                  onClick={() => setTaxType("percentage")}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md transition-colors",
                    taxType === "percentage"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  %
                </button>
                <button
                  onClick={() => setTaxType("fixed")}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md transition-colors",
                    taxType === "fixed"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  Fixed{" "}
                  {taxType === "fixed" && (currency === "NGN" ? "₦" : "$")}
                </button>
              </div>
            </div>
          )}

          {/* Dates */}
          <h3 className="text-xl font-bold text-[#23272e]">Dates</h3>
          <div className="flex gap-5">
            <div className="flex-1 relative space-y-2">
              <label className="block text-sm font-bold text-[#023337]">
                Manufacturing Date
              </label>
              <div className="relative">
                <Input
                  ref={manufacturingDateRef}
                  type="date"
                  value={manufacturingDate}
                  onClick={() => openDatePicker(manufacturingDateRef)}
                  onChange={(e) => setManufacturingDate(e.target.value)}
                  placeholder="Manufacturing date"
                  className="w-full h-12 px-3 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#023337] focus:outline-none focus:ring-2 focus:ring-orange-500/30 [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <Calendar
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                  onClick={() => openDatePicker(manufacturingDateRef)}
                />
              </div>
            </div>
            <div className="flex-1 relative space-y-2">
              <label className="block text-sm font-bold text-[#023337]">
                Expiration Date
              </label>
              <div className="relative">
                <Input
                  ref={expirationDateRef}
                  type="date"
                  value={expirationDate}
                  onClick={() => openDatePicker(expirationDateRef)}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  placeholder="Expiration date"
                  className="w-full h-12 px-3 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#023337] focus:outline-none focus:ring-2 focus:ring-orange-500/30 [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <Calendar
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                  onClick={() => openDatePicker(expirationDateRef)}
                />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <h3 className="text-xl font-bold text-[#23272e]">Inventory</h3>

          <div className="flex gap-5">
            <div className="flex-1 min-w-0 space-y-3">
              <label className="block text-sm font-bold text-[#023337]">
                Stock Quantity
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Enter quantity"
                className="w-full h-12 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <label className="block text-sm font-bold text-[#023337]">
                Low Stock Threshold
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="e.g., 10"
                className="w-full h-12 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
              <p className="text-xs text-gray-500 mt-1">
                When stock quantity reaches this number, you’ll be notified to
                restock.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsFeatured((v) => !v)}
            className="flex items-center gap-2"
          >
            <div
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors",
                isFeatured
                  ? "bg-orange-500"
                  : "border border-gray-300 bg-white",
              )}
            >
              {isFeatured && (
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
            <span className="text-sm text-gray-500">
              Highlight this product in a featured section.
            </span>
          </button>

          {/* Bottom action buttons - visible on desktop */}
          <div className="hidden lg:block">
            <ActionButtons />
          </div>
        </div>

        {/* ── Right column: Upload + Categories + Tags + Attributes ── */}
        <div className="bg-white rounded-lg shadow-sm w-full lg:w-[485px] flex-shrink-0 p-6 space-y-6">
          {/* Media Upload Section */}
          <div>
            <h3 className="text-xl font-bold text-[#23272e] mb-4">
              Upload Media
            </h3>
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setMediaType("image")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  mediaType === "image"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                )}
              >
                <ImageIcon size={16} />
                Images
              </button>
              <button
                onClick={() => setMediaType("video")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  mediaType === "video"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                )}
              >
                <Video size={16} />
                Video
              </button>
            </div>

            {mediaType === "image" ? (
              <>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-[#023337]">
                    Product Image
                  </label>
                  <div className="relative border border-gray-200 rounded-lg overflow-hidden h-[266px] bg-gray-50 flex items-center justify-center">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt="Main product"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-300">
                        <ImageIcon size={48} />
                        <span className="text-sm text-gray-400">
                          No image selected
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => mainImageRef.current?.click()}
                      className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 h-9 border border-gray-200 rounded-lg bg-white text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <ImageIcon size={16} />
                      Browse
                    </button>
                    {mainImage && (
                      <>
                        <button
                          onClick={clearMainImage}
                          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 h-9 bg-white rounded-lg shadow text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                          Clear
                        </button>
                        <button
                          onClick={() => mainImageRef.current?.click()}
                          className="absolute bottom-3 right-24 flex items-center gap-1.5 px-3 h-9 bg-white rounded-lg shadow text-sm text-black hover:bg-gray-50 transition-colors"
                        >
                          <RefreshCcw size={14} />
                          Replace
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
                </div>

                {/* Thumbnail row */}
                <div className="flex gap-3 flex-wrap mt-4">
                  {thumbnails.map((url, i) => (
                    <div
                      key={i}
                      className="relative w-[98px] h-[99px] border border-gray-200 rounded-lg overflow-hidden flex-shrink-0 group"
                    >
                      <img
                        src={url}
                        alt={`Thumbnail ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeThumb(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {thumbnails.length < 4 && (
                    <button
                      onClick={() => thumbRef.current?.click()}
                      className="w-[201px] h-[99px] border border-dashed border-gray-400 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-gray-50 transition-colors"
                    >
                      <PlusCircle size={22} className="text-orange-500" />
                      <span className="text-sm text-orange-500">Add Image</span>
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
              <div className="space-y-3">
                <label className="block text-sm font-bold text-[#023337]">
                  Product Video
                </label>
                <div className="relative border border-gray-200 rounded-lg overflow-hidden h-[266px] bg-gray-50 flex items-center justify-center">
                  {videoFile ? (
                    <video
                      src={videoFile}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-300">
                      <Video size={48} />
                      <span className="text-sm text-gray-400">
                        No video selected
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => videoRef.current?.click()}
                    className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 h-9 border border-gray-200 rounded-lg bg-white text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <Video size={16} />
                    Browse
                  </button>
                  {videoFile && (
                    <button
                      onClick={clearVideo}
                      className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 h-9 bg-white rounded-lg shadow text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                      Clear
                    </button>
                  )}
                  <input
                    ref={videoRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Categories */}
          <h3 className="text-xl font-bold text-[#23272e]">Categories</h3>
          <div className="space-y-3">
            <label className="block text-sm font-bold text-[#023337]">
              Product Categories
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-11 px-3 pr-9 appearance-none bg-white shadow-[0px_1px_1.5px_rgba(0,0,0,0.2)] rounded-lg text-sm text-[#023337] focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              >
                <option value="">Select your product</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Product Tags (chips input) */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-[#023337]">
              Product Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-sm"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <Input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Type a tag and press Enter"
              className="w-full h-12 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>

          {/* Add Attributes */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-[#23272e]">Add Attributes</h3>
            <div className="flex gap-2">
              <Input
                type="text"
                value={attributeNameInput}
                onChange={(e) => setAttributeNameInput(e.target.value)}
                placeholder="Attribute name (e.g., Size)"
                className="flex-1 h-12 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
              <Input
                type="text"
                value={attributeValueInput}
                onChange={(e) => setAttributeValueInput(e.target.value)}
                placeholder="Value (e.g., Large)"
                className="flex-1 h-12 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
              <button
                onClick={addAttribute}
                className="px-4 h-12 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            {attributes.length > 0 && (
              <div className="mt-3 space-y-2">
                {attributes.map((attr) => (
                  <div
                    key={attr.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <span className="font-medium text-sm">{attr.name}:</span>{" "}
                      <span className="text-sm text-gray-600">
                        {attr.value}
                      </span>
                    </div>
                    <button
                      onClick={() => removeAttribute(attr.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom action buttons - visible on mobile only */}
      <div className="lg:hidden">
        <ActionButtons />
      </div>
    </div>
  );
}
