import { create } from "zustand";
import type { Category, CategoryProduct } from "@/types/product";

interface ProductsStore {
  categories: Category[];
  products: CategoryProduct[];
  setCategories: (categories: Category[]) => void;
  setProducts: (products: CategoryProduct[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  updateProduct: (id: string, data: Partial<CategoryProduct>) => void;
  deleteProduct: (id: string) => void;
}

export const useProductsStore = create<ProductsStore>()((set) => ({
  categories: [],
  products: [],
  setCategories: (categories) => set({ categories }),
  setProducts: (products) => set({ products }),
  addCategory: (category) =>
    set((state) => ({ categories: [...state.categories, category] })),
  updateCategory: (id, data) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...data } : c,
      ),
    })),
  deleteCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    })),
  updateProduct: (id, data) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...data } : p,
      ),
    })),
  deleteProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),
}));
