import AddProductPage from "@/components/products/AddProductPage";

export default async function Page({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <AddProductPage productId={productId} />;
}
