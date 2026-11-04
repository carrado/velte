import ViewProductPage from "@/components/products/ViewProductPage";

export default async function Page({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <ViewProductPage productId={productId} />;
}
