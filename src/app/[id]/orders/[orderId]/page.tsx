import ViewOrderPage from "@/components/orders/ViewOrderPage";

export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <ViewOrderPage orderId={orderId} />;
}
