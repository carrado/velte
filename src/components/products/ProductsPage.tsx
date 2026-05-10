"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, MoreHorizontal, Search, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES_DATA, PRODUCTS_DATA } from "@/services/products";
import type {
  Category,
  ProductTab,
  CategoryCardProps,
  CategoryProduct,
  CategoryModalProps,
  RestockModalProps,
  PriceModalProps,
} from "@/types/product";
import type { FilterField } from "@/types/common";
import DeleteProductModal from "./DeleteProductModal";
import ProductsTable from "./ProductsTable";
import { Pagination } from "../Pagination";
import { useNavigation } from "../NavigationProgressContext";
import TabBar from "../TabBar";
import FilterPopover from "../FilterPopover";
import SortMenu from "../SortMenu";
import { Input } from "../ui/input";

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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              required
            />
          </div>
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
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none"
            />
          </div>
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
              className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {editing ? "Save Changes" : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
          <h2 className="text-base font-semibold text-[#023337]">
            Restock Product
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Product:{" "}
            <span className="font-medium text-gray-900">{product.name}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Restock Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            />
          </div>
          <p className="text-xs text-gray-400">
            {product.inStock
              ? "Product is currently in stock. Quantity will be added to existing stock."
              : "Product is out of stock. Total quantity will be reset to the restock amount."}
          </p>
          <button
            type="submit"
            className="w-full py-2.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors cursor-pointer"
          >
            Confirm Restock
          </button>
        </form>
      </div>
    </div>
  );
}

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
          <h2 className="text-base font-semibold text-[#023337]">
            Change Price
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Product:{" "}
            <span className="font-medium text-gray-900">{product.name}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors cursor-pointer"
          >
            Update Price
          </button>
        </form>
      </div>
    </div>
  );
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
        "relative bg-white sm:rounded-lg shadow-sm p-3 flex items-center gap-3 cursor-pointer transition-all border-2",
        selected
          ? "border-[#4ea674] shadow-md"
          : "border-transparent hover:border-gray-200",
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "w-16 h-16 rounded flex items-center justify-center text-2xl flex-shrink-0 border border-gray-200",
          category.bgColor,
        )}
      >
        {category.emoji}
      </div>

      <p className="flex-1 min-w-0 text-sm font-medium text-black leading-tight">
        {category.name}
      </p>

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

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>(CATEGORIES_DATA);
  const [products, setProducts] = useState<CategoryProduct[]>(PRODUCTS_DATA);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleRestock = (productId: string, quantity: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          totalQuantity: p.inStock ? p.totalQuantity + quantity : quantity,
        };
      }),
    );
  };

  const handlePriceChange = (productId: string, newPrice: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, price: newPrice } : p)),
    );
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const tabs: { key: ProductTab; label: string }[] = [
    { key: "all", label: "All Product" },
    { key: "featured", label: "Featured Products" },
    { key: "on-sale", label: "On Sale" },
    { key: "out-of-stock", label: "Out of Stock" },
  ];

  const { navigate } = useNavigation();

  return (
    <div className="w-full space-y-4 sm:px-0 lg:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-wide text-[#023337]"></h1>

        <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto px-5 sm:items-center">
          <button
            onClick={() => navigate("products/add")}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 text-sm font-bold text-white transition-colors hover:bg-orange-600 sm:w-auto"
          >
            <Plus size={18} />
            <span className="truncate">Add Product</span>
          </button>

          <button
            onClick={() => {
              setEditingCategory(null);
              setModalOpen(true);
            }}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold text-[#023337] transition-colors hover:bg-gray-50 sm:w-auto"
          >
            <Plus size={16} className="text-orange-500" />
            <span className="truncate">Add Categories</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            selected={selectedCategoryId === cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            onEdit={() => {
              setEditingCategory(cat);
              setModalOpen(true);
            }}
            onDelete={() => handleDeleteCategory(cat.id)}
          />
        ))}
      </div>

      <div className="overflow-hidden sm:rounded-lg bg-white shadow-sm">
        <div className="flex flex-col gap-3 px-3 pb-4 pt-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between border-b border-gray-100">
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
            className="sm:grid-cols-4"
          />

          <div className="flex w-full items-center gap-2 lg:w-auto">
            <div className="relative flex-1">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order report"
                className="pl-3 pr-9 py-2 text-sm bg-[#f9fafb] border border-[#e5e7eb] rounded-lg w-full"
              />
              <Search
                size={16}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6a717f]"
              />
            </div>

            <FilterPopover
              values={productFilters}
              defaultValues={DEFAULT_PRODUCT_FILTERS}
              fields={PRODUCT_FILTER_FIELDS}
              onApply={(newFilters) => {
                setProductFilters(newFilters);
                setCurrentPage(1);
              }}
              onReset={() => {
                setProductFilters(DEFAULT_PRODUCT_FILTERS);
                setCurrentPage(1);
              }}
            />

            <SortMenu
              currentSort={productSort}
              onSort={(option) => {
                setProductSort(option);
                setCurrentPage(1);
              }}
              options={PRODUCT_SORT_OPTIONS}
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <ProductsTable
            products={paginatedProducts}
            rowOffset={startIndex}
            onRestock={(product: CategoryProduct) =>
              setRestockModal({ open: true, product })
            }
            onChangePrice={(product: CategoryProduct) =>
              setPriceModal({ open: true, product })
            }
            onDelete={(product: CategoryProduct) =>
              setDeleteModal({ open: true, product })
            }
          />
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

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
