"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  ChefHat,
  Star,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { categoriesApi } from "@/services/products";
import { queryKeys } from "@/lib/query-keys";
import type {
  Category,
  ProductTab,
  CategoryProduct,
  CategoryModalProps,
  RestockModalProps,
  PriceModalProps,
} from "@/types/product";
import type { FilterField } from "@/types/common";
import { useIsFood } from "@/hooks/useBusinessType";
import DeleteProductModal from "./DeleteProductModal";
import ProductsTable from "./ProductsTable";
import { Pagination } from "../Pagination";
import { useNavigation } from "../NavigationProgressContext";
import TabBar from "../TabBar";
import FilterPopover from "../FilterPopover";
import SortMenu from "../SortMenu";
import { Input } from "../ui/input";

// ── Constants ─────────────────────────────────────────────────────────────────

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

type ProductSort = "newest" | "oldest" | "price_asc" | "price_desc";

const PRODUCT_SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price low to high" },
  { value: "price_desc", label: "Price high to low" },
];

const DEFAULT_PRODUCT_FILTERS: Record<string, string> = {
  startDate: "",
  endDate: "",
  stockStatus: "all",
};

const PRODUCT_FILTER_FIELDS: FilterField[] = [
  {
    type: "select",
    key: "stockStatus",
    label: "Stock Status",
    options: [
      { value: "all", label: "All" },
      { value: "in-stock", label: "In Stock" },
      { value: "out-of-stock", label: "Out of Stock" },
    ],
  },
];

