"use client";

import AddProductPage from "./AddProductPage";

export default function EditProductPage({ productId }: { productId: string }) {
  return <AddProductPage mode="edit" productId={productId} />;
}
