"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  MoreHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  SlidersHorizontal,
  SquarePlus,
  AlignJustify,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORIES_DATA,
  PRODUCTS_DATA,
  Category,
  CategoryProduct,
  ProductTab,
} from "@/services/categories";

const EMOJI_OPTIONS = [
  "🛒",
  "🎯",
  "🌿",
  "🔧",
  "💎",
  "🎨",
  "🍕",
  "✈️",
  "🎵",
  "📦",
];
const BG_OPTIONS = [
  "bg-blue-100",
  "bg-pink-100",
  "bg-amber-100",
  "bg-teal-100",
  "bg-green-100",
  "bg-purple-100",
  "bg-red-100",
  "bg-yellow-100",
  "bg-indigo-100",
  "bg-orange-100",
];

const ITEMS_PER_PAGE = 10;
const TOTAL_PAGES = 24;
const VISIBLE_PAGES = [1, 2, 3, 4, 5];

// ─── Modal ────────────────────────────────────────────────────────────────────

interface CategoryModalProps {
  open: boolean;
  editing: Category | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    emoji: string;
    bgColor: string;
  }) => void;
}

function CategoryModal({
  open,
  editing,
  onClose,
  onSubmit,
}: CategoryModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJI_OPTIONS[0]);
  const [selectedBg, setSelectedBg] = useState(BG_OPTIONS[0]);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setSelectedEmoji(editing.emoji);
      setSelectedBg(editing.bgColor);
    } else {
      setName("");
      setDescription("");
      setSelectedEmoji(EMOJI_OPTIONS[0]);
      setSelectedBg(BG_OPTIONS[0]);
    }
  }, [editing, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      emoji: selectedEmoji,
      bgColor: selectedBg,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-[#023337]">
            {editing ? "Edit Category" : "Add Category"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Preview */}
          <div className="flex justify-center">
            <div
              className={cn(
                "w-16 h-16 rounded-lg flex items-center justify-center text-3xl border border-gray-200",
                selectedBg,
              )}
            >
              {selectedEmoji}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4ea674]/30 focus:border-[#4ea674]"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4ea674]/30 focus:border-[#4ea674] resize-none"
            />
          </div>

          {/* Emoji picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setSelectedEmoji(em)}
                  className={cn(
                    "w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition-colors cursor-pointer",
                    selectedEmoji === em
                      ? "border-[#4ea674] bg-[#eaf8e7]"
                      : "border-gray-200 hover:border-gray-300 bg-gray-50",
                  )}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background Color
            </label>
            <div className="flex flex-wrap gap-2">
              {BG_OPTIONS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setSelectedBg(bg)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all cursor-pointer",
                    bg,
                    selectedBg === bg
                      ? "border-[#4ea674] scale-110"
                      : "border-gray-200",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 text-sm font-medium bg-[#4ea674] text-white rounded-lg hover:bg-[#3d8c62] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {editing ? "Save Changes" : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Category Card ─────────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: Category;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CategoryCard({
  category,
  selected,
  onClick,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    }
    if (popoverOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverOpen]);

  return (
    <div
      className={cn(
        "relative bg-white rounded-lg shadow-sm p-3 flex items-center gap-3 cursor-pointer transition-all border-2",
        selected
          ? "border-[#4ea674] shadow-md"
          : "border-transparent hover:border-gray-200",
      )}
      onClick={onClick}
    >
      {/* Image box */}
      <div
        className={cn(
          "w-16 h-16 rounded flex items-center justify-center text-2xl flex-shrink-0 border border-gray-200",
          category.bgColor,
        )}
      >
        {category.emoji}
      </div>

      {/* Name */}
      <p className="flex-1 min-w-0 text-sm font-medium text-black leading-tight">
        {category.name}
      </p>

      {/* More icon */}
      <div
        ref={popoverRef}
        className="relative flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setPopoverOpen((v) => !v)}
          className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <MoreHorizontal size={16} />
        </button>

        {popoverOpen && (
          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
            <button
              onClick={() => {
                setPopoverOpen(false);
                onEdit();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Pencil size={13} className="text-gray-400" />
              Edit
            </button>
            <button
              onClick={() => {
                setPopoverOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 size={13} className="text-red-400" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  setCurrentPage: (p: number) => void;
}

function Pagination({ currentPage, setCurrentPage }: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-wrap gap-4">
      <button
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg shadow-sm text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        <ChevronLeft size={16} />
        Previous
      </button>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {VISIBLE_PAGES.map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded text-sm font-medium transition-colors cursor-pointer",
              currentPage === page
                ? "bg-[#c1e6ba] text-[#023337]"
                : "border border-gray-200 text-[#023337] hover:bg-gray-50",
            )}
          >
            {page}
          </button>
        ))}
        <span className="w-9 h-9 flex items-center justify-center text-sm font-bold text-[#023337]">
          .....
        </span>
        <button
          onClick={() => setCurrentPage(TOTAL_PAGES)}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded text-sm font-medium transition-colors cursor-pointer",
            currentPage === TOTAL_PAGES
              ? "bg-[#c1e6ba] text-[#023337]"
              : "border border-gray-200 text-[#023337] hover:bg-gray-50",
          )}
        >
          {TOTAL_PAGES}
        </button>
      </div>

      <button
        onClick={() => setCurrentPage(Math.min(TOTAL_PAGES, currentPage + 1))}
        disabled={currentPage === TOTAL_PAGES}
        className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg shadow-sm text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(CATEGORIES_DATA);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<ProductTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Filtered products
  const filtered = PRODUCTS_DATA.filter((p) => {
    if (selectedCategoryId && p.categoryId !== selectedCategoryId) return false;
    if (activeTab === "featured" && !p.featured) return false;
    if (activeTab === "on-sale" && !p.onSale) return false;
    if (activeTab === "out-of-stock" && p.inStock) return false;
    if (
      searchQuery &&
      !p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const totalFiltered = filtered.length;
  const allCount = PRODUCTS_DATA.filter(
    (p) => !selectedCategoryId || p.categoryId === selectedCategoryId,
  ).length;

  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategoryId, activeTab, searchQuery]);

  const handleCategoryClick = (id: string) => {
    setSelectedCategoryId((prev) => (prev === id ? null : id));
    setActiveTab("all");
    setSearchQuery("");
  };

  const handleAddCategory = (data: {
    name: string;
    description: string;
    emoji: string;
    bgColor: string;
  }) => {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: data.name,
      emoji: data.emoji,
      bgColor: data.bgColor,
      description: data.description,
    };
    setCategories((prev) => [...prev, newCat]);
    setModalOpen(false);
  };

  const handleEditCategory = (data: {
    name: string;
    description: string;
    emoji: string;
    bgColor: string;
  }) => {
    if (!editingCategory) return;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === editingCategory.id
          ? {
              ...c,
              name: data.name,
              emoji: data.emoji,
              bgColor: data.bgColor,
              description: data.description,
            }
          : c,
      ),
    );
    setEditingCategory(null);
    setModalOpen(false);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (selectedCategoryId === id) setSelectedCategoryId(null);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const tabs: { key: ProductTab; label: string }[] = [
    { key: "all", label: `All Product` },
    { key: "featured", label: "Featured Products" },
    { key: "on-sale", label: "On Sale" },
    { key: "out-of-stock", label: "Out of Stock" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Top action bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#023337] tracking-wide">
          Discover
        </h1>
        <div className="flex items-center gap-3">
          {/* Add Product */}
          <button className="flex items-center gap-1.5 h-11 pl-3 pr-4 bg-[#4ea674] text-white rounded-lg text-sm font-bold hover:bg-[#3d8c62] transition-colors cursor-pointer">
            <Plus size={18} />
            Add Product
          </button>
          {/* Add Categories */}
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 h-11 pl-3 pr-4 bg-white border border-gray-200 text-[#023337] rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Plus size={16} className="text-[#4ea674]" />
            Add Categories
          </button>
        </div>
      </div>

      {/* ── Category cards grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            selected={selectedCategoryId === cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            onEdit={() => openEdit(cat)}
            onDelete={() => handleDeleteCategory(cat.id)}
          />
        ))}
      </div>

      {/* ── Product register ── */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Table header controls */}
        <div className="flex items-center justify-between flex-wrap gap-3 px-6 pt-5 pb-4">
          {/* Filter tabs */}
          <div className="flex items-center bg-[#eaf8e7] rounded-lg p-1 gap-1 overflow-x-auto flex-shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setCurrentPage(1);
                }}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors cursor-pointer",
                  activeTab === tab.key
                    ? "bg-white text-black font-medium shadow-sm"
                    : "text-gray-600 hover:text-gray-800",
                )}
              >
                <span>{tab.label}</span>
                {tab.key === "all" && (
                  <span className="text-[#4ea674] text-xs font-bold">
                    ({allCount})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg pl-3 pr-2 py-1.5 w-56 border border-transparent focus-within:border-gray-200">
              <input
                type="text"
                placeholder="Search your product"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-600 outline-none min-w-0 placeholder:text-gray-400"
              />
              <Search size={18} className="text-gray-400 flex-shrink-0" />
            </div>
            <button className="p-2.5 border border-gray-200 rounded bg-white hover:bg-gray-50 transition-colors cursor-pointer">
              <SlidersHorizontal size={18} className="text-gray-500" />
            </button>
            <button className="p-2.5 border border-gray-200 rounded bg-white hover:bg-gray-50 transition-colors cursor-pointer">
              <SquarePlus size={20} className="text-gray-500" />
            </button>
            <button className="p-2.5 border border-gray-200 rounded bg-white hover:bg-gray-50 transition-colors cursor-pointer">
              <AlignJustify size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-[#eaf8e7]">
                {["No.", "Product", "Created Date", "Order", "Action"].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-sm font-medium text-[#023337] text-center whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? (
                paginated.map((product, idx) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {/* No. + checkbox */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-5 h-5 rounded border-[1.5px] border-[#eaf8e7] bg-white flex-shrink-0" />
                        <span className="text-sm text-black">
                          {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                        </span>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 justify-center">
                        <div
                          className={cn(
                            "w-10 h-10 rounded border border-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500",
                            product.colorClass,
                          )}
                        >
                          {product.name.charAt(0)}
                        </div>
                        <p className="text-sm text-black w-48 line-clamp-2 text-left">
                          {product.name}
                        </p>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-black">
                        {product.createdDate}
                      </span>
                    </td>

                    {/* Order */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-black">
                        {product.orders}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                          aria-label="Edit product"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          aria-label="Delete product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-sm text-gray-400"
                  >
                    No products found for this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-100">
          {paginated.length > 0 ? (
            paginated.map((product, idx) => (
              <div key={product.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded border border-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500",
                      product.colorClass,
                    )}
                  >
                    {product.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {product.createdDate}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">Orders</p>
                    <p className="text-sm font-medium text-gray-800">
                      {product.orders}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-sm text-gray-400">
              No products found.
            </div>
          )}
        </div>

        <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>

      {/* Modal */}
      <CategoryModal
        open={modalOpen}
        editing={editingCategory}
        onClose={() => {
          setModalOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={editingCategory ? handleEditCategory : handleAddCategory}
      />
    </div>
  );
}