// ── Category modal (unchanged) ────────────────────────────────────────────────

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-dash-heading font-semibold text-[#023337]">
            {editing ? "Edit Category" : "Add Category"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
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
          <div>
            <label className="block text-dash-body font-medium text-gray-700 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics"
              className="w-full px-3 py-2 text-dash-body border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              required
            />
          </div>
          <div>
            <label className="block text-dash-body font-medium text-gray-700 mb-1">
              Description{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description..."
              rows={2}
              className="w-full px-3 py-2 text-dash-body border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-dash-body font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setSelectedEmoji(em)}
                  className={cn(
                    "w-9 h-9 rounded-lg border text-dash-title flex items-center justify-center transition-colors cursor-pointer",
                    selectedEmoji === em
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300 bg-gray-50",
                  )}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-dash-body font-medium text-gray-700 mb-2">
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
                      ? "border-orange-500 scale-110"
                      : "border-gray-200",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-dash-body font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 text-dash-body font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {editing ? "Save Changes" : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Restock modal (unchanged) ─────────────────────────────────────────────────

function RestockModal({
  open,
  product,
  onClose,
  onConfirm,
}: RestockModalProps) {
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuantity(1);
  }, [product, open]);
  if (!open || !product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > 0) {
      onConfirm(product.id, quantity);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-dash-heading font-semibold text-[#023337]">
            Restock Product
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-dash-body text-gray-600">
            Product:{" "}
            <span className="font-medium text-gray-900">{product.name}</span>
          </p>
          <div>
            <label className="block text-dash-body font-medium text-gray-700 mb-1">
              Restock Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-full px-3 py-2 text-dash-body border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            />
          </div>
          <p className="text-dash-secondary text-gray-400">
            {product.inStock
              ? "Product is currently in stock. Quantity will be added to existing stock."
              : "Product is out of stock. Total quantity will be reset to the restock amount."}
          </p>
          <button
            type="submit"
            className="w-full py-2.5 text-dash-body font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors cursor-pointer"
          >
            Confirm Restock
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Price modal (unchanged) ───────────────────────────────────────────────────

function PriceModal({ open, product, onClose, onConfirm }: PriceModalProps) {
  const [price, setPrice] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (product) setPrice(product.price.toString());
  }, [product, open]);
  if (!open || !product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(price) > 0) {
      onConfirm(product.id, Number(price));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-dash-heading font-semibold text-[#023337]">
            Change Price
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-dash-body text-gray-600">
            Product:{" "}
            <span className="font-medium text-gray-900">{product.name}</span>
          </p>
          <div>
            <label className="block text-dash-body font-medium text-gray-700 mb-1">
              New Price (₦)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 text-dash-body border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 text-dash-body font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors cursor-pointer"
          >
            Update Price
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Category strip ────────────────────────────────────────────────────────────

function CategoryStrip({
  categories,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onAdd,
  isFood,
}: {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  isFood: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        openId &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpenId(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openId]);

  return (
    <div
      ref={containerRef}
      className="flex gap-2 overflow-x-auto pb-0.5"
      style={{ scrollbarWidth: "none" }}
    >
      {/* All chip */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "flex-shrink-0 h-9 px-4 rounded-xl text-dash-body font-semibold border transition-colors cursor-pointer",
          selectedId === null
            ? "bg-orange-500 text-white border-orange-500"
            : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600",
        )}
      >
        All {isFood ? "Dishes" : "Products"}
      </button>

      {/* Category chips */}
      {categories.map((cat) => (
        <div key={cat.id} className="relative flex-shrink-0">
          <div
            className={cn(
              "flex items-center h-9 rounded-xl border transition-colors overflow-hidden",
              selectedId === cat.id
                ? "border-orange-400 bg-orange-50"
                : "border-gray-200 bg-white hover:border-orange-200",
            )}
          >
            <button
              onClick={() => onSelect(selectedId === cat.id ? null : cat.id)}
              className="flex items-center gap-1.5 pl-3 pr-2 h-full cursor-pointer"
            >
              <span className="text-[15px] leading-none">{cat.emoji}</span>
              <span
                className={cn(
                  "text-dash-body font-medium whitespace-nowrap",
                  selectedId === cat.id ? "text-orange-600" : "text-gray-700",
                )}
              >
                {cat.name}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenId(openId === cat.id ? null : cat.id);
              }}
              className={cn(
                "px-1.5 h-full flex items-center border-l transition-colors cursor-pointer",
                selectedId === cat.id
                  ? "border-orange-200 text-orange-300 hover:text-orange-500"
                  : "border-gray-100 text-gray-300 hover:text-gray-500",
              )}
            >
              <MoreHorizontal size={13} />
            </button>
          </div>

          {openId === cat.id && (
            <div className="absolute left-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
              <button
                onClick={() => {
                  setOpenId(null);
                  onEdit(cat);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-dash-body text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Pencil size={12} className="text-gray-400" /> Edit
              </button>
              <button
                onClick={() => {
                  setOpenId(null);
                  onDelete(cat.id);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-dash-body text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 size={12} className="text-red-400" /> Delete
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add chip */}
      <button
        onClick={onAdd}
        className="flex-shrink-0 h-9 px-3.5 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-orange-300 hover:text-orange-500 flex items-center gap-1.5 text-dash-body transition-colors cursor-pointer"
      >
        <Plus size={13} /> Add
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const userId = pathname.split("/").filter(Boolean)[0];
  const isFood = useIsFood();

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.products.categories,
    queryFn: categoriesApi.getCategories,
  });
  const { data: products = [] } = useQuery({
    queryKey: queryKeys.products.list,
    queryFn: categoriesApi.getProducts,
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<ProductTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [restockModal, setRestockModal] = useState<{
    open: boolean;
    product: CategoryProduct | null;
  }>({ open: false, product: null });
  const [priceModal, setPriceModal] = useState<{
    open: boolean;
    product: CategoryProduct | null;
  }>({ open: false, product: null });
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    product: CategoryProduct | null;
  }>({ open: false, product: null });

  const [productFilters, setProductFilters] = useState<Record<string, string>>(
    DEFAULT_PRODUCT_FILTERS,
  );
  const [productSort, setProductSort] = useState<ProductSort>("newest");

  // ── Filtering & sorting ──────────────────────────────────────────────────

  let filteredProducts = products.filter((p) => {
    if (selectedCategoryId && p.categoryId !== selectedCategoryId) return false;
    if (activeTab === "featured" && !p.featured) return false;
    if (activeTab === "on-sale" && (!p.onSale || !p.inStock)) return false;
    if (activeTab === "out-of-stock" && p.inStock) return false;
    if (
      searchQuery &&
      !p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (productFilters["stockStatus"] === "in-stock" && !p.inStock)
      return false;
    if (productFilters["stockStatus"] === "out-of-stock" && p.inStock)
      return false;
    return true;
  });

  filteredProducts = [...filteredProducts].sort((a, b) => {
    if (productSort === "newest")
      return b.createdDate.localeCompare(a.createdDate);
    if (productSort === "oldest")
      return a.createdDate.localeCompare(b.createdDate);
    if (productSort === "price_asc") return a.price - b.price;
    if (productSort === "price_desc") return b.price - a.price;
    return 0;
  });

  const totalFiltered = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const allCount = products.filter(
    (p) => !selectedCategoryId || p.categoryId === selectedCategoryId,
  ).length;

  // Quick stats
  const inStockCount = products.filter((p) => !!p.inStock).length;
  const outOfStockCount = products.filter((p) => !p.inStock).length;
  const featuredCount = products.filter((p) => p.featured).length;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [selectedCategoryId, activeTab, searchQuery]);

  // ── Handlers ─────────────────────────────────────────────────────────────

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
    queryClient.setQueryData<Category[]>(
      queryKeys.products.categories,
      (prev) => [...(prev ?? []), newCat],
    );
    setModalOpen(false);
  };

  const handleEditCategory = (data: {
    name: string;
    description: string;
    emoji: string;
    bgColor: string;
  }) => {
    if (!editingCategory) return;
    queryClient.setQueryData<Category[]>(
      queryKeys.products.categories,
      (prev) =>
        (prev ?? []).map((c) =>
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
    queryClient.setQueryData<Category[]>(
      queryKeys.products.categories,
      (prev) => (prev ?? []).filter((c) => c.id !== id),
    );
    if (selectedCategoryId === id) setSelectedCategoryId(null);
  };

  const handleRestock = (productId: string, quantity: number) => {
    queryClient.setQueryData<CategoryProduct[]>(
      queryKeys.products.list,
      (prev) =>
        (prev ?? []).map((p) => {
          if (p.id !== productId) return p;
          return {
            ...p,
            totalQuantity: p.inStock ? p.totalQuantity + quantity : quantity,
          };
        }),
    );
  };

  const handlePriceChange = (productId: string, newPrice: number) => {
    queryClient.setQueryData<CategoryProduct[]>(
      queryKeys.products.list,
      (prev) =>
        (prev ?? []).map((p) =>
          p.id === productId ? { ...p, price: newPrice } : p,
        ),
    );
  };

  const handleDeleteProduct = (productId: string) => {
    queryClient.setQueryData<CategoryProduct[]>(
      queryKeys.products.list,
      (prev) => (prev ?? []).filter((p) => p.id !== productId),
    );
  };

  const { navigate } = useNavigation();

  const tabs: { key: ProductTab; label: string }[] = isFood
    ? [
        { key: "all", label: "All Dishes" },
        { key: "featured", label: "Featured" },
        { key: "on-sale", label: "On Sale" },
        { key: "out-of-stock", label: "Not Available" },
      ]
    : [
        { key: "all", label: "All Products" },
        { key: "featured", label: "Featured" },
        { key: "on-sale", label: "On Sale" },
        { key: "out-of-stock", label: "Out of Stock" },
      ];

  const stats = [
    {
      label: isFood ? "Total Dishes" : "Total Products",
      value: products.length,
      icon: isFood ? ChefHat : Package,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      label: isFood ? "Available" : "In Stock",
      value: inStockCount,
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      label: isFood ? "Not Available" : "Out of Stock",
      value: outOfStockCount,
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-50",
    },
    {
      label: "Featured",
      value: featuredCount,
      icon: Star,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="w-full space-y-5">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start px-5 sm:px-0 justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-dash-title font-black text-[#023337]">
            {isFood ? "My Menu" : "My Products"}
          </h2>
          <p className="text-dash-body text-gray-400 mt-0.5">
            {isFood
              ? "Manage your dishes, drinks and menu items"
              : "Manage and track your product catalogue"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/${userId}/products/add`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Plus size={16} />
            {isFood ? "Add Dish" : "Add Product"}
          </button>
          <button
            onClick={() => {
              setEditingCategory(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white text-[#023337] text-dash-body font-semibold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Plus size={15} className="text-orange-500" />
            Category
          </button>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white sm:rounded-xl border border-gray-100 shadow-sm px-4 py-4 flex items-center gap-3"
          >
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                stat.bg,
              )}
            >
              <stat.icon size={16} className={stat.color} />
            </div>
            <div className="min-w-0">
              <p className="text-[1.4rem] font-black leading-none text-[#023337]">
                {stat.value}
              </p>
              <p className="text-dash-caption text-gray-400 mt-0.5 truncate">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Category strip ───────────────────────────────────────────────── */}
      <div className="bg-white sm:rounded-xl border border-gray-100 shadow-sm px-5 py-4">
        <p className="text-dash-caption font-semibold text-gray-400 uppercase tracking-wider mb-3">
          {isFood ? "Menu Sections" : "Categories"}
        </p>
        <CategoryStrip
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={(id) => {
            setSelectedCategoryId(id);
            setActiveTab("all");
            setSearchQuery("");
          }}
          onEdit={(cat) => {
            setEditingCategory(cat);
            setModalOpen(true);
          }}
          onDelete={handleDeleteCategory}
          onAdd={() => {
            setEditingCategory(null);
            setModalOpen(true);
          }}
          isFood={isFood}
        />
      </div>

      {/* ── Products panel ───────────────────────────────────────────────── */}
      <div className="bg-white sm:rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 px-4 pt-4 pb-3 sm:px-5 border-b border-gray-100 lg:flex-row lg:items-center lg:justify-between">
          <TabBar
            tabs={tabs.map((t) => ({
              ...t,
              count: t.key === "all" ? allCount : undefined,
            }))}
            activeTab={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
          />

          <div className="flex items-center gap-2">
            <div className="relative flex-1 lg:w-52 lg:flex-none">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isFood ? "Search dishes…" : "Search products…"}
                className="pl-3 pr-9 h-9 text-dash-body bg-gray-50 border border-gray-200 rounded-lg w-full"
              />
              <Search
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <FilterPopover
              values={productFilters}
              defaultValues={DEFAULT_PRODUCT_FILTERS}
              fields={PRODUCT_FILTER_FIELDS}
              onApply={(f) => {
                setProductFilters(f);
                setCurrentPage(1);
              }}
              onReset={() => {
                setProductFilters(DEFAULT_PRODUCT_FILTERS);
                setCurrentPage(1);
              }}
            />

            <SortMenu
              currentSort={productSort}
              onSort={(o) => {
                setProductSort(o);
                setCurrentPage(1);
              }}
              options={PRODUCT_SORT_OPTIONS}
            />
          </div>
        </div>

        {/* Product list */}
        <ProductsTable
          products={paginatedProducts}
          rowOffset={startIndex}
          onRestock={(p) => setRestockModal({ open: true, product: p })}
          onChangePrice={(p) => setPriceModal({ open: true, product: p })}
          onDelete={(p) => setDeleteModal({ open: true, product: p })}
          isFood={isFood}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ── Modals (unchanged) ───────────────────────────────────────────── */}
      <CategoryModal
        open={modalOpen}
        editing={editingCategory}
        onClose={() => {
          setModalOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={editingCategory ? handleEditCategory : handleAddCategory}
      />

      <RestockModal
        open={restockModal.open}
        product={restockModal.product}
        onClose={() => setRestockModal({ open: false, product: null })}
        onConfirm={handleRestock}
      />

      <PriceModal
        open={priceModal.open}
        product={priceModal.product}
        onClose={() => setPriceModal({ open: false, product: null })}
        onConfirm={handlePriceChange}
      />

      <DeleteProductModal
        open={deleteModal.open}
        product={deleteModal.product}
        onClose={() => setDeleteModal({ open: false, product: null })}
        onConfirm={handleDeleteProduct}
      />
    </div>
  );
}
