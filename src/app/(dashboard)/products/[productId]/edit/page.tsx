import EditProductPage from "@/components/products/EditProductPage";

export default async function Page({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <EditProductPage productId={productId} />;
}
